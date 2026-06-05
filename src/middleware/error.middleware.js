import { AppError } from '../utils/appError.js';
import logger from '../utils/logger.js';
import { ENV } from '../config/env.js';

const handleCastError = (err) =>
  new AppError(`Invalid ${err.path}: ${err.value}`, 400);

const handleDuplicateKey = (err) => {
  const field = Object.keys(err.keyValue)[0];
  return new AppError(`${field} already exists`, 409);
};

const handleValidationError = (err) => {
  const messages = Object.values(err.errors).map(e => e.message);
  return new AppError(`Validation failed: ${messages.join('. ')}`, 400);
};

const handleJWTError = () =>
  new AppError('Invalid token. Please log in again.', 401);

const handleJWTExpired = () =>
  new AppError('Token expired. Please log in again.', 401);

export const errorMiddleware = (err, req, res, next) => {
  let error = { ...err, message: err.message };

  if (err.name === 'CastError')            error = handleCastError(err);
  if (err.code === 11000)                  error = handleDuplicateKey(err);
  if (err.name === 'ValidationError')      error = handleValidationError(err);
  if (err.name === 'JsonWebTokenError')    error = handleJWTError();
  if (err.name === 'TokenExpiredError')    error = handleJWTExpired();

  const statusCode = error.statusCode || 500;
  const message    = error.message    || 'Internal Server Error';

  logger.error(`${statusCode} — ${message} — ${req.originalUrl}`);

  res.status(statusCode).json({
    success: false,
    message,
    ...(ENV.NODE_ENV === 'development' && { stack: err.stack }),
  });
};