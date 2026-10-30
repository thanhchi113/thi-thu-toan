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

// Test 10: Phân quyền & Phạm vi So sánh Kết quả của Học sinh (Chỉ Lớp mình hoặc Toàn khối mình, chỉ mở khi Admin bật)
App.state.students = SeedData.students.map(s => ({ ...s }));
App.state.exams = [
  { id: 'EX_K12_1', title: 'Đề Khối 12 - Đợt 1', roundLabel: 'Đợt 1', grade: 12, is_active: true },
  { id: 'EX_K11_1', title: 'Đề Khối 11 - Đợt 1', roundLabel: 'Đợt 1', grade: 11, is_active: true }
];
const hs001 = App.state.students.find(s => s.studentId === 'HS001'); // Quốc Việt - K12 - 12B 2K9
const hs002 = App.state.students.find(s => s.studentId === 'HS002'); // K12 - 12B 2K9
const hs12A = App.state.students.find(s => s.grade === 12 && s.className === '12A 2K9'); // K12 - lớp khác (12A 2K9)
const hsK11 = App.state.students.find(s => s.grade === 11); // Khối 11

App.state.submissions = [
  { id: 'SUB_1', studentId: hs001.studentId, examId: 'EX_K12_1', scoreResult: { totalScore: 8.5 } },
  { id: 'SUB_2', studentId: hs002.studentId, examId: 'EX_K12_1', scoreResult: { totalScore: 9.25 } },
  { id: 'SUB_3', studentId: hs12A.studentId, examId: 'EX_K12_1', scoreResult: { totalScore: 9.75 } },
  { id: 'SUB_4', studentId: hsK11.studentId, examId: 'EX_K11_1', scoreResult: { totalScore: 10.0 } }
];

// 10.1 Mặc định khóa (allowStudentViewClassBoard = false) -> học sinh KHÔNG được xem bất kỳ dữ liệu đối chiếu nào
App.state.settings.allowStudentViewOwnScore = true;
App.state.settings.allowStudentViewClassBoard = false;
App.state.settings.studentCompareScope = 'both';
const cmpLocked = App.getStudentPeerComparison(hs001, 'class');
console.assert(cmpLocked.allowed === false && cmpLocked.rankedList.length === 0, 'Locked peer comparison must block access');

// 10.2 Khi Admin mở quyền (allowStudentViewClassBoard = true):
// - Chế độ 'class': HS001 (12B 2K9) chỉ thấy đúng 10 học sinh cùng lớp 12B 2K9, thứ hạng #2 (sau HS002 9.25đ), không lẫn 12A hay Khối 10/11
App.state.settings.allowStudentViewClassBoard = true;
const cmpClass = App.getStudentPeerComparison(hs001, 'class');
console.assert(cmpClass.allowed === true && cmpClass.scope === 'class', 'Class scope open fail');
console.assert(cmpClass.rankedList.length === 10, `Expected 10 peers in 12B 2K9, got ${cmpClass.rankedList.length}`);
console.assert(cmpClass.rankedList.every(it => it.student.grade === 12 && it.student.className === '12B 2K9'), 'Class scope leaked other class/grade');
console.assert(cmpClass.targetExams.length === 1 && cmpClass.targetExams[0].id === 'EX_K12_1', 'Cohort exam filter leaked K11 exam');
console.assert(cmpClass.myRank === 2, `Expected HS001 rank #2 in class, got ${cmpClass.myRank}`);

// - Chế độ 'grade': HS001 chỉ thấy đúng 16 học sinh Toàn Khối 12 (12A + 12B), tuyệt đối không thấy Khối 10 hay Khối 11, thứ hạng #3 (sau 12A 9.75đ và HS002 9.25đ)
const cmpGrade = App.getStudentPeerComparison(hs001, 'grade');
console.assert(cmpGrade.allowed === true && cmpGrade.scope === 'grade', 'Grade scope open fail');
console.assert(cmpGrade.rankedList.length === 16, `Expected 16 peers in Grade 12, got ${cmpGrade.rankedList.length}`);
console.assert(cmpGrade.rankedList.every(it => it.student.grade === 12), 'Grade scope leaked Grade 10/11 students');
console.assert(cmpGrade.myRank === 3, `Expected HS001 rank #3 in Grade 12, got ${cmpGrade.myRank}`);

// - Khi Admin giới hạn 'class' (Chỉ Lớp mình): dù học sinh truyền 'grade' hay 'all' vẫn ép chặt về 'class'
App.state.settings.studentCompareScope = 'class';
const cmpForcedClass = App.getStudentPeerComparison(hs001, 'grade');
console.assert(cmpForcedClass.scope === 'class' && cmpForcedClass.rankedList.length === 10, 'Admin scope restriction to class fail');

// - Khi Admin giới hạn 'grade' (Chỉ Toàn khối): ép chặt về 'grade'
App.state.settings.studentCompareScope = 'grade';
const cmpForcedGrade = App.getStudentPeerComparison(hs001, 'class');
console.assert(cmpForcedGrade.scope === 'grade' && cmpForcedGrade.rankedList.length === 16, 'Admin scope restriction to grade fail');

// Reset về mặc định khóa
App.state.settings.allowStudentViewClassBoard = false;
App.state.settings.studentCompareScope = 'both';
App.state.exams = [];
App.state.submissions = [];

// Test 11: Nhận diện thiết bị Android & tạo liên kết QR ?install=android
const localAndroidRec = App.getRecommendedAppUrl({ protocol: 'http:', hostname: 'localhost', origin: 'http://localhost:8000', pathname: '/' }, 'android');
console.assert(localAndroidRec.isFallbackPublic === true && localAndroidRec.url === 'https://thanhchi113.github.io/thi-thu-toan/?install=android', 'Localhost Android QR fallback URL fail');

const liveAndroidRec = App.getRecommendedAppUrl({ protocol: 'https:', hostname: 'thanhchi113.github.io', origin: 'https://thanhchi113.github.io', pathname: '/thi-thu-toan/' }, 'android');
console.assert(liveAndroidRec.isFallbackPublic === false && liveAndroidRec.url === 'https://thanhchi113.github.io/thi-thu-toan/?install=android', 'Live GitHub Pages Android QR URL fail');

console.assert(App.isAndroidDevice('Mozilla/5.0 (Linux; Android 14; SM-S928B) AppleWebKit/537.36 Chrome/124.0 Mobile Safari/537.36') === true, 'Samsung Android UA detect fail');
console.assert(App.isAndroidDevice('Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15') === false, 'iPhone must not match Android');
console.assert(App.isAndroidDevice('Mozilla/5.0 (Windows NT 10.0; Win64; x64)') === false, 'Windows must not match Android');

