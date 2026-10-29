/**
 * Google Apps Script Backend — Hệ Thống Khảo Thí & Luyện Đề Toán 6 – 12
 * Đồng bộ 2 chiều Máy Tính Giáo Viên <-> Điện Thoại Học Sinh (Đề thi, File PDF, Tài liệu, Học sinh & Bài nộp).
 *
 * HƯỚNG DẪN CÀI ĐẶT NHANH (1 LẦN DUY NHẤT):
 * 1. Truy cập https://script.new (hoặc mở Google Trang Tính -> Tiện ích mở rộng -> Apps Script).
 * 2. Xóa mã mặc định, dán toàn bộ nội dung file Code.gs này vào và nhấn Lưu (Ctrl+S).
 * 3. Bấm "Triển khai" (Deploy) -> "Tùy chọn triển khai mới" (New deployment):
 *    - Loại: "Ứng dụng web" (Web app)
 *    - Thực thi dưới dạng (Execute as): "Tôi" (Me)
 *    - Ai có quyền truy cập (Who has access): "Bất kỳ ai" (Anyone)
 * 4. Bấm "Triển khai", cấp quyền Drive, sau đó sao chép URL kết thúc bằng /exec dán vào mục Đồng Bộ Điện Thoại trên web Giáo viên.
 */

var STORAGE_FOLDER_NAME = 'KhaoThiToan_Cloud_Storage';
var STATE_FILE_NAME = 'khao_thi_toan_state_v1.json';

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function getStorageFolder_() {
  var it = DriveApp.getFoldersByName(STORAGE_FOLDER_NAME);
  return it.hasNext() ? it.next() : DriveApp.createFolder(STORAGE_FOLDER_NAME);
}

function readCloudState_(folder) {
  var files = folder.getFilesByName(STATE_FILE_NAME);
  if (!files.hasNext()) {
    return {
      version: 1,
      updatedAt: 0,
      deletedIds: [],
      exams: null,
      homeworks: null,
      students: null,
      submissions: [],
      settings: null,
      pdfMap: {}
    };
  }
  try {
    var raw = files.next().getBlob().getDataAsString('UTF-8');
    var parsed = JSON.parse(raw);
    if (!Array.isArray(parsed.deletedIds)) parsed.deletedIds = [];
    if (!Array.isArray(parsed.submissions)) parsed.submissions = [];
    if (!parsed.pdfMap || typeof parsed.pdfMap !== 'object') parsed.pdfMap = {};
    return parsed;
  } catch (err) {
    return {
      version: 1,
      updatedAt: 0,
      deletedIds: [],
      exams: null,
      homeworks: null,
      students: null,
      submissions: [],
      settings: null,
      pdfMap: {}
    };
  }
}

function writeCloudState_(folder, state) {
  var content = JSON.stringify(state);
  var files = folder.getFilesByName(STATE_FILE_NAME);
  if (files.hasNext()) {
    files.next().setContent(content);
  } else {
    folder.createFile(STATE_FILE_NAME, content, MimeType.PLAIN_TEXT);
  }
}

function syncGradebookSheet_(state) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) return;
    var sheet = ss.getSheetByName('SoDiem') || ss.insertSheet('SoDiem');
    var rows = [['Mã Bài Nộp', 'Mã HS', 'Họ và Tên', 'Mã Đề', 'Tên Đề Thi', 'Điểm Số', 'Lần Thi', 'Vi Phạm Rời Màn Hình', 'Thời Gian Nộp']];
    var subs = Array.isArray(state.submissions) ? state.submissions : [];
    for (var i = 0; i < subs.length; i++) {
      var s = subs[i] || {};
      var total = (s.scoreResult && s.scoreResult.totalScore !== undefined) ? s.scoreResult.totalScore : '';
      rows.push([
        s.id || '',
        s.studentId || '',
        s.studentName || '',
        s.examId || '',
        s.examTitle || '',
        total,
        s.attemptNumber || 1,
        s.tabSwitches || 0,
        s.submittedAt || ''
      ]);
    }
    sheet.clearContents();
    sheet.getRange(1, 1, rows.length, rows[0].length).setValues(rows);
  } catch (_) {}
}

function mergeSubmissions_(existingList, incomingList) {
  var map = {};
  var order = [];
  var a = Array.isArray(existingList) ? existingList : [];
  var b = Array.isArray(incomingList) ? incomingList : [];
  for (var i = 0; i < a.length; i++) {
    var item = a[i];
    if (item && item.id) {
      map[item.id] = item;
      order.push(item.id);
    }
  }
  for (var j = 0; j < b.length; j++) {
    var inc = b[j];
    if (!inc || !inc.id) continue;
    if (!map[inc.id]) {
      map[inc.id] = inc;
      order.push(inc.id);
    } else {
      var cur = map[inc.id];
      var incGraded = inc.answers && inc.answers.part4Scores && Object.keys(inc.answers.part4Scores).length > 0;
      var curGraded = cur.answers && cur.answers.part4Scores && Object.keys(cur.answers.part4Scores).length > 0;
      if (incGraded || !curGraded) {
        map[inc.id] = inc;
      }
    }
  }
  var merged = [];
  for (var k = 0; k < order.length; k++) {
    merged.push(map[order[k]]);
  }
  merged.sort(function(x, y) {
    return String(y.submittedAt || '').localeCompare(String(x.submittedAt || ''));
  });
  return merged;
}

