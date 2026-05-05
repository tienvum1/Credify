const cache = new Map();

/**
 * Đặt dữ liệu vào cache với thời gian sống (TTL)
 * @param {string} key 
 * @param {any} value 
 * @param {number} ttl - miliseconds
 */
exports.set = (key, value, ttl = 60000) => {
  const expiresAt = Date.now() + ttl;
  cache.set(key, { value, expiresAt });
};

/**
 * Lấy dữ liệu từ cache
 * @param {string} key 
 * @returns {any | null}
 */
exports.get = (key) => {
  const data = cache.get(key);
  if (!data) return null;
  
  if (Date.now() > data.expiresAt) {
    cache.delete(key);
    return null;
  }
  
  return data.value;
};

/**
 * Xóa cache theo key
 * @param {string} key 
 */
exports.del = (key) => {
  cache.delete(key);
};

/**
 * Xóa cache theo prefix (ví dụ: 'bookings:*')
 * @param {string} prefix 
 */
exports.delByPrefix = (prefix) => {
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) {
      cache.delete(key);
    }
  }
};
