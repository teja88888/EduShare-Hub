/**
 * EduShare Hub - Core Client-Side Application Script
 * Provides authentication guards, API interactions, dynamic UI rendering,
 * and page lifecycle management across all 5 EduShare Hub pages.
 */

// Storage keys
const TOKEN_KEY = 'edushare_token';
const USER_KEY = 'edushare_student';

// Global state
let currentStudent = null;

// ============================================================================
// Authentication & API Helpers
// ============================================================================

function getToken() {
  return localStorage.getItem(TOKEN_KEY) || getCookie('edushare_token');
}

function setSession(token, student) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(student));
  currentStudent = student;
  // Set cookie for browser-level redirects
  document.cookie = `edushare_token=${token}; path=/; max-age=604800; SameSite=Lax`;
}

function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  document.cookie = 'edushare_token=; path=/; max-age=0';
  currentStudent = null;
}

function getCookie(name) {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? match[2] : null;
}

// Authenticated fetch wrapper
async function apiFetch(url, options = {}) {
  const token = getToken();
  const headers = options.headers ? { ...options.headers } : {};

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Do not set Content-Type if sending FormData (browser sets boundary)
  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(url, { credentials: 'same-origin', ...options, headers });
  
  if (res.status === 401) {
    // If unauthorized, clear session and redirect to register
    clearSession();
    if (!window.location.pathname.includes('register.html')) {
      window.location.replace('/register.html?reason=expired');
    }
  }

  return res;
}

// Check session on page load
async function checkAuth(isProtectedPage = true) {
  const token = getToken();

  if (!token) {
    if (isProtectedPage) {
      window.location.replace('/register.html');
      return false;
    }
    return true;
  }

  try {
    const res = await apiFetch('/api/auth/me');
    if (!res.ok) {
      if (isProtectedPage) {
        clearSession();
        window.location.replace('/register.html');
        return false;
      }
      return true;
    }
    const data = await res.json();
    currentStudent = data.student;
    localStorage.setItem(USER_KEY, JSON.stringify(currentStudent));
    updateHeaderUI();
    return true;
  } catch (err) {
    console.error('Session validation error:', err);
    if (isProtectedPage) {
      clearSession();
      window.location.replace('/register.html');
      return false;
    }
    return true;
  }
}

async function handleLogout() {
  try {
    await fetch('/api/auth/logout', { method: 'POST' });
  } catch (e) {
    // ignore network errors on logout
  }
  clearSession();
  showToast('You have been logged out safely.', 'info');
  setTimeout(() => {
    window.location.replace('/register.html');
  }, 400);
}

// ============================================================================
// UI & Notification System
// ============================================================================

