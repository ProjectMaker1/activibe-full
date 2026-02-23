// backend/src/services/authService.js
import { prisma } from '../config/prisma.js';
import { hashPassword, comparePassword } from '../utils/password.js';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '../utils/jwt.js';
import crypto from 'crypto';
import { sendSignupVerificationCode, sendPasswordResetCode } from './emailService.js';

/**
 * Register / OTP
 */
const OTP_TTL_MINUTES = 10;
const OTP_TTL_MS = OTP_TTL_MINUTES * 60 * 1000;

function generateOtpCode() {
  const n = crypto.randomInt(0, 1000000);
  return String(n).padStart(6, '0');
}

function hashOtp(code) {
  return crypto.createHash('sha256').update(code).digest('hex');
}

/* ===========================
   SIGN UP (PendingSignup)
=========================== */

export async function registerUser({ username, email, password, country }) {
  const existingUserByEmail = await prisma.user.findUnique({ where: { email } });
  if (existingUserByEmail) {
    const err = new Error(
      existingUserByEmail.isBlocked ? 'This email is blocked' : 'Email already registered'
    );
    err.status = 400;
    throw err;
  }

  const existingUserByUsername = await prisma.user.findUnique({ where: { username } });
  if (existingUserByUsername) {
    const err = new Error(
      existingUserByUsername.isBlocked ? 'This username is blocked' : 'Username already taken'
    );
    err.status = 400;
    throw err;
  }

  const pendingByEmail = await prisma.pendingSignup.findUnique({ where: { email } });
  const pendingByUsername = await prisma.pendingSignup.findUnique({ where: { username } });

  if (pendingByUsername && pendingByUsername.email !== email) {
    const err = new Error('Username already taken');
    err.status = 400;
    throw err;
  }

  if (pendingByEmail && pendingByEmail.username !== username) {
    const err = new Error('Email is already in use');
    err.status = 400;
    throw err;
  }

  const code = generateOtpCode();
  const codeHash = hashOtp(code);
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);

  const passwordHash = await hashPassword(password);

  await prisma.pendingSignup.upsert({
    where: { email },
    update: {
      username,
      passwordHash,
      country: country || null,
      codeHash,
      codeExpiresAt: expiresAt,
      attempts: 0,
      lastSentAt: new Date(),
    },
    create: {
      email,
      username,
      passwordHash,
      country: country || null,
      codeHash,
      codeExpiresAt: expiresAt,
      attempts: 0,
      resendCount: 0,
      lastSentAt: new Date(),
    },
  });

  await sendSignupVerificationCode({
    to: email,
    code,
    minutes: OTP_TTL_MINUTES,
  });

  return {
    pending: true,
    email,
    expiresInSeconds: OTP_TTL_MINUTES * 60,
  };
}

export async function verifySignupCode({ email, code }) {
  const pending = await prisma.pendingSignup.findUnique({ where: { email } });
  if (!pending) {
    const err = new Error('No pending sign up found for this email');
    err.status = 400;
    throw err;
  }

  if (pending.codeExpiresAt.getTime() < Date.now()) {
    const err = new Error('Verification code expired');
    err.status = 400;
    throw err;
  }

  if (pending.attempts >= 8) {
    const err = new Error('Too many attempts. Please request a new code.');
    err.status = 429;
    throw err;
  }

  const codeHash = hashOtp(code);

  if (codeHash !== pending.codeHash) {
    await prisma.pendingSignup.update({
      where: { email },
      data: { attempts: { increment: 1 } },
    });

    const err = new Error('Invalid verification code');
    err.status = 400;
    throw err;
  }

  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        email: pending.email,
        username: pending.username,
        password: pending.passwordHash,
        country: pending.country,
        role: 'USER',
        isEmailVerified: true,
      },
    });

    await tx.pendingSignup.delete({ where: { email } });

    return created;
  });

  const tokens = issueTokens(user);
  return { user: publicUser(user), tokens };
}

