import jwt from 'jsonwebtoken';
import { ENV } from '../../config/env.js';
import { AppError } from '../../utils/appError.js';
import User from './auth.model.js';

const signToken = (id) =>
  jwt.sign({ id }, ENV.JWT_SECRET, { expiresIn: ENV.JWT_EXPIRES_IN });

export const registerUser = async ({ name, email, mobile, password }) => {
  const existingEmail = await User.findOne({ email });
  if (existingEmail) throw new AppError('Email already registered', 409);

  const existingMobile = await User.findOne({ mobile });
  if (existingMobile) throw new AppError('Mobile number already registered', 409);

  const user = await User.create({
    name,
    email,
    mobile,
    password
  });

  return {
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      mobile: user.mobile,
      role: user.role
    }
  };
};

export const loginUser = async ({ email, password }) => {
  const user = await User.findOne({ email }).select('+password');

  if (!user || !(await user.comparePassword(password))) {
    throw new AppError('Invalid email or password', 401);
  }

  const token = signToken(user._id);

  return {
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      mobile: user.mobile,
      role: user.role
    }
  };
};

export const getMe = async (userId) =>
  User.findById(userId).select('-password');