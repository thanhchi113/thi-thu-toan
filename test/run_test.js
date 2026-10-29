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
  value: 'hs001',
  selectionStart: 4,
  selectionEnd: 4,
  setSelectionRange(s, e) { caretCaptured = [s, e]; }
};
const upperVal = App.forceUppercaseInput(mockLoginInput);
console.assert(upperVal === 'HS001' && mockLoginInput.value === 'HS001', 'Uppercase login input fail');
console.assert(caretCaptured && caretCaptured[0] === 4 && caretCaptured[1] === 4, 'Uppercase cursor preserve fail');

// Test 6: Danh sách học sinh Cấp 3 chính thức (HS001..HS079, mật khẩu 123) & đã xóa sạch dữ liệu/PDF nháp
const SeedData = require('../js/seed_data.js');
console.assert(SeedData.students.length === 79, 'Expected 79 high school students');
console.assert(SeedData.students[0].studentId === 'HS001' && SeedData.students[0].fullName === 'Quốc Việt', 'First student HS001 fail');
console.assert(SeedData.students[78].studentId === 'HS079' && SeedData.students[78].fullName === 'Phan Quý', 'Last student HS079 fail');
console.assert(SeedData.students.every((s, idx) => s.studentId === 'HS' + String(idx + 1).padStart(3, '0') && s.password === '123' && [10, 11, 12].includes(s.grade)), 'Student ID/password/grade cap 3 invariant fail');
console.assert(SeedData.exams.length === 0 && SeedData.homeworks.length === 0 && SeedData.submissions.length === 0, 'Draft exams/homeworks/submissions must be empty');

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

// Test 7: Đề 4 phần (có Tự luận), chia đều tổng điểm từng phần & nhập điểm riêng từng câu
const examEqual4Parts = App.buildPartsFromDraft({
  p1: ['A', 'B', 'C', 'D', 'A', 'B', 'C', 'D', 'A', 'B', 'C', 'D'], // 12 câu -> chia đều 3.0đ = 0.25đ/câu
  p2: [
    { a: true, b: false, c: true, d: false },
    { a: false, b: true, c: false, d: true }
  ], // 2 câu -> chia đều 2.0đ = 1.0đ/câu
  p3: ['12.5', '-0.5', '4', '0.75'], // 4 câu -> chia đều 2.0đ = 0.5đ/câu
  p4: ['m = 2', 'V = 16'], // 2 câu TL -> chia đều 3.0đ = 1.5đ/câu
  scoring: { mode: 'equal', p1Total: '3', p2Total: '2', p3Total: '2', p4Total: '3' },
  qPoints: { p1: [], p2: [], p3: [], p4: [] }
});

const pendingRes = GradingSystem.grade({
  part1: { 1: 'A', 2: 'B', 3: 'C', 4: 'D' }, // 4 * 0.25 = 1.0đ
  part2: { 1: { a: true, b: false, c: true, d: true } }, // đúng 3/4 ý của câu 1.0đ -> 0.5đ
  part3: { 1: '12,5', 4: '3/4' }, // 2 * 0.5 = 1.0đ
  part4: { 1: { text: 'Ta có đạo hàm...', images: [] } } // chưa chấm tay
}, examEqual4Parts);

console.assert(pendingRes.maxTotal === 10.0, '4-part equal maxTotal fail');
console.assert(pendingRes.part4.pendingManual === true && pendingRes.totalScore === 2.5, '4-part pending manual score fail');

const gradedRes = GradingSystem.grade({
  part1: { 1: 'A', 2: 'B', 3: 'C', 4: 'D' },
  part2: { 1: { a: true, b: false, c: true, d: true } },
  part3: { 1: '12,5', 4: '3/4' },
  part4: { 1: { text: 'Lời giải câu 1', images: [] }, 2: { text: 'Lời giải câu 2', images: [] } },
  part4Scores: { 1: 1.5, 2: 1.25 }
}, examEqual4Parts);

console.assert(gradedRes.part4.pendingManual === false && gradedRes.part4.score === 2.75 && gradedRes.totalScore === 5.25, '4-part manual graded score fail');

// Test chế độ nhập điểm riêng từng câu (mode = 'custom')
const examCustomPerQ = App.buildPartsFromDraft({
  p1: ['A', 'C'],
  p2: [{ a: true, b: true, c: false, d: false }],
  p3: ['-12.5'],
  p4: ['x = 3'],
  scoring: { mode: 'custom', p1Total: '', p2Total: '', p3Total: '', p4Total: '' },
  qPoints: { p1: ['0.5', '1.0'], p2: ['2.0'], p3: ['1.5'], p4: ['5.0'] }
});
const customRes = GradingSystem.grade({
  part1: { 1: 'A', 2: 'B' }, // chỉ đúng câu 1 -> 0.5đ
  part2: { 1: { a: true, b: true, c: false, d: true } }, // đúng 3/4 ý trên câu 2.0đ -> 50% * 2.0 = 1.0đ
  part3: { 1: '−12,5' }, // dấu trừ Unicode -> 1.5đ
  part4Scores: { 1: 4.5 }
}, examCustomPerQ);
console.assert(customRes.maxTotal === 10.0 && customRes.totalScore === 7.5, 'Custom per-question points fail');

// Test 8: Parser file .TEX (ex_test chuẩn Toán Việt Nam: \choice, \choiceTF, \shortans, \bt + \dapso, comment %, ngoặc nhọn \{ \})
const sampleTex = `
% Đề kiểm tra 4 phần
\\section*{PHẦN I. Trắc nghiệm nhiều phương án (3,0 điểm)}
\\begin{ex}
  Tập nghiệm $S = \\{1; 2\\}$ ứng với đáp án nào? % comment bẫy \\True
  \\choice
  {$S = \\{0\\}$}
  {\\True $S = \\{1; 2\\}$}
  {$S = \\emptyset$}
  {$S = \\{3\\}$}
  \\loigiai{Vì \\True trong lời giải không được làm nhiễu đáp án.}
\\end{ex}
\\begin{ex}
  Câu 2 chọn D:
  \\motcot{A}{B}{C}{\\True D}
\\end{ex}

\\section*{PHẦN II. Trắc nghiệm đúng sai (2,0 điểm)}
\\begin{ex}
  Xét tính đúng sai:
  \\choiceTF
  {\\True Mệnh đề a đúng}
  {Mệnh đề b sai}
  {\\True Mệnh đề c đúng}
  {Mệnh đề d sai}
  \\loigiai{Chi tiết.}
\\end{ex}

\\section*{PHẦN III. Trả lời ngắn (2,0 điểm)}
\\begin{ex}
  Tính giá trị biểu thức.
  \\shortans[oly]{$-12{,}5$}
  \\loigiai{Kết quả là $-12{,}5$.}
\\end{ex}
\\begin{ex}
  Tính xác suất.
  \\shortans{$\\dfrac{3}{4}$}
\\end{ex}

\\section*{PHẦN IV. TỰ LUẬN (3,0 điểm)}
\\begin{bt}
  (1,5 điểm) Giải phương trình tham số $m$.
  \\loigiai{Ta tìm được \\dapso{$m = 2$}}
\\end{bt}
\\begin{bt}
  (1,5 điểm) Tính thể tích khối chóp.
  \\dapso{$16$}
\\end{bt}
`;

const parsedTex = App.parseTexAnswerKey(sampleTex);
console.assert(parsedTex.p1.join('') === 'BD', 'TEX P1 parse fail');
console.assert(parsedTex.p2.length === 1 && parsedTex.p2[0].a === true && parsedTex.p2[0].b === false && parsedTex.p2[0].c === true && parsedTex.p2[0].d === false, 'TEX P2 parse fail');
console.assert(parsedTex.p3.length === 2 && parsedTex.p3[0] === '-12.5' && parsedTex.p3[1] === '3/4', 'TEX P3 parse fail');
console.assert(parsedTex.p4.length === 2 && parsedTex.p4[0] === 'm = 2' && parsedTex.p4[1] === '16', 'TEX P4 parse fail');
console.assert(parsedTex.sectionTotals.p1Total === 3 && parsedTex.sectionTotals.p4Total === 3, 'TEX section totals parse fail');
console.assert(parsedTex.hasCustomQuestionPoints === true && parsedTex.qPoints.p4[0] === '1.5', 'TEX per-question points parse fail');

// Test 9: Parser file .TXT & văn bản OCR từ ảnh dán Ctrl+V (bảng ngang 2 dòng, bảng P.II nhiều cột, đánh số nối tiếp 17..20, kí tự Ð)
const sampleOcrText = `
PHẦN I (3,0 điểm)
Câu | 1 | 2 | 3 | 4
Đáp án | C | A | D | B
PHẦN II (4,0 điểm)
Câu 1   Câu 2
a) Ð    a) S
b) S    b) Đ
c) Đ    c) S
d) S    d) Đ
PHẦN III (2,0 điểm)
17. 12,5   18. -0,5   19. 4   20. 8
PHẦN IV. TỰ LUẬN (1,0 điểm)
Câu 21 (1,0 điểm): x = 5
`;

const parsedOcr = App.parseTextAnswerKey(sampleOcrText);
console.assert(parsedOcr.p1.join('') === 'CADB', 'OCR 2-row P1 table parse fail');
console.assert(parsedOcr.p2.length === 2 && parsedOcr.p2[0].a === true && parsedOcr.p2[0].b === false && parsedOcr.p2[1].a === false && parsedOcr.p2[1].b === true, 'OCR multi-col P2 parse fail');
console.assert(parsedOcr.p3.length === 4 && parsedOcr.p3[0] === '12.5' && parsedOcr.p3[1] === '-0.5' && parsedOcr.p3[3] === '8', 'OCR continuous P3 parse fail');
console.assert(parsedOcr.p4.length === 1 && parsedOcr.p4[0] === 'x = 5' && parsedOcr.qPoints.p4[0] === '1', 'OCR P4 parse fail');

console.log('[OK] TẤT CẢ TEST CHẤM ĐIỂM 3-4 PHẦN, PARSER .TEX/.TXT/OCR, THANG ĐIỂM & GIÁM SÁT ĐÃ ĐẠT 100%!');
