// ============================================================
// ACADEMIC RECORDS & MANAGEMENT SYSTEM
// Roles: admin, registrar, college (dean), depthead, teacher, student
// ============================================================

// --- SCORE WEIGHTS ---
const MAX_MID = 30;
const MAX_ASSESSMENT = 20;
const MAX_FINAL = 50;

// --- INITIAL DATA SEEDING ---
function initStorage() {
  if (!localStorage.getItem('sms_colleges')) {
    const colleges = [
      { id: 'col-eng', name: 'College of Engineering' },
      { id: 'col-bus', name: 'College of Business' }
    ];
    localStorage.setItem('sms_colleges', JSON.stringify(colleges));
  }

  if (!localStorage.getItem('sms_departments')) {
    const departments = [
      { id: 'dep-cs', name: 'Computer Science', collegeId: 'col-eng' },
      { id: 'dep-ee', name: 'Electrical Engineering', collegeId: 'col-eng' },
      { id: 'dep-acc', name: 'Accounting', collegeId: 'col-bus' }
    ];
    localStorage.setItem('sms_departments', JSON.stringify(departments));
  }

  if (!localStorage.getItem('sms_users')) {
    const initialUsers = [
      { id: '1', name: 'System Admin', email: 'admin', password: 'admin123', role: 'admin' },
      { id: '2', name: 'Grace Registrar', email: 'registrar@school.edu', password: 'pass', role: 'registrar' },
      { id: '3', name: 'Dr. Helen Cole', email: 'dean.eng@school.edu', password: 'pass', role: 'college', collegeId: 'col-eng' },
      { id: '4', name: 'Dr. Mark Reyes', email: 'head.cs@school.edu', password: 'pass', role: 'depthead', collegeId: 'col-eng', departmentId: 'dep-cs' },
      { id: '5', name: 'John Teacher', email: 'teacher@school.edu', password: 'pass', role: 'teacher', collegeId: 'col-eng', departmentId: 'dep-cs' },
      {
        id: '6', name: 'Alex Student', email: 'alex@student.edu', password: 'pass', role: 'student',
        collegeId: 'col-eng', departmentId: 'dep-cs', course: 'B.Sc. Computer Science',
        scores: { mid: 24, assessment: 16, final: 40 }, attendance: '92%', approved: true
      }
    ];
    localStorage.setItem('sms_users', JSON.stringify(initialUsers));
  }
}

// --- STORAGE HELPERS ---
const getUsers = () => JSON.parse(localStorage.getItem('sms_users')) || [];
const saveUsers = (users) => localStorage.setItem('sms_users', JSON.stringify(users));
const getColleges = () => JSON.parse(localStorage.getItem('sms_colleges')) || [];
const getDepartments = () => JSON.parse(localStorage.getItem('sms_departments')) || [];
const collegeName = (id) => getColleges().find(c => c.id === id)?.name || '—';
const departmentName = (id) => getDepartments().find(d => d.id === id)?.name || '—';
const deptsForCollege = (collegeId) => getDepartments().filter(d => d.collegeId === collegeId);

// --- SCORE HELPERS ---
function computeTotal(scores) {
  if (!scores) return null;
  const mid = Number(scores.mid) || 0;
  const assessment = Number(scores.assessment) || 0;
  const final = Number(scores.final) || 0;
  return mid + assessment + final;
}

const GRADE_SCALE = [
  { min: 90, grade: 'A+' },
  { min: 85, grade: 'A' },
  { min: 80, grade: 'A-' },
  { min: 75, grade: 'B+' },
  { min: 70, grade: 'B' },
  { min: 65, grade: 'B-' },
  { min: 60, grade: 'C+' },
  { min: 55, grade: 'C' },
  { min: 50, grade: 'C-' },
  { min: 45, grade: 'D' }
];

function computeGrade(total) {
  if (total === null || total === undefined) return null;
  const match = GRADE_SCALE.find(tier => total >= tier.min);
  return match ? match.grade : 'F';
}

function gradeClass(grade) {
  return grade.replace('+', 'plus').replace('-', 'minus');
}

function gradePillHtml(grade) {
  if (!grade) return '<span class="grade-pill grade-dash">—</span>';
  return `<span class="grade-pill grade-${gradeClass(grade)}">${grade}</span>`;
}

// Global Application State
let currentUser = null;

