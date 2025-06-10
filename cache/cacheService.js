// cache/cacheService.js
const NodeCache = require('node-cache');
const cache = new NodeCache({ stdTTL: 600 }); // 10 minutos TTL

async function get(key) {
  return cache.get(key);
}

async function set(key, value) {
  return cache.set(key, value);
}

module.exports = { get, set };