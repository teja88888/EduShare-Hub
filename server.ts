import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { app } from './backend/server.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FRONTEND_DIR = path.resolve(__dirname, 'frontend');

const PORT = Number(process.env.PORT) || 3000;

async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  // Explicitly ensure frontend files are served first before any fallback
  app.use(express.static(FRONTEND_DIR));

  if (!isProduction) {
    try {
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'custom'
      });
      app.use(vite.middlewares);
    } catch (e) {
      console.warn('Vite middleware initialization notice:', e);
    }
  }

  // Fallback for root: send register.html or dashboard
  app.get('/', (req, res) => {
    if (req.cookies && req.cookies.edushare_token) {
      return res.redirect('/dashboard.html');
    }
    return res.sendFile(path.join(FRONTEND_DIR, 'register.html'));
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`EduShare Hub server listening at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