// --- DOM ELEMENTS ---
const authContainer = document.getElementById('auth-container');
const dashboardContainer = document.getElementById('dashboard-container');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
  initStorage();
  populateCollegeSelect('reg-college');
  refreshDeptOptions('reg-college', 'reg-department');
  populateCollegeSelect('reg2-college');
  refreshDeptOptions('reg2-college', 'reg2-department');
  populateCollegeSelect('admin-add-college');
  refreshDeptOptions('admin-add-college', 'admin-add-department');

  checkExistingSession();

  loginForm.addEventListener('submit', handleLogin);
  registerForm.addEventListener('submit', handleRegister);
  document.getElementById('admin-add-form').addEventListener('submit', handleAdminAddAccount);
  document.getElementById('registrar-add-form').addEventListener('submit', handleRegistrarEnroll);
  onAdminRoleChange();
});

// --- COLLEGE / DEPARTMENT SELECT HELPERS ---
function populateCollegeSelect(selectId) {
  const select = document.getElementById(selectId);
  if (!select) return;
  select.innerHTML = getColleges().map(c => `<option value="${c.id}">${c.name}</option>`).join('');
}

function refreshDeptOptions(collegeSelectId, deptSelectId) {
  const collegeSelect = document.getElementById(collegeSelectId);
  const deptSelect = document.getElementById(deptSelectId);
  if (!collegeSelect || !deptSelect) return;
  const depts = deptsForCollege(collegeSelect.value);
  deptSelect.innerHTML = depts.map(d => `<option value="${d.id}">${d.name}</option>`).join('');
}

// --- AUTH TABS ---
function switchTab(tab) {
  const tabs = document.querySelectorAll('.tab-btn');
  tabs.forEach(t => t.classList.remove('active'));

  if (tab === 'login') {
    document.querySelector('.tab-btn[data-tab="login"]').classList.add('active');
    loginForm.classList.remove('hidden');
    registerForm.classList.add('hidden');
  } else {
    document.querySelector('.tab-btn[data-tab="register"]').classList.add('active');
    loginForm.classList.add('hidden');
    registerForm.classList.remove('hidden');
  }
}

// --- LOGIN / LOGOUT ---
function handleLogin(e) {
  e.preventDefault();
  const role = document.getElementById('login-role').value;
  const email = document.getElementById('login-email').value.trim();
  const pass = document.getElementById('login-pass').value.trim();

  const users = getUsers();
  const user = users.find(u => u.email === email && u.password === pass && u.role === role);

  if (user) {
    currentUser = user;
    localStorage.setItem('sms_session', JSON.stringify(user));
    loadDashboard();
  } else {
    alert('Invalid credentials or role selection!');
  }
}

function handleRegister(e) {
  e.preventDefault();
  const name = document.getElementById('reg-name').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const password = document.getElementById('reg-pass').value.trim();
  const collegeId = document.getElementById('reg-college').value;
  const departmentId = document.getElementById('reg-department').value;
  const course = document.getElementById('reg-course').value.trim();

  const users = getUsers();
  if (users.some(u => u.email === email)) {
    alert('Email already exists!');
    return;
  }

  const newUser = {
    id: Date.now().toString(),
    name, email, password, role: 'student',
    collegeId, departmentId, course,
    scores: { mid: '', assessment: '', final: '' },
    attendance: '100%',
    approved: false
  };

  users.push(newUser);
  saveUsers(users);
  alert('Registration successful! Please sign in.');
  switchTab('login');
  registerForm.reset();
}

function checkExistingSession() {
  const session = localStorage.getItem('sms_session');
  if (session) {
    currentUser = JSON.parse(session);
    loadDashboard();
  }
}

function logout() {
  localStorage.removeItem('sms_session');
  currentUser = null;
  dashboardContainer.classList.add('hidden');
  authContainer.classList.remove('hidden');
  loginForm.reset();
}

// --- DASHBOARD ROUTING ---
const ROLE_LABELS = {
  admin: 'Administrator', registrar: 'Registrar', college: 'College Dean',
  depthead: 'Department Head', teacher: 'Teacher', student: 'Student'
};

function loadDashboard() {
  authContainer.classList.add('hidden');
  dashboardContainer.classList.remove('hidden');

  document.getElementById('user-welcome').textContent = `Welcome, ${currentUser.name}`;
  document.getElementById('role-badge').textContent = ROLE_LABELS[currentUser.role] || currentUser.role;

  document.querySelectorAll('.role-view').forEach(v => v.classList.add('hidden'));

  if (currentUser.role === 'admin') {
    document.getElementById('admin-view').classList.remove('hidden');
    renderAdminTable();
  } else if (currentUser.role === 'registrar') {
    document.getElementById('registrar-view').classList.remove('hidden');
    renderRegistrarTable();
  } else if (currentUser.role === 'college') {
    document.getElementById('college-view').classList.remove('hidden');
    renderCollegeReport();
  } else if (currentUser.role === 'depthead') {
    document.getElementById('depthead-view').classList.remove('hidden');
    renderDeptHeadTable();
  } else if (currentUser.role === 'teacher') {
    document.getElementById('teacher-view').classList.remove('hidden');
    renderTeacherTable();
  } else if (currentUser.role === 'student') {
    document.getElementById('student-view').classList.remove('hidden');
    renderStudentProfile();
  }
}

// ============================================================
// ADMIN VIEW
// ============================================================
function onAdminRoleChange() {
  const role = document.getElementById('admin-add-role').value;
  const needsAssignment = role === 'college' || role === 'depthead' || role === 'teacher';
  document.getElementById('admin-add-college-wrap').classList.toggle('hidden', !needsAssignment);
  document.getElementById('admin-add-department-wrap').classList.toggle('hidden', role !== 'depthead' && role !== 'teacher');
}

function handleAdminAddAccount(e) {
  e.preventDefault();
  const name = document.getElementById('admin-add-name').value.trim();
  const email = document.getElementById('admin-add-email').value.trim();
  const password = document.getElementById('admin-add-pass').value.trim();
  const role = document.getElementById('admin-add-role').value;
  const collegeId = document.getElementById('admin-add-college').value;
  const departmentId = document.getElementById('admin-add-department').value;

  const users = getUsers();
  if (users.some(u => u.email === email)) {
    alert('Email already exists!');
    return;
  }

  const newUser = { id: Date.now().toString(), name, email, password, role };
  if (role === 'college' || role === 'depthead' || role === 'teacher') newUser.collegeId = collegeId;
  if (role === 'depthead' || role === 'teacher') newUser.departmentId = departmentId;

  users.push(newUser);
  saveUsers(users);
  e.target.reset();
  onAdminRoleChange();
  renderAdminTable();
}

function renderAdminTable() {
  const users = getUsers();
  const tbody = document.getElementById('admin-user-table');
  tbody.innerHTML = '';

  users.forEach(u => {
    const tr = document.createElement('tr');

    const passwordCell = u.role !== 'admin'
      ? `<input type="text" value="${u.password}" id="pass-${u.id}" class="inline-input" style="width:110px;">`
      : `<span>${u.password}</span>`;

    const actionCell = u.role !== 'admin'
      ? `<button onclick="updatePassword('${u.id}')" class="btn btn-primary btn-sm" style="margin-right:4px;">Save Pass</button>` +
        `<button onclick="deleteUser('${u.id}')" class="btn btn-danger btn-sm">Delete</button>`
      : '';

    tr.innerHTML = `
      <td>${u.id}</td>
      <td>${u.name}</td>
      <td>${u.email}</td>
      <td>${passwordCell}</td>
      <td>${ROLE_LABELS[u.role] || u.role}</td>
      <td>${u.collegeId ? collegeName(u.collegeId) : '-'}</td>
      <td>${u.departmentId ? departmentName(u.departmentId) : '-'}</td>
      <td>${actionCell}</td>
    `;
    tbody.appendChild(tr);
  });
}

function updatePassword(id) {
  const newPassInput = document.getElementById(`pass-${id}`).value.trim();
  if (!newPassInput) { alert('Password cannot be empty!'); return; }

  const users = getUsers();
  const index = users.findIndex(u => u.id === id);
  if (index !== -1) {
    users[index].password = newPassInput;
    saveUsers(users);
    alert(`Password updated successfully for ${users[index].name}!`);
    renderAdminTable();
  }
}

function deleteUser(id) {
  if (!confirm('Delete this account? This cannot be undone.')) return;
  const users = getUsers().filter(u => u.id !== id);
  saveUsers(users);
  renderAdminTable();
}

// ============================================================
// REGISTRAR VIEW
// ============================================================
function handleRegistrarEnroll(e) {
  e.preventDefault();
  const name = document.getElementById('reg2-name').value.trim();
  const email = document.getElementById('reg2-email').value.trim();
  const collegeId = document.getElementById('reg2-college').value;
  const departmentId = document.getElementById('reg2-department').value;
  const course = document.getElementById('reg2-course').value.trim();

  const users = getUsers();
  if (users.some(u => u.email === email)) {
    alert('Email already exists!');
    return;
  }

  const newStudent = {
    id: Date.now().toString(),
    name, email, password: 'pass', role: 'student',
    collegeId, departmentId, course,
    scores: { mid: '', assessment: '', final: '' },
    attendance: '100%',
    approved: false
  };

  users.push(newStudent);
  saveUsers(users);
  e.target.reset();
  refreshDeptOptions('reg2-college', 'reg2-department');
  renderRegistrarTable();
}

function renderRegistrarTable() {
  const students = getUsers().filter(u => u.role === 'student');
  const tbody = document.getElementById('registrar-student-table');
  tbody.innerHTML = '';

  students.forEach(s => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${s.id}</td>
      <td>${s.name}</td>
      <td>${s.email}</td>
      <td>${collegeName(s.collegeId)}</td>
      <td>${departmentName(s.departmentId)}</td>
      <td>${s.course || '-'}</td>
      <td><button onclick="deleteUser('${s.id}'); renderRegistrarTable();" class="btn btn-danger btn-sm">Remove</button></td>
    `;
    tbody.appendChild(tr);
  });
}

// ============================================================
// COLLEGE DEAN VIEW (read-only report)
// ============================================================
function renderCollegeReport() {
  const users = getUsers();
  const myDepts = deptsForCollege(currentUser.collegeId);
  const tbody = document.getElementById('college-report-table');
  tbody.innerHTML = '';

  myDepts.forEach(dep => {
    const teachers = users.filter(u => u.role === 'teacher' && u.departmentId === dep.id);
    const students = users.filter(u => u.role === 'student' && u.departmentId === dep.id);
    const head = users.find(u => u.role === 'depthead' && u.departmentId === dep.id);

    const totals = students.map(s => computeTotal(s.scores)).filter(t => t !== null && !isNaN(t) && t > 0);
    const avgTotal = totals.length ? (totals.reduce((a, b) => a + b, 0) / totals.length).toFixed(1) : '—';

    const attendances = students
      .map(s => parseFloat((s.attendance || '').replace('%', '')))
      .filter(n => !isNaN(n));
    const avgAttendance = attendances.length
      ? (attendances.reduce((a, b) => a + b, 0) / attendances.length).toFixed(1) + '%'
      : '—';

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${dep.name}</td>
      <td>${head ? head.name : '—'}</td>
      <td>${teachers.length}</td>
      <td>${students.length}</td>
      <td class="numeric">${avgTotal}</td>
      <td class="numeric">${avgAttendance}</td>
    `;
    tbody.appendChild(tr);
  });
}

// ============================================================
// DEPARTMENT HEAD VIEW
// ============================================================
function renderDeptHeadTable() {
  const users = getUsers();
  const students = users.filter(u => u.role === 'student' && u.departmentId === currentUser.departmentId);
  const tbody = document.getElementById('depthead-table');
  tbody.innerHTML = '';

  students.forEach(s => {
    const total = computeTotal(s.scores);
    const grade = computeGrade(total);
    const statusHtml = s.approved
      ? '<span class="status-pill status-approved">Approved</span>'
      : '<span class="status-pill status-pending">Pending</span>';
    const actionHtml = s.approved
      ? `<button onclick="setApproval('${s.id}', false)" class="btn btn-danger btn-sm">Unapprove</button>`
      : `<button onclick="setApproval('${s.id}', true)" class="btn btn-primary btn-sm">Approve</button>`;

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${s.name}</td>
      <td>${s.course || '-'}</td>
      <td class="numeric">${s.scores?.mid ?? '—'}</td>
      <td class="numeric">${s.scores?.assessment ?? '—'}</td>
      <td class="numeric">${s.scores?.final ?? '—'}</td>
      <td class="total-cell">${total || '—'}</td>
      <td>${gradePillHtml(grade)}</td>
      <td class="numeric">${s.attendance || '—'}</td>
      <td>${statusHtml}</td>
      <td>${actionHtml}</td>
    `;
    tbody.appendChild(tr);
  });
}

function setApproval(id, approved) {
  const users = getUsers();
  const index = users.findIndex(u => u.id === id);
  if (index !== -1) {
    users[index].approved = approved;
    saveUsers(users);
    renderDeptHeadTable();
  }
}

// ============================================================
// TEACHER VIEW — gradebook
// ============================================================
function renderTeacherTable() {
  const users = getUsers();
  const students = currentUser.departmentId
    ? users.filter(u => u.role === 'student' && u.departmentId === currentUser.departmentId)
    : users.filter(u => u.role === 'student');

  const tbody = document.getElementById('teacher-student-table');
  tbody.innerHTML = '';

  students.forEach(s => {
    const scores = s.scores || { mid: '', assessment: '', final: '' };
    const total = computeTotal(scores);
    const grade = computeGrade(total);

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${s.name}</td>
      <td>${s.course || '-'}</td>
      <td><input type="number" min="0" max="${MAX_MID}" value="${scores.mid ?? ''}" id="mid-${s.id}" class="inline-input" oninput="previewTotal('${s.id}')"></td>
      <td><input type="number" min="0" max="${MAX_ASSESSMENT}" value="${scores.assessment ?? ''}" id="assessment-${s.id}" class="inline-input" oninput="previewTotal('${s.id}')"></td>
      <td><input type="number" min="0" max="${MAX_FINAL}" value="${scores.final ?? ''}" id="final-${s.id}" class="inline-input" oninput="previewTotal('${s.id}')"></td>
      <td class="total-cell" id="total-${s.id}">${total || '—'}</td>
      <td id="grade-${s.id}">${gradePillHtml(grade)}</td>
      <td><input type="text" value="${s.attendance || ''}" id="att-${s.id}" class="inline-input" style="width:56px;"></td>
      <td><button onclick="updateStudent('${s.id}')" class="btn btn-primary btn-sm">Save</button></td>
    `;
    tbody.appendChild(tr);
  });
}

function previewTotal(id) {
  const mid = document.getElementById(`mid-${id}`).value;
  const assessment = document.getElementById(`assessment-${id}`).value;
  const final = document.getElementById(`final-${id}`).value;
  const total = computeTotal({ mid, assessment, final });
  const grade = computeGrade(total);
  document.getElementById(`total-${id}`).textContent = total || '—';
  document.getElementById(`grade-${id}`).innerHTML = gradePillHtml(grade);
}

function updateStudent(id) {
  const mid = document.getElementById(`mid-${id}`).value;
  const assessment = document.getElementById(`assessment-${id}`).value;
  const final = document.getElementById(`final-${id}`).value;
  const attInput = document.getElementById(`att-${id}`).value;

  const users = getUsers();
  const index = users.findIndex(u => u.id === id);
  if (index !== -1) {
    users[index].scores = { mid, assessment, final };
    users[index].attendance = attInput;
    users[index].approved = false; // score changed — needs re-approval
    saveUsers(users);
    alert('Student record updated successfully! Awaiting department head approval.');
    renderTeacherTable();
  }
}

// ============================================================
// STUDENT VIEW
// ============================================================
function renderStudentProfile() {
  const users = getUsers();
  const me = users.find(u => u.id === currentUser.id);
  if (!me) return;

  document.getElementById('st-profile-name').textContent = me.name;
  document.getElementById('st-profile-email').textContent = me.email;
  document.getElementById('st-profile-college').textContent = collegeName(me.collegeId);
  document.getElementById('st-profile-department').textContent = departmentName(me.departmentId);
  document.getElementById('st-profile-course').textContent = me.course || 'N/A';
  document.getElementById('st-profile-attendance').textContent = me.attendance || 'N/A';
  document.getElementById('st-profile-status').innerHTML = me.approved
    ? '<span class="status-pill status-approved">Approved</span>'
    : '<span class="status-pill status-pending">Pending review</span>';

  const scores = me.scores || {};
  const total = computeTotal(scores);
  const grade = computeGrade(total);

  document.getElementById('st-mid').textContent = scores.mid !== '' && scores.mid !== undefined ? scores.mid : '—';
  document.getElementById('st-assessment').textContent = scores.assessment !== '' && scores.assessment !== undefined ? scores.assessment : '—';
  document.getElementById('st-final').textContent = scores.final !== '' && scores.final !== undefined ? scores.final : '—';
  document.getElementById('st-total').textContent = total || '—';
  document.getElementById('st-grade').textContent = grade || '—';
}