function doGet(e) {
  try {
    var action = (e && e.parameter && e.parameter.action) ? String(e.parameter.action) : 'getState';
    var folder = getStorageFolder_();
    var state = readCloudState_(folder);

    if (action === 'ping') {
      return jsonResponse({ success: true, message: 'OK', updatedAt: state.updatedAt || 0 });
    }

    if (action === 'getPdf') {
      var key = (e && e.parameter && e.parameter.key) ? String(e.parameter.key).trim() : '';
      if (!key) return jsonResponse({ success: false, error: 'Missing key' });
      var entry = state.pdfMap && state.pdfMap[key];
      var file = null;
      if (entry && entry.fileId) {
        try { file = DriveApp.getFileById(entry.fileId); } catch (_) { file = null; }
      }
      if (!file) {
        var found = folder.getFilesByName(key + '.pdf');
        if (found.hasNext()) file = found.next();
      }
      if (!file) return jsonResponse({ success: false, error: 'PDF not found for key: ' + key });
      var blob = file.getBlob();
      return jsonResponse({
        success: true,
        key: key,
        fileName: (entry && entry.fileName) || file.getName(),
        mimeType: 'application/pdf',
        base64: Utilities.base64Encode(blob.getBytes())
      });
    }

    return jsonResponse({
      success: true,
      version: 1,
      updatedAt: state.updatedAt || 0,
      deletedIds: state.deletedIds || [],
      exams: state.exams,
      homeworks: state.homeworks,
      students: state.students,
      submissions: state.submissions || [],
      settings: state.settings,
      pdfKeys: Object.keys(state.pdfMap || {})
    });
  } catch (err) {
    return jsonResponse({ success: false, error: String(err && err.message ? err.message : err) });
  }
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(25000);
  try {
    var rawBody = (e && e.postData && e.postData.contents) ? e.postData.contents : '{}';
    var body = JSON.parse(rawBody);
    var action = String(body.action || '');
    var folder = getStorageFolder_();
    var state = readCloudState_(folder);

    if (action === 'uploadPdf') {
      var key = String(body.key || '').trim();
      var b64 = String(body.base64 || '').replace(/^data:[^;]+;base64,/, '');
      if (!key || !b64) return jsonResponse({ success: false, error: 'Missing key or base64' });
      var bytes = Utilities.base64Decode(b64);
      var blob = Utilities.newBlob(bytes, 'application/pdf', key + '.pdf');

      var old = folder.getFilesByName(key + '.pdf');
      while (old.hasNext()) {
        try { old.next().setTrashed(true); } catch (_) {}
      }
      var created = folder.createFile(blob);
      state.pdfMap[key] = {
        fileId: created.getId(),
        fileName: String(body.fileName || (key + '.pdf')),
        updatedAt: Date.now()
      };
      writeCloudState_(folder, state);
      return jsonResponse({ success: true, key: key, fileId: created.getId() });
    }

    if (action === 'syncAdminState') {
      var delSet = {};
      var combinedDel = (state.deletedIds || []).concat(Array.isArray(body.deletedIds) ? body.deletedIds : []);
      var nextDel = [];
      for (var d = 0; d < combinedDel.length; d++) {
        var did = String(combinedDel[d] || '');
        if (did && !delSet[did]) {
          delSet[did] = true;
          nextDel.push(did);
        }
      }
      state.deletedIds = nextDel.slice(-500);
      state.updatedAt = Math.max(Number(state.updatedAt || 0), Number(body.updatedAt || Date.now()));
      if (Array.isArray(body.exams)) state.exams = body.exams;
      if (Array.isArray(body.homeworks)) state.homeworks = body.homeworks;
      if (Array.isArray(body.students)) state.students = body.students;
      if (body.settings && typeof body.settings === 'object') state.settings = body.settings;
      if (Array.isArray(body.submissions)) {
        state.submissions = mergeSubmissions_(state.submissions, body.submissions);
      }
      writeCloudState_(folder, state);
      syncGradebookSheet_(state);
      return jsonResponse({
        success: true,
        updatedAt: state.updatedAt,
        submissions: state.submissions
      });
    }

    if (action === 'submitExam') {
      if (body.submission && body.submission.id) {
        state.submissions = mergeSubmissions_(state.submissions, [body.submission]);
      }
      if (body.studentUpdate && body.studentUpdate.studentId && Array.isArray(state.students)) {
        for (var sIdx = 0; sIdx < state.students.length; sIdx++) {
          if (state.students[sIdx].studentId === body.studentUpdate.studentId) {
            state.students[sIdx] = body.studentUpdate;
            break;
          }
        }
      }
      writeCloudState_(folder, state);
      syncGradebookSheet_(state);
      return jsonResponse({ success: true, totalSubmissions: state.submissions.length });
    }

    return jsonResponse({ success: false, error: 'Unsupported action: ' + action });
  } catch (err) {
    return jsonResponse({ success: false, error: String(err && err.message ? err.message : err) });
  } finally {
    lock.releaseLock();
  }
}
