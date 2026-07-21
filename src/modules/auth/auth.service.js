import jwt from 'jsonwebtoken';
import { ENV } from '../../config/env.js';
import { AppError } from '../../utils/appError.js';
import User from './auth.model.js';

const signToken = (id) =>
  jwt.sign({ id }, ENV.JWT_SECRET, { expiresIn: ENV.JWT_EXPIRES_IN });

export const registerUser = async ({ name, mobile, password }) => {
  const existingMobile = await User.findOne({ mobile });
  if (existingMobile) throw new AppError('Mobile number already registered', 409);

  const user = await User.create({ name, mobile, password });

  return {
    user: {
      id: user._id,
      name: user.name,
      mobile: user.mobile,
      role: user.role
    }
  };
};

export const loginUser = async ({ mobile, password }) => {
  const user = await User.findOne({ mobile }).select('+password');
  if (!user || !(await user.comparePassword(password))) {
    throw new AppError('Invalid mobile number or password', 401);
  }

  const token = signToken(user._id);
  return {
    token,
    user: {
      id: user._id,
      name: user.name,
      mobile: user.mobile,
      role: user.role
    }
  };
};

export const getMe = async (userId) =>
  User.findById(userId).select('-password');