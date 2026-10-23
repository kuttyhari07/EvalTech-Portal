import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { sendError } from '../utils/response';
import { config } from '../config/env';

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  console.error('[Error]', {
    path: req.path,
    method: req.method,
    message: err.message,
    stack: config.NODE_ENV === 'development' ? err.stack : undefined,
  });

  // Zod Validation Error
  if (err instanceof ZodError) {
    const formatted = err.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));
    sendError(res, 'Validation failed', 422, formatted);
    return;
  }

  // Mongoose Duplicate Key Error (11000)
  if (err.code === 11000) {
    const keys = Object.keys(err.keyPattern || {});
    sendError(res, `Duplicate entry for ${keys.join(', ')}. Must be unique.`, 409);
    return;
  }

  // Mongoose CastError (Invalid ObjectId)
  if (err.name === 'CastError') {
    sendError(res, `Invalid resource identifier: ${err.value}`, 400);
    return;
  }

  // JWT Errors
  if (err.name === 'JsonWebTokenError') {
    sendError(res, 'Malformed or invalid authentication token', 401);
    return;
  }
  if (err.name === 'TokenExpiredError') {
    sendError(res, 'Authentication token has expired', 401);
    return;
  }

  const statusCode = err.statusCode || 500;
  const message = err.isOperational ? err.message : 'Internal server error occurred';
  sendError(res, message, statusCode);
}
