import express from 'express';
import bcrypt from 'bcryptjs';
import { Student } from '../models/Student.js';
import { Material } from '../models/Material.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// GET /api/profile
// Fetches the current logged in student's profile & their own uploaded materials
router.get('/', requireAuth, async (req, res) => {
  try {
    const student = req.student;
    
    // Find all materials uploaded by this student
    const rawMyMaterials = await Material.find({ uploadedBy: student._id });
    
    // Calculate total downloads received across all uploads
    const totalDownloadsReceived = rawMyMaterials.reduce((acc, curr) => acc + (curr.downloads || 0), 0);

    const myMaterials = rawMyMaterials.map(m => Material.toOwnerJSON(m));

    return res.json({
      success: true,
      profile: {
        id: student._id,
        name: student.name,
        college: student.college,
        rollNumber: student.rollNumber || 'Not specified',
        email: student.email,
        department: student.department || 'Not specified',
        createdAt: student.createdAt,
        stats: {
          totalUploads: myMaterials.length,
          totalDownloadsReceived
        }
      },
      materials: myMaterials
    });
  } catch (err) {
    console.error('Profile fetch error:', err);
    return res.status(500).json({ success: false, error: 'Could not fetch student profile.' });
  }
});

// PUT /api/profile
// Update student profile details
router.put('/', requireAuth, async (req, res) => {
  try {
    const { name, department, rollNumber, college } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: 'Name cannot be empty.' });
    }

    const updated = await Student.updateProfile(req.student._id, {
      name: name.trim(),
      department: department ? department.trim() : req.student.department,
      rollNumber: rollNumber ? rollNumber.trim() : req.student.rollNumber,
      college: college ? college.trim() : req.student.college
    });

    return res.json({
      success: true,
      message: 'Profile updated successfully!',
      student: Student.toSafeJSON(updated)
    });
  } catch (err) {
    console.error('Update profile error:', err);
    return res.status(500).json({ success: false, error: 'Could not update profile.' });
  }
});

// PUT /api/profile/password
// Change student password
router.put('/password', requireAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Please provide both your current password and a new password.'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'New password must be at least 6 characters long.'
      });
    }

    if (confirmPassword && newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        error: 'New passwords do not match.'
      });
    }

    // Verify current password
    const student = await Student.findById(req.student._id);
    const isMatch = await bcrypt.compare(currentPassword, student.passwordHash);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Incorrect current password. Please try again.'
      });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    await Student.updateProfile(student._id, { passwordHash });

    return res.json({
      success: true,
      message: 'Password changed successfully.'
    });
  } catch (err) {
    console.error('Password change error:', err);
    return res.status(500).json({ success: false, error: 'Failed to update password.' });
  }
});

export default router;
