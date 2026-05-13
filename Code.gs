// QUẢN LÝ HSG TIN HỌC - Google Apps Script Backend
// ============================================
// HƯỚNG DẪN CÀI ĐẶT:
// 1. Tạo Google Sheet mới
// 2. Vào Extensions > Apps Script
// 3. Dán toàn bộ code này vào
// 4. Chạy hàm setupSheet() một lần (Run > setupSheet)
// 5. Cấp quyền khi được yêu cầu
// 6. Deploy > New deployment > Web app
//    - Execute as: Me
//    - Who has access: Anyone
// 7. Copy URL deployment, dán vào phần Cài đặt của web app
// ============================================

const FOLDER_NAME = 'QUAN_LY_HSG_TIN_HOC_Data';
const SHEET_ACCOUNTS = 'TaiKhoan';
const SHEET_ASSIGNMENTS = 'DeBai';
const SHEET_SUBMISSIONS = 'BaiNop';
const SPREADSHEET_ID = '10bVigCYjbEZLjV9D8M7xQHwpjj799t0LWINzA04BamU';

// === SETUP ===
function setupSheet() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

  let s1 = ss.getSheetByName(SHEET_ACCOUNTS);
  if (!s1) {
    s1 = ss.insertSheet(SHEET_ACCOUNTS);
  }
  s1.getRange(1, 1, 1, 5).setValues([['Tài khoản', 'Mật khẩu', 'Họ tên', 'Lớp', 'Vai trò']]);
  // Tạo tài khoản admin mặc định
  if (s1.getLastRow() < 2) {
    s1.appendRow(['admin', 'admin', 'Quản trị viên', '', 'gv']);
  }

  let s2 = ss.getSheetByName(SHEET_ASSIGNMENTS);
  if (!s2) {
    s2 = ss.insertSheet(SHEET_ASSIGNMENTS);
  }
  s2.getRange(1, 1, 1, 3).setValues([['Link file', 'Tên file', 'Thời gian']]);

  let s3 = ss.getSheetByName(SHEET_SUBMISSIONS);
  if (!s3) {
    s3 = ss.insertSheet(SHEET_SUBMISSIONS);
  }
  s3.getRange(1, 1, 1, 10).setValues([['Tài khoản', 'Đề bài', 'Link bài nộp', 'Điểm', 'Lỗi chi tiết', 'Ưu điểm', 'Gợi ý', 'Tên file', 'Thời gian', 'Dữ liệu AI (JSON)']]);

  getOrCreateFolder();
  Logger.log('✅ Setup hoàn tất!');
}

function getOrCreateFolder() {
  const it = DriveApp.getFoldersByName(FOLDER_NAME);
  if (it.hasNext()) return it.next();
  return DriveApp.createFolder(FOLDER_NAME);
}

// === API ROUTER ===
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    let result;
    switch (data.action) {
      case 'login': result = handleLogin(data); break;
      case 'register': result = handleRegister(data); break;
      case 'uploadAssignment': result = handleUploadAssignment(data); break;
      case 'getAssignments': result = handleGetAssignments(); break;
      case 'submitWork': result = handleSubmitWork(data); break;
      case 'getStudentHistory': result = handleGetStudentHistory(data); break;
      case 'getStudents': result = handleGetStudents(); break;
      case 'deleteStudent': result = handleDeleteStudent(data); break;
      case 'deleteAssignment': result = handleDeleteAssignment(data); break;
      case 'deleteSubmission': result = handleDeleteSubmission(data); break;
      case 'addAccount': result = handleAddAccount(data); break;
      default: result = { success: false, message: 'Hành động không hợp lệ' };
    }
    return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, message: err.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  try {
    const action = e.parameter.action;
    let result;
    switch (action) {
      case 'getAssignments': result = handleGetAssignments(); break;
      case 'getStudents': result = handleGetStudents(); break;
      default: result = { success: false, message: 'Hành động không hợp lệ' };
    }
    return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, message: err.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}

// === HANDLERS ===

function handleLogin(data) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_ACCOUNTS);
  const rows = sheet.getDataRange().getValues();
  const role = String(data.role);

  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]).toLowerCase() === String(data.username).toLowerCase() && String(rows[i][1]) === String(data.password) && String(rows[i][4]) === role) {
      return { success: true, user: { username: String(rows[i][0]), fullName: String(rows[i][2]), className: String(rows[i][3]), role: String(rows[i][4]) } };
    }
  }
  return { success: false, message: 'Tài khoản hoặc mật khẩu không đúng!' };
}

function handleRegister(data) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_ACCOUNTS);
  const rows = sheet.getDataRange().getValues();

  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === data.username) {
      return { success: false, message: 'Tài khoản đã tồn tại!' };
    }
  }
  sheet.appendRow([data.username, data.password, data.fullName, data.className || '', 'hs']);
  return { success: true, message: 'Đăng ký thành công!' };
}

