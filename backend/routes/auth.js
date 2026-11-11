import express from 'express';
import bcrypt from 'bcryptjs';
import { Student } from '../models/Student.js';
import { generateToken, requireAuth } from '../middleware/auth.js';

const router = express.Router();

// Helper to set cookie
function setAuthCookie(res, token) {
  res.cookie('edushare_token', token, {
    httpOnly: false, // Accessible to script.js for SPA header sync while also sent with requests
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, college, rollNumber, email, password, confirmPassword, department } = req.body;

    // Basic validation
    if (!name || !college || !email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Please fill in all required fields (Name, College, Email, and Password).'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 6 characters long.'
      });
    }

    if (confirmPassword && password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        error: 'Passwords do not match.'
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'Please enter a valid email address.'
      });
    }

    // Check duplicate email
    const existing = await Student.findByEmail(email);
    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'An account with this email address already exists. Please log in.'
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Save student
    const student = await Student.create({
      name,
      college,
      rollNumber: rollNumber || '',
      email,
      passwordHash,
      department: department || 'Computer Science & Engineering'
    });

    const token = generateToken(student);
    setAuthCookie(res, token);

    return res.status(201).json({
      success: true,
      message: 'Account created successfully! Welcome to EduShare Hub.',
      token,
      student: Student.toSafeJSON(student)
    });
  } catch (err) {
    console.error('Registration error:', err);
    return res.status(500).json({
      success: false,
      error: 'Registration failed due to server error. Please try again.'
    });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Please provide both email and password.'
      });
    }

    const student = await Student.findByEmail(email);
    if (!student) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password. Please check your credentials.'
      });
    }

    const isMatch = await bcrypt.compare(password, student.passwordHash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password. Please check your credentials.'
      });
    }

    const token = generateToken(student);
    setAuthCookie(res, token);

    return res.json({
      success: true,
      message: 'Login successful!',
      token,
      student: Student.toSafeJSON(student)
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({
      success: false,
      error: 'Login failed due to a server error. Please try again.'
    });
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  res.clearCookie('edushare_token');
  return res.json({
    success: true,
    message: 'Logged out successfully.'
  });
});

// GET /api/auth/me
router.get('/me', requireAuth, (req, res) => {
  return res.json({
    success: true,
    student: Student.toSafeJSON(req.student)
  });
});

export default router;