export async function resendSignupCode({ email }) {
  const pending = await prisma.pendingSignup.findUnique({ where: { email } });
  if (!pending) {
    const err = new Error('No pending sign up found for this email');
    err.status = 400;
    throw err;
  }

  const secondsSinceLast = (Date.now() - pending.lastSentAt.getTime()) / 1000;
  if (secondsSinceLast < 30) {
    const err = new Error('Please wait before requesting a new code');
    err.status = 429;
    throw err;
  }

  if (pending.resendCount >= 8) {
    const err = new Error('Too many resend requests. Please try again later.');
    err.status = 429;
    throw err;
  }

  const code = generateOtpCode();
  const codeHash = hashOtp(code);
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);

  await prisma.pendingSignup.update({
    where: { email },
    data: {
      codeHash,
      codeExpiresAt: expiresAt,
      attempts: 0,
      resendCount: { increment: 1 },
      lastSentAt: new Date(),
    },
  });

  await sendSignupVerificationCode({
    to: email,
    code,
    minutes: OTP_TTL_MINUTES,
  });

  return { ok: true, expiresInSeconds: OTP_TTL_MINUTES * 60 };
}

/* ===========================
   LOGIN / TOKENS
=========================== */

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

  if (user.isEmailVerified === false) {
    const err = new Error('Please verify your email to continue');
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

/* ===========================
   PASSWORD RESET (PasswordReset)
   Endpoints:
   - POST /api/auth/forgot-password
   - POST /api/auth/forgot-password/resend
   - POST /api/auth/reset-password
=========================== */

export async function requestPasswordReset({ email }) {
  const user = await prisma.user.findUnique({ where: { email } });

  if (user.isBlocked) {
    const err = new Error('Your account is blocked');
    err.status = 403;
    throw err;
  }

  const existing = await prisma.passwordReset.findUnique({ where: { email } });

  // rate limit: 30 seconds
  if (existing) {
    const secondsSinceLast = (Date.now() - existing.lastSentAt.getTime()) / 1000;
    if (secondsSinceLast < 30) {
      const err = new Error('Please wait before requesting a new code');
      err.status = 429;
      throw err;
    }

    if (existing.resendCount >= 8) {
      const err = new Error('Too many resend requests. Please try again later.');
      err.status = 429;
      throw err;
    }
  }

  const code = generateOtpCode();
  const codeHash = hashOtp(code);
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);

  await prisma.passwordReset.upsert({
    where: { email },
    update: {
      codeHash,
      codeExpiresAt: expiresAt,
      attempts: 0,
      resendCount: existing ? existing.resendCount : 0,
      lastSentAt: new Date(),
    },
    create: {
      email,
      codeHash,
      codeExpiresAt: expiresAt,
      attempts: 0,
      resendCount: 0,
      lastSentAt: new Date(),
    },
  });

  await sendPasswordResetCode({
    to: email,
    code,
    minutes: OTP_TTL_MINUTES,
  });

  return { ok: true, expiresInSeconds: OTP_TTL_MINUTES * 60 };
}

export async function resendPasswordReset({ email }) {
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    const err = new Error('No verified account found with this email address.');
    err.status = 404;
    throw err;
  }

  if (user.isEmailVerified === false) {
    const err = new Error('This email address is not verified.');
    err.status = 400;
    throw err;
  }

  if (user.isBlocked) {
    const err = new Error('Your account is blocked');
    err.status = 403;
    throw err;
  }

  const existing = await prisma.passwordReset.findUnique({ where: { email } });

  if (existing) {
    const secondsSinceLast = (Date.now() - existing.lastSentAt.getTime()) / 1000;
    if (secondsSinceLast < 30) {
      const err = new Error('Please wait before requesting a new code');
      err.status = 429;
      throw err;
    }

    if (existing.resendCount >= 8) {
      const err = new Error('Too many resend requests. Please try again later.');
      err.status = 429;
      throw err;
    }
  }

  const code = generateOtpCode();
  const codeHash = hashOtp(code);
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);

  await prisma.passwordReset.upsert({
    where: { email },
    update: {
      codeHash,
      codeExpiresAt: expiresAt,
      attempts: 0,
      resendCount: { increment: 1 },
      lastSentAt: new Date(),
    },
    create: {
      email,
      codeHash,
      codeExpiresAt: expiresAt,
      attempts: 0,
      resendCount: 0,
      lastSentAt: new Date(),
    },
  });

  await sendPasswordResetCode({
    to: email,
    code,
    minutes: OTP_TTL_MINUTES,
  });

  return { ok: true, expiresInSeconds: OTP_TTL_MINUTES * 60 };
}

/* ===========================
   Helpers
=========================== */

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
    isEmailVerified: user.isEmailVerified,
    badges: user.badges ?? 0,
    lastSeenBadges: user.lastSeenBadges ?? 0,
  };
}