// Test 12: Kéo & thả file trực tiếp vào ô tải lên (.pdf, .tex không có MIME trên Windows, .txt, ảnh OCR, định tuyến thông minh)
console.assert(App.doesFileMatchAccept({ name: 'De_Toan_12.pdf', type: 'application/pdf' }, '.pdf,application/pdf') === true, 'PDF accept match fail');
console.assert(App.doesFileMatchAccept({ name: 'dethi.TEX', type: '' }, '.txt,.tex,text/plain,application/x-tex') === true, 'Windows TEX empty MIME match fail');
console.assert(App.doesFileMatchAccept({ name: 'dapan.txt', type: 'text/plain' }, '.txt,.tex,text/plain,application/x-tex') === true, 'TXT accept match fail');
console.assert(App.doesFileMatchAccept({ name: 'chup_dapan.PNG', type: '' }, 'image/*') === true, 'Image extension fallback match fail');
console.assert(App.doesFileMatchAccept({ name: 'virus.exe', type: 'application/octet-stream' }, '.pdf,application/pdf') === false, 'Invalid extension must be rejected');

let capturedPdfFiles = null;
let capturedKeyFiles = null;
const mockDoc = {
  getElementById(id) {
    if (id === 'pdfFileInput') {
      return {
        id: 'pdfFileInput',
        multiple: false,
        getAttribute: (k) => (k === 'accept' ? '.pdf,application/pdf' : ''),
        onchange: (ev) => { capturedPdfFiles = ev.target.files; }
      };
    }
    if (id === 'ansKeyFileInput') {
      return {
        id: 'ansKeyFileInput',
        multiple: false,
        getAttribute: (k) => (k === 'accept' ? '.txt,.tex,text/plain,application/x-tex' : ''),
        onchange: (ev) => { capturedKeyFiles = ev.target.files; }
      };
    }
    return null;
  }
};

// Kéo thả đồng thời cả De_Thi.pdf + Dap_An.tex vào ô PDF đề thi -> tự nạp cả 2!
const dualDropOk = App.handleDropZoneFiles(
  { getAttribute: () => 'pdfFileInput' },
  [
    { name: 'De_Thi_GK1_Toan_12.pdf', type: 'application/pdf' },
    { name: 'Dap_An_GK1.tex', type: '' }
  ],
  mockDoc
);
console.assert(dualDropOk === true, 'Dual PDF + TEX drop fail');
console.assert(capturedPdfFiles && capturedPdfFiles[0].name === 'De_Thi_GK1_Toan_12.pdf', 'Dropped PDF dispatch fail');
console.assert(capturedKeyFiles && capturedKeyFiles[0].name === 'Dap_An_GK1.tex', 'Dropped TEX smart route fail');

// Test 13: Phần III Trả lời ngắn chấp nhận cả dấu "." và dấu "," ở mọi định dạng
console.assert(GradingSystem.isShortAnsMatch('12,5', '12.5') === true, 'Comma vs dot decimal fail');
console.assert(GradingSystem.isShortAnsMatch('12.5', '12,5') === true, 'Dot vs comma decimal fail');
console.assert(GradingSystem.isShortAnsMatch('-0,25', '-0.25') === true, 'Negative comma vs dot fail');
console.assert(GradingSystem.isShortAnsMatch(',5', '0.5') === true, 'Leading comma decimal fail');
console.assert(GradingSystem.isShortAnsMatch('-,25', '-0,25') === true, 'Negative leading comma decimal fail');
console.assert(GradingSystem.isShortAnsMatch('12,50', '12.5') === true, 'Trailing zero with comma fail');
console.assert(GradingSystem.isShortAnsMatch('12,', '12') === true, 'Trailing comma integer fail');
console.assert(GradingSystem.isShortAnsMatch('0,5', '1/2') === true, 'Comma decimal vs fraction fail');

// Test 14: getPart3BoxCount tự mở rộng lên 5-6 ô nếu đáp án có nhiều hơn 4 ký tự (VD: -0,25) và giữ 4 ô cho đề chuẩn
console.assert(App.getPart3BoxCount({ part3: [{ id: 1, correct_answer: '12,5' }, { id: 2, correct_answer: '-1.5' }] }) === 4, 'Standard 4-box count fail');
console.assert(App.getPart3BoxCount({ part3: [{ id: 1, correct_answer: '-0,25' }, { id: 2, correct_answer: '3' }] }) === 5, '5-char answer box expansion fail');

// Test 15: Theo dõi quá trình làm bài (số câu đã làm, câu làm dở P.II, câu chưa tích chọn, đánh dấu xem lại)
App.state.activeExam = {
  id: 'EX-PROG-TEST',
  part1: [{ id: 1, correct_answer: 'A' }, { id: 2, correct_answer: 'B' }, { id: 3, correct_answer: 'C' }],
  part2: [
    { id: 1, statements: [{ sub_id: 'a', correct: true }, { sub_id: 'b', correct: false }, { sub_id: 'c', correct: true }, { sub_id: 'd', correct: false }] },
    { id: 2, statements: [{ sub_id: 'a', correct: true }, { sub_id: 'b', correct: true }, { sub_id: 'c', correct: false }, { sub_id: 'd', correct: false }] }
  ],
  part3: [{ id: 1, correct_answer: '12.5' }, { id: 2, correct_answer: '-0,5' }],
  part4: [{ id: 1, correct_answer: 'x=2' }]
};
App.state.answers = {
  part1: { 1: 'A', 3: 'D' },
  part2: { 1: { a: true, b: false }, 2: { a: true, b: true, c: false, d: false } },
  part3: { 1: ['1', '2', ',', '5'], 2: ['', '', '', ''] },
  part4: { 1: { text: '', images: [] } },
  flagged: { p1_2: true, p2_1: true }
};
const prog = App.calculateProgress();
console.assert(prog.total === 8, 'Total progress count fail: ' + prog.total);
console.assert(prog.answered === 4, 'Answered count fail: ' + prog.answered); // P1: 2, P2: 1 (câu 2 đủ 4 ý), P3: 1 (câu 1 = 12,5), P4: 0
console.assert(prog.partial === 1, 'Partial P2 count fail: ' + prog.partial);  // P2 câu 1 mới chọn 2/4 ý
console.assert(prog.unanswered === 3, 'Unanswered count fail: ' + prog.unanswered); // P1 câu 2, P3 câu 2, P4 câu 1
console.assert(prog.flagged === 2, 'Flagged count fail: ' + prog.flagged);
console.assert(App.getQuestionProgressState('p1', 1).label === 'Đã chọn A', 'P1 answered label fail');
console.assert(App.getQuestionProgressState('p1', 2).label === 'Chưa chọn', 'P1 unanswered label fail');
console.assert(App.getQuestionProgressState('p2', 1).status === 'partial' && App.getQuestionProgressState('p2', 1).shortVal === '2/4 ý', 'P2 partial state fail');
console.assert(App.getQuestionProgressState('p3', 1).label === 'Đã điền: 12,5', 'P3 comma value progress label fail');

