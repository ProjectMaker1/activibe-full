// backend/src/services/authService.js
import { prisma } from '../config/prisma.js';
import { hashPassword, comparePassword } from '../utils/password.js';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '../utils/jwt.js';

/**
 * Register
 * - ამოწმებს email-ს და username-ს უნიკალურობას
 * - თუ იძებნება USER, რომელიც დაბლოკილია, აბრუნებს "blocked" მესიჯს
 */
export async function registerUser({ username, email, password, country }) {
  // email-ის მიხედვით existing user
  const existingByEmail = await prisma.user.findUnique({
    where: { email },
  });
  if (existingByEmail) {
    const err = new Error(
      existingByEmail.isBlocked
        ? 'This email is blocked'
        : 'Email already registered'
    );
    err.status = 400;
    throw err;
  }

  // username-ის მიხედვით existing user
  const existingByUsername = await prisma.user.findUnique({
    where: { username },
  });
  if (existingByUsername) {
    const err = new Error(
      existingByUsername.isBlocked
        ? 'This username is blocked'
        : 'Username already taken'
    );
    err.status = 400;
    throw err;
  }

  const hashed = await hashPassword(password);

  const user = await prisma.user.create({
    data: {
      email,
      username,
      password: hashed,
      role: 'USER',
      country: country || null,
      // isBlocked default(false) მოდელიდან მოვა
    },
  });

  const tokens = issueTokens(user);
  return { user: publicUser(user), tokens };
}

/**
 * Login
 * - ლოგინი email + password-ით
 * - თუ იუზერი დაბლოკილია -> 403 + შესაბამისი მესიჯი
 */
export async function loginUser({ email, password }) {
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    const err = new Error('Invalid credentials');
    err.status = 401;
    throw err;
  }

  if (user.isBlocked) {
    const err = new Error('Your account is blocked');
    err.status = 403;
    throw err;
  }

  const ok = await comparePassword(password, user.password);
  if (!ok) {
    const err = new Error('Invalid credentials');
    err.status = 401;
    throw err;
  }

  const tokens = issueTokens(user);
  return { user: publicUser(user), tokens };
}

export async function refreshTokens(refreshToken) {
  try {
    const payload = verifyRefreshToken(refreshToken);
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    });

    if (!user) {
      const err = new Error('User not found');
      err.status = 401;
      throw err;
    }

    // 🔴 აქ ვამატებთ ბლოკის შემოწმებას refresh-ზეც
    if (user.isBlocked) {
      const err = new Error('Your account is blocked');
      err.status = 403;
      throw err;
    }

    const tokens = issueTokens(user);
    return { user: publicUser(user), tokens };
  } catch (err) {
    const e = new Error('Invalid refresh token');
    e.status = 401;
    throw e;
  }
}

function issueTokens(user) {
  const payload = { userId: user.id, role: user.role };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);
  return { accessToken, refreshToken };
}

function publicUser(user) {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    role: user.role,
    country: user.country,
    isBlocked: user.isBlocked,
    badges: user.badges ?? 0,          // ⭐ სულ რამდენი მედალი აქვს
    lastSeenBadges: user.lastSeenBadges ?? 0, // 👀 რამდენი უკვე ნანახია
  };
}

