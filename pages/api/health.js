// pages/api/health.js
export default function handler(req, res) {
  if (req.method === 'GET') {
    res.status(200).json({
      status: 'ok',
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString(),
    });
  } else {
    res.status(405).json({
      status: 'error',
      error: 'Método no permitido, usa GET',
      timestamp: new Date().toISOString(),
    });
  }
}