// Test 16: Bảng đáp án ngang khi xem lời giải chi tiết + bộ lọc Sai/Đúng
const mockSub = {
  id: 'SUB-HORIZ-1',
  examId: 'EX-PROG-TEST',
  answers: {
    part1: { 1: 'A', 2: 'A', 3: '' },
    part2: { 1: { a: true, b: false, c: true, d: false }, 2: { a: false, b: true, c: false, d: false } },
    part3: { 1: '12,5', 2: '' },
    part4: { 1: { text: 'Em giải ra x=2', images: [] } }
  }
};
const mockRes = GradingSystem.grade(mockSub.answers, App.state.activeExam);
console.assert(mockRes.part3.details[1].isCorrect === true, 'P3 comma submission must grade correct against dot key');

App.state.detailAnswerFilter = 'all';
const allHtml = App.renderSubmissionAnswerSheetBody(App.state.activeExam, mockSub, mockRes, true, true);
console.assert(allHtml.includes('lg:grid-cols-12') && allHtml.includes('md:grid-cols-6'), 'Horizontal grid classes missing in answer sheet body');

App.state.detailAnswerFilter = 'correct';
const onlyCorrectHtml = App.renderSubmissionAnswerSheetBody(App.state.activeExam, mockSub, mockRes, true, true);
console.assert(onlyCorrectHtml.includes('C1') && !onlyCorrectHtml.includes('C2') && !onlyCorrectHtml.includes('C3'), 'Correct filter must keep C1 and hide wrong C2/C3');

App.state.detailAnswerFilter = 'all';
App.state.activeExam = null;

// Test 17: Thu gọn đề điền đáp án nhanh + 4 chế độ bố cục Đề PDF / Ô đáp án (bao gồm Ô đáp án ở trên - Đề PDF bên dưới) + Đồng bộ 1 thanh cuộn
console.assert(Array.isArray(App.EXAM_LAYOUT_MODES) && App.EXAM_LAYOUT_MODES.length === 4, 'Must support 4 exam layout modes');
console.assert(App.getExamLayoutMeta('top-sheet').id === 'top-sheet', 'top-sheet meta fail');
console.assert(App.getNormalizedExamLayoutMode('invalid-mode') === 'split', 'Invalid layout mode must fallback to split');

// 17.1 Chế độ 'top-sheet' (Ô đáp án ở trên - Đề PDF bên dưới, đồng bộ 1 thanh cuộn chung trên workspace)
App.state.examLayoutMode = 'top-sheet';
App.state.examPdfCollapsed = false;
App.state.examSheetCollapsed = false;
App.state.mobileExamPane = 'both';
console.assert(App.isWideAnswerSheet() === true, 'top-sheet must enable wide horizontal answer grid');
console.assert(App.isExamStackedFlowMode('both') === true, 'top-sheet must enable unified single-scrollbar flow mode');
const topCls = App.getExamPaneClasses('both');
console.assert(topCls.right.includes('order-1') && topCls.left.includes('order-2'), 'top-sheet must place Answer Sheet (order-1) above PDF (order-2)');
console.assert(topCls.workspace.includes('overflow-y-auto') && !topCls.right.includes('overflow-y-auto'), 'top-sheet must use unified workspace scrollbar without nested right scrollbar');
const flowPdfCls = App.getPdfViewerFlowClasses('examRoomPdfViewer', true);
console.assert(flowPdfCls.scroll.includes('overflow-visible') && flowPdfCls.scroll.includes('pdf-viewer-flow'), 'Unified PDF viewer must not trap vertical scroll');

// 17.2 Chế độ Thu gọn đề (examPdfCollapsed = true) -> ẩn khung PDF viewer, hiện thanh banner mỏng, mở rộng ô đáp án 100% đa cột
App.state.examLayoutMode = 'split';
App.state.examPdfCollapsed = true;
console.assert(App.isWideAnswerSheet() === true, 'Collapsed PDF in split mode must switch answer sheet to wide horizontal grid');
const collapsedPdfCls = App.getExamPaneClasses('both');
console.assert(collapsedPdfCls.pdfViewer === 'hidden' && !collapsedPdfCls.pdfBanner.includes('hidden'), 'Collapsed PDF must hide viewer and show restore banner');
console.assert(collapsedPdfCls.right.includes('w-full') && collapsedPdfCls.right.includes('flex-1'), 'Collapsed PDF must expand Answer Sheet to full width');

// 17.3 Kiểm tra render lưới ngang đa cột và tab 'all' điền liên thông toàn đề
const fastExamMock = {
  part1: [{ id: 1, correct_answer: 'A' }, { id: 2, correct_answer: 'B' }, { id: 3, correct_answer: 'C' }, { id: 4, correct_answer: 'D' }],
  part2: [{ id: 1, statements: [{ sub_id: 'a', correct: true }, { sub_id: 'b', correct: false }, { sub_id: 'c', correct: true }, { sub_id: 'd', correct: false }] }],
  part3: [{ id: 1, correct_answer: '12,5' }],
  part4: [{ id: 1, correct_answer: 'x=1' }]
};
App.state.activeExam = fastExamMock;
App.state.activeSectionTab = 'p1';
const wideP1Html = App.renderAnswerSheetInputs(fastExamMock);
console.assert(wideP1Html.includes('xl:grid-cols-4') && wideP1Html.includes('lg:grid-cols-3'), 'Wide P1 must render 3-4 column horizontal grid');

App.state.activeSectionTab = 'all';
const allContinuousHtml = App.renderAnswerSheetInputs(fastExamMock);
console.assert(
  allContinuousHtml.includes('row_p1_1') &&
  allContinuousHtml.includes('row_p2_1') &&
  allContinuousHtml.includes('row_p3_1') &&
  allContinuousHtml.includes('row_p4_1'),
  'All-sections tab must render P.I, P.II, P.III, and P.IV continuously'
);

// 17.4 Kiểm tra Modal Xem Trước (Preview) & Chọn Bố Cục
App.state.layoutPreviewMode = 'top-sheet';
App.state.layoutPreviewPdfCollapsed = false;
const previewModalHtml = App.renderExamLayoutModalInner();
console.assert(
  previewModalHtml.includes('layoutModeCard_top-sheet') &&
  previewModalHtml.includes('layoutModeCard_fast-entry') &&
  previewModalHtml.includes('examLayoutPreviewStage') &&
  previewModalHtml.includes('applyExamLayoutBtn'),
  'Layout preview modal must render all mode cards, interactive preview stage, and apply button'
);

