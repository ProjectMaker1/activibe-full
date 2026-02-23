import React, { createContext, useContext, useEffect, useState } from 'react';
import { apiRequest } from '@shared/apiClient.js';

const AuthContext = createContext(null);

const STORAGE_KEY = 'activibe_auth';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [tokens, setTokens] = useState({
    accessToken: null,
    refreshToken: null,
  });
  const [loading, setLoading] = useState(true);
  const [hasNewBadge, setHasNewBadge] = useState(false);

  // initial load from localStorage
  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        setUser(parsed.user);
        setTokens({
          accessToken: parsed.accessToken,
          refreshToken: parsed.refreshToken,
        });
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
    setLoading(false);
  }, []);

  // check for new badge (user.badges > user.lastSeenBadges)
  useEffect(() => {
    if (!user) {
      setHasNewBadge(false);
      return;
    }

    const badges = user.badges ?? 0;
    const lastSeen = user.lastSeenBadges ?? 0;

    if (badges > lastSeen) {
      setHasNewBadge(true);
    } else {
      setHasNewBadge(false);
    }
  }, [user]);

  const saveSession = (data) => {
    const payload = {
      user: data.user, // აქ უკვე არის badges და lastSeenBadges
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    setUser(data.user);
    setTokens({
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
    });
  };

  // LOGIN – email/password
  const login = async (email, password) => {
    const data = await apiRequest('/auth/login', {
      method: 'POST',
      body: { email, password },
    });

    saveSession({
      user: data.user,
      accessToken: data.tokens.accessToken,
      refreshToken: data.tokens.refreshToken,
    });
  };

  /**
   * SIGNUP – username, email, password, country
   * ახალი flow:
   * - backend აბრუნებს { pending:true, email, expiresInSeconds }
   * - აქ არ ვინახავთ tokens/user-ს, სანამ verify არ დასრულდება
   * - signup აბრუნებს response-ს, რომ UI გადავიდეს OTP ეტაპზე
   */
  const signup = async (username, email, password, country) => {
    const data = await apiRequest('/auth/register', {
      method: 'POST',
      body: {
        username,
        email,
        password,
        country, // ISO კოდი ან null
      },
    });

    // ✅ pending flow - არ ვწერთ localStorage-ში
    if (data?.pending) {
      return data;
    }

    // (fallback თუ ოდესმე backend შეიცვლება და პირდაპირ დააბრუნებს user/tokens)
    if (data?.user && data?.tokens) {
      saveSession({
        user: data.user,
        accessToken: data.tokens.accessToken,
        refreshToken: data.tokens.refreshToken,
      });
    }

    return data;
  };

  /**
   * VERIFY EMAIL (OTP)
   * - backend აბრუნებს { user, tokens }
   * - აქ უკვე ვინახავთ session-ს
   */
  const verifyEmailCode = async (email, code) => {
    const data = await apiRequest('/auth/verify-email', {
      method: 'POST',
      body: { email, code },
    });

    saveSession({
      user: data.user,
      accessToken: data.tokens.accessToken,
      refreshToken: data.tokens.refreshToken,
    });

    return data;
  };

  /**
   * RESEND OTP
   * - backend აბრუნებს { ok:true, expiresInSeconds }
   */
  const resendSignupCode = async (email) => {
    const data = await apiRequest('/auth/resend-code', {
      method: 'POST',
      body: { email },
    });
    return data;
  };

  const logout = () => {
    localStorage.removeItem(STORAGE_KEY);
    setUser(null);
    setTokens({ accessToken: null, refreshToken: null });
    setHasNewBadge(false);
  };

  const refreshMe = async () => {
    if (!tokens.accessToken) return;

    try {
      const res = await apiRequest('/auth/me', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${tokens.accessToken}`,
        },
      });

      if (res?.user) {
        setUser(res.user);

        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          parsed.user = res.user;
          localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
        }
      }
    } catch (err) {
      console.error('Failed to refresh user', err);
    }
  };

  useEffect(() => {
    if (tokens.accessToken) refreshMe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokens.accessToken]);

  // როცა იუზერი დახურავს დიდ ბეიჯის მოდალს
  const markBadgesSeen = async () => {
    if (!tokens.accessToken) return;

    try {
      const res = await apiRequest('/auth/badges/seen', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${tokens.accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      setUser((prev) =>
        prev
          ? {
              ...prev,
              lastSeenBadges: res.lastSeenBadges,
            }
          : prev
      );

      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.user) {
          parsed.user.lastSeenBadges = res.lastSeenBadges;
          localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
        }
      }

      setHasNewBadge(false);
    } catch (err) {
      console.error('Failed to mark badges as seen', err);
    }
  };

  const value = {
    user,
    tokens,
    loading,
    login,
    signup,
    verifyEmailCode,   // ✅ NEW
    resendSignupCode,  // ✅ NEW
    logout,
    refreshMe,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'ADMIN',
    hasNewBadge,
    markBadgesSeen,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}