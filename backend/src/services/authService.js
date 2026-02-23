// backend/src/services/authService.js
import { prisma } from '../config/prisma.js';
import { hashPassword, comparePassword } from '../utils/password.js';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '../utils/jwt.js';
import crypto from 'crypto';
import { sendSignupVerificationCode } from './emailService.js';
/**
 * Register
 * - ამოწმებს email-ს და username-ს უნიკალურობას
 * - თუ იძებნება USER, რომელიც დაბლოკილია, აბრუნებს "blocked" მესიჯს
 */
const OTP_TTL_MINUTES = 10;
const OTP_TTL_MS = OTP_TTL_MINUTES * 60 * 1000;

function generateOtpCode() {
  // 6-digit numeric
  const n = crypto.randomInt(0, 1000000);
  return String(n).padStart(6, '0');
}

function hashOtp(code) {
  // fast hash is enough here; OTP is short-lived
  return crypto.createHash('sha256').update(code).digest('hex');
}
export async function registerUser({ username, email, password, country }) {
  // 1) თუ უკვე არსებობს რეალური User -> ჩვეულებრივი "already registered"
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

  // 2) თუ PendingSignup-ში სხვა ვინმეს აქვს იგივე username/email — უნდა ვმართოთ სწორად
  const pendingByEmail = await prisma.pendingSignup.findUnique({ where: { email } });
  const pendingByUsername = await prisma.pendingSignup.findUnique({ where: { username } });

  // თუ pendingByUsername არსებობს და სხვა email-ია -> username დაკავებულია (pending-ითაც)
  if (pendingByUsername && pendingByUsername.email !== email) {
    const err = new Error('Username already taken');
    err.status = 400;
    throw err;
  }

  // თუ pendingByEmail არსებობს და სხვა username-ია -> email დაკავებულია (pending-ითაც)
  if (pendingByEmail && pendingByEmail.username !== username) {
    const err = new Error('Email is already in use');
    err.status = 400;
    throw err;
  }

  // 3) ყოველთვის ვაგენერირებთ ახალ OTP-ს (ყოველ register-ზე)
  const code = generateOtpCode();
  const codeHash = hashOtp(code);
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);

  const passwordHash = await hashPassword(password);

  // 4) Upsert pending (თუ არსებობს -> update; თუ არა -> create)
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

  // 5) გააგზავნე OTP
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

  // ✅ create real user in a transaction, then delete pending
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

  // rate limit: 30 seconds
  const secondsSinceLast = (Date.now() - pending.lastSentAt.getTime()) / 1000;
  if (secondsSinceLast < 30) {
    const err = new Error('Please wait before requesting a new code');
    err.status = 429;
    throw err;
  }

  // resend limit
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
    isEmailVerified: user.isEmailVerified, // ✅ add
    badges: user.badges ?? 0,          // ⭐ სულ რამდენი მედალი აქვს
    lastSeenBadges: user.lastSeenBadges ?? 0, // 👀 რამდენი უკვე ნანახია
  };
}

