import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { getDashboardSession } from './db.js';

const scrypt = promisify(scryptCallback);
export const DASHBOARD_SESSION_MS = 8 * 60 * 60 * 1000;
export const SESSION_COOKIE = 'dashboard_session';

export const hashPassword = async (password, salt = randomBytes(16).toString('hex')) => {
  const derived = await scrypt(password, salt, 64);
  return { passwordHash: derived.toString('hex'), passwordSalt: salt };
};

export const verifyPassword = async (password, user) => {
  const actual = await scrypt(password, user.passwordSalt, 64);
  const expected = Buffer.from(user.passwordHash, 'hex');
  return expected.length === actual.length && timingSafeEqual(expected, actual);
};

export const hashSessionToken = (token) => createHash('sha256').update(token).digest('hex');

export const readSessionToken = (req) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }
  const cookies = (req.headers.cookie || '').split(';');
  const sessionCookie = cookies.find((part) => part.trim().startsWith(`${SESSION_COOKIE}=`));
  return sessionCookie ? decodeURIComponent(sessionCookie.trim().slice(SESSION_COOKIE.length + 1)) : '';
};

export const requireDashboardUser = (roles = []) => (req, res, next) => {
  const token = readSessionToken(req);
  const entry = token ? getDashboardSession(hashSessionToken(token)) : null;
  if (!entry) return res.status(401).json({ message: 'Please sign in to access this resource.' });
  if (roles.length && !roles.includes(entry.user.role)) {
    return res.status(403).json({ message: 'You do not have permission to perform this action.' });
  }
  req.dashboardUser = entry.user;
  req.user = entry.user;
  req.dashboardSession = entry.session;
  return next();
};

export const optionalUser = () => (req, _res, next) => {
  const token = readSessionToken(req);
  const entry = token ? getDashboardSession(hashSessionToken(token)) : null;
  if (entry) {
    req.dashboardUser = entry.user;
    req.user = entry.user;
    req.dashboardSession = entry.session;
  }
  return next();
};

export const requireDashboardOrigin = (req, res, next) => {
  const origin = req.get('origin');
  if (!origin) {
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      return res.status(403).json({ message: 'A request origin is required for this operation.' });
    }
    return next();
  }

  const allowedOrigin = process.env.DASHBOARD_ORIGIN;
  const isDevelopmentOrigin = process.env.NODE_ENV !== 'production' &&
    /^http:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?$/.test(origin);
  if (allowedOrigin ? origin !== allowedOrigin : !isDevelopmentOrigin) {
    return res.status(403).json({ message: 'Request origin is not permitted.' });
  }
  return next();
};

export const setSessionCookie = (res, token) => {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader('Set-Cookie', `${SESSION_COOKIE}=${encodeURIComponent(token)}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${DASHBOARD_SESSION_MS / 1000}${secure}`);
};

export const clearSessionCookie = (res) => {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader('Set-Cookie', [
    `${SESSION_COOKIE}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0${secure}`,
    `${SESSION_COOKIE}=; HttpOnly; SameSite=Strict; Path=/api/dashboard; Max-Age=0${secure}`,
  ]);
};