function showToast(message, type = 'success') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  const iconSvg = type === 'success' 
    ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>'
    : type === 'error'
    ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>'
    : '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>';

  toast.innerHTML = `${iconSvg}<span>${escapeHtml(message)}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }
}

// Escape HTML for security
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Format bytes
function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// Format date
function formatDate(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

// Background floating particles
function initParticles() {
  const bg = document.createElement('div');
  bg.className = 'particles-bg';
  for (let i = 0; i < 8; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    const size = Math.floor(Math.random() * 80) + 40;
    p.style.width = `${size}px`;
    p.style.height = `${size}px`;
    p.style.top = `${Math.random() * 90}%`;
    p.style.left = `${Math.random() * 90}%`;
    p.style.animationDelay = `${Math.random() * 10}s`;
    p.style.animationDuration = `${15 + Math.random() * 15}s`;
    bg.appendChild(p);
  }
  document.body.insertBefore(bg, document.body.firstChild);
}

// Update header UI with logged in user profile
function updateHeaderUI() {
  if (!currentStudent) return;

  const nameEl = document.getElementById('header-user-name');
  const collegeEl = document.getElementById('header-user-college');
  const avatarEl = document.getElementById('header-user-avatar');

  if (nameEl) nameEl.textContent = currentStudent.name;
  if (collegeEl) collegeEl.textContent = currentStudent.college;
  if (avatarEl) {
    const initials = currentStudent.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    avatarEl.textContent = initials || 'S';
  }
}

// Setup common header event listeners
function setupHeader() {
  const mobileToggle = document.getElementById('mobile-menu-toggle');
  const navLinks = document.getElementById('nav-links');
  if (mobileToggle && navLinks) {
    mobileToggle.addEventListener('click', () => {
      navLinks.classList.toggle('mobile-open');
    });
  }

  const logoutBtns = document.querySelectorAll('.logout-btn');
  logoutBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      handleLogout();
    });
  });

  // Modal overlay click to close
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        closeModal(overlay.id);
      }
    });
  });

  // Modal close buttons
  document.querySelectorAll('.modal-close-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const modal = btn.closest('.modal-overlay');
      if (modal) closeModal(modal.id);
    });
  });
}

// Global PDF Preview Modal
function previewPdf(materialId, title) {
  const modal = document.getElementById('pdf-preview-modal');
  if (!modal) return;

  const titleEl = document.getElementById('pdf-modal-title');
  const iframeEl = document.getElementById('pdf-modal-iframe');
  const downloadLink = document.getElementById('pdf-modal-download');

  if (titleEl) titleEl.textContent = title;
  if (iframeEl) iframeEl.src = `/api/materials/${materialId}/view`;
  if (downloadLink) downloadLink.href = `/api/materials/${materialId}/download`;

  openModal('pdf-preview-modal');
}

// ============================================================================
// PAGE 1: Registration & Login Controller (register.html)
// ============================================================================

function initRegisterPage() {
  // If already authenticated, redirect straight to dashboard
  const token = getToken();
  if (token) {
    window.location.replace('/dashboard.html');
    return;
  }

  const tabRegister = document.getElementById('tab-register');
  const tabLogin = document.getElementById('tab-login');
  const formRegister = document.getElementById('form-register');
  const formLogin = document.getElementById('form-login');
  const pageTitle = document.getElementById('auth-card-title');
  const pageDesc = document.getElementById('auth-card-desc');

  // Check URL query parameters for login view
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('mode') === 'login' || urlParams.get('reason')) {
    switchAuthTab('login');
    if (urlParams.get('reason') === 'expired') {
      showToast('Your session has expired. Please log in again.', 'info');
    }
  }

  function switchAuthTab(mode) {
    if (mode === 'login') {
      tabLogin.classList.add('active');
      tabRegister.classList.remove('active');
      formLogin.style.display = 'block';
      formRegister.style.display = 'none';
      if (pageTitle) pageTitle.textContent = 'Welcome Back';
      if (pageDesc) pageDesc.textContent = 'Enter your college email to access study materials';
    } else {
      tabRegister.classList.add('active');
      tabLogin.classList.remove('active');
      formRegister.style.display = 'block';
      formLogin.style.display = 'none';
      if (pageTitle) pageTitle.textContent = 'Join EduShare Hub';
      if (pageDesc) pageDesc.textContent = 'Create your student account to share and access study resources';
    }
  }

  if (tabRegister) tabRegister.addEventListener('click', () => switchAuthTab('register'));
  if (tabLogin) tabLogin.addEventListener('click', () => switchAuthTab('login'));

  // Switch links inside forms
  document.querySelectorAll('.switch-to-login').forEach(el => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      switchAuthTab('login');
    });
  });
  document.querySelectorAll('.switch-to-register').forEach(el => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      switchAuthTab('register');
    });
  });

  // Handle Registration Form Submit
  if (formRegister) {
    formRegister.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('reg-name').value.trim();
      const college = document.getElementById('reg-college').value.trim();
      const rollNumber = document.getElementById('reg-roll').value.trim();
      const department = document.getElementById('reg-dept').value;
      const email = document.getElementById('reg-email').value.trim();
      const password = document.getElementById('reg-password').value;
      const confirmPassword = document.getElementById('reg-confirm-password').value;
      const submitBtn = formRegister.querySelector('button[type="submit"]');

      if (!name || !college || !email || !password) {
        showToast('Please fill in all required fields.', 'error');
        return;
      }

      if (password.length < 6) {
        showToast('Password must be at least 6 characters long.', 'error');
        return;
      }

      if (password !== confirmPassword) {
        showToast('Passwords do not match. Please re-enter.', 'error');
        return;
      }

      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span class="animate-spin inline-block mr-2">&#8635;</span> Creating Account...';

      try {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, college, rollNumber, department, email, password, confirmPassword })
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Registration failed');
        }

        setSession(data.token, data.student);
        showToast('Account created successfully! Redirecting...', 'success');
        setTimeout(() => {
          window.location.replace('/dashboard.html');
        }, 800);
      } catch (err) {
        showToast(err.message, 'error');
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Create Account';
      }
    });
  }

  // Handle Login Form Submit
  if (formLogin) {
    formLogin.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('login-email').value.trim();
      const password = document.getElementById('login-password').value;
      const submitBtn = formLogin.querySelector('button[type="submit"]');

      if (!email || !password) {
        showToast('Please provide both email and password.', 'error');
        return;
      }

      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span class="animate-spin inline-block mr-2">&#8635;</span> Signing In...';

      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Login failed');
        }

        setSession(data.token, data.student);
        showToast('Welcome back! Logging you in...', 'success');
        setTimeout(() => {
          window.location.replace('/dashboard.html');
        }, 700);
      } catch (err) {
        showToast(err.message, 'error');
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Sign In to EduShare Hub';
      }
    });
  }
}

// ============================================================================
// PAGE 2: Dashboard Controller (dashboard.html)
// ============================================================================

async function initDashboardPage() {
  const isAuth = await checkAuth(true);
  if (!isAuth) return;

  const welcomeNameEl = document.getElementById('dashboard-welcome-name');
  const collegeBadgeEl = document.getElementById('dashboard-user-college');
  const totalUploadsEl = document.getElementById('stat-my-uploads');
  const totalAvailableEl = document.getElementById('stat-total-available');
  const totalCollegesEl = document.getElementById('stat-total-colleges');
  const recentListEl = document.getElementById('recent-materials-container');

  if (currentStudent && welcomeNameEl) {
    const firstName = currentStudent.name.split(' ')[0];
    welcomeNameEl.textContent = firstName;
  }
  if (currentStudent && collegeBadgeEl) {
    collegeBadgeEl.textContent = currentStudent.college;
  }

  try {
    const res = await apiFetch('/api/materials/stats');
    if (!res.ok) throw new Error('Could not load statistics');
    const data = await res.json();

    if (totalUploadsEl) totalUploadsEl.textContent = data.stats.myUploads;
    if (totalAvailableEl) totalAvailableEl.textContent = data.stats.totalMaterials;
    if (totalCollegesEl) totalCollegesEl.textContent = data.stats.totalColleges;

    // Render recently uploaded materials
    if (recentListEl) {
      if (!data.recentMaterials || data.recentMaterials.length === 0) {
        recentListEl.innerHTML = `
          <div class="empty-state">
            <div class="empty-state-icon">
              <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3>No materials uploaded yet</h3>
            <p>Be the first student to upload study notes to help peers across colleges!</p>
            <a href="/upload.html" class="btn btn-primary">Upload Study Material</a>
          </div>
        `;
      } else {
        recentListEl.innerHTML = `
          <div class="materials-grid">
            ${data.recentMaterials.map(m => renderMaterialCard(m)).join('')}
          </div>
        `;
        bindCardActions(recentListEl);
      }
    }
  } catch (err) {
    console.error('Dashboard load error:', err);
    showToast('Failed to load dashboard metrics.', 'error');
  }
}

// ============================================================================
// PAGE 3: Upload Study Materials Controller (upload.html)
// ============================================================================

async function initUploadPage() {
  const isAuth = await checkAuth(true);
  if (!isAuth) return;

  const studentCollegeEl = document.getElementById('upload-student-college');
  if (studentCollegeEl && currentStudent) {
    studentCollegeEl.textContent = currentStudent.college;
  }

  const dropzone = document.getElementById('pdf-dropzone');
  const fileInput = document.getElementById('pdf-file-input');
  const selectedBox = document.getElementById('file-selected-box');
  const fileNameDisplay = document.getElementById('selected-file-name');
  const fileSizeDisplay = document.getElementById('selected-file-size');
  const removeFileBtn = document.getElementById('remove-selected-file');
  const uploadForm = document.getElementById('material-upload-form');
  const progressBar = document.getElementById('upload-progress-fill');
  const progressWrapper = document.getElementById('upload-progress-wrapper');
  const submitBtn = document.getElementById('upload-submit-btn');

  let chosenFile = null;

  function handleFileSelect(file) {
    if (!file) return;

    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      showToast('Only PDF files are supported. Please choose a .pdf document.', 'error');
      return;
    }

    // 25MB limit
    if (file.size > 25 * 1024 * 1024) {
      showToast('File size exceeds 25MB. Please choose a smaller document.', 'error');
      return;
    }

    chosenFile = file;
    fileNameDisplay.textContent = file.name;
    fileSizeDisplay.textContent = formatFileSize(file.size);
    selectedBox.style.display = 'flex';
    dropzone.style.display = 'none';
  }

  if (dropzone && fileInput) {
    dropzone.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        handleFileSelect(e.target.files[0]);
      }
    });

    // Drag & Drop
    ['dragenter', 'dragover'].forEach(eventName => {
      dropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        dropzone.classList.add('drag-over');
      });
    });
    ['dragleave', 'drop'].forEach(eventName => {
      dropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        dropzone.classList.remove('drag-over');
      });
    });
    dropzone.addEventListener('drop', (e) => {
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleFileSelect(e.dataTransfer.files[0]);
      }
    });
  }

  if (removeFileBtn) {
    removeFileBtn.addEventListener('click', () => {
      chosenFile = null;
      fileInput.value = '';
      selectedBox.style.display = 'none';
      dropzone.style.display = 'block';
    });
  }

  if (uploadForm) {
    uploadForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      if (!chosenFile) {
        showToast('Please select a PDF file to upload.', 'error');
        return;
      }

      const title = document.getElementById('upload-title').value.trim();
      const subject = document.getElementById('upload-subject').value.trim();
      const semester = document.getElementById('upload-semester').value;
      const department = document.getElementById('upload-department').value;

      if (!title || !subject || !semester || !department) {
        showToast('Please complete all form fields.', 'error');
        return;
      }

      const formData = new FormData();
      formData.append('title', title);
      formData.append('subject', subject);
      formData.append('semester', semester);
      formData.append('department', department);
      formData.append('pdfFile', chosenFile);

      submitBtn.disabled = true;
      progressWrapper.style.display = 'block';
      progressBar.style.width = '30%';

      try {
        progressBar.style.width = '70%';
        const res = await apiFetch('/api/materials/upload', {
          method: 'POST',
          body: formData
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Upload failed');
        }

        progressBar.style.width = '100%';
        showToast('Study material uploaded successfully!', 'success');

        // Reset form
        uploadForm.reset();
        chosenFile = null;
        selectedBox.style.display = 'none';
        dropzone.style.display = 'block';
        submitBtn.disabled = false;
        setTimeout(() => {
          progressWrapper.style.display = 'none';
          progressBar.style.width = '0%';
          window.location.replace('/materials.html');
        }, 1200);

      } catch (err) {
        showToast(err.message, 'error');
        submitBtn.disabled = false;
        progressWrapper.style.display = 'none';
        progressBar.style.width = '0%';
      }
    });
  }
}

// ============================================================================
// PAGE 4: Study Materials Library Controller (materials.html)
// ============================================================================

async function initMaterialsPage() {
  const isAuth = await checkAuth(true);
  if (!isAuth) return;

  const searchInput = document.getElementById('library-search');
  const subjectFilter = document.getElementById('filter-subject');
  const semesterFilter = document.getElementById('filter-semester');
  const collegeFilter = document.getElementById('filter-college');
  const departmentFilter = document.getElementById('filter-department');
  const sortSelect = document.getElementById('filter-sort');
  const materialsContainer = document.getElementById('materials-container');
  const resultsCountEl = document.getElementById('materials-count-badge');
  const resetBtn = document.getElementById('reset-filters-btn');

  // Load filter options dynamically
  try {
    const filterRes = await apiFetch('/api/materials/filters');
    if (filterRes.ok) {
      const data = await filterRes.json();
      if (collegeFilter && data.colleges) {
        collegeFilter.innerHTML = '<option value="all">All Colleges</option>' +
          data.colleges.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
      }
      if (subjectFilter && data.subjects) {
        subjectFilter.innerHTML = '<option value="all">All Subjects</option>' +
          data.subjects.map(s => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join('');
      }
      if (departmentFilter && data.departments) {
        departmentFilter.innerHTML = '<option value="all">All Departments</option>' +
          data.departments.map(d => `<option value="${escapeHtml(d)}">${escapeHtml(d)}</option>`).join('');
      }
    }
  } catch (err) {
    console.warn('Could not populate dynamic filters:', err);
  }

  async function fetchMaterials() {
    if (materialsContainer) {
      materialsContainer.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 3rem;">
          <div class="inline-block animate-spin text-blue-600 mb-2">&#8635;</div>
          <p class="text-slate-500 font-medium">Searching study materials...</p>
        </div>
      `;
    }

    const params = new URLSearchParams();
    if (searchInput && searchInput.value.trim()) params.append('search', searchInput.value.trim());
    if (subjectFilter && subjectFilter.value !== 'all') params.append('subject', subjectFilter.value);
    if (semesterFilter && semesterFilter.value !== 'all') params.append('semester', semesterFilter.value);
    if (collegeFilter && collegeFilter.value !== 'all') params.append('college', collegeFilter.value);
    if (departmentFilter && departmentFilter.value !== 'all') params.append('department', departmentFilter.value);
    if (sortSelect) params.append('sort', sortSelect.value);

    try {
      const res = await apiFetch(`/api/materials?${params.toString()}`);
      if (!res.ok) throw new Error('Could not load materials');
      const data = await res.json();

      if (resultsCountEl) {
        resultsCountEl.textContent = `${data.count} Available Resources`;
      }

      if (!data.materials || data.materials.length === 0) {
        materialsContainer.innerHTML = `
          <div class="empty-state" style="grid-column: 1 / -1;">
            <div class="empty-state-icon">
              <svg width="36" height="36" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <h3>No study materials found</h3>
            <p>Try adjusting your search terms or filters to find what you need.</p>
            <button id="empty-reset-btn" class="btn btn-secondary">Clear All Filters</button>
          </div>
        `;
        const emptyReset = document.getElementById('empty-reset-btn');
        if (emptyReset) emptyReset.addEventListener('click', resetFilters);
      } else {
        materialsContainer.innerHTML = data.materials.map(m => renderMaterialCard(m)).join('');
        bindCardActions(materialsContainer);
      }
    } catch (err) {
      console.error('Error fetching materials:', err);
      materialsContainer.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1;">
          <h3>Failed to load study materials</h3>
          <p>Please check your connection and try again.</p>
          <button onclick="location.reload()" class="btn btn-primary">Retry</button>
        </div>
      `;
    }
  }

  function resetFilters() {
    if (searchInput) searchInput.value = '';
    if (subjectFilter) subjectFilter.value = 'all';
    if (semesterFilter) semesterFilter.value = 'all';
    if (collegeFilter) collegeFilter.value = 'all';
    if (departmentFilter) departmentFilter.value = 'all';
    if (sortSelect) sortSelect.value = 'latest';
    fetchMaterials();
  }

  // Debounced search
  let debounceTimer;
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(fetchMaterials, 300);
    });
  }

  [subjectFilter, semesterFilter, collegeFilter, departmentFilter, sortSelect].forEach(select => {
    if (select) select.addEventListener('change', fetchMaterials);
  });

  if (resetBtn) resetBtn.addEventListener('click', resetFilters);

  // Initial load
  fetchMaterials();
}

// ============================================================================
// PAGE 5: Student Profile Controller (profile.html)
// ============================================================================

async function initProfilePage() {
  const isAuth = await checkAuth(true);
  if (!isAuth) return;

  const nameDisplay = document.getElementById('profile-name');
  const collegeDisplay = document.getElementById('profile-college');
  const rollDisplay = document.getElementById('profile-roll');
  const emailDisplay = document.getElementById('profile-email');
  const deptDisplay = document.getElementById('profile-dept');
  const avatarLarge = document.getElementById('profile-avatar-large');
  const statUploads = document.getElementById('profile-stat-uploads');
  const statDownloads = document.getElementById('profile-stat-downloads');
  const myMaterialsContainer = document.getElementById('my-materials-container');

  async function loadProfileData() {
    try {
      const res = await apiFetch('/api/profile');
      if (!res.ok) throw new Error('Could not fetch profile');
      const data = await res.json();
      const p = data.profile;

      if (nameDisplay) nameDisplay.textContent = p.name;
      if (collegeDisplay) collegeDisplay.textContent = p.college;
      if (rollDisplay) rollDisplay.textContent = p.rollNumber;
      if (emailDisplay) emailDisplay.textContent = p.email;
      if (deptDisplay) deptDisplay.textContent = p.department;
      if (statUploads) statUploads.textContent = p.stats.totalUploads;
      if (statDownloads) statDownloads.textContent = p.stats.totalDownloadsReceived;

      if (avatarLarge) {
        const initials = p.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
        avatarLarge.textContent = initials || 'S';
      }

      // Populate edit profile modal fields
      const editName = document.getElementById('edit-profile-name');
      const editCollege = document.getElementById('edit-profile-college');
      const editRoll = document.getElementById('edit-profile-roll');
      const editDept = document.getElementById('edit-profile-dept');
      if (editName) editName.value = p.name;
      if (editCollege) editCollege.value = p.college;
      if (editRoll) editRoll.value = p.rollNumber === 'Not specified' ? '' : p.rollNumber;
      if (editDept) editDept.value = p.department;

      // Render My Uploaded Materials table
      renderMyMaterials(data.materials);
    } catch (err) {
      console.error('Profile fetch error:', err);
      showToast('Failed to load profile details.', 'error');
    }
  }

  function renderMyMaterials(materials) {
    if (!myMaterialsContainer) return;

    if (!materials || materials.length === 0) {
      myMaterialsContainer.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">
            <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <h3>You haven't uploaded any study materials yet</h3>
          <p>Share your handwritten or lecture notes with students across universities.</p>
          <a href="/upload.html" class="btn btn-primary">Upload Your First Material</a>
        </div>
      `;
      return;
    }

    myMaterialsContainer.innerHTML = `
      <div class="my-uploads-table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th>Material Title</th>
              <th>Subject &amp; Semester</th>
              <th>Upload Date</th>
              <th>Downloads</th>
              <th style="text-align: right;">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${materials.map(m => `
              <tr data-material-id="${m._id}">
                <td>
                  <div style="font-weight: 700; color: #0f172a;">${escapeHtml(m.title)}</div>
                  <div style="font-size: 0.78rem; color: #64748b;">${escapeHtml(m.originalFileName || 'notes.pdf')} &bull; ${formatFileSize(m.fileSize)}</div>
                </td>
                <td>
                  <span class="badge badge-royal">${escapeHtml(m.subject)}</span>
                  <span class="badge badge-blue">Sem ${escapeHtml(m.semester)}</span>
                </td>
                <td>${formatDate(m.uploadDate)}</td>
                <td>
                  <span class="badge badge-green">${m.downloads || 0} downloads</span>
                </td>
                <td style="text-align: right;">
                  <button class="btn btn-secondary btn-sm preview-material-btn" data-id="${m._id}" data-title="${escapeHtml(m.title)}" title="Preview PDF">
                    Preview
                  </button>
                  <a href="/api/materials/${m._id}/download" class="btn btn-primary btn-sm" title="Download">
                    Download
                  </a>
                  <button class="btn btn-danger btn-sm delete-material-btn" data-id="${m._id}" data-title="${escapeHtml(m.title)}">
                    Delete
                  </button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;

    // Bind preview & delete actions
    myMaterialsContainer.querySelectorAll('.preview-material-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        previewPdf(btn.getAttribute('data-id'), btn.getAttribute('data-title'));
      });
    });

    myMaterialsContainer.querySelectorAll('.delete-material-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const title = btn.getAttribute('data-title');
        confirmDeleteMaterial(id, title);
      });
    });
  }

  // Delete modal confirmation
  let pendingDeleteId = null;
  function confirmDeleteMaterial(id, title) {
    pendingDeleteId = id;
    const nameEl = document.getElementById('delete-modal-material-name');
    if (nameEl) nameEl.textContent = title;
    openModal('confirm-delete-modal');
  }

  const confirmDeleteBtn = document.getElementById('confirm-delete-action');
  if (confirmDeleteBtn) {
    confirmDeleteBtn.addEventListener('click', async () => {
      if (!pendingDeleteId) return;
      confirmDeleteBtn.disabled = true;
      confirmDeleteBtn.textContent = 'Deleting...';

      try {
        const res = await apiFetch(`/api/materials/${pendingDeleteId}`, { method: 'DELETE' });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Could not delete material');
        }

        showToast('Study material deleted successfully.', 'success');
        closeModal('confirm-delete-modal');
        loadProfileData();
      } catch (err) {
        showToast(err.message, 'error');
      } finally {
        confirmDeleteBtn.disabled = false;
        confirmDeleteBtn.textContent = 'Yes, Delete Material';
        pendingDeleteId = null;
      }
    });
  }

  // Edit profile form
  const editProfileForm = document.getElementById('edit-profile-form');
  if (editProfileForm) {
    editProfileForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('edit-profile-name').value.trim();
      const college = document.getElementById('edit-profile-college').value.trim();
      const rollNumber = document.getElementById('edit-profile-roll').value.trim();
      const department = document.getElementById('edit-profile-dept').value.trim();

      if (!name || !college) {
        showToast('Name and College cannot be empty.', 'error');
        return;
      }

      try {
        const res = await apiFetch('/api/profile', {
          method: 'PUT',
          body: JSON.stringify({ name, college, rollNumber, department })
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Failed to update profile');
        }

        showToast('Profile updated successfully!', 'success');
        closeModal('edit-profile-modal');
        loadProfileData();
        checkAuth(false); // refresh header
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  }

  // Change password form
  const changePasswordForm = document.getElementById('change-password-form');
  if (changePasswordForm) {
    changePasswordForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const currentPassword = document.getElementById('pw-current').value;
      const newPassword = document.getElementById('pw-new').value;
      const confirmPassword = document.getElementById('pw-confirm').value;

      if (!currentPassword || !newPassword) {
        showToast('Please fill in current and new password.', 'error');
        return;
      }

      if (newPassword.length < 6) {
        showToast('New password must be at least 6 characters.', 'error');
        return;
      }

      if (newPassword !== confirmPassword) {
        showToast('New passwords do not match.', 'error');
        return;
      }

      try {
        const res = await apiFetch('/api/profile/password', {
          method: 'PUT',
          body: JSON.stringify({ currentPassword, newPassword, confirmPassword })
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Password update failed');
        }

        showToast('Password changed successfully!', 'success');
        changePasswordForm.reset();
        closeModal('change-password-modal');
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  }

  loadProfileData();
}

// ============================================================================
// Shared Card Renderer with STRICT STUDENT PRIVACY
// ============================================================================

/**
 * STRICT PRIVACY REQUIREMENT:
 * Displays only Title, Subject, Semester, Department, College Name, Upload Date.
 * NEVER renders student name, email, roll number, or uploader identity.
 */
function renderMaterialCard(material) {
  const isDemoBadge = material.isDemo 
    ? '<span class="badge badge-amber" title="Sample educational resource">Demo Resource</span>' 
    : '';

  return `
    <div class="material-card" data-material-id="${material._id}">
      <div class="material-card-body">
        <div class="material-header-row">
          <div class="pdf-icon-badge">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
          </div>
          <div style="flex: 1; overflow: hidden;">
            <h3 class="material-title" title="${escapeHtml(material.title)}">${escapeHtml(material.title)}</h3>
            <div style="font-size: 0.78rem; color: #64748b; margin-top: 2px;">
              Uploaded ${formatDate(material.uploadDate)} &bull; ${formatFileSize(material.fileSize)}
            </div>
          </div>
        </div>

        <div class="tags-row">
          <span class="badge badge-royal">${escapeHtml(material.subject)}</span>
          <span class="badge badge-blue">Sem ${escapeHtml(material.semester)}</span>
          <span class="badge badge-privacy">${escapeHtml(material.department)}</span>
          ${isDemoBadge}
        </div>
      </div>

      <!-- COLLEGE FOOTER (Prominently displayed below every card, privacy protected) -->
      <div class="material-college-footer">
        <div class="college-info-block">
          <svg class="college-building-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect>
            <path d="M9 22v-4h6v4"></path>
            <path d="M8 6h.01"></path>
            <path d="M16 6h.01"></path>
            <path d="M12 6h.01"></path>
            <path d="M12 10h.01"></path>
            <path d="M12 14h.01"></path>
            <path d="M16 10h.01"></path>
            <path d="M16 14h.01"></path>
            <path d="M8 10h.01"></path>
            <path d="M8 14h.01"></path>
          </svg>
          <div>
            <span class="college-label-prefix">College</span>
            <span class="college-name-text">${escapeHtml(material.collegeName)}</span>
          </div>
        </div>
        <span class="badge badge-green" style="font-size: 0.72rem;">${material.downloads || 0} downloads</span>
      </div>

      <div class="material-card-actions">
        <button class="btn btn-secondary btn-sm preview-btn" data-id="${material._id}" data-title="${escapeHtml(material.title)}" style="flex: 1;">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
            <circle cx="12" cy="12" r="3"></circle>
          </svg>
          Preview
        </button>
        <a href="/api/materials/${material._id}/download" class="btn btn-primary btn-sm" style="flex: 1.2;">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
          Download PDF
        </a>
      </div>
    </div>
  `;
}

function bindCardActions(container) {
  container.querySelectorAll('.preview-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const id = btn.getAttribute('data-id');
      const title = btn.getAttribute('data-title');
      previewPdf(id, title);
    });
  });
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  initParticles();
  setupHeader();

  const path = window.location.pathname;

  if (path.includes('register.html') || path === '/' && !getToken()) {
    initRegisterPage();
  } else if (path.includes('dashboard.html')) {
    initDashboardPage();
  } else if (path.includes('upload.html')) {
    initUploadPage();
  } else if (path.includes('materials.html')) {
    initMaterialsPage();
  } else if (path.includes('profile.html')) {
    initProfilePage();
  }
});
