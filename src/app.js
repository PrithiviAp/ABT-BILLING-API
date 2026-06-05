import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';
import mongoSanitize from 'express-mongo-sanitize';

import { ENV } from './config/env.js';
import { connectDB } from './config/db.js';

import { errorMiddleware } from './middleware/error.middleware.js';
import { apiLimiter } from './middleware/rateLimiter.middleware.js';

import logger from './utils/logger.js';

import appRoutes from './app.routes.js';

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: ENV.ALLOWED_ORIGIN,
    credentials: true,
  })
);

app.use(mongoSanitize());
app.use(compression());


app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (ENV.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

app.use('/api', apiLimiter);

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'ABT Billing API',
    timestamp: new Date(),
  });
});

app.use('/api/v1', appRoutes);

app.all('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
  });
});

app.use(errorMiddleware);

connectDB().then(() => {
  app.listen(ENV.PORT, () => {
    logger.info(
      `🚀 ABT API running on port ${ENV.PORT} [${ENV.NODE_ENV}]`
    );
  });
});

export default app;