// ============================================
// QUẢN LÝ HSG TIN HỌC - Frontend Logic
// ============================================

// --- Global State ---
// ⚠️ DÁN LINK GOOGLE APPS SCRIPT CỦA BẠN VÀO ĐÂY:
const gasUrl = 'https://script.google.com/macros/s/AKfycbxOrl60Aium7fURmNkUOd-fs_NvW0Xbd3cYr2fsraaHxnwcjNTd5vNlMMaVRvjmVcQH/exec';

let apiKey = localStorage.getItem('gemini_api_key') || '';
let modelName = localStorage.getItem('gemini_model_name') || 'gemini-3-flash-preview';
let currentUser = null; // { username, fullName, className, role }
let selectedRole = '';
let selectedAssignment = null; // Tên đề bài học sinh chọn

// --- DOM References ---
const $ = id => document.getElementById(id);

const loginScreen = $('login-screen');
const roleSelect = $('role-select');
const loginForm = $('login-form');
const loginTitle = $('login-title');
const backToRoles = $('back-to-roles');
const usernameInput = $('username');
const passwordInput = $('password');
const loginBtn = $('login-btn');
const showRegisterBtn = $('show-register-btn');

const registerModal = $('register-modal');
const closeRegister = $('close-register');
const registerBtn = $('register-btn');

const appContainer = $('app-container');
const teacherNav = $('teacher-nav');
const studentNav = $('student-nav');
const userBadge = $('user-badge');
const logoutBtn = $('logout-btn');

const settingsModal = $('settings-modal');
const openSettingsBtn = $('open-settings');
const closeSettingsBtn = $('close-settings');
const saveSettingsBtn = $('save-settings');

const apiKeyInput = $('api-key');
const modelInput = $('model-select');

// --- Init Settings ---
apiKeyInput.value = apiKey;
modelInput.value = modelName;

const addAccountModal = $('add-account-modal');
const addAccountBtn = $('add-account-btn');
const closeAddAccount = $('close-add-account');
const confirmAddAccount = $('confirm-add-account');
const refreshStudentsBtn = $('refresh-students-btn');

const problemDropZone = $('problem-drop-zone');
const problemInput = $('problem-input');
const problemPreview = $('problem-preview');
const confirmUploadBtn = $('confirm-upload-btn');
const clearProblemBtn = $('clear-problem-btn');
const teacherUploadActions = $('teacher-upload-actions');
const assignmentsList = $('assignments-list');
const studentManagement = $('student-management');

const dropZone = $('drop-zone');
const fileInput = $('file-input');
const codePreview = $('code-preview');
const analyzeBtn = $('analyze-btn');
const clearCodeBtn = $('clear-code-btn');
const studentUploadActions = $('student-upload-actions');
const studentProblemView = $('student-problem-view');
const resultSection = $('result-section');
const loadingOverlay = $('loading-overlay');
const loadingText = $('loading-text');

const refreshHistoryBtn = $('refresh-history-btn');
const studentHistoryList = $('student-history-list');
let currentStudentHistory = [];
if (refreshHistoryBtn) {
    refreshHistoryBtn.addEventListener('click', loadStudentHistory);
}

const tabBtns = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');



// ============================================
// 1. LOGIN & REGISTRATION
// ============================================

document.querySelectorAll('.role-card').forEach(card => {
    card.addEventListener('click', () => {
        selectedRole = card.dataset.role;
        roleSelect.style.display = 'none';
        loginForm.style.display = 'block';
        loginTitle.textContent = selectedRole === 'gv' ? 'Đăng nhập Giáo viên' : 'Đăng nhập Học sinh';
        showRegisterBtn.style.display = selectedRole === 'hs' ? 'block' : 'none';
    });
});

backToRoles.addEventListener('click', () => {
    loginForm.style.display = 'none';
    roleSelect.style.display = 'grid';
    usernameInput.value = '';
    passwordInput.value = '';
});

loginBtn.addEventListener('click', async () => {
    const user = usernameInput.value.trim();
    const pass = passwordInput.value.trim();
    if (!user || !pass) return alert('Vui lòng nhập đầy đủ!');
    if (!gasUrl) return alert('Vui lòng cấu hình Google Apps Script URL trong Cài đặt!');

    showLoading(true, 'Đang đăng nhập...');
    try {
        const res = await callGAS({ action: 'login', username: user, password: pass, role: selectedRole });
        if (res.success) {
            currentUser = res.user;
            enterApp();
        } else {
            alert(res.message || 'Đăng nhập thất bại!');
        }
    } catch (e) { alert('Lỗi kết nối: ' + e.message); }
    finally { showLoading(false); }
});

showRegisterBtn.addEventListener('click', () => registerModal.classList.add('active'));
closeRegister.addEventListener('click', () => registerModal.classList.remove('active'));

registerBtn.addEventListener('click', async () => {
    const u = $('reg-user').value.trim();
    const p = $('reg-pass').value.trim();
    const n = $('reg-name').value.trim();
    const c = $('reg-class').value.trim();
    if (!u || !p || !n) return alert('Vui lòng nhập đầy đủ Tài khoản, Mật khẩu và Họ tên!');
    if (!gasUrl) return alert('Vui lòng cấu hình Apps Script URL!');

    showLoading(true, 'Đang đăng ký...');
    try {
        const res = await callGAS({ action: 'register', username: u, password: p, fullName: n, className: c });
        alert(res.message);
        if (res.success) {
            registerModal.classList.remove('active');
            usernameInput.value = u;
            passwordInput.value = p;
        }
    } catch (e) { alert('Lỗi: ' + e.message); }
    finally { showLoading(false); }
});

logoutBtn.addEventListener('click', () => {
    currentUser = null;
    appContainer.style.display = 'none';
    loginScreen.style.display = 'block';
    loginForm.style.display = 'none';
    roleSelect.style.display = 'grid';
    usernameInput.value = '';
    passwordInput.value = '';
});

function enterApp() {
    loginScreen.style.display = 'none';
    appContainer.style.display = 'block';
    userBadge.textContent = currentUser.fullName;

    if (currentUser.role === 'gv') {
        teacherNav.style.display = 'flex';
        studentNav.style.display = 'flex';
        switchTab('teacher-tab');
    } else {
        teacherNav.style.display = 'none';
        studentNav.style.display = 'flex';
        switchTab('student-tab');
    }
    lucide.createIcons();
}

// ============================================
// 2. TABS
// ============================================

tabBtns.forEach(btn => btn.addEventListener('click', () => switchTab(btn.dataset.tab)));

function switchTab(tabId) {
    tabBtns.forEach(b => b.classList.toggle('active', b.dataset.tab === tabId));
    tabContents.forEach(c => c.classList.toggle('active', c.id === tabId));
    if (tabId === 'teacher-tab') { loadAssignments(); loadStudents(); }
    if (tabId === 'student-tab') { loadStudentAssignments(); loadStudentHistory(); }
}

// ============================================
// 3. SETTINGS
// ============================================

openSettingsBtn.addEventListener('click', () => settingsModal.classList.add('active'));
closeSettingsBtn.addEventListener('click', () => settingsModal.classList.remove('active'));
saveSettingsBtn.addEventListener('click', () => {
    apiKey = apiKeyInput.value.trim();
    modelName = modelInput.value.trim();
    localStorage.setItem('gemini_api_key', apiKey);
    localStorage.setItem('gemini_model_name', modelName);
    settingsModal.classList.remove('active');
    alert('Đã lưu cài đặt!');
});

// ============================================
// 4. TEACHER: UPLOAD ASSIGNMENT
// ============================================

let pendingProblemFile = null;

problemDropZone.addEventListener('click', (e) => { if (e.target.closest('.btn-action')) return; problemInput.click(); });
problemDropZone.addEventListener('dragover', e => { e.preventDefault(); problemDropZone.classList.add('drag-over'); });
problemDropZone.addEventListener('dragleave', () => problemDropZone.classList.remove('drag-over'));
problemDropZone.addEventListener('drop', e => { e.preventDefault(); problemDropZone.classList.remove('drag-over'); if (e.dataTransfer.files[0]) selectProblemFile(e.dataTransfer.files[0]); });
problemInput.addEventListener('change', e => { if (e.target.files[0]) selectProblemFile(e.target.files[0]); });

function selectProblemFile(file) {
    pendingProblemFile = file;
    problemPreview.style.display = 'block';
    problemPreview.innerHTML = `<span>📎 ${file.name}</span>`;
    teacherUploadActions.style.display = 'flex';
    lucide.createIcons();
}

clearProblemBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    pendingProblemFile = null;
    problemPreview.style.display = 'none';
    teacherUploadActions.style.display = 'none';
    problemInput.value = '';
});

confirmUploadBtn.addEventListener('click', async (e) => {
    e.stopPropagation();
    if (!pendingProblemFile) return alert('Chưa chọn file!');
    await uploadAssignment(pendingProblemFile);
    pendingProblemFile = null;
    teacherUploadActions.style.display = 'none';
});

async function uploadAssignment(file) {
    showLoading(true, 'Đang tải đề bài lên Google Drive...');
    try {
        const base64 = await fileToBase64Raw(file);
        const res = await callGAS({ action: 'uploadAssignment', fileData: base64, fileName: file.name, mimeType: file.type });
        if (res.success) {
            problemPreview.innerHTML = `<span style="color:var(--success)">✓ ${file.name} - Đã đăng!</span>`;
            alert(res.message);
            loadAssignments();
        } else { alert('Lỗi: ' + res.message); }
    } catch (e) { alert('Lỗi upload: ' + e.message); }
    finally { showLoading(false); }
}

async function loadAssignments() {
    try {
        const res = await callGAS({ action: 'getAssignments' });
        if (res.success && res.data.length > 0) {
            assignmentsList.innerHTML = res.data.map((a, idx) =>
                `<div class="assignment-item">
                    <span class="assign-num">${idx + 1}.</span>
                    <a href="${a.link}" target="_blank">${a.fileName}</a>
                    <span class="time">${a.time}</span>
                    <button class="btn-del" onclick="deleteAssignment(${a.row}, '${a.fileName}')">Xóa</button>
                </div>`
            ).join('');
        } else { assignmentsList.innerHTML = '<p class="empty-msg">Chưa có đề bài.</p>'; }
    } catch (e) { assignmentsList.innerHTML = '<p class="empty-msg">Lỗi tải dữ liệu.</p>'; }
}

async function deleteAssignment(row, name) {
    if (!confirm(`Xóa đề bài "${name}"?`)) return;
    showLoading(true, 'Đang xóa đề bài...');
    try {
        const res = await callGAS({ action: 'deleteAssignment', row });
        if (res.success) { loadAssignments(); }
        else { alert('Lỗi: ' + res.message); }
    } catch (e) { alert('Lỗi: ' + e.message); }
    finally { showLoading(false); }
}
window.deleteAssignment = deleteAssignment;

// ============================================
// 5. TEACHER: STUDENT MANAGEMENT
// ============================================

addAccountBtn.addEventListener('click', () => addAccountModal.classList.add('active'));
closeAddAccount.addEventListener('click', () => addAccountModal.classList.remove('active'));

confirmAddAccount.addEventListener('click', async () => {
    const u = $('new-acc-user').value.trim();
    const p = $('new-acc-pass').value.trim();
    const n = $('new-acc-name').value.trim();
    const c = $('new-acc-class').value.trim();
    if (!u || !p || !n) return alert('Nhập đầy đủ thông tin!');

    showLoading(true, 'Đang thêm tài khoản...');
    try {
        const res = await callGAS({ action: 'addAccount', username: u, password: p, fullName: n, className: c, role: 'hs' });
        alert(res.message);
        if (res.success) { addAccountModal.classList.remove('active'); loadStudents(); }
    } catch (e) { alert('Lỗi: ' + e.message); }
    finally { showLoading(false); }
});

refreshStudentsBtn.addEventListener('click', () => loadStudents());

async function loadStudents() {
    studentManagement.innerHTML = '<p class="empty-msg">Đang tải...</p>';
    try {
        const res = await callGAS({ action: 'getStudents' });
        if (!res.success) { studentManagement.innerHTML = '<p class="empty-msg">Lỗi.</p>'; return; }

        let html = '';
        // Account list
        if (res.accounts.length > 0) {
            html += `<table class="student-table"><thead><tr>
                <th>TK</th><th>Họ tên</th><th>Lớp</th><th></th>
            </tr></thead><tbody>`;
            res.accounts.forEach(a => {
                html += `<tr>
                    <td>${a.username}</td><td>${a.fullName}</td><td>${a.className}</td>
                    <td><button class="btn-del" onclick="deleteStudent('${a.username}')">Xóa</button></td>
                </tr>`;
            });
            html += '</tbody></table>';
        }

        // Submissions
        if (res.submissions.length > 0) {
            html += '<h4 style="margin:1.5rem 0 1rem;display:flex;align-items:center;gap:0.5rem;"><i data-lucide="file-check" size="16"></i> Bài nộp gần đây</h4>';
            html += `<table class="student-table"><thead><tr>
                <th>Họ tên</th><th>Đề bài</th><th>File</th><th>Điểm</th><th>Lỗi</th><th>Ưu điểm</th><th>Gợi ý</th><th>Thời gian</th><th></th>
            </tr></thead><tbody>`;
            res.submissions.forEach(s => {
                html += `<tr>
                    <td>${s.fullName}</td>
                    <td style="font-weight:600;color:var(--primary);">${s.assignmentName || '-'}</td>
                    <td><a href="${s.link}" target="_blank" style="color:var(--primary)">${s.fileName}</a></td>
                    <td><span class="score-badge">${s.score}</span></td>
                    <td style="max-width:200px;font-size:0.8rem;">${truncate(s.errors, 100)}</td>
                    <td style="max-width:150px;font-size:0.8rem;">${truncate(s.pros, 80)}</td>
                    <td style="max-width:150px;font-size:0.8rem;">${truncate(s.suggestions, 80)}</td>
                    <td style="white-space:nowrap;">${s.time}</td>
                    <td><button class="btn-del" onclick="deleteSubmission(${s.row}, '${s.fullName}')">Xóa</button></td>
                </tr>`;
            });
            html += '</tbody></table>';
        } else if (res.accounts.length === 0) {
            html = '<p class="empty-msg">Chưa có học sinh nào.</p>';
        }

        studentManagement.innerHTML = html || '<p class="empty-msg">Chưa có dữ liệu.</p>';
        lucide.createIcons();
    } catch (e) { studentManagement.innerHTML = `<p class="empty-msg">Lỗi: ${e.message}</p>`; }
}

async function deleteStudent(username) {
    if (!confirm(`Xóa tài khoản "${username}"?`)) return;
    showLoading(true, 'Đang xóa...');
    try {
        await callGAS({ action: 'deleteStudent', username });
        loadStudents();
    } catch (e) { alert('Lỗi: ' + e.message); }
    finally { showLoading(false); }
}

async function deleteSubmission(row, name) {
    if (!confirm(`Xóa bài nộp của "${name}"?`)) return;
    showLoading(true, 'Đang xóa bài nộp...');
    try {
        const res = await callGAS({ action: 'deleteSubmission', row });
        if (res.success) { loadStudents(); }
        else { alert('Lỗi: ' + res.message); }
    } catch (e) { alert('Lỗi: ' + e.message); }
    finally { showLoading(false); }
}

// Expose to global for inline onclick
window.deleteStudent = deleteStudent;
window.deleteSubmission = deleteSubmission;

// ============================================
// 6. STUDENT: VIEW ASSIGNMENTS
// ============================================

async function loadStudentAssignments() {
    studentProblemView.innerHTML = '<p class="empty-msg">Đang tải đề bài...</p>';
    try {
        const res = await callGAS({ action: 'getAssignments' });
        if (res.success && res.data.length > 0) {
            studentProblemView.innerHTML = res.data.map((a, idx) =>
                `<div class="assignment-item">
                    <input type="checkbox" class="assign-checkbox" id="check-${idx}" onchange="selectAssignment('${a.fileName}', this)">
                    <label for="check-${idx}" class="assign-num">${idx + 1}.</label>
                    <a href="${a.link}" target="_blank">${a.fileName}</a>
                </div>`
            ).join('');
        } else { studentProblemView.innerHTML = '<p class="empty-msg">Chưa có đề bài.</p>'; }
    } catch (e) { studentProblemView.innerHTML = '<p class="empty-msg">Lỗi tải đề bài.</p>'; }
}

function selectAssignment(name, checkbox) {
    const checkboxes = document.querySelectorAll('.assign-checkbox');
    checkboxes.forEach(cb => { if (cb !== checkbox) cb.checked = false; });
    
    if (checkbox.checked) {
        selectedAssignment = name;
    } else {
        selectedAssignment = null;
    }
}
window.selectAssignment = selectAssignment;

async function loadStudentHistory() {
    if (!studentHistoryList) return;
    studentHistoryList.innerHTML = '<p class="empty-msg">Đang tải lịch sử...</p>';
    try {
        const res = await callGAS({ action: 'getStudentHistory', username: currentUser.username });
        if (res.success && res.history.length > 0) {
            currentStudentHistory = res.history;
            let html = `<table class="student-table"><thead><tr>
                <th>Đề bài</th><th>File</th><th>Điểm</th><th>Thời gian</th><th></th>
            </tr></thead><tbody>`;
            res.history.forEach((h, idx) => {
                html += `<tr>
                    <td style="font-weight:600;color:var(--primary);">${h.assignmentName || '-'}</td>
                    <td><a href="${h.link}" target="_blank" style="color:var(--primary)">${h.fileName}</a></td>
                    <td><span class="score-badge">${h.score}</span></td>
                    <td>${h.time}</td>
                    <td style="display:flex;gap:0.5rem;align-items:center;">
                        <button class="btn-small" onclick="viewHistoryDetail(${idx})">Xem chi tiết</button>
                        <button class="btn-del" onclick="deleteHistorySubmission(${h.row}, '${h.fileName}')">Xóa</button>
                    </td>
                </tr>`;
            });
            html += '</tbody></table>';
            studentHistoryList.innerHTML = html;
        } else {
            currentStudentHistory = [];
            studentHistoryList.innerHTML = '<p class="empty-msg">Chưa có lịch sử nộp bài.</p>';
        }
    } catch (e) {
        studentHistoryList.innerHTML = '<p class="empty-msg">Lỗi tải lịch sử.</p>';
    }
}

window.deleteHistorySubmission = async function(row, fileName) {
    if (!confirm(`Bạn có chắc muốn xóa bài nộp "${fileName}" khỏi lịch sử?`)) return;
    showLoading(true, 'Đang xóa bài nộp...');
    try {
        const res = await callGAS({ action: 'deleteSubmission', row });
        if (res.success) {
            loadStudentHistory();
        } else {
            alert('Lỗi: ' + res.message);
        }
    } catch (e) {
        alert('Lỗi: ' + e.message);
    } finally {
        showLoading(false);
    }
}

window.viewHistoryDetail = function(idx) {
    const item = currentStudentHistory[idx];
    if (!item || !item.raw_json) return alert('Không có dữ liệu nhận xét chi tiết (chỉ hỗ trợ các bài nộp mới).');
    try {
        const result = JSON.parse(item.raw_json);
        displayResults(result);
        $('code-preview').style.display = 'block';
        $('code-preview').innerHTML = `<span>📎 ${item.fileName} (Lịch sử)</span>`;
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    } catch (e) {
        alert('Lỗi đọc dữ liệu: ' + e.message);
    }
}

// ============================================
// 7. STUDENT: SUBMIT CODE
// ============================================

let currentCodeFile = null;
let currentCodeContent = '';
let currentCodeFileName = '';

dropZone.addEventListener('click', (e) => { if (e.target.closest('.btn-action')) return; fileInput.click(); });
dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('drag-over'); });
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
dropZone.addEventListener('drop', e => { e.preventDefault(); dropZone.classList.remove('drag-over'); if (e.dataTransfer.files[0]) selectCodeFile(e.dataTransfer.files[0]); });
fileInput.addEventListener('change', e => { if (e.target.files[0]) selectCodeFile(e.target.files[0]); });

function selectCodeFile(file) {
    currentCodeFile = file;
    currentCodeFileName = file.name;
    codePreview.style.display = 'block';
    codePreview.innerHTML = `<span>📎 ${file.name}</span>`;
    studentUploadActions.style.display = 'flex';

    const reader = new FileReader();
    reader.onload = e => { currentCodeContent = e.target.result; };
    reader.readAsText(file);
    lucide.createIcons();
}

clearCodeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    currentCodeFile = null;
    currentCodeContent = '';
    currentCodeFileName = '';
    codePreview.style.display = 'none';
    studentUploadActions.style.display = 'none';
    fileInput.value = '';
    resultSection.style.display = 'none';
    if ($('reference-code-section')) $('reference-code-section').style.display = 'none';
});

analyzeBtn.addEventListener('click', async (e) => {
    e.stopPropagation();
    if (!currentCodeContent) return alert('Chưa chọn file bài làm!');
    if (!selectedAssignment) return alert('Vui lòng tích chọn đề bài tương ứng ở cột bên trái!');
    if (!apiKey) { alert('Cấu hình Gemini AI trong Cài đặt!'); settingsModal.classList.add('active'); return; }
    await analyzeCode();
});

async function analyzeCode() {
    showLoading(true, 'AI đang phân tích bài làm...');
    resultSection.style.display = 'none';

    const promptText = `Bạn là giảng viên chấm bài lập trình chuyên nghiệp.
Nhiệm vụ:
1. Nhận diện ngôn ngữ lập trình của bài làm dựa trên mã nguồn và đuôi file.
2. Chấm điểm và phân tích lỗi bài làm của học sinh ĐÚNG THEO NGỮ CẢNH CỦA NGÔN NGỮ ĐÓ. Tuyệt đối không lấy khái niệm của ngôn ngữ này (ví dụ C/C++) để nhận xét cho ngôn ngữ khác (ví dụ Pascal hoặc Python).

Mã nguồn học sinh nộp (File: ${currentCodeFileName}):
\`\`\`
${currentCodeContent}
\`\`\`

Yêu cầu phản hồi bằng JSON DUY NHẤT (không kèm text khác):
{
  "score": number (0-10),
  "summary": "Nhận xét tổng quan (Tiếng Việt)",
  "errors": [
    {
      "type": "Cú pháp" hoặc "Logic",
      "line": number,
      "description": "Mô tả lỗi (Tiếng Việt)",
      "wrong_code": "Code sai",
      "correct_code": "Code đúng"
    }
  ],
  "pros": ["Ưu điểm"],
  "suggestions": ["Gợi ý"],
  "reference_code": "Mã code mẫu hoàn chỉnh sau khi đã sửa lỗi (nếu có, để trống nếu không cần)"
}
Nếu không có lỗi, "errors" để trống [].`;

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: promptText }] }] })
        });
        if (!response.ok) {
            const errData = await response.text();
            throw new Error('Lỗi API Gemini: ' + errData);
        }

        const data = await response.json();
        const resText = data.candidates[0].content.parts[0].text;
        const result = JSON.parse(resText.replace(/```json|```/g, '').trim());

        displayResults(result);

        // Save to Google Sheet
        showLoading(true, 'Đang lưu kết quả...');
        const base64 = await fileToBase64Raw(currentCodeFile);
        const errText = (result.errors || []).map(e => `[${e.type}] Dòng ${e.line}: ${e.description}`).join('\n');
        const prosText = (result.pros || []).join(', ');
        const sugText = (result.suggestions || []).join(', ');
        await callGAS({
            action: 'submitWork',
            username: currentUser.username,
            assignmentName: selectedAssignment,
            fileData: base64,
            fileName: currentCodeFileName,
            mimeType: 'text/plain',
            score: result.score,
            errors: errText,
            pros: prosText,
            suggestions: sugText,
            raw_json: JSON.stringify(result)
        });
        loadStudentHistory();
    } catch (error) {
        console.error(error);
        alert('Lỗi phân tích: ' + error.message);
    } finally { showLoading(false); }
}

function displayResults(result) {
    resultSection.style.display = 'block';
    $('score-value').innerText = result.score;
    const pct = (result.score / 10) * 100;
    $('score-circle').style.setProperty('--percentage', `${(pct / 100) * 360}deg`);
    $('feedback-summary').innerText = result.summary;

    const ec = $('errors-container');
    if (!result.errors || result.errors.length === 0) {
        ec.innerHTML = '<p style="color:var(--success);padding:1rem;">Tuyệt vời! Không phát hiện lỗi.</p>';
    } else {
        ec.innerHTML = result.errors.map(err => `
            <div class="error-item">
                <div class="error-meta">
                    <span class="badge ${err.type === 'Cú pháp' ? 'badge-danger' : 'badge-warning'}">${err.type}</span>
                    <span style="color:var(--text-muted)">Dòng ${err.line}</span>
                </div>
                <div class="error-desc">${err.description}</div>
                <div class="code-diff">
                    <div class="code-block" data-label="Sai"><code class="code-wrong">${escHtml(err.wrong_code)}</code></div>
                    <div class="code-block" data-label="Đúng"><code class="code-correct">${escHtml(err.correct_code)}</code></div>
                </div>
            </div>`).join('');
    }
    renderList('pros-content', result.pros);
    renderList('suggestions-content', result.suggestions);
    
    const refCodeSection = $('reference-code-section');
    const refCodeContent = $('reference-code-content');
    if (result.reference_code && result.reference_code.trim() !== '') {
        refCodeSection.style.display = 'block';
        refCodeContent.textContent = result.reference_code;
    } else {
        refCodeSection.style.display = 'none';
    }

    resultSection.scrollIntoView({ behavior: 'smooth' });
    lucide.createIcons();
}

// ============================================
// HELPERS
// ============================================

async function callGAS(payload) {
    try {
        const res = await fetch(gasUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(payload),
            redirect: 'follow'
        });
        const text = await res.text();
        try {
            return JSON.parse(text);
        } catch {
            console.error('GAS raw response:', text);
            return { success: false, message: 'Phản hồi server không hợp lệ' };
        }
    } catch (err) {
        console.error('GAS fetch error:', err);
        throw new Error('Không thể kết nối server.\nKiểm tra:\n1. Đã chạy setupSheet() chưa\n2. Deploy > New deployment > Web app\n3. Who has access = Anyone\n4. Copy đúng URL deployment');
    }
}

function fileToBase64Raw(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result.split(',')[1]); // return only base64 part
        reader.onerror = e => reject(e);
    });
}

function renderList(id, items) {
    const c = $(id);
    if (!items || items.length === 0) { c.innerHTML = 'Không có.'; return; }
    c.innerHTML = `<ul>${items.map(i => `<li>${i}</li>`).join('')}</ul>`;
}

function showLoading(show, text) {
    loadingOverlay.style.display = show ? 'flex' : 'none';
    if (text) loadingText.textContent = text;
}

function truncate(str, max) {
    if (!str) return '';
    return str.length > max ? str.substring(0, max) + '...' : str;
}

function escHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
