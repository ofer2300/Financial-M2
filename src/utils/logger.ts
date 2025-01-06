import winston from 'winston';

// הגדרות פורמט
const logFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// יצירת Logger
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { service: 'video-conference' },
  transports: [
    // כתיבה לקובץ עבור כל הרמות
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    new winston.transports.File({
      filename: 'logs/combined.log',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  ]
});

// הוספת כתיבה לקונסול בסביבת פיתוח
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

// פונקציות עזר
export const logError = (error: Error, context?: object) => {
  logger.error({
    message: error.message,
    stack: error.stack,
    ...context
  });
};

export const logInfo = (message: string, context?: object) => {
  logger.info({
    message,
    ...context
  });
};

export const logWarning = (message: string, context?: object) => {
  logger.warn({
    message,
    ...context
  });
};

export const logDebug = (message: string, context?: object) => {
  logger.debug({
    message,
    ...context
  });
}; 