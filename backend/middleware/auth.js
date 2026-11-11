import jwt from 'jsonwebtoken';
import { Student } from '../models/Student.js';

const JWT_SECRET = process.env.JWT_SECRET || 'edushare-hub-super-secure-jwt-secret-key-2026';

export function generateToken(student) {
  return jwt.sign(
    {
      id: student._id,
      email: student.email,
      college: student.college
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

export async function requireAuth(req, res, next) {
  try {
    let token = null;

    // Check Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.cookies && req.cookies.edushare_token) {
      token = req.cookies.edushare_token;
    } else if (req.query && req.query.token) {
      // Allow download/preview links with ?token=...
      token = req.query.token;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required. Please log in.'
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const student = await Student.findById(decoded.id);

    if (!student) {
      return res.status(401).json({
        success: false,
        error: 'Student session invalid or student not found. Please log in again.'
      });
    }

    req.student = student;
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired session. Please log in again.'
    });
  }
}
