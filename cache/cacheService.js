const NodeCache = require('node-cache');
const logger = require('../utils/logger'); // Ajusta la ruta según tu estructura

const cache = new NodeCache({
  stdTTL: 600, // 10 minutos TTL
  checkperiod: 120 // Verifica entradas expiradas cada 2 minutos
});

async function get(key) {
  try {
    const value = cache.get(key);
    logger.debug('cache', `Consultando caché para clave: ${key}`, { found: value !== undefined });
    return value;
  } catch (error) {
    logger.error('cache', `Error al obtener clave ${key} del caché:`, error.message);
    return undefined;
  }
}

async function set(key, value) {
  try {
    const success = cache.set(key, value);
    logger.debug('cache', `Guardando en caché para clave: ${key}`, { success });
    return success;
  } catch (error) {
    logger.error('cache', `Error al guardar clave ${key} en caché:`, error.message);
    return false;
  }
}

module.exports = { get, set };