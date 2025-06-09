// utils/withErrorHandling.js
module.exports = (fn) => async (req, res) => {
  try {
    await fn(req, res);
  } catch (err) {
    console.error("🔥 Error en endpoint:", err);
    res.status(500).json({ success: false, error: err.message || 'Error interno' });
  }
};
