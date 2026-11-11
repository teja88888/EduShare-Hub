import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Material } from '../models/Material.js';
import { requireAuth } from '../middleware/auth.js';
import { UPLOADS_DIR } from '../config/db.js';

const router = express.Router();

// Configure Multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOADS_DIR);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname).toLowerCase() || '.pdf';
    cb(null, 'edu-' + uniqueSuffix + ext);
  }
});

// PDF filter and size limit (25MB)
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 25 * 1024 * 1024 // 25 MB
  },
  fileFilter: function (req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext !== '.pdf' && file.mimetype !== 'application/pdf') {
      return cb(new Error('Only PDF files (.pdf) are allowed for upload.'));
    }
    cb(null, true);
  }
});

// POST /api/materials/upload
// Requires auth. College name is strictly retrieved from student's profile.
router.post('/upload', requireAuth, (req, res) => {
  upload.single('pdfFile')(req, res, async function (err) {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          error: 'File size exceeds maximum limit of 25MB. Please upload a smaller PDF.'
        });
      }
      return res.status(400).json({ success: false, error: err.message });
    } else if (err) {
      return res.status(400).json({ success: false, error: err.message });
    }

    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'Please select a valid PDF file to upload.'
        });
      }

      const { title, subject, semester, department } = req.body;

      if (!title || !subject || !semester || !department) {
        // Remove uploaded file if validation fails
        if (req.file && fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
        return res.status(400).json({
          success: false,
          error: 'Please fill in all material details (Title, Subject, Semester, and Department).'
        });
      }

      // STRICT SECURITY REQUIREMENT:
      // Never trust college name from frontend form.
      // Always extract verified college from logged-in student database record.
      const verifiedCollege = req.student.college;

      const newMaterial = await Material.create({
        title,
        subject,
        semester,
        department,
        collegeName: verifiedCollege,
        filePath: req.file.path,
        fileName: req.file.filename,
        originalFileName: req.file.originalname,
        fileSize: req.file.size,
        uploadedBy: req.student._id // strictly internal reference
      });

      return res.status(201).json({
        success: true,
        message: 'Study material uploaded successfully!',
        material: Material.toPublicJSON(newMaterial)
      });
    } catch (dbErr) {
      console.error('Material upload error:', dbErr);
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(500).json({
        success: false,
        error: 'Failed to save study material. Please try again.'
      });
    }
  });
});

// GET /api/materials/stats
// Return live stats for dashboard and library
router.get('/stats', requireAuth, async (req, res) => {
  try {
    const totalMaterials = await Material.count({});
    const myUploads = await Material.count({ uploadedBy: req.student._id });
    const colleges = await Material.distinct('collegeName');
    
    // Recent 5 materials with privacy preserved
    const rawRecent = await Material.find({}, { sort: { uploadDate: -1 } });
    const recentMaterials = rawRecent.slice(0, 5).map(m => Material.toPublicJSON(m));

    return res.json({
      success: true,
      stats: {
        totalMaterials,
        myUploads,
        totalColleges: colleges.length,
        studentName: req.student.name,
        studentCollege: req.student.college
      },
      recentMaterials
    });
  } catch (err) {
    console.error('Stats error:', err);
    return res.status(500).json({ success: false, error: 'Could not fetch platform statistics.' });
  }
});

// GET /api/materials/filters
// Return list of available colleges and subjects for dynamic filter dropdowns
router.get('/filters', async (req, res) => {
  try {
    const colleges = await Material.distinct('collegeName');
    const subjects = await Material.distinct('subject');
    const departments = await Material.distinct('department');
    return res.json({
      success: true,
      colleges: colleges.sort(),
      subjects: subjects.sort(),
      departments: departments.sort()
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Failed to load filter options.' });
  }
});

// GET /api/materials
// Public materials library listing with search, filtering, and sorting
// Privacy constraint: uploadedBy is omitted completely!
router.get('/', async (req, res) => {
  try {
    const { search, subject, semester, college, department, sort } = req.query;

    let filter = {};

    if (subject && subject !== 'all') {
      filter.subject = subject;
    }
    if (semester && semester !== 'all') {
      filter.semester = semester;
    }
    if (college && college !== 'all') {
      filter.collegeName = college;
    }
    if (department && department !== 'all') {
      filter.department = department;
    }

    let materials = await Material.find(filter);

    // Keyword search over title, subject, college, department
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      materials = materials.filter(m =>
        (m.title && m.title.toLowerCase().includes(q)) ||
        (m.subject && m.subject.toLowerCase().includes(q)) ||
        (m.collegeName && m.collegeName.toLowerCase().includes(q)) ||
        (m.department && m.department.toLowerCase().includes(q))
      );
    }

    // Sort order
    if (sort === 'oldest') {
      materials.sort((a, b) => new Date(a.uploadDate) - new Date(b.uploadDate));
    } else if (sort === 'title') {
      materials.sort((a, b) => a.title.localeCompare(b.title));
    } else if (sort === 'downloads') {
      materials.sort((a, b) => (b.downloads || 0) - (a.downloads || 0));
    } else {
      // Default: latest uploads first
      materials.sort((a, b) => new Date(b.uploadDate) - new Date(a.uploadDate));
    }

    // STRICT PRIVACY: strip uploadedBy from all materials
    const publicList = materials.map(m => Material.toPublicJSON(m));

    return res.json({
      success: true,
      count: publicList.length,
      materials: publicList
    });
  } catch (err) {
    console.error('Get materials error:', err);
    return res.status(500).json({ success: false, error: 'Failed to retrieve study materials.' });
  }
});

// GET /api/materials/:id
// Single material details (safe, no uploader identity)
router.get('/:id', async (req, res) => {
  try {
    const material = await Material.findById(req.params.id);
    if (!material) {
      return res.status(404).json({ success: false, error: 'Material not found.' });
    }
    return res.json({
      success: true,
      material: Material.toPublicJSON(material)
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Failed to retrieve material details.' });
  }
});

// GET /api/materials/:id/download
// Download PDF file & increment download count
router.get('/:id/download', async (req, res) => {
  try {
    const material = await Material.findById(req.params.id);
    if (!material) {
      return res.status(404).send('Material not found.');
    }

    const filePath = material.filePath;
    if (!filePath || !fs.existsSync(filePath)) {
      return res.status(404).send('The requested PDF file is not available on disk.');
    }

    // Increment download count
    await Material.incrementDownload(req.params.id);

    const safeName = (material.originalFileName || `${material.title}.pdf`).replace(/[^\w.-]/g, '_');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}"`);

    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  } catch (err) {
    console.error('Download error:', err);
    res.status(500).send('Error downloading file.');
  }
});

// GET /api/materials/:id/view
// Inline preview PDF in modal or new tab
router.get('/:id/view', async (req, res) => {
  try {
    const material = await Material.findById(req.params.id);
    if (!material) {
      return res.status(404).send('Material not found.');
    }

    const filePath = material.filePath;
    if (!filePath || !fs.existsSync(filePath)) {
      return res.status(404).send('The requested PDF file is not available for preview.');
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline');
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  } catch (err) {
    console.error('Preview error:', err);
    res.status(500).send('Error displaying file preview.');
  }
});

// DELETE /api/materials/:id
// Ownership verification: Only the student who uploaded the file can delete it!
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const materialId = req.params.id;
    const studentId = req.student._id;

    const result = await Material.deleteByIdAndOwner(materialId, studentId);

    if (!result.success) {
      if (result.reason === 'not_found') {
        return res.status(404).json({ success: false, error: 'Study material not found.' });
      }
      if (result.reason === 'unauthorized') {
        return res.status(403).json({
          success: false,
          error: 'Unauthorized: You can only delete materials that you uploaded.'
        });
      }
      return res.status(400).json({ success: false, error: 'Could not delete study material.' });
    }

    return res.json({
      success: true,
      message: 'Study material deleted successfully from EduShare Hub.'
    });
  } catch (err) {
    console.error('Delete material error:', err);
    return res.status(500).json({ success: false, error: 'Server error while deleting material.' });
  }
});

export default router;
