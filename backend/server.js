import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';

import authRoutes from './routes/auth.js';
import materialsRoutes from './routes/materials.js';
import profileRoutes from './routes/profile.js';
import { UPLOADS_DIR } from './config/db.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FRONTEND_DIR = path.resolve(__dirname, '../frontend');

export const app = express();

// Standard middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/materials', materialsRoutes);
app.use('/api/profile', profileRoutes);

// Static uploads (for thumbnails or downloads)
app.use('/uploads', express.static(UPLOADS_DIR));

// Serve Frontend Static Assets (CSS, JS, Assets)
app.use(express.static(FRONTEND_DIR));

// Direct page routes for clean navigation
app.get('/', (req, res) => {
  // If student is logged in with cookie, direct to dashboard
  if (req.cookies && req.cookies.edushare_token) {
    return res.redirect('/dashboard.html');
  }
  res.sendFile(path.join(FRONTEND_DIR, 'register.html'));
});

app.get('/register', (req, res) => {
  res.sendFile(path.join(FRONTEND_DIR, 'register.html'));
});

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(FRONTEND_DIR, 'dashboard.html'));
});

app.get('/upload', (req, res) => {
  res.sendFile(path.join(FRONTEND_DIR, 'upload.html'));
});

app.get('/materials', (req, res) => {
  res.sendFile(path.join(FRONTEND_DIR, 'materials.html'));
});

app.get('/profile', (req, res) => {
  res.sendFile(path.join(FRONTEND_DIR, 'profile.html'));
});

export default app;
