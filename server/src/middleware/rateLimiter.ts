import rateLimit from 'express-rate-limit';

export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // limit each IP to 300 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again after 15 minutes.',
  },
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20, // max 20 login/register attempts per 15 mins
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts. Please try again after 15 minutes.',
  },
});

export const examSaveLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 120, // allows frequent autosave without blocking real answers
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Autosave rate limit reached. Please wait a moment.',
  },
});