// Reset state
App.state.examLayoutMode = 'split';
App.state.examPdfCollapsed = false;
App.state.examSheetCollapsed = false;
App.state.activeSectionTab = 'p1';
App.state.activeExam = null;

// Test 18: Tự động hóa 100% Lưu Server & Đồng bộ Đề thi / PDF Máy tính <-> Điện thoại (Supabase Postgres + Storage CDN, 0 thao tác)
const assert = require('assert');
const PDFStorage = require('../js/pdf_storage.js');

(async () => {
  // 18.1 PDFStorage an toàn trong môi trường Node (không có indexedDB) & mặc định chặn gọi Server thật khi chạy unit test Node
  const nullBlob = await PDFStorage.getPdfBlob('EXAM-NONE');
  assert.strictEqual(nullBlob, null, 'PDFStorage.getPdfBlob must safely return null without indexedDB');
  assert.strictEqual(App.isServerSyncEnabled(), false, 'Node unit test must not hit live production server unless _enableNodeCloudTest is explicitly enabled');

  // 18.2 mergeCloudState với trạng thái Server khởi tạo (updatedAt: 0) KHÔNG bao giờ xóa đề cục bộ idb: trên máy Giáo viên
  App.state.exams = [{
    id: 'EXAM-LOCAL-PC',
    title: 'Đề Ôn Tập Giữa Kỳ 1 - Mã Đề 05',
    grade: 11,
    category: 'GK1',
    is_active: true,
    allowed_all: false,
    access_type: 'grade',
    allowed_grades: [11],
    pdf_url: 'idb:EXAM-LOCAL-PC',
    part1: [{ id: 1, correct_answer: 'B' }],
    part2: [],
    part3: [],
    part4: []
  }];
  App.state.deletedIds = [];
  App.state.localStateUpdatedAt = 1000;
  App.state.unsyncedAdminChanges = false;

  assert.strictEqual(App.hasLocalOnlyPdf(App.state.exams[0]), true, 'idb: exam must be flagged as local-only');
  assert.strictEqual(App.needsAutoServerUpload(), true, 'needsAutoServerUpload must detect pre-existing local idb: exam for automatic server migration');

  const changedInit = App.mergeCloudState({ updatedAt: 0, exams: undefined, homeworks: undefined, students: undefined });
  assert.strictEqual(changedInit.changed, false, 'Empty server state must be ignored');
  assert.strictEqual(App.state.exams.length, 1, 'Existing local PC exam must remain intact');

  // 18.3 Chẩn đoán rõ ràng trên Điện thoại khi có đề Khối 11 đang mở nhưng HS001 thuộc Khối 12
  App.state.currentUser = { role: 'student', studentId: 'HS001', fullName: 'Quốc Việt', grade: 12, className: '12A1' };
  const mismatchHtml = App.renderStudentExamGridHtml([], []);
  assert(
    mismatchHtml.includes('Khối 11') && mismatchHtml.includes('HS001') && mismatchHtml.includes('studentEmptySyncBtn'),
    'Empty student grid must clearly explain grade/permission mismatch'
  );

  // 18.4 Tự động tải file PDF idb: lên Supabase Storage và lưu khao_thi_state khi mở trang (Zero-Touch Auto Upload)
  const origFetch = global.fetch;
  const origGetPdfBlob = PDFStorage.getPdfBlob;
  let mockServerState = { updated_at: 0, deleted_ids: [], exams: [], homeworks: [], students: [], settings: {} };
  const mockUploadedPdfs = new Map();
  const mockSubmissions = new Map();
  const mockStudentUpdates = new Map();

  PDFStorage.getPdfBlob = async (key) => {
    if (key === 'EXAM-LOCAL-PC') {
      return new Blob(['%PDF-1.4 local pc exam pdf'], { type: 'application/pdf' });
    }
    return null;
  };

  global.fetch = async (url, opts = {}) => {
    const u = String(url);
    const method = (opts.method || 'GET').toUpperCase();
    if (u.includes('/storage/v1/object/') && method === 'POST') {
      const objName = u.split('/').pop();
      mockUploadedPdfs.set(objName, opts.body);
      return { ok: true, status: 200, text: async () => '' };
    }
    if (u.includes('/storage/v1/object/public/') && method === 'GET') {
      const objName = u.split('/').pop().split('?')[0];
      if (mockUploadedPdfs.has(objName)) {
        return { ok: true, status: 200, blob: async () => mockUploadedPdfs.get(objName) };
      }
      return { ok: false, status: 404 };
    }
    if (u.includes('/rest/v1/khao_thi_state') && method === 'GET') {
      return { ok: true, status: 200, json: async () => [mockServerState] };
    }
    if (u.includes('/rest/v1/khao_thi_state') && method === 'POST') {
      mockServerState = JSON.parse(opts.body);
      return { ok: true, status: 201, text: async () => '' };
    }
    if (u.includes('/rest/v1/khao_thi_submissions') && method === 'GET') {
      return { ok: true, status: 200, json: async () => Array.from(mockSubmissions.values()) };
    }
    if (u.includes('/rest/v1/khao_thi_submissions') && method === 'POST') {
      const row = JSON.parse(opts.body);
      mockSubmissions.set(row.id, row);
      return { ok: true, status: 201, text: async () => '' };
    }
    if (u.includes('/rest/v1/khao_thi_student_updates') && method === 'GET') {
      return { ok: true, status: 200, json: async () => Array.from(mockStudentUpdates.values()) };
    }
    if (u.includes('/rest/v1/khao_thi_student_updates') && method === 'POST') {
      const row = JSON.parse(opts.body);
      mockStudentUpdates.set(row.student_id, row);
      return { ok: true, status: 201, text: async () => '' };
    }
    return { ok: false, status: 404, text: async () => 'Not found' };
  };

  App._enableNodeCloudTest = true;
  await App.pushAdminStateToCloud({ manual: false });
  assert.strictEqual(mockUploadedPdfs.size, 1, 'Local idb: PDF must be automatically uploaded to Supabase Storage');
  assert(
    App.state.exams[0].pdf_url.startsWith(App.SUPABASE_URL + '/storage/v1/object/public/' + App.SUPABASE_BUCKET + '/'),
    'Exam pdf_url must automatically become public Supabase Storage CDN URL'
  );
  assert.strictEqual(App.hasLocalOnlyPdf(App.state.exams[0]), false, 'Uploaded exam must no longer be flagged local-only');
  assert.strictEqual(mockServerState.exams.length, 1, 'khao_thi_state must contain the auto-saved exam');

  // 18.5 Điện thoại mới tinh (exams = []) mở trang tự động tải ngay Đề thi & PDF từ Server không cần bấm nút
  const serverPdfUrl = App.state.exams[0].pdf_url;
  App.state.exams = [];
  App.state.homeworks = [];
  App.state.submissions = [];
  App.state.localStateUpdatedAt = 0;
  App.state.unsyncedAdminChanges = false;
  App.state.cloudLastSyncedAt = 0;

  await App.syncFromCloud({ silent: true });
  assert.strictEqual(App.state.exams.length, 1, 'Fresh mobile device must automatically receive server exam on syncFromCloud');
  assert.strictEqual(App.state.exams[0].pdf_url, serverPdfUrl, 'Mobile must receive exact Supabase Storage PDF URL');

  const resolvedMobilePdf = await App.resolvePdfSourceUrl(serverPdfUrl, 'EXAM-LOCAL-PC');
  assert(
    resolvedMobilePdf.startsWith('blob:') || resolvedMobilePdf === serverPdfUrl,
    'Mobile resolvePdfSourceUrl must resolve Supabase Storage PDF to renderable URL'
  );

  // 18.6 Học sinh nộp bài & đổi mật khẩu tự động đồng bộ ngược về Server Giáo viên
  const stuSub = {
    id: 'SUB-1730280999-HS001',
    studentId: 'HS001',
    studentName: 'Quốc Việt',
    examId: 'EXAM-LOCAL-PC',
    examTitle: 'Đề Ôn Tập Giữa Kỳ 1 - Mã Đề 05',
    submittedAt: '2026-10-30T04:00:00.000Z',
    updatedAt: '2026-10-30T04:00:00.000Z',
    scoreResult: { totalScore: 10, maxTotal: 10, rank: 'Xuất sắc', part1: { score: 10 }, part2: { score: 0 }, part3: { score: 0 } },
    answers: { part1: { 1: 'B' }, part2: {}, part3: {}, part4: {} }
  };
  await App.pushStudentSubmissionToCloud(stuSub, {
    studentId: 'HS001',
    fullName: 'Quốc Việt',
    password: '999',
    updatedAt: '2026-10-30T04:01:00.000Z'
  });
  assert.strictEqual(mockSubmissions.size, 1, 'Student submission must auto-save to khao_thi_submissions');
  assert.strictEqual(mockStudentUpdates.size, 1, 'Student profile update must auto-save to khao_thi_student_updates');

  App.state.submissions = [];
  await App.syncFromCloud({ silent: true });
  assert.strictEqual(App.state.submissions.length, 1, 'Teacher must receive student submission automatically');
  const syncedHs001 = App.state.students.find(s => s.studentId === 'HS001');
  assert.strictEqual(syncedHs001 && syncedHs001.password, '999', 'Teacher must receive student updated password automatically');

  // 18.7 Tombstone deletedIds xóa sạch đề đã bị Giáo viên gỡ bỏ & QR URL chuẩn tắc
  App.mergeCloudState({
    updatedAt: mockServerState.updated_at + 5000,
    deletedIds: ['EXAM-LOCAL-PC'],
    exams: []
  });
  assert.strictEqual(App.state.exams.length, 0, 'Deleted exam tombstone must remove exam on mobile');

  const qrClean = App.getRecommendedAppUrl({ protocol: 'https:', hostname: 'thanhchi113.github.io', origin: 'https://thanhchi113.github.io', pathname: '/thi-thu-toan/' }, 'android');
  assert.strictEqual(qrClean.url, 'https://thanhchi113.github.io/thi-thu-toan/?install=android', 'QR URL must match clean canonical URL without manual cloud params');

  App._enableNodeCloudTest = false;
  PDFStorage.getPdfBlob = origGetPdfBlob;
  global.fetch = origFetch;
  App.state.currentUser = null;
  App.state.deletedIds = [];

  console.log('[OK] Test 18 Passed: Zero-touch Supabase auto-upload & mobile sync verified.');

  // =========================================================================
  // TEST 19: Chuẩn hóa hiển thị dấu "," cho Trả lời ngắn + Tắt đánh dấu sao & Bỏ chọn câu trắc nghiệm
  // =========================================================================
  const testExam19 = {
    id: 'EXAM-19',
    part1: [{ id: 1, correct_answer: 'B' }, { id: 2, correct_answer: 'C' }],
    part2: [{ id: 1, statements: [{ sub_id: 'a', correct: true }, { sub_id: 'b', correct: false }, { sub_id: 'c', correct: true }, { sub_id: 'd', correct: false }] }],
    part3: [{ id: 1, correct_answer: '1,5' }, { id: 2, correct_answer: '12,5' }, { id: 3, correct_answer: '0,5' }]
  };
  App.state.activeExam = testExam19;
  App.state.answers = { part1: {}, part2: {}, part3: {}, part4: {}, flagged: {} };

  // 19.1 Gõ dấu "." hoặc "," trong handleBoxInput đều hiển thị ","
  const makeMockBox = () => ({
    value: '',
    classList: {
      _set: new Set(),
      add(c) { this._set.add(c); },
      remove(c) { this._set.delete(c); },
      contains(c) { return this._set.has(c); }
    }
  });
  const box0 = makeMockBox();
  box0.value = '1';
  App.handleBoxInput({ data: '1', target: box0 }, 1, 0);
  assert.strictEqual(box0.value, '1');

  const box1 = makeMockBox();
  box1.value = '.';
  App.handleBoxInput({ data: '.', target: box1 }, 1, 1);
  assert.strictEqual(box1.value, ',', 'Typing "." via keyboard must immediately display "," in input box');
  assert.strictEqual(App.state.answers.part3[1][1], ',', 'Typing "." must store "," in state.answers.part3');

  // Bàn phím số điện thoại (IME không gửi event.data, chỉ đổi target.value)
  const box1Mobile = makeMockBox();
  box1Mobile.value = '.';
  App.handleBoxInput({ data: null, target: box1Mobile }, 1, 1);
  assert.strictEqual(box1Mobile.value, ',', 'Mobile decimal pad "." without event.data must still display ","');

  // Gõ dấu "," giữ nguyên ","
  const boxComma = makeMockBox();
  boxComma.value = ',';
  App.handleBoxInput({ data: ',', target: boxComma }, 1, 1);
  assert.strictEqual(boxComma.value, ',', 'Typing "," must display ","');

  // Dán chuỗi "12.5" -> tự rải thành ['1', '2', ',', '5']
  App.state.answers.part3[2] = ['', '', '', ''];
  const pasteBox = makeMockBox();
  pasteBox.value = '12.5';
  App.handleBoxInput({ inputType: 'insertFromPaste', data: '12.5', target: pasteBox }, 2, 0);
  assert.strictEqual(App.state.answers.part3[2].join(''), '12,5', 'Pasting "12.5" must convert "." to "," across boxes');
  assert.strictEqual(App.getQuestionProgressState('p3', 2).label, 'Đã điền: 12,5', 'Progress badge must display comma "12,5"');

  // Bàn phím ảo trên màn hình bấm "." -> hiển thị ","
  App.state.answers.part3[3] = ['', '', '', ''];
  App.state.activePart3Target = { qId: 3, boxIdx: 0 };
  App.handleKeypadPress('0');
  App.handleKeypadPress('.');
  App.handleKeypadPress('5');
  assert.strictEqual(App.state.answers.part3[3].join(''), '0,5', 'Virtual math keypad "." must insert ","');

  // Giáo viên nhập đáp án Phần III bằng "." -> tự đổi hiển thị sang ","
  App.initAnswerKeyDraft({ p1Count: 1, p2Count: 0, p3Count: 2, p4Count: 0 });
  const teacherInput = { value: '3.75' };
  App.setDraftP3(0, '3.75', teacherInput);
  assert.strictEqual(teacherInput.value, '3,75', 'Teacher P3 input must immediately convert "." to ","');
  assert.strictEqual(App.state.answerKeyDraft.p3[0], '3,75', 'Teacher P3 draft must store "3,75"');

  // Chấm điểm vẫn công nhận tuyệt đối cả "," và "."
  const commaExam = {
    id: 'TEST-COMMA',
    part1: [],
    part2: [],
    part3: [{ id: 1, correct_answer: '12.5' }, { id: 2, correct_answer: '-0,75' }]
  };
  const commaGrade = GradingSystem.grade({ part1: {}, part2: {}, part3: { 1: '12,5', 2: '-0,75' } }, commaExam);
  assert.strictEqual(commaGrade.part3.correctCount, 2, 'Comma-formatted answers must match both "." and "," answer keys');
  const detailSheetHtml = App.renderSubmissionAnswerSheetBody(
    commaExam,
    { id: 'S1', answers: { part1: {}, part2: {}, part3: { 1: '12.5', 2: '-0.75' } } },
    GradingSystem.grade({ part1: {}, part2: {}, part3: { 1: '12.5', 2: '-0.75' } }, commaExam),
    true,
    true
  );
  assert(detailSheetHtml.includes('12,5') && detailSheetHtml.includes('-0,75') && !detailSheetHtml.includes('12.5'), 'Submission detail must display "," for both student answer and answer key');

  // 19.2 Bật & Tắt đánh dấu ngôi sao (toggleFlag)
  App.state.activeExam = testExam19;
  App.state.answers = { part1: {}, part2: {}, part3: {}, part4: {}, flagged: {} };
  App.toggleFlag('p1', 1);
  assert.strictEqual(App.getQuestionProgressState('p1', 1).isFlagged, true, 'First tap must flag question');
  assert.strictEqual(App.calculateProgress().flagged, 1, 'Flagged count must be 1');
  assert(App.renderAnswerSheetPartBlock(testExam19, 'p1').includes('fa-solid fa-star'), 'Flagged star must use fa-solid');

  App.toggleFlag('p1', 1);
  assert.strictEqual(App.getQuestionProgressState('p1', 1).isFlagged, false, 'Second tap must unflag question');
  assert.strictEqual(App.calculateProgress().flagged, 0, 'Flagged count must return to 0');
  assert.strictEqual('p1_1' in App.state.answers.flagged, false, 'Unflagged key must be deleted cleanly');
  assert(!App.renderAnswerSheetPartBlock(testExam19, 'p1').includes('is-flagged'), 'Unflagged render must have zero is-flagged stars');

  // 19.3 Bấm lại đáp án đang chọn ở Phần I & Phần II -> Tự tắt chọn (Bỏ đánh dấu phương án)
  App.selectPart1Answer(1, 'B');
  assert.strictEqual(App.getQuestionProgressState('p1', 1).status, 'answered');
  assert.strictEqual(App.getQuestionProgressState('p1', 1).label, 'Đã chọn B');
  App.selectPart1Answer(1, 'B');
  assert.strictEqual(App.state.answers.part1[1], undefined, 'Tapping selected Part I choice again must unselect it');
  assert.strictEqual(App.getQuestionProgressState('p1', 1).status, 'unanswered');
  assert.strictEqual(App.getQuestionProgressState('p1', 1).label, 'Chưa chọn');

  App.selectPart2Answer(1, 'a', true);
  assert.strictEqual(App.getQuestionProgressState('p2', 1).status, 'partial');
  App.selectPart2Answer(1, 'a', true);
  assert.strictEqual(App.state.answers.part2[1], undefined, 'Tapping selected Part II Đúng/Sai again must unselect it');
  assert.strictEqual(App.getQuestionProgressState('p2', 1).status, 'unanswered');

  App.state.layoutPreviewSampleAns = null;
  App.pickPreviewSampleAns(1, 'B');
  assert.strictEqual(App.state.layoutPreviewSampleAns[1], undefined, 'Preview sample answer must also toggle off when tapped again');

  App.state.activeExam = null;

  // =========================================================================
  // TEST 20: Cảnh báo Chụp màn hình & Cơ chế Tích điểm Đổi phần thưởng
  // =========================================================================
  // 20.1 Nhận diện phím tắt chụp màn hình & chặn đếm trùng lỗi rời màn hình ngay sau đó
  assert(App.isScreenshotShortcutEvent({ key: 'PrintScreen', code: 'PrintScreen' }).includes('PrintScreen'), 'Must detect PrintScreen');
  assert(App.isScreenshotShortcutEvent({ key: 'S', metaKey: true, shiftKey: true }).length > 0, 'Must detect Win/Cmd+Shift+S');
  assert(App.isScreenshotShortcutEvent({ key: 's', ctrlKey: true, shiftKey: true }).length > 0, 'Must detect Ctrl+Shift+S');
  assert(App.isScreenshotShortcutEvent({ key: 'p', ctrlKey: true, shiftKey: false }).length > 0, 'Must detect Ctrl+P');
  assert.strictEqual(App.isScreenshotShortcutEvent({ key: 'a', ctrlKey: false, shiftKey: false }), '', 'Normal typing must not trigger screenshot warning');

  App.state.settings.warnOnScreenshot = true;
  App.state.settings.warnOnExitExam = true;
  App.state.activeExam = testExam19;
  App.state.tabSwitchesCount = 0;
  App.state.screenshotCount = 0;
  App.state.violationLogs = [];
  App.resetExamMonitorState();

  const recordedShot1 = App.recordScreenshotViolation('Nhấn phím chụp màn hình (PrintScreen)');
  assert.strictEqual(recordedShot1, true, 'First screenshot violation must be recorded');
  assert.strictEqual(App.state.screenshotCount, 1, 'screenshotCount must increment to 1');
  assert.strictEqual(App.state.tabSwitchesCount, 1, 'tabSwitchesCount must include screenshot violation');
  assert.strictEqual(App.state.violationLogs[0].type, 'screenshot', 'Violation log entry must have type=screenshot');

  // Ngay sau khi bấm Win+Shift+S, trình duyệt bị blur -> không được đếm trùng thêm 1 lỗi rời màn hình trong cửa sổ chống dội
  const duplicateBlur = App.recordExamLeaveViolation('Mở đa nhiệm ngay sau phím chụp');
  assert.strictEqual(duplicateBlur, false, 'Immediate blur right after screenshot shortcut must not double-count');
  assert.strictEqual(App.state.tabSwitchesCount, 1, 'Total violations must remain 1');

  // Khi Giáo viên tắt warnOnScreenshot -> không cảnh báo chụp màn hình
  App.state.settings.warnOnScreenshot = false;
  App._lastScreenshotWarnAt = 0;
  assert.strictEqual(App.recordScreenshotViolation('PrintScreen'), false, 'Disabled warnOnScreenshot must ignore screenshot');
  App.state.settings.warnOnScreenshot = true;
  App.state.activeExam = null;

  // 20.2 Tính điểm tích lũy theo mốc điểm + kỷ luật + chống spam nộp trùng đề + đổi thưởng & duyệt thưởng
  App.state.students = [
    App.normalizeStudentRecord({ studentId: 'HS20', fullName: 'Trần Minh Khôi', className: '12A1', grade: 12, status: 'active' })
  ];
  App.state.currentUser = { ...App.state.students[0], role: 'student' };
  App.state.submissions = [
    // Đề 1: 8.5/10 (85% -> +30⭐) + Nghiêm túc 0 vi phạm (+5⭐) = 35⭐
    {
      id: 'SUB-R1',
      examId: 'EX-R1',
      studentId: 'HS20',
      tabSwitches: 0,
      screenshotCount: 0,
      scoreResult: { totalScore: 8.5, maxTotal: 10, percentage: 85 }
    },
    // Nộp lại trùng Đề 1 nhưng điểm thấp hơn (6.0/10) -> Chống spam: không được cộng dồn thêm điểm
    {
      id: 'SUB-R1-DUP',
      examId: 'EX-R1',
      studentId: 'HS20',
      tabSwitches: 0,
      screenshotCount: 0,
      scoreResult: { totalScore: 6.0, maxTotal: 10, percentage: 60 }
    },
    // Đề 2: 9.2/10 (92% -> +45⭐) nhưng chụp màn hình 1 lần (mất +5⭐ kỷ luật và phạt -5⭐ chụp MH) = 40⭐
    {
      id: 'SUB-R2',
      examId: 'EX-R2',
      studentId: 'HS20',
      tabSwitches: 1,
      screenshotCount: 1,
      scoreResult: { totalScore: 9.2, maxTotal: 10, percentage: 92 }
    }
  ];

  let rwStats = App.getStudentRewardStats('HS20');
  assert.strictEqual(rwStats.earnedPoints, 75, 'Earned points must equal 35 (EX-R1 best) + 40 (EX-R2 with 1 screenshot penalty) = 75');
  assert.strictEqual(rwStats.availablePoints, 75, 'Initial available points must be 75');

  // Chưa đủ 100⭐ để đổi RW-02 (100⭐)
  assert.strictEqual(App.redeemReward('RW-02', true), false, 'Cannot redeem 100-point reward with 75 points');

  // Đổi thành công RW-01 (60⭐)
  assert.strictEqual(App.redeemReward('RW-01', true), true, 'Must redeem 60-point reward with 75 points');
  rwStats = App.getStudentRewardStats('HS20');
  assert.strictEqual(rwStats.spentPoints, 60, 'Spent points must be 60');
  assert.strictEqual(rwStats.availablePoints, 15, 'Available points must be 15 after redeeming 60');
  assert.strictEqual(App.getPendingRedemptionsCount(), 1, 'Pending redemptions count for Teacher must be 1');

  const rdmId = rwStats.redemptions[0].id;
  // Giáo viên xác nhận đã trao thưởng
  assert.strictEqual(App.fulfillRewardRedemption('HS20', rdmId), true, 'Teacher must fulfill redemption');
  assert.strictEqual(App.getPendingRedemptionsCount(), 0, 'Pending redemptions must drop to 0 after fulfillment');
  assert.strictEqual(App.getStudentRewardStats('HS20').availablePoints, 15, 'Fulfilled redemption keeps points spent');

  // Giáo viên cộng thêm +90⭐ khuyến khích -> HS có 105⭐ -> đổi RW-02 (100⭐), sau đó GV hoàn điểm
  App.adjustStudentBonusPoints('HS20', 90);
  assert.strictEqual(App.getStudentRewardStats('HS20').availablePoints, 105, 'Bonus +90 must raise availablePoints to 105');
  assert.strictEqual(App.redeemReward('RW-02', true), true, 'Student can now redeem RW-02 (100 points)');
  assert.strictEqual(App.getStudentRewardStats('HS20').availablePoints, 5, 'Available points drop to 5');

  const rdm2Id = App.getStudentRewardStats('HS20').redemptions[0].id;
  App.rejectRewardRedemption('HS20', rdm2Id);
  assert.strictEqual(App.getStudentRewardStats('HS20').availablePoints, 105, 'Rejecting redemption must refund 100 points back to 105');

  // Đồng bộ Cloud không làm mất lịch sử đổi thưởng
  const mergedStu = App.mergeStudentRecords(
    { studentId: 'HS20', fullName: 'Trần Minh Khôi', redemptions: [{ id: 'RDM-CLOUD-1', rewardTitle: 'Quà Cloud', cost: 60, status: 'pending', createdAt: '2026-10-30T09:00:00Z' }] },
    App.state.students[0]
  );
  assert.strictEqual(mergedStu.redemptions.length, 3, 'mergeStudentRecords must union redemptions across devices without data loss');

  // Test 21: Không dùng Emoji trong UI, Chỉnh sửa phần thưởng tại chỗ, Tìm kiếm học sinh (Sổ điểm tổng hợp & Thưởng/Trừ nhanh) và Chống ghi đè mất đề Server
  const fs = require('fs');
  const path = require('path');
  const appSrc = fs.readFileSync(path.join(__dirname, '..', 'js', 'app.js'), 'utf8');
  const emojiMatches = appSrc.match(/[\p{Extended_Pictographic}\u2B50\u2728\u2705\u274C\u26A0]/gu) || [];
  assert.strictEqual(emojiMatches.length, 0, `UI code must use synchronized FontAwesome icons with 0 emojis, found: ${emojiMatches.join('')}`);

  // 21.1 Chỉnh sửa phần thưởng trực tiếp không cần xóa & tạo mới
  App.state.settings.rewardCatalog = null;
  const beforeLen = App.getRewardCatalog().length;
  const editOk = App.handleEditRewardSubmit('RW-01', {
    title: 'Cộng +0,75 điểm kiểm tra miệng',
    cost: 75,
    icon: 'fa-medal',
    desc: 'Đã chỉnh sửa trực tiếp phần thưởng'
  });
  assert.strictEqual(editOk, true, 'handleEditRewardSubmit must succeed');
  const editedCatalog = App.getRewardCatalog();
  assert.strictEqual(editedCatalog.length, beforeLen, 'Editing reward must keep catalog length unchanged');
  assert.strictEqual(editedCatalog[0].id, 'RW-01', 'Editing reward must preserve original reward id');
  assert.strictEqual(editedCatalog[0].title, 'Cộng +0,75 điểm kiểm tra miệng', 'Edited title mismatch');
  assert.strictEqual(editedCatalog[0].cost, 75, 'Edited cost mismatch');
  assert.strictEqual(editedCatalog[0].icon, 'fa-medal', 'Edited icon mismatch');

  // 21.2 Tìm kiếm nhanh học sinh có dấu / không dấu / mã HS ở cả Bảng Tích Điểm và Sổ Điểm Tổng Hợp + Cộng/Trừ điểm tùy chỉnh
  App.state.students = [
    App.normalizeStudentRecord({ studentId: 'HS001', fullName: 'Quốc Việt', className: '12B 2K9', grade: 12 }),
    App.normalizeStudentRecord({ studentId: 'HS055', fullName: 'Hồ Kiên', className: '10A 2K11', grade: 10 }),
    App.normalizeStudentRecord({ studentId: 'HS080', fullName: 'Vy Nhã', className: '11A1', grade: 11 })
  ];
  App.state.adminRewardStudentSearch = 'quoc viet';
  const rwFiltered = App.getFilteredRewardStudentRows();
  assert.strictEqual(rwFiltered.length, 1, 'Accent-insensitive reward student search must find 1 match');
  assert.strictEqual(rwFiltered[0].student.studentId, 'HS001', 'Accent-insensitive reward student search must find Quốc Việt');

  assert.strictEqual(App.applyCustomStudentBonus('HS001', 1, 25), true, 'Custom +25 bonus must succeed');
  assert.strictEqual(App.getStudentRewardStats('HS001').bonusPoints, 25, 'HS001 bonusPoints must be 25');
  assert.strictEqual(App.applyCustomStudentBonus('HS001', -1, 10), true, 'Custom -10 deduction must succeed');
  assert.strictEqual(App.getStudentRewardStats('HS001').bonusPoints, 15, 'HS001 bonusPoints must be 15 after -10');
  App.state.adminRewardStudentSearch = '';

  App.state.adminGradeFilter = 'ALL';
  App.state.adminClassFilter = 'ALL';
  App.state.adminGradebookSearch = 'ho kien';
  const gbByNoAccent = App.getFilteredGradebookStudents();
  assert.strictEqual(gbByNoAccent.length, 1, 'Gradebook search without accents must find 1 match');
  assert.strictEqual(gbByNoAccent[0].studentId, 'HS055', 'Gradebook search without accents must find Hồ Kiên');

  App.state.adminGradebookSearch = 'hs080';
  const gbById = App.getFilteredGradebookStudents();
  assert.strictEqual(gbById.length, 1, 'Gradebook search by studentId must find 1 match');
  assert.strictEqual(gbById[0].fullName, 'Vy Nhã', 'Gradebook search by studentId must find HS080');
  App.state.adminGradebookSearch = '';

  // 21.3 Bảo vệ chống ghi đè mất đề thi trên Server khi tab chưa sync lần đầu (!cloudLastSyncedAt)
  let pushedStateBody = null;
  const prevFetch = global.fetch;
  global.fetch = async (url, opts = {}) => {
    const u = String(url);
    if (opts.method === 'POST' && u.includes('/khao_thi_state')) {
      pushedStateBody = JSON.parse(opts.body);
      return { ok: true, status: 201, text: async () => '' };
    }
    if (u.includes('/khao_thi_state?id=eq.main')) {
      return {
        ok: true,
        json: async () => [{
          updated_at: 1000,
          deleted_ids: [],
          exams: [{ id: 'EXAM-SERVER-EXISTING', title: 'ÔN TẬP GK1 11 ĐỀ 5', grade: 11, category: 'GK1', is_active: true, part1: [], part2: [], part3: [], part4: [] }],
          homeworks: [],
          students: [],
          settings: {}
        }]
      };
    }
    return { ok: true, json: async () => [] };
  };
  App._enableNodeCloudTest = true;
  App.state.cloudLastSyncedAt = 0;
  App.state.deletedIds = [];
  App.state.unsyncedAdminChanges = true;
  App.state.localStateUpdatedAt = 2000;
  App.state.exams = [{ id: 'EXAM-NEW-LOCAL', title: 'ÔN TẬP GK1 11 ĐỀ 4', grade: 11, category: 'GK1', is_active: true, part1: [], part2: [], part3: [], part4: [] }];
  await App.pushAdminStateToCloud({ manual: false });
  assert.ok(pushedStateBody && Array.isArray(pushedStateBody.exams), 'Must push merged state');
  const pushedExamIds = pushedStateBody.exams.map(e => e.id);
  assert.ok(pushedExamIds.includes('EXAM-NEW-LOCAL') && pushedExamIds.includes('EXAM-SERVER-EXISTING'), 'pushAdminStateToCloud must preserve existing server exams when !cloudLastSyncedAt');
  App._enableNodeCloudTest = false;
  global.fetch = prevFetch;

  console.log('[OK] TẤT CẢ 21 BỘ TEST (ICON ĐỒNG BỘ, SỬA PHẦN THƯỞNG, TÌM NHANH HS, BẢO VỆ ĐỀ SERVER & CHỐNG CHỤP MÀN HÌNH) ĐÃ ĐẠT 100%!');
})().catch((err) => {
  console.error('[FAIL] Test suite failed:', err);
  process.exit(1);
});
