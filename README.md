# 🎓 EduShare Hub – Student Knowledge Sharing Platform

> **EduShare Hub** is an academic knowledge-sharing and resource-exchange platform tailored for university and engineering students. Students can register, upload study materials (handwritten notes, syllabus summaries, question banks, lab records), and download resources contributed by students across different universities—**with 100% student privacy guaranteed**.

---

## 🔒 The Core Privacy Guarantee

When a student uploads a PDF to EduShare Hub:
- **Other students see ONLY the College Name** (e.g., `PSCMRCET`, `ABC Engineering College`).
- **NEVER EXPOSED**: Student Name, Email Address, Roll Number, Student ID, or any personal contact information.
- College names are retrieved strictly from the student's authenticated database record and cannot be spoofed or forged on the frontend.
- Students retain complete ownership to manage and delete their own uploads from their private Profile dashboard.

---

## 🚀 Key Features

1. **Secure Student Authentication**:
   - Registration with Full Name, College Name, Roll Number, Department, Email, and Password.
   - Secure password hashing with `bcryptjs`.
   - JWT session tokens stored securely in HTTP cookies and local storage.
   - Form validation, duplicate email prevention, and protected page access guards.

2. **Personalized Student Dashboard (`dashboard.html`)**:
   - Dynamic welcome message using the student's first name.
   - Real-time statistics: Total uploaded materials, total available PDFs, and collaborating colleges.
   - Quick Upload and Library access buttons.
   - Recent materials feed with college badges.

3. **Drag-and-Drop PDF Upload Hub (`upload.html`)**:
   - Drag-and-drop dropzone with instant PDF validation (PDF only, up to 25MB).
   - Selected file preview with size formatting.
   - Upload progress bar and success alerts.
   - Automatic retrieval of the student's verified college name.

4. **Public Study Materials Library (`materials.html`)**:
   - Attractive responsive cards with PDF icons, subject tags, semester badges, and upload dates.
   - **Prominent College Badge** displayed below every card with zero uploader identity.
   - Live real-time search by title, subject, department, or college.
   - Multi-parameter filters: Filter by Subject, Semester, College, or Department.
   - Sorting by Latest Uploads, Most Downloaded, or Title (A–Z).
   - In-app PDF preview modal and direct PDF downloads with download tracking.

5. **Student Profile & Ownership Hub (`profile.html`)**:
   - Profile summary with privacy status indicator.
   - Personal uploads dashboard with live download counts.
   - Direct ownership verification for deleting uploads.
   - Edit Profile and Change Password modals.

---

## 🛠️ Technology Stack

- **Frontend**: HTML5, CSS3 (Custom Responsive Design System with light-blue theme), Modern Vanilla JavaScript (ES6+).
- **Backend**: Node.js, Express.js.
- **File Uploads**: Multer with MIME-type and size validation (Max 25MB, PDF only).
- **Security & Authentication**: JSON Web Tokens (JWT), `bcryptjs` password hashing, Cookie Parser, strict ownership middleware.
- **Database**: Persistent document database (MongoDB schema compliant, with automatic file-backed JSON engine and remote MongoDB URI support).
- **Development & Build**: Vite, TypeScript, tsx.

---

## 📁 Project Folder Structure

```text
edushare-hub/
│
├── frontend/                     # Core Frontend 5-Page Application
│   ├── register.html             # Page 1: Student Registration & Login
│   ├── dashboard.html            # Page 2: Student Dashboard & Analytics
│   ├── upload.html               # Page 3: Drag-and-Drop PDF Upload
│   ├── materials.html            # Page 4: Study Materials Library (Privacy-first)
│   ├── profile.html              # Page 5: Student Profile & Uploads Management
│   ├── css/
│   │   └── style.css             # Unified modern light-blue UI design system
│   └── js/
│       └── script.js             # Auth guards, API wrappers, dynamic rendering
│
├── backend/                      # Express Backend & API Services
│   ├── server.js                 # Express application and route mounts
│   ├── config/
│   │   └── db.js                 # Database engine & demo dataset seeder
│   ├── models/
│   │   ├── Student.js            # Student schema & authentication queries
│   │   └── Material.js           # Material schema & privacy serialization
│   ├── routes/
│   │   ├── auth.js               # Registration, Login, Logout, Session check
│   │   ├── materials.js          # PDF Upload, Library browse, Download, Delete
│   │   └── profile.js            # Profile details, Password change, User uploads
│   ├── middleware/
│   │   └── auth.js               # JWT authentication & session verification
│   ├── data/                     # Persistent database storage
│   └── uploads/                  # Secure uploaded PDF documents
│
├── server.ts                     # Full-stack server entrypoint (Port 3000)
├── .env.example                  # Environment configuration template
├── .gitignore                    # Sensitive data & credentials exclusion
├── package.json                  # Dependencies & scripts
└── README.md                     # Documentation
```

