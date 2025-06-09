// utils/logger.js

const isDev = process.env.NODE_ENV !== "production";

function format(level, modulo, mensaje) {
  const timestamp = new Date().toISOString();
  return `[${timestamp}] [${level.toUpperCase()}] [${modulo}] ${mensaje}`;
}

const logger = {
  info(modulo, mensaje) {
    const texto = format("info", modulo, mensaje);
    if (isDev) {
      console.log("🔵", texto);
    } else {
      console.log(texto);
    }
  },

  warn(modulo, mensaje) {
    const texto = format("warn", modulo, mensaje);
    if (isDev) {
      console.warn("🟠", texto);
    } else {
      console.warn(texto);
    }
  },

  error(modulo, mensaje) {
    const texto = format("error", modulo, mensaje);
    if (isDev) {
      console.error("🔴", texto);
    } else {
      console.error(texto);
    }
  }
};

export default logger;
