import dotenv from 'dotenv';
dotenv.config();

export const ENV = {
  PORT:          process.env.PORT          || 5000,
  NODE_ENV:      process.env.NODE_ENV      || 'development',
  MONGO_URI:     process.env.MONGO_URI     || 'mongodb://localhost:27017/abt_billing',
  JWT_SECRET:    process.env.JWT_SECRET    || 'change_this_secret',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  ALLOWED_ORIGIN: process.env.ALLOWED_ORIGIN || 'http://localhost:4200',
};