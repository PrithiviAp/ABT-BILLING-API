import { validationResult } from 'express-validator';
import { AppError } from '../utils/appError.js';

export const validate = (rules) => [
  ...rules,          
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const message = errors.array().map(e => e.msg).join('. ');
      return next(new AppError(message, 422));
    }
    next();
  }
];