import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../data');
const DB_FILE = path.join(DATA_DIR, 'edushare.json');
const UPLOADS_DIR = path.resolve(__dirname, '../uploads');

// Ensure directories exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Minimal valid PDF generator for real sample files
function createSamplePdf(title, college, subject, semester, department) {
  const content = `BT /F1 20 Tf 50 720 Td (EduShare Hub - Study Material) Tj ET
BT /F1 14 Tf 50 680 Td (Title: ${title}) Tj ET
BT /F1 12 Tf 50 650 Td (Subject: ${subject} | Semester: ${semester}) Tj ET
BT /F1 12 Tf 50 625 Td (Department: ${department}) Tj ET
BT /F1 12 Tf 50 600 Td (College: ${college}) Tj ET
BT /F1 10 Tf 50 560 Td (Privacy Protected: Uploader personal details are confidential.) Tj ET
BT /F1 11 Tf 50 520 Td (Summary & Key Concepts:) Tj ET
BT /F1 10 Tf 50 495 Td (1. Comprehensive lecture notes, definitions, and code patterns.) Tj ET
BT /F1 10 Tf 50 475 Td (2. University syllabus revision questions and problem solutions.) Tj ET
BT /F1 10 Tf 50 455 Td (3. Verified educational reference shared by students.) Tj ET
BT /F1 9 Tf 50 100 Td (EduShare Hub Platform - Verified Academic Resource) Tj ET`;

  const streamLength = Buffer.byteLength(content, 'utf8');

  return `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>
endobj
4 0 obj
<< /Length ${streamLength} >>
stream
${content}
endstream
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000244 00000 n 
0000000300 00000 n 
trailer
<< /Size 6 /Root 1 0 R >>
startxref
390
%%EOF`;
}

// In-memory cache + file sync
let dbData = {
  students: [],
  materials: []
};

// Seed sample data
function seedInitialData() {
  const samplePdfs = [
    {
      title: "Java Programming Notes",
      subject: "Java",
      semester: "3-1",
      department: "Computer Science & Engineering",
      collegeName: "PSCMRCET",
      fileName: "sample-java-notes.pdf",
      originalFileName: "Java_Full_Notes_Unit1_to_Unit5.pdf",
      fileSize: 2457600, // ~2.4 MB
      downloads: 48,
      uploadDate: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      title: "Python Basics",
      subject: "Python",
      semester: "1-2",
      department: "Information Technology",
      collegeName: "ABC Engineering College",
      fileName: "sample-python-basics.pdf",
      originalFileName: "Python_Programming_Basics_Notes.pdf",
      fileSize: 1843200, // ~1.8 MB
      downloads: 32,
      uploadDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      title: "DBMS Notes",
      subject: "DBMS",
      semester: "2-2",
      department: "Computer Science & Engineering",
      collegeName: "XYZ Engineering College",
      fileName: "sample-dbms-notes.pdf",
      originalFileName: "Database_Management_Systems_Complete.pdf",
      fileSize: 3145728, // ~3.0 MB
      downloads: 65,
      uploadDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      title: "Computer Networks Notes",
      subject: "Computer Networks",
      semester: "3-2",
      department: "Electronics & Communication Engineering",
      collegeName: "PSCMRCET",
      fileName: "sample-cn-notes.pdf",
      originalFileName: "Computer_Networks_OSI_TCP_IP.pdf",
      fileSize: 2621440, // ~2.5 MB
      downloads: 27,
      uploadDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      title: "Operating Systems Notes",
      subject: "Operating Systems",
      semester: "3-1",
      department: "Computer Science & Engineering",
      collegeName: "ABC Engineering College",
      fileName: "sample-os-notes.pdf",
      originalFileName: "Operating_Systems_Process_Memory_Notes.pdf",
      fileSize: 2097152, // ~2.0 MB
      downloads: 41,
      uploadDate: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString()
    }
  ];

  // Write demo PDF files if not present
  samplePdfs.forEach(sample => {
    const filePath = path.join(UPLOADS_DIR, sample.fileName);
    if (!fs.existsSync(filePath)) {
      const pdfContent = createSamplePdf(
        sample.title,
        sample.collegeName,
        sample.subject,
        sample.semester,
        sample.department
      );
      fs.writeFileSync(filePath, pdfContent, 'utf8');
    }
  });

  // Populate sample materials if none exist
  if (!dbData.materials || dbData.materials.length === 0) {
    dbData.materials = samplePdfs.map((sample, idx) => ({
      _id: `demo-mat-${idx + 1}`,
      title: sample.title,
      subject: sample.subject,
      semester: sample.semester,
      department: sample.department,
      collegeName: sample.collegeName,
      filePath: path.join(UPLOADS_DIR, sample.fileName),
      fileName: sample.fileName,
      originalFileName: sample.originalFileName,
      fileSize: sample.fileSize,
      downloads: sample.downloads,
      isDemo: true,
      uploadedBy: `demo-student-${sample.collegeName.toLowerCase().replace(/\s+/g, '')}`,
      uploadDate: sample.uploadDate
    }));
    saveDb();
  }
}

