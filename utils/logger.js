// utils/logger.js
const winston = require('winston');
const path = require('path');
const fs = require('fs');

const isDev = process.env.NODE_ENV !== 'production';

// Verificar que el directorio logs existe
const logDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json(),
    winston.format.printf(({ timestamp, level, message, modulo }) => {
      const formatted = `[timestamp: ${timestamp}] [${level.toUpperCase()}] [${modulo}] ${message}`;
      return isDev ? `${level === 'info' ? '🔵' : level === 'warn' ? '🟠' : '🔴'} ${formatted}` : formatted;
    })
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: path.join(logDir, 'error.log'), level: 'error' }),
    new winston.transports.File({ filename: path.join(logDir, 'combined.log') }),
  ],
});

// Log inicial para confirmar carga
logger.info("logger", `Logger inicializado. Directorio de logs: ${logDir}`);

module.exports = {
  info: (modulo, mensaje) => logger.info(mensaje, { modulo }),
  warn: (modulo, mensaje) => logger.warn(mensaje, { modulo }),
  error: (modulo, mensaje, stack) => logger.error(mensaje, { modulo, stack }),
};