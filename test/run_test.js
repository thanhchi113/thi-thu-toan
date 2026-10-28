// Test bộ chấm điểm theo thang điểm chuẩn Bộ GD&ĐT 2027
const GradingSystem = require('../js/grading.js');

const sampleExam = {
  part1: [
    { id: 1, correct_answer: 'A' },
    { id: 2, correct_answer: 'B' },
    { id: 3, correct_answer: 'C' },
    { id: 4, correct_answer: 'D' }
  ],
  part2: [
    {
      id: 1,
      statements: [
        { sub_id: 'a', correct: true },
        { sub_id: 'b', correct: true },
        { sub_id: 'c', correct: false },
        { sub_id: 'd', correct: false }
      ]
    }
  ],
  part3: [
    { id: 1, correct_answer: '3.5' },
    { id: 2, correct_answer: '-1/2' }
  ]
};

console.log('--- TEST 1: Full Marks ---');
const fullAnswers = {
  part1: { 1: 'A', 2: 'B', 3: 'C', 4: 'D' },
  part2: { 1: { a: true, b: true, c: false, d: false } },
  part3: { 1: '3,50', 2: '-0.5' } // Test dấu phẩy và phân số tương đương
};

const res1 = GradingSystem.grade(fullAnswers, sampleExam);
console.log('Result 1:', {
  p1: res1.part1.score, // 4 * 0.25 = 1.0
  p2: res1.part2.score, // 4 ý đúng = 1.0
  p3: res1.part3.score, // 2 * 0.5 = 1.0
  total: res1.totalScore
});

console.log('--- TEST 2: Partial Marks Part 2 ---');
// Chỉ đúng 2 ý ở Phần 2 -> phải được 0.25đ
const partialAnswers = {
  part1: { 1: 'A' }, // 0.25đ
  part2: { 1: { a: true, b: true, c: true, d: true } }, // đúng 2 ý a, b -> 0.25đ
  part3: { 1: '4.0' } // sai
};
const res2 = GradingSystem.grade(partialAnswers, sampleExam);
console.log('Result 2:', {
  p1: res2.part1.score, // 0.25
  p2: res2.part2.score, // 0.25
  p3: res2.part3.score, // 0.0
  total: res2.totalScore // 0.50
});

console.assert(res1.part1.score === 1.0, 'P1 fail');
console.assert(res1.part2.score === 1.0, 'P2 full fail');
console.assert(res1.part3.score === 1.0, 'P3 equivalence fail');
console.assert(res2.part2.score === 0.25, 'P2 partial 2 items fail');

// Test 3: Bảng đáp án đề PDF (nhập nhanh P1 + tùy chỉnh số câu + chấm điểm)
const App = require('../js/app.js');
const q1 = App.parseQuickP1String('1C 2D 3.a 4-b', Array(4).fill(''));
console.assert(q1.matched === 4 && q1.nextP1.join('') === 'CDAB', 'Quick P1 numbered parse fail');

const q2 = App.parseQuickP1String('ABCDDCBA', Array(4).fill(''));
console.assert(q2.matched === 8 && q2.nextP1.join('') === 'ABCDDCBA', 'Quick P1 contiguous parse fail');

const built = App.buildPartsFromDraft({
  p1: ['A', 'C', 'B', 'D'],
  p2: [],
  p3: ['-200', '0.03']
});
const res3 = GradingSystem.grade({
  part1: { 1: 'A', 2: 'C', 3: 'B', 4: 'D' },
  part2: {},
  part3: { 1: '-200', 2: '0,03' }
}, built);
console.assert(res3.totalScore === 2.0 && res3.maxTotal === 2.0 && res3.rank === 'Xuất sắc', 'Custom PDF exam key grade fail');

// Test 4: Hỗ trợ QR tạo App iOS, nhận diện thiết bị & chuẩn hóa URL PDF
const localRec = App.getRecommendedAppUrl({ protocol: 'http:', hostname: 'localhost', origin: 'http://localhost:8000', pathname: '/' });
console.assert(localRec.isFallbackPublic === true && localRec.url === 'https://thanhchi113.github.io/thi-thu-toan/?install=ios', 'Localhost QR fallback URL fail');

const liveRec = App.getRecommendedAppUrl({ protocol: 'https:', hostname: 'thanhchi113.github.io', origin: 'https://thanhchi113.github.io', pathname: '/thi-thu-toan/' });
console.assert(liveRec.isFallbackPublic === false && liveRec.url === 'https://thanhchi113.github.io/thi-thu-toan/?install=ios', 'Live GitHub Pages QR URL fail');

console.assert(App.isIosDevice('Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15') === true, 'iPhone UA detect fail');
console.assert(App.isIosDevice('Mozilla/5.0 (Windows NT 10.0; Win64; x64)') === false, 'Windows UA detect fail');
console.assert(App.isInAppWebView('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) Zalo/24.0') === true, 'Zalo webview detect fail');

const driveNorm = App.normalizeExternalPdfUrl('https://drive.google.com/file/d/1AbCdEfGhIjK/view?usp=sharing');
console.assert(driveNorm.isExternalEmbed === true && driveNorm.embedUrl === 'https://drive.google.com/file/d/1AbCdEfGhIjK/preview', 'Google Drive PDF normalize fail');

const panePdf = App.getExamPaneClasses('pdf');
const paneSheet = App.getExamPaneClasses('sheet');
console.assert(panePdf.left.includes('h-full') && panePdf.right.includes('hidden'), 'Mobile PDF pane class fail');
console.assert(paneSheet.right.includes('h-full') && paneSheet.left.includes('hidden'), 'Mobile Sheet pane class fail');

// Test 5: Tự động IN HOA tài khoản đăng nhập & Cảnh báo thoát màn hình khi đang thi (warnOnExitExam)
let caretCaptured = null;
const mockLoginInput = {
  value: 'hs202701',
  selectionStart: 4,
  selectionEnd: 4,
  setSelectionRange(s, e) { caretCaptured = [s, e]; }
};
const upperVal = App.forceUppercaseInput(mockLoginInput);
console.assert(upperVal === 'HS202701' && mockLoginInput.value === 'HS202701', 'Uppercase login input fail');
console.assert(caretCaptured && caretCaptured[0] === 4 && caretCaptured[1] === 4, 'Uppercase cursor preserve fail');

// Khi BẬT warnOnExitExam: ghi nhận đúng 1 lần khi thoát, chống đếm trùng liên tiếp, và báo cảnh báo khi quay lại
App.state.activeExam = { id: 'EXAM_TEST_GUARD', title: 'Đề kiểm tra' };
App.state.settings.warnOnExitExam = true;
App.state.tabSwitchesCount = 0;
App.state.violationLogs = [];
App.resetExamMonitorState();

const v1 = App.recordExamLeaveViolation('Thoát app iOS');
const v1Dup = App.recordExamLeaveViolation('Sự kiện trùng pagehide');
console.assert(v1 === true && v1Dup === false && App.state.tabSwitchesCount === 1, 'Exam leave single-count fail');
console.assert(App.state.violationLogs.length === 1, 'Violation log append fail');

const returned = App.handleExamReturnFocus();
console.assert(returned === true && App._examAwayActive === false, 'Exam return focus warning trigger fail');

// Khi TẮT warnOnExitExam: thoát màn hình KHÔNG tính vi phạm và KHÔNG cảnh báo
App.state.settings.warnOnExitExam = false;
App._lastViolationAt = 0;
const vDisabled = App.recordExamLeaveViolation('Thoát app khi đã tắt giám sát');
console.assert(vDisabled === false && App.state.tabSwitchesCount === 1, 'Disabled warnOnExitExam should not record violation');
App.state.activeExam = null;
App.state.settings.warnOnExitExam = true;

console.log('[OK] TẤT CẢ TEST CHẤM ĐIỂM, ĐỀ PDF, IN HOA TK & GIÁM SÁT THOÁT MÀN HÌNH ĐÃ ĐẠT 100%!');
