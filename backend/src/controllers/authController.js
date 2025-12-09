// backend/src/controllers/authController.js
import * as authService from '../services/authService.js';
import { prisma } from '../config/prisma.js';

export async function register(req, res, next) {
  try {
    // ⬇️ name აღარ გვჭირდება, ვიღებთ username-ს
    const { email, password, username, country } = req.body;

    const result = await authService.registerUser({
      email,
      password,
      username,
      country,
    });

    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

export async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const result = await authService.loginUser({ email, password });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function refresh(req, res, next) {
  try {
    const { refreshToken } = req.body;
    const result = await authService.refreshTokens(refreshToken);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function me(req, res, next) {
  try {
    res.json({ user: req.user });
  } catch (err) {
    next(err);
  }
}
// მომხმარებელმა ნახა ახალი ბეიჯი
// მომხმარებელმა ნახა ახალი ბეიჯი
export async function markBadgesSeen(req, res, next) {
  try {
    const userId = req.user.id;

    // ჯერ ამოვიღოთ მომხმარებელი, რომ ვიცოდეთ რამდენი badges აქვს
    const current = await prisma.user.findUnique({
      where: { id: userId },
      select: { badges: true },
    });

    if (!current) {
      const err = new Error('User not found');
      err.status = 404;
      throw err;
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        lastSeenBadges: current.badges, // ვუტოლებთ ამჟამინდელ badges-ს
      },
    });

    res.json({
      success: true,
      badges: user.badges,
      lastSeenBadges: user.lastSeenBadges,
    });
  } catch (err) {
    next(err);
  }
}
