// import jwt from 'jsonwebtoken';
// import { ENV } from '../config/env.js';
// import { AppError } from '../utils/appError.js';
// import { asyncHandler } from '../utils/asyncHandler.js';
// import User from '../modules/auth/auth.model.js';

// export const protect = asyncHandler(async (req, res, next) => {
//   let token;

//   if (req.headers.authorization?.startsWith('Bearer')) {
//     token = req.headers.authorization.split(' ')[1];
//   }

//   if (!token) throw new AppError('Not authenticated. Please log in.', 401);

//   const decoded = jwt.verify(token, ENV.JWT_SECRET);
//   const user = await User.findById(decoded.id).select('-password');

//   if (!user) throw new AppError('User no longer exists.', 401);

//   req.user = user;
//   next();
// });
import { AppError } from '../utils/appError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const protect = asyncHandler(async (req, res, next) => {
  // ← JWT verification disabled for now
  next();
});