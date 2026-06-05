import winston from 'winston';
import { ENV } from '../config/env.js';

const { combine, timestamp, colorize, printf, json } = winston.format;

const devFormat = combine(
  colorize(),
  timestamp({ format: 'HH:mm:ss' }),
  printf(({ level, message, timestamp }) =>
    `[${timestamp}] ${level}: ${message}`)
);

const prodFormat = combine(timestamp(), json());

const logger = winston.createLogger({
  level: ENV.NODE_ENV === 'production' ? 'warn' : 'debug',
  format: ENV.NODE_ENV === 'production' ? prodFormat : devFormat,
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/error.log',  level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
});

export default logger;