function handleAddAccount(data) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_ACCOUNTS);
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === data.username) {
      return { success: false, message: 'Tài khoản đã tồn tại!' };
    }
  }
  sheet.appendRow([data.username, data.password, data.fullName, data.className || '', data.role || 'hs']);
  return { success: true, message: 'Thêm tài khoản thành công!' };
}

function handleDeleteStudent(data) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_ACCOUNTS);
  const rows = sheet.getDataRange().getValues();
  for (let i = rows.length - 1; i >= 1; i--) {
    if (rows[i][0] === data.username) {
      sheet.deleteRow(i + 1);
      return { success: true, message: 'Đã xóa tài khoản.' };
    }
  }
  return { success: false, message: 'Không tìm thấy tài khoản.' };
}

function handleUploadAssignment(data) {
  const folder = getOrCreateFolder();
  const decoded = Utilities.base64Decode(data.fileData);
  const blob = Utilities.newBlob(decoded, data.mimeType, data.fileName);
  const file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  const link = file.getUrl();

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_ASSIGNMENTS);
  const now = Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'dd/MM/yyyy HH:mm');
  sheet.appendRow([link, data.fileName, now]);

  return { success: true, link: link, message: 'Đăng đề bài thành công!' };
}

function handleGetAssignments() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_ASSIGNMENTS);
  const rows = sheet.getDataRange().getValues();
  const list = [];
  for (let i = 1; i < rows.length; i++) {
    list.push({ row: i + 1, link: rows[i][0], fileName: rows[i][1], time: rows[i][2] });
  }
  return { success: true, data: list };
}

function handleDeleteAssignment(data) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_ASSIGNMENTS);
  const row = parseInt(data.row);
  if (row < 2 || row > sheet.getLastRow()) {
    return { success: false, message: 'Không tìm thấy đề bài.' };
  }
  sheet.deleteRow(row);
  return { success: true, message: 'Đã xóa đề bài.' };
}

function handleSubmitWork(data) {
  const folder = getOrCreateFolder();
  const decoded = Utilities.base64Decode(data.fileData);
  const blob = Utilities.newBlob(decoded, data.mimeType || 'text/plain', data.fileName);
  const file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  const link = file.getUrl();

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_SUBMISSIONS);
  const now = Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'dd/MM/yyyy HH:mm');
  sheet.appendRow([
    data.username,
    data.assignmentName || 'Không xác định',
    link,
    data.score,
    data.errors,
    data.pros,
    data.suggestions,
    data.fileName,
    now,
    data.raw_json || ''
  ]);
  return { success: true, link: link, message: 'Đã lưu bài nộp!' };
}

function handleGetStudents() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

  // Lấy danh sách tài khoản HS
  const accSheet = ss.getSheetByName(SHEET_ACCOUNTS);
  const accRows = accSheet.getDataRange().getValues();
  const accounts = {};
  for (let i = 1; i < accRows.length; i++) {
    if (accRows[i][4] === 'hs') {
      accounts[accRows[i][0]] = { fullName: accRows[i][2], className: accRows[i][3] };
    }
  }

  // Lấy bài nộp
  const subSheet = ss.getSheetByName(SHEET_SUBMISSIONS);
  const subRows = subSheet.getDataRange().getValues();
  const submissions = [];
  for (let i = 1; i < subRows.length; i++) {
    const un = subRows[i][0];
    submissions.push({
      row: i + 1,
      username: un,
      fullName: accounts[un] ? accounts[un].fullName : un,
      className: accounts[un] ? accounts[un].className : '',
      assignmentName: subRows[i][1],
      link: subRows[i][2],
      score: subRows[i][3],
      errors: subRows[i][4],
      pros: subRows[i][5],
      suggestions: subRows[i][6],
      fileName: subRows[i][7],
      time: subRows[i][8]
    });
  }

  // Danh sách tài khoản
  const accountList = [];
  for (const un in accounts) {
    accountList.push({ username: un, fullName: accounts[un].fullName, className: accounts[un].className });
  }

  return { success: true, accounts: accountList, submissions: submissions };
}

function handleDeleteSubmission(data) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_SUBMISSIONS);
  const row = parseInt(data.row);
  if (row < 2 || row > sheet.getLastRow()) {
    return { success: false, message: 'Không tìm thấy bài nộp.' };
  }
  sheet.deleteRow(row);
  return { success: true, message: 'Đã xóa bài nộp.' };
}

function handleGetStudentHistory(data) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const subSheet = ss.getSheetByName(SHEET_SUBMISSIONS);
  const subRows = subSheet.getDataRange().getValues();
  const history = [];
  for (let i = subRows.length - 1; i >= 1; i--) {
    if (subRows[i][0] === data.username) {
      history.push({
        row: i + 1,
        assignmentName: subRows[i][1],
        link: subRows[i][2],
        score: subRows[i][3],
        fileName: subRows[i][7],
        time: subRows[i][8],
        raw_json: subRows[i][9] || null
      });
    }
  }
  return { success: true, history: history };
}