// Load DB from disk
function loadDb() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      dbData = JSON.parse(raw);
      if (!Array.isArray(dbData.students)) dbData.students = [];
      if (!Array.isArray(dbData.materials)) dbData.materials = [];
    } else {
      dbData = { students: [], materials: [] };
      saveDb();
    }
  } catch (err) {
    console.error('Error reading db.json, initializing fresh store:', err);
    dbData = { students: [], materials: [] };
  }
  seedInitialData();
}

// Save DB to disk
export function saveDb() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(dbData, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving db.json:', err);
  }
}

// Initialize on import
loadDb();

export const db = {
  students: {
    find: (filter = {}) => {
      return dbData.students.filter(item => matchFilter(item, filter));
    },
    findOne: (filter = {}) => {
      return dbData.students.find(item => matchFilter(item, filter)) || null;
    },
    findById: (id) => {
      return dbData.students.find(item => item._id === id || item.id === id) || null;
    },
    create: (data) => {
      const doc = {
        _id: 'std_' + Math.random().toString(36).substring(2, 11) + Date.now().toString(36),
        ...data,
        createdAt: data.createdAt || new Date().toISOString()
      };
      dbData.students.push(doc);
      saveDb();
      return { ...doc };
    },
    updateOne: (filter, update) => {
      const student = dbData.students.find(item => matchFilter(item, filter));
      if (!student) return false;
      const updates = update.$set ? update.$set : update;
      Object.assign(student, updates, { updatedAt: new Date().toISOString() });
      saveDb();
      return true;
    },
    findByIdAndUpdate: (id, updates) => {
      const student = dbData.students.find(item => item._id === id || item.id === id);
      if (!student) return null;
      Object.assign(student, updates, { updatedAt: new Date().toISOString() });
      saveDb();
      return { ...student };
    },
    count: (filter = {}) => {
      return dbData.students.filter(item => matchFilter(item, filter)).length;
    }
  },
  materials: {
    find: (filter = {}, options = {}) => {
      let list = dbData.materials.filter(item => matchFilter(item, filter));
      if (options.sort) {
        const sortKey = Object.keys(options.sort)[0];
        const dir = options.sort[sortKey];
        list.sort((a, b) => {
          if (a[sortKey] < b[sortKey]) return dir === 1 ? -1 : 1;
          if (a[sortKey] > b[sortKey]) return dir === 1 ? 1 : -1;
          return 0;
        });
      }
      return list;
    },
    findOne: (filter = {}) => {
      return dbData.materials.find(item => matchFilter(item, filter)) || null;
    },
    findById: (id) => {
      return dbData.materials.find(item => item._id === id || item.id === id) || null;
    },
    create: (data) => {
      const doc = {
        _id: 'mat_' + Math.random().toString(36).substring(2, 11) + Date.now().toString(36),
        downloads: 0,
        ...data,
        uploadDate: data.uploadDate || new Date().toISOString()
      };
      dbData.materials.push(doc);
      saveDb();
      return { ...doc };
    },
    findByIdAndUpdate: (id, updates) => {
      const mat = dbData.materials.find(item => item._id === id || item.id === id);
      if (!mat) return null;
      Object.assign(mat, updates);
      saveDb();
      return { ...mat };
    },
    deleteOne: (filter = {}) => {
      const idx = dbData.materials.findIndex(item => matchFilter(item, filter));
      if (idx === -1) return false;
      const [removed] = dbData.materials.splice(idx, 1);
      // Clean up physical file if not demo
      if (removed && removed.filePath && !removed.isDemo) {
        try {
          if (fs.existsSync(removed.filePath)) {
            fs.unlinkSync(removed.filePath);
          }
        } catch (e) {
          console.warn('Could not remove file:', removed.filePath);
        }
      }
      saveDb();
      return true;
    },
    count: (filter = {}) => {
      return dbData.materials.filter(item => matchFilter(item, filter)).length;
    },
    distinct: (field) => {
      const values = new Set();
      dbData.materials.forEach(item => {
        if (item[field]) values.add(item[field]);
      });
      return Array.from(values);
    }
  }
};

function matchFilter(item, filter) {
  for (const key of Object.keys(filter)) {
    if (key === '$or' && Array.isArray(filter.$or)) {
      const matched = filter.$or.some(subFilter => matchFilter(item, subFilter));
      if (!matched) return false;
      continue;
    }
    const target = filter[key];
    if (target instanceof RegExp) {
      if (!target.test(String(item[key] || ''))) return false;
    } else if (typeof target === 'object' && target !== null) {
      if (target.$regex) {
        const regex = new RegExp(target.$regex, target.$options || '');
        if (!regex.test(String(item[key] || ''))) return false;
      } else if (target.$ne !== undefined) {
        if (item[key] === target.$ne) return false;
      }
    } else {
      if (item[key] !== target) return false;
    }
  }
  return true;
}

export { UPLOADS_DIR };