---

## ⚙️ Environment Variables

Create a `.env` file in the project root based on `.env.example`:

```env
# Server Port
PORT=3000
NODE_ENV=development

# JWT Secret for student session tokens
JWT_SECRET=edushare-hub-super-secure-jwt-secret-key-2026

# Optional: Remote MongoDB Connection URI (If omitted, embedded database engine is used)
MONGODB_URI=mongodb://localhost:27017/edushare

# Max Upload Size in Bytes (25MB)
MAX_FILE_SIZE=26214400
```

---

## 🚀 Installation & Local Setup

### 1. Prerequisites
- Node.js (v18.0 or higher)
- npm (v9.0 or higher)
- Git

### 2. Clone Repository
```bash
git clone https://github.com/your-username/edushare-hub.git
cd edushare-hub
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Start Development Server
```bash
npm run dev
```

The application will be live at `http://localhost:3000`.

---

## 📡 REST API Documentation

### Authentication (`/api/auth`)
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/api/auth/register` | Register new student account | No |
| `POST` | `/api/auth/login` | Student login & JWT issuance | No |
| `POST` | `/api/auth/logout` | Clear session cookie | No |
| `GET` | `/api/auth/me` | Fetch currently logged-in student | Yes (Bearer/Cookie) |

### Study Materials (`/api/materials`)
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/api/materials/upload` | Upload PDF (inherits college) | Yes |
| `GET` | `/api/materials` | Browse library with search/filters | No / Yes |
| `GET` | `/api/materials/stats` | Dashboard metrics & recent items | Yes |
| `GET` | `/api/materials/filters` | Distinct colleges, subjects, depts | No |
| `GET` | `/api/materials/:id` | Get single material details | No |
| `GET` | `/api/materials/:id/download` | Download PDF & increment counter | No |
| `GET` | `/api/materials/:id/view` | Inline PDF preview stream | No |
| `DELETE`| `/api/materials/:id` | Delete upload (Owner only) | Yes (Owner) |

### Profile & Settings (`/api/profile`)
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/profile` | View profile & my uploads | Yes |
| `PUT` | `/api/profile` | Update profile details | Yes |
| `PUT` | `/api/profile/password` | Change account password | Yes |

---

## 📚 Seed Demo Educational Materials

EduShare Hub includes 5 initial verified demo resources pre-loaded with valid PDF files:
1. **Java Programming Notes** – `PSCMRCET` (Semester 3-1, Dept: Computer Science & Engineering)
2. **Python Basics** – `ABC Engineering College` (Semester 1-2, Dept: Information Technology)
3. **DBMS Notes** – `XYZ Engineering College` (Semester 2-2, Dept: Computer Science & Engineering)
4. **Computer Networks Notes** – `PSCMRCET` (Semester 3-2, Dept: Electronics & Communication Engineering)
5. **Operating Systems Notes** – `ABC Engineering College` (Semester 3-1, Dept: Computer Science & Engineering)

---

## 🛡️ Security & Privacy Checklist

- [x] Passwords hashed with salt rounds using `bcryptjs`.
- [x] JWT sessions with expiration and secure flags.
- [x] Zero student identity leaked in public API endpoints (`toPublicJSON` removes `uploadedBy`).
- [x] College name sourced directly from authenticated session, preventing spoofing.
- [x] Ownership authorization checks for material deletions.
- [x] Multer file extension and MIME type guards.
- [x] Sensitive files and database dumps excluded via `.gitignore`.

---

## 📄 License
This project is licensed under the Apache-2.0 License.
