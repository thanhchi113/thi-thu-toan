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

  // Test 22: Chống tự động quay về trang đầu (sync digest + canSafelyAutoReRender + lưu kép phiên đăng nhập) & Nút Back trên điện thoại (openModalElement + handleBrowserBackPop)
  // 22.1 mergeCloudState không báo changed=true khi dữ liệu Server giống hệt dữ liệu hiện tại
  App.state.localStateUpdatedAt = 5000;
  App.state.exams = [{ id: 'EX-STABLE-1', title: 'Đề ổn định', grade: 12, category: 'GK1', is_active: true, part1: [], part2: [], part3: [], part4: [] }];
  App.state.homeworks = [];
  App.state.submissions = [];
  App.state.deletedIds = [];
  const sameSnapRes = App.mergeCloudState({
    updatedAt: 5000,
    deletedIds: [],
    exams: [{ id: 'EX-STABLE-1', title: 'Đề ổn định', grade: 12, category: 'GK1', is_active: true, part1: [], part2: [], part3: [], part4: [] }],
    homeworks: [],
    students: App.state.students.map(s => ({ ...s })),
    settings: { ...App.state.settings },
    submissions: []
  });
  assert.strictEqual(sameSnapRes.changed, false, 'Identical cloud snapshot must report changed=false so 25s poll does not reset view');

  // 22.2 Lưu kép phiên đăng nhập: mất sessionStorage trên điện thoại vẫn khôi phục từ localStorage
  const storeMap = { session: {}, local: {} };
  const prevSessionStorage = global.sessionStorage;
  const prevLocalStorage = global.localStorage;
  global.sessionStorage = {
    getItem: (k) => (k in storeMap.session ? storeMap.session[k] : null),
    setItem: (k, v) => { storeMap.session[k] = String(v); },
    removeItem: (k) => { delete storeMap.session[k]; }
  };
  global.localStorage = {
    getItem: (k) => (k in storeMap.local ? storeMap.local[k] : null),
    setItem: (k, v) => { storeMap.local[k] = String(v); },
    removeItem: (k) => { delete storeMap.local[k]; }
  };
  App.saveSessionUser({ role: 'student', studentId: 'HS001', fullName: 'Quốc Việt', grade: 12 });
  delete storeMap.session.thpt_current_user; // Giả lập trình duyệt điện thoại giải phóng RAM tab ngầm
  App.state.currentUser = null;
  App.checkSession();
  assert.ok(App.state.currentUser && App.state.currentUser.studentId === 'HS001', 'checkSession must recover student session from localStorage when sessionStorage is cleared');
  App.clearSessionUser();
  assert.strictEqual(storeMap.local.thpt_current_user, undefined, 'clearSessionUser must remove localStorage session');
  global.sessionStorage = prevSessionStorage;
  global.localStorage = prevLocalStorage;

  // 22.3 openModalElement & handleBrowserBackPop đóng đúng thứ tự lớp phủ và không đẩy trùng history khi mở lại modal
  const prevWindow = global.window;
  const prevDocument = global.document;
  let pushedCount = 0;
  let cleanedCreateExam = 0;
  const domNodes = [];
  const makeNode = (id, tag = 'DIV') => ({
    id,
    tagName: tag,
    classList: {
      _set: new Set(),
      contains(c) { return this._set.has(c); },
      add(c) { this._set.add(c); },
      remove(c) { this._set.delete(c); },
      toggle(c) { if (this._set.has(c)) this._set.delete(c); else this._set.add(c); }
    },
    remove() {
      const idx = domNodes.indexOf(this);
      if (idx >= 0) domNodes.splice(idx, 1);
    }
  });
  global.window = {
    history: { pushState: () => { pushedCount += 1; } }
  };
  global.document = {
    activeElement: { tagName: 'BODY' },
    body: { appendChild(n) { domNodes.push(n); }, classList: { remove() {} }, style: {} },
    documentElement: { style: {} },
    getElementById(id) { return domNodes.find(n => n.id === id) || null; },
    querySelector(sel) {
      if (sel.includes('[id$="Modal"]')) {
        return domNodes.find(n => (n.id && n.id.endsWith('Modal')) || n.id === 'appSystemDialog' || n.id === 'appCustomSelectMenu') || null;
      }
      return null;
    },
    querySelectorAll(sel) {
      if (sel === '[id$="Modal"]') return domNodes.filter(n => n.id && n.id.endsWith('Modal'));
      return [];
    }
  };

  App.state.activeExam = null;
  App.state.activeSubmissionDetailId = 'SUB-DETAIL-1';
  assert.strictEqual(App.canSafelyAutoReRender(), false, 'canSafelyAutoReRender must be false while viewing submission detail');
  App.state.activeSubmissionDetailId = null;
  assert.strictEqual(App.canSafelyAutoReRender(), true, 'canSafelyAutoReRender must be true on idle dashboard');

  const m1 = makeNode('createExamModal');
  App.openModalElement(m1, false);
  assert.strictEqual(pushedCount, 1, 'First modal open must push 1 history entry');
  assert.strictEqual(App.canSafelyAutoReRender(), false, 'canSafelyAutoReRender must be false when modal is open');

  const m1Reopen = makeNode('createExamModal');
  App.openModalElement(m1Reopen, true);
  assert.strictEqual(pushedCount, 1, 'Re-rendering an already open modal must NOT push duplicate history');
  assert.strictEqual(domNodes.filter(n => n.id === 'createExamModal').length, 1, 'Old modal node must be replaced');

  const origCleanup = App.cleanupUnusedPreuploads;
  App.cleanupUnusedPreuploads = () => { cleanedCreateExam += 1; };
  assert.strictEqual(App.handleBrowserBackPop(), true, 'Back button must close topmost modal');
  assert.strictEqual(cleanedCreateExam, 1, 'Closing createExamModal via Back must clean up pre-uploads');
  assert.strictEqual(domNodes.length, 0, 'Modal must be removed from DOM after Back');
  App.cleanupUnusedPreuploads = origCleanup;

  global.window = prevWindow;
  global.document = prevDocument;

  // Test 23: Tăng tốc tải file & lưu file lên Server (RAM Cache 0ms, gộp luồng tải trùng, tải song song Promise.all + tái sử dụng pre-upload & bỏ tải thừa submissions khi lưu state)
  await PDFStorage.clearAllPdfs();
  const sampleFastBlob = new Blob(['%PDF-1.4 fast-ram'], { type: 'application/pdf' });
  await PDFStorage.savePdf('FAST-EXAM-1', sampleFastBlob);
  assert.strictEqual(PDFStorage.hasMemBlob('FAST-EXAM-1'), true, 'savePdf must populate 0ms RAM memCache immediately');
  const syncBlobUrl = PDFStorage.getCachedBlobUrlSync('FAST-EXAM-1');
  assert.ok(syncBlobUrl.startsWith('blob:'), 'getCachedBlobUrlSync must return instant blob URL from RAM');
  assert.strictEqual(PDFStorage.getCachedBlobUrlSync('FAST-EXAM-1'), syncBlobUrl, 'Repeated getCachedBlobUrlSync must reuse same ObjectURL');
  await PDFStorage.deletePdf('FAST-EXAM-1');
  assert.strictEqual(PDFStorage.hasMemBlob('FAST-EXAM-1'), false, 'deletePdf must clear RAM memCache');

  // 23.1 Hợp nhất các luồng tải PDF trùng lặp (5 lượt gọi đồng thời chỉ phát sinh đúng 1 HTTP GET)
  const prevFetch23 = global.fetch;
  let pdfGetCalls = 0;
  let storagePostCalls = 0;
  let submissionsGetCalls = 0;
  let maxConcurrentUploads = 0;
  let activeUploads = 0;
  const targetFastPdfUrl = `${App.SUPABASE_URL}/storage/v1/object/public/${App.SUPABASE_BUCKET}/DEDUP_TEST_999.pdf`;

  global.fetch = async (url, opts = {}) => {
    const u = String(url);
    const method = (opts.method || 'GET').toUpperCase();
    if (u === targetFastPdfUrl && method === 'GET') {
      pdfGetCalls += 1;
      await new Promise(r => setTimeout(r, 35));
      return { ok: true, status: 200, blob: async () => new Blob(['%PDF-1.4 dedup'], { type: 'application/pdf' }) };
    }
    if (u.includes('/storage/v1/object/') && method === 'POST') {
      storagePostCalls += 1;
      activeUploads += 1;
      if (activeUploads > maxConcurrentUploads) maxConcurrentUploads = activeUploads;
      assert.strictEqual(opts.headers['cache-control'], '31536000', 'Upload must set 1-year immutable CDN cache-control header');
      await new Promise(r => setTimeout(r, 40));
      activeUploads -= 1;
      return { ok: true, status: 200, text: async () => '' };
    }
    if (u.includes('/rest/v1/khao_thi_submissions') && method === 'GET') {
      submissionsGetCalls += 1;
      return { ok: true, status: 200, json: async () => [] };
    }
    if (u.includes('/rest/v1/khao_thi_state') && method === 'GET') {
      return { ok: true, status: 200, json: async () => [] };
    }
    if (u.includes('/rest/v1/khao_thi_state') && method === 'POST') {
      return { ok: true, status: 201, text: async () => '' };
    }
    return { ok: true, status: 200, json: async () => [] };
  };

  const parallelUrls = await Promise.all([
    App.resolvePdfSourceUrl(targetFastPdfUrl, 'DEDUP-SLOT'),
    App.resolvePdfSourceUrl(targetFastPdfUrl, 'DEDUP-SLOT'),
    App.resolvePdfSourceUrl(targetFastPdfUrl, 'DEDUP-SLOT'),
    App.resolvePdfSourceUrl(targetFastPdfUrl, 'DEDUP-SLOT'),
    App.resolvePdfSourceUrl(targetFastPdfUrl, 'DEDUP-SLOT')
  ]);
  assert.strictEqual(pdfGetCalls, 1, '5 concurrent resolvePdfSourceUrl calls must share 1 single HTTP download');
  assert.ok(parallelUrls.every(u => u.startsWith('blob:')), 'All callers must receive valid blob URL');

  // Lần mở tiếp theo phải lấy thẳng từ RAM 0ms (không gọi thêm bất kỳ fetch nào)
  const instantSecondOpen = await App.resolvePdfSourceUrl(targetFastPdfUrl, 'DEDUP-SLOT');
  assert.strictEqual(pdfGetCalls, 1, 'Subsequent open must hit 0ms RAM cache with 0 network calls');
  assert.strictEqual(instantSecondOpen, parallelUrls[0], 'Subsequent open must reuse cached blob URL');

  // 23.2 Lưu song song nhiều file PDF (Đề + Lời giải + Tài liệu) & tái sử dụng luồng pre-upload không tải lại từ đầu
  await PDFStorage.savePdf('EX-PAR-1', new Blob(['%PDF-Q'], { type: 'application/pdf' }));
  await PDFStorage.savePdf('EX-PAR-1_sol', new Blob(['%PDF-SOL'], { type: 'application/pdf' }));
  await PDFStorage.savePdf('HW-PAR-1', new Blob(['%PDF-HW'], { type: 'application/pdf' }));

  const preuploadedUrl = `${App.SUPABASE_URL}/storage/v1/object/public/${App.SUPABASE_BUCKET}/PREUPLOADED_HW_1.pdf`;
  App.registerInFlightSlotUpload('HW-PAR-1', new Promise(r => setTimeout(() => r(preuploadedUrl), 15)));

  App._enableNodeCloudTest = true;
  App.state.cloudLastSyncedAt = 0;
  App.state.exams = [{
    id: 'EX-PAR-1',
    title: 'Đề Tải Song Song',
    grade: 12,
    category: 'GK1',
    is_active: true,
    pdf_url: 'idb:EX-PAR-1',
    solution_pdf_url: 'idb:EX-PAR-1_sol',
    part1: [], part2: [], part3: [], part4: []
  }];
  App.state.homeworks = [{
    id: 'HW-PAR-1',
    title: 'Chuyên Đề Tốc Độ Cao',
    grade: 12,
    pdfUrl: 'idb:HW-PAR-1',
    allowedAll: true
  }];

  await App.pushAdminStateToCloud({ manual: false });
  assert.strictEqual(submissionsGetCalls, 0, 'pushAdminStateToCloud must skip fetching 2000 submissions when merging stateOnly');
  assert.strictEqual(storagePostCalls, 2, 'Must reuse pre-uploaded HW promise and only POST the remaining 2 PDFs');
  assert.strictEqual(maxConcurrentUploads, 2, 'Question PDF and Solution PDF must upload in parallel (concurrency = 2)');
  assert.strictEqual(App.state.homeworks[0].pdfUrl, preuploadedUrl, 'Homework must receive reused pre-uploaded URL');
  assert.ok(App.state.exams[0].pdf_url.includes('/storage/v1/object/public/'), 'Question PDF must be uploaded to CDN');
  assert.ok(App.state.exams[0].solution_pdf_url.includes('/storage/v1/object/public/'), 'Solution PDF must be uploaded to CDN');

  App._enableNodeCloudTest = false;
  global.fetch = prevFetch23;
  await PDFStorage.clearAllPdfs();

  // ==========================================
  // TEST 24: QUẢN LÝ NHIỀU TÀI KHOẢN ADMIN, ĐĂNG XUẤT SẠCH MOBILE & CHỐNG ĐÈ NÚT
  // ==========================================
  console.log('--- TEST 24: Multi-Admin Accounts, Mobile Clean Logout & Anti-Overlap Buttons ---');

  // 24.1 Multi-admin creation, validation & login
  App.state.admins = [
    { ...App.state.admin, username: 'ADMIN', password: '123' }
  ];
  const initialAdminCount = App.getAdminAccounts().length;
  assert.strictEqual(initialAdminCount, 1, 'Initial admin count should be 1');

  const createMockElement = () => ({
    id: '',
    className: '',
    innerHTML: '',
    style: {},
    appendChild: () => {},
    remove: () => {},
    setAttribute: () => {},
    getAttribute: () => '',
    addEventListener: () => {},
    querySelector: () => null,
    querySelectorAll: () => []
  });

  // Thêm admin phụ GIAOVIEN_MAI
  global.document = {
    getElementById: (id) => {
      if (id === 'newAdminFullName') return { value: 'Cô Nguyễn Thị Mai' };
      if (id === 'newAdminUsername') return { value: 'GIAOVIEN_MAI' };
      if (id === 'newAdminPassword') return { value: 'mai123' };
      if (id === 'newAdminEmail') return { value: 'mai@toan.edu.vn' };
      if (id === 'targetAdminNewPass') return { value: 'mai456' };
      return null;
    },
    querySelectorAll: () => [],
    createElement: createMockElement,
    addEventListener: () => {},
    removeEventListener: () => {},
    body: { classList: { remove: () => {} }, appendChild: () => {} }
  };

  const addResult = App.handleAddAdminSubmit();
  assert.strictEqual(addResult, true, 'Adding new secondary admin should succeed');
  assert.strictEqual(App.getAdminAccounts().length, 2, 'Admin count should now be 2');

  // Kiểm tra chống trùng username
  const dupResult = App.handleAddAdminSubmit();
  assert.strictEqual(dupResult, false, 'Adding duplicate username must fail');

  // Đăng nhập bằng tài khoản admin mới
  const loginNewSuccess = App.loginAdmin('GIAOVIEN_MAI', 'mai123');
  assert.strictEqual(loginNewSuccess, true, 'Login with new admin account should succeed');
  assert.strictEqual(App.state.currentUser.username, 'GIAOVIEN_MAI', 'Current user should be GIAOVIEN_MAI');
  assert.strictEqual(App.state.currentUser.role, 'admin', 'Role must be admin');

  // Đăng nhập sai mật khẩu admin mới
  const loginNewFail = App.loginAdmin('GIAOVIEN_MAI', 'wrong_pass');
  assert.strictEqual(loginNewFail, false, 'Login with wrong password must fail');

  // Admin gốc ADMIN vẫn đăng nhập bình thường
  const loginMaster = App.loginAdmin('ADMIN', '123');
  assert.strictEqual(loginMaster, true, 'Master admin should still login successfully');
  assert.strictEqual(App.state.currentUser.username, 'ADMIN', 'Current user should be ADMIN');

  // Đổi mật khẩu tài khoản GIAOVIEN_MAI
  const changePassResult = App.handleChangeAdminPassSubmit('GIAOVIEN_MAI');
  assert.strictEqual(changePassResult, true, 'Change admin password should succeed');
  const loginWithNewPass = App.loginAdmin('GIAOVIEN_MAI', 'mai456');
  assert.strictEqual(loginWithNewPass, true, 'Login with updated admin password should succeed');

  // Không cho phép tự xóa tài khoản đang đăng nhập
  App.state.currentUser = { username: 'GIAOVIEN_MAI', role: 'admin' };
  let selfDeleteBlocked = false;
  const originalNotify = App.notify;
  App.notify = (msg, type) => {
    if (msg.includes('không thể tự xóa') || type === 'error') selfDeleteBlocked = true;
  };
  App.deleteAdminAccount('GIAOVIEN_MAI');
  assert.strictEqual(selfDeleteBlocked, true, 'Cannot self-delete current logged in admin');

  // Không cho phép xóa ADMIN gốc
  let masterDeleteBlocked = false;
  App.deleteAdminAccount('ADMIN');
  assert.strictEqual(masterDeleteBlocked || selfDeleteBlocked, true, 'Cannot delete master ADMIN account');

  // Xóa tài khoản phụ khi đăng nhập bằng ADMIN
  App.state.currentUser = { username: 'ADMIN', role: 'admin' };
  App.confirmDialog = (msg, onConfirm) => onConfirm();
  App.deleteAdminAccount('GIAOVIEN_MAI');
  assert.strictEqual(App.getAdminAccounts().length, 1, 'After delete, admin count should be 1');
  assert.strictEqual(App.getAdminAccounts()[0].username, 'ADMIN', 'Only master admin remains');
  App.notify = originalNotify;

  // 24.2 Đồng bộ Admin từ Cloud snapshot (syncAdminsFromCloud)
  App.syncAdminsFromCloud([
    { username: 'ADMIN', fullName: 'Thầy Huỳnh Thanh Chí', role: 'admin', password: '123' },
    { username: 'GIAOVIEN_CLOUD', fullName: 'Thầy Trần Văn Cloud', role: 'admin', password: 'cloud_pass_789' }
  ]);
  assert.strictEqual(App.getAdminAccounts().length, 2, 'Cloud admin sync must merge newly received accounts');
  assert.strictEqual(App.loginAdmin('GIAOVIEN_CLOUD', 'cloud_pass_789'), true, 'Cloud-synced admin should be able to login');

  // 24.3 Logout trên mobile dọn sạch session, monitor state và in-exam class
  let classListRemoved = [];
  let modalsRemoved = 0;
  global.document.body.classList.remove = (cls) => classListRemoved.push(cls);
  global.document.querySelectorAll = (sel) => [
    { remove: () => modalsRemoved++ }
  ];
  App.logout();
  assert.strictEqual(App.state.currentUser, null, 'Logout must clear currentUser');
  assert.ok(classListRemoved.includes('in-exam'), 'Logout must remove in-exam class from body');
  assert.strictEqual(modalsRemoved, 1, 'Logout must clean up any active modal overlays');

  console.log('[OK] Test 24 Passed: Multi-admin management, clean mobile logout & button layouts verified 100%.');

  // ==========================================
  // TEST 25: BIỆT DANH HỌC SINH (NICKNAME / TÊN KHÁC), KHÓA TÊN THẬT VỚI HỌC SINH & ADMIN QUAN SÁT CẢ HAI TÊN
  // ==========================================
  console.log('--- TEST 25: Student Nickname / Alias, Real Name Lock & Admin Visibility ---');

  // 25.1 Normalize student record & getStudentDisplayName
  const rawStudent = { studentId: 'HS901', fullName: 'Nguyễn Văn Minh' };
  App.normalizeStudentRecord(rawStudent);
  assert.strictEqual(rawStudent.nickname, '', 'Normalized student must have empty string nickname by default');
  assert.strictEqual(App.getStudentDisplayName(rawStudent), 'Nguyễn Văn Minh', 'Display name falls back to real name if no nickname');

  rawStudent.nickname = 'Minh Toán Học';
  assert.strictEqual(App.getStudentDisplayName(rawStudent), 'Minh Toán Học', 'Display name returns nickname when present');

  // 25.2 Học sinh tự chỉnh sửa: Khóa tên thật, chỉ được đổi biệt danh
  App.state.students = [
    { studentId: 'HS901', fullName: 'Nguyễn Văn Minh', nickname: '', className: '12A1', password: '123', status: 'active', grade: 12 },
    { studentId: 'HS902', fullName: 'Trần Thị Hoa', nickname: 'Hoa Bách Khoa', className: '12A1', password: '123', status: 'active', grade: 12 }
  ];
  App.state.currentUser = { studentId: 'HS901', fullName: 'Nguyễn Văn Minh', nickname: '', role: 'student', className: '12A1', grade: 12 };

  // Giả lập DOM form self-edit khi học sinh cố ý truyền tên thật mới
  global.document.getElementById = (id) => {
    if (id === 'selfEditName') return { value: 'Hacker Đổi Tên' };
    if (id === 'selfEditNickname') return { value: 'Toán Thủ Số 1' };
    if (id === 'selfEditPhone') return { value: '0988888888' };
    if (id === 'selfEditPass') return { value: 'newpass123' };
    if (id === 'selfEditStudentModal') return { remove: () => {} };
    return null;
  };

  let pushedCloudUpdate = null;
  App.pushStudentSubmissionToCloud = async (sub, stUpdate) => {
    pushedCloudUpdate = stUpdate;
    return true;
  };

  App.handleStudentSelfEditSubmit();

  const hs901 = App.state.students.find(s => s.studentId === 'HS901');
  assert.strictEqual(hs901.fullName, 'Nguyễn Văn Minh', 'Student CANNOT change real name; fullName must remain unchanged');
  assert.strictEqual(hs901.nickname, 'Toán Thủ Số 1', 'Student can successfully set nickname');
  assert.strictEqual(hs901.password, 'newpass123', 'Student can update password');
  assert.strictEqual(App.state.currentUser.fullName, 'Nguyễn Văn Minh', 'CurrentUser fullName remains unchanged');
  assert.strictEqual(App.state.currentUser.nickname, 'Toán Thủ Số 1', 'CurrentUser nickname is updated');
  assert.ok(pushedCloudUpdate && pushedCloudUpdate.nickname === 'Toán Thủ Số 1', 'Nickname update pushed to cloud');

  // 25.3 Hiển thị biệt danh trên bảng xếp hạng (Peer Compare Table)
  App.state.settings = { allowStudentViewOwnScore: true, allowStudentViewClassBoard: true, anonymizeOtherStudents: false };
  App.state.submissions = [
    { id: 'SUB1', studentId: 'HS901', studentName: 'Nguyễn Văn Minh', examId: 'EX1', scoreResult: { totalScore: 9.5 }, submittedAt: new Date().toISOString() },
    { id: 'SUB2', studentId: 'HS902', studentName: 'Trần Thị Hoa', examId: 'EX1', scoreResult: { totalScore: 8.5 }, submittedAt: new Date().toISOString() }
  ];
  App.state.exams = [{ id: 'EX1', title: 'Đề Khảo Sát 1', grade: 12, part1: [], part2: [], part3: [] }];

  const peerData = App.getStudentPeerComparison(App.state.currentUser);
  assert.ok(peerData && peerData.rankedList.length === 2, 'Ranked list should contain students');
  const hs1Entry = peerData.rankedList.find(x => x.student.studentId === 'HS901');
  const hs2Entry = peerData.rankedList.find(x => x.student.studentId === 'HS902');
  assert.strictEqual(App.getStudentDisplayName(hs1Entry.student), 'Toán Thủ Số 1', 'Rank entry for HS901 uses nickname');
  assert.strictEqual(App.getStudentDisplayName(hs2Entry.student), 'Hoa Bách Khoa', 'Rank entry for HS902 uses nickname');

  // 25.4 Admin quyền: Thêm học sinh có biệt danh, sửa cả họ tên thật lẫn biệt danh
  App.state.currentUser = { username: 'ADMIN', role: 'admin' };

  // Admin thêm học sinh mới
  global.document.getElementById = (id) => {
    if (id === 'newStudentId') return { value: 'HS903' };
    if (id === 'newStudentName') return { value: 'Lê Văn Cường' };
    if (id === 'newStudentNickname') return { value: 'Cường KHTN' };
    if (id === 'newStudentGrade') return { value: '11' };
    if (id === 'newStudentClass') return { value: '11A2' };
    if (id === 'newStudentPass') return { value: '123' };
    if (id === 'newStudentPhone') return { value: '' };
    if (id === 'newStudentParent') return { value: '' };
    if (id === 'newStudentNotes') return { value: '' };
    if (id === 'addStudentModal') return { remove: () => {} };
    return null;
  };
  App.handleAddStudentSubmit();

  const hs903 = App.state.students.find(s => s.studentId === 'HS903');
  assert.ok(hs903, 'Admin successfully added HS903');
  assert.strictEqual(hs903.fullName, 'Lê Văn Cường', 'Admin sets real name');
  assert.strictEqual(hs903.nickname, 'Cường KHTN', 'Admin sets nickname');

  // Admin sửa học sinh HS901 (đổi cả real name và nickname)
  global.document.getElementById = (id) => {
    if (id === 'editStudentId') return { value: 'HS901' };
    if (id === 'editStudentName') return { value: 'Nguyễn Văn Minh (Chính Thức)' };
    if (id === 'editStudentNickname') return { value: 'Minh Pro VIP' };
    if (id === 'editStudentGrade') return { value: '12' };
    if (id === 'editStudentClass') return { value: '12A1' };
    if (id === 'editStudentPass') return { value: 'pass999' };
    if (id === 'editStudentPhone') return { value: '' };
    if (id === 'editStudentParent') return { value: '' };
    if (id === 'editStudentStatus') return { value: 'active' };
    if (id === 'editStudentNotes') return { value: '' };
    if (id === 'editStudentModal') return { remove: () => {} };
    return null;
  };
  App.handleEditStudentSubmit('HS901');

  assert.strictEqual(hs901.fullName, 'Nguyễn Văn Minh (Chính Thức)', 'Admin can edit real name');
  assert.strictEqual(hs901.nickname, 'Minh Pro VIP', 'Admin can edit nickname');

  // 25.5 Admin luôn nhìn thấy cả tên thật và biệt danh trên các bảng & giao diện
  App.state.studentSearchQuery = '';
  App.state.studentGradeFilter = 'ALL';
  App.state.studentClassFilter = 'ALL';
  App.state.studentStatusFilter = 'ALL';
  const studentTableHtml = App.renderStudentTableHtml();
  assert.ok(studentTableHtml.includes('Nguyễn Văn Minh (Chính Thức)'), 'Admin student table shows real name');
  assert.ok(studentTableHtml.includes('Minh Pro VIP'), 'Admin student table shows nickname badge');

  App.state.adminViewTab = 'matrix';
  const gradebookHtml = App.renderAdminGradebookContentHtml();
  assert.ok(gradebookHtml.includes('Nguyễn Văn Minh (Chính Thức)'), 'Admin gradebook matrix shows real name');
  assert.ok(gradebookHtml.includes('Minh Pro VIP'), 'Admin gradebook matrix shows nickname badge');

  // 25.6 Tìm kiếm theo cả tên thật và biệt danh
  assert.strictEqual(App.matchesStudentSearch(hs901, 'Minh (Chính Thức)'), true, 'Matches by real name');
  assert.strictEqual(App.matchesStudentSearch(hs901, 'Minh Pro VIP'), true, 'Matches by nickname');
  assert.strictEqual(App.matchesStudentSearch(hs903, 'Cường KHTN'), true, 'Matches HS903 by nickname');

  console.log('[OK] Test 25 Passed: Student nickname/alias, real name lock & admin full visibility verified 100%.');

  // ==========================================
  // TEST 26: Đồng bộ Font chữ (Be Vietnam Pro, Fraunces, Patrick Hand), Giao diện Thương hiệu & Tích hợp Giới thiệu Web Thầy Chí
  // ==========================================
  console.log('--- TEST 26: Typography Sync, Brand UI & Teacher Website Integration ---');

  // 26.1 Kiểm tra file index.html có link Google Fonts và cấu hình Tailwind fontFamily
  const indexHtmlContent = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
  assert.ok(indexHtmlContent.includes('Be+Vietnam+Pro'), 'index.html includes Be Vietnam Pro font');
  assert.ok(indexHtmlContent.includes('Fraunces'), 'index.html includes Fraunces serif font');
  assert.ok(indexHtmlContent.includes('Patrick+Hand'), 'index.html includes Patrick Hand font');
  assert.ok(indexHtmlContent.includes('Be Vietnam Pro'), 'Tailwind config defines sans font Be Vietnam Pro');
  assert.ok(indexHtmlContent.includes('Fraunces'), 'Tailwind config defines serif font Fraunces');
  assert.ok(indexHtmlContent.includes('Patrick Hand'), 'Tailwind config defines hand font Patrick Hand');

  // 26.2 Kiểm tra file css/app.css có import fonts và các biến CSS custom
  const appCssContent = fs.readFileSync(path.join(__dirname, '../css/app.css'), 'utf8');
  assert.ok(appCssContent.includes('fonts.googleapis.com'), 'app.css imports Google Fonts');
  assert.ok(appCssContent.includes('--font-main:'), 'app.css defines --font-main');
  assert.ok(appCssContent.includes('--font-serif:'), 'app.css defines --font-serif');
  assert.ok(appCssContent.includes('--font-hand:'), 'app.css defines --font-hand');
  assert.ok(appCssContent.includes('.brand-pill-badge'), 'app.css defines .brand-pill-badge');

  // 26.3 Kiểm tra bảng màu Accent Presets có màu Đỏ Đô Thầy Chí (#650f12)
  const thayChiPreset = App.ACCENT_PRESETS.find(p => p.id === 'thaychi');
  assert.ok(thayChiPreset, 'ACCENT_PRESETS must have "thaychi"');
  assert.strictEqual(thayChiPreset.hex.toLowerCase(), '#650f12', 'Preset thaychi hex must be #650f12');

  // 26.4 Kiểm tra hàm mở Modal Giới thiệu Web Thầy Chí (showTeacherIntroModal)
  assert.strictEqual(typeof App.showTeacherIntroModal, 'function', 'App.showTeacherIntroModal is a function');
  let appendedModal = null;
  global.document.body.appendChild = (node) => {
    appendedModal = node;
    return node;
  };
  App.showTeacherIntroModal();
  assert.ok(appendedModal, 'Teacher intro modal must be created and appended to DOM');
  assert.ok(appendedModal.innerHTML.includes('https://thanhchi113.github.io/'), 'Modal has link to official website');
  assert.ok(appendedModal.innerHTML.includes('https://thanhchi113.github.io/Chi-GV-Toan/'), 'Modal keeps portfolio link');
  assert.ok(appendedModal.innerHTML.includes('Huỳnh Thanh Chí') || appendedModal.innerHTML.includes('Thầy Chí'), 'Modal introduces Teacher Huỳnh Thanh Chí');
  assert.ok(appendedModal.innerHTML.includes('Lớp Toán Anh Chí'), 'Modal mentions Lớp Toán Anh Chí brand');

  // 26.5 Kiểm tra giao diện Đăng nhập có liên kết và thẻ giới thiệu Web Thầy Chí
  const loginContainer = { innerHTML: '' };
  App.renderLoginView(loginContainer);
  assert.ok(loginContainer.innerHTML.includes('https://thanhchi113.github.io/'), 'Login view has link to official teacher website');
  assert.ok(loginContainer.innerHTML.includes('loginTeacherIntroBtn'), 'Login view has button to open teacher intro modal');

  // 26.6 Kiểm tra giao diện Cổng Học sinh có mục giới thiệu và liên kết Web Thầy Chí
  const studentContainer = { innerHTML: '' };
  App.state.currentUser = { username: 'HS901', fullName: 'Nguyễn Văn Minh', role: 'student', studentId: 'HS901', grade: 12, className: '12A1' };
  App.renderStudentPortal(studentContainer);
  assert.ok(studentContainer.innerHTML.includes('https://thanhchi113.github.io/'), 'Student portal has link to official teacher website');
  assert.ok(studentContainer.innerHTML.includes('studentTeacherIntroBtn'), 'Student portal has button to open teacher intro modal');

  // 26.7 Kiểm tra giao diện Cổng Admin có nút mở Modal Web Thầy Chí
  const adminContainer = { innerHTML: '' };
  App.state.currentUser = { username: 'ADMIN', role: 'admin', fullName: 'Quản Trị Viên' };
  App.renderAdminDashboard(adminContainer);
  assert.ok(adminContainer.innerHTML.includes('adminTeacherIntroBtn'), 'Admin dashboard has adminTeacherIntroBtn');

  console.log('[OK] Test 26 Passed: Typography sync, brand identity (#650f12) & Teacher website integration verified 100%.');

  // ==========================================
  // TEST 27: Đồng bộ Dữ liệu Hệ sinh thái, Quản lý 13 Nhóm Lớp & Giao Bài Tập Về Nhà Theo Nhóm Lớp (Photo + Interactive)
  // ==========================================
  console.log('--- TEST 27: Data Sync, 13 Class Groups & Class-Group Homework System ---');

  // 27.1 Đồng bộ thông tin liên hệ & website chính thức
  assert.strictEqual(App.ADMIN_RECOVERY_EMAIL, 'chithanhhuynh11@gmail.com', 'Synced recovery email');
  assert.strictEqual(App.TEACHER_MAIN_WEB_URL, 'https://thanhchi113.github.io/', 'Synced official website URL');
  assert.strictEqual(App.TEACHER_PHONE, '090 595 7716', 'Synced teacher Zalo/phone');
  assert.strictEqual(App.DEFAULT_CLASS_GROUPS.length, 13, '13 canonical class groups synced with main website');

  const allGroupNames = App.getClassGroups().map(g => g.name);
  ['12A 2K9', '12B 2K9', '12D', '11A 2K10', '11B 2K10', '10A 2K11', '10B 2K11', '10C 2K11', '9 2K12', '8A 2K13', '8B 2K13', '7 2K14', '7 Onl'].forEach(cn => {
    assert.ok(allGroupNames.some(n => App.isSameClassName(n, cn)), `Canonical group "${cn}" must exist`);
  });

  // 27.2 Tạo học sinh thuộc các nhóm lớp khác nhau & kiểm tra phân quyền Đề thi theo Nhóm lớp
  App.state.students.push(
    { studentId: 'HS951', fullName: 'Lê Hoàng A', grade: 12, className: '12A 2K9', status: 'active' },
    { studentId: 'HS952', fullName: 'Trần Minh B', grade: 12, className: '12B 2K9', status: 'active' },
    { studentId: 'HS953', fullName: 'Phạm Thu C', grade: 10, className: '10A 2K11', status: 'active' }
  );
  const st12A = App.state.students.find(s => s.studentId === 'HS951');
  const st12B = App.state.students.find(s => s.studentId === 'HS952');
  const st10A = App.state.students.find(s => s.studentId === 'HS953');

  const classExam = App.normalizeExamRecord({
    id: 'EXAM-CLASS-12A',
    title: 'Kiểm tra 15 phút riêng 12A 2K9',
    grade: 12,
    is_active: true,
    allowed_all: false,
    access_type: 'class',
    allowed_classes: ['12A 2K9']
  });
  App.state.exams.unshift(classExam);
  assert.strictEqual(App.isStudentAllowedExam(classExam, st12A), true, '12A 2K9 student allowed in 12A exam');
  assert.strictEqual(App.isStudentAllowedExam(classExam, st12B), false, '12B 2K9 student blocked from 12A exam');

  // 27.3 Giao Bài tập về nhà chế độ Chụp ảnh vở (photo) cho nhóm lớp 12A 2K9 & 12B 2K9
  const pastDueIso = new Date(Date.now() - 3600 * 1000).toISOString();
  const photoHw = App.normalizeHomeworkRecord({
    id: 'HW-PHOTO-12AB',
    itemKind: 'homework',
    hwMode: 'photo',
    title: 'BTVN Tuần 10 — Cực trị hàm hợp',
    grade: 12,
    description: 'Giải chi tiết Câu 1-5 vào vở và chụp ảnh nộp.',
    dueAt: pastDueIso,
    maxScore: 10,
    allowResubmit: true,
    accessType: 'class',
    allowedAll: false,
    allowedClasses: ['12A 2K9', '12B 2K9']
  });
  App.state.homeworks.unshift(photoHw);

  assert.strictEqual(App.isStudentAllowedHomework(photoHw, st12A), true, '12A 2K9 receives photo BTVN');
  assert.strictEqual(App.isStudentAllowedHomework(photoHw, st12B), true, '12B 2K9 receives photo BTVN');
  assert.strictEqual(App.isStudentAllowedHomework(photoHw, st10A), false, '10A 2K11 does NOT see 12AB BTVN');

  const targets12AB = App.getHomeworkTargetStudents(photoHw);
  assert.ok(targets12AB.some(s => s.studentId === 'HS951') && targets12AB.some(s => s.studentId === 'HS952'), 'Target students include 12A & 12B');
  assert.ok(!targets12AB.some(s => s.studentId === 'HS953'), 'Target students exclude 10A');

  // Học sinh HS951 nộp ảnh vở (quá hạn -> isLate = true, pendingManualGrade = true)
  const origGetElementById = global.document.getElementById;
  App.state.currentUser = { ...st12A, role: 'student' };
  App.state.tempPhotoHwImages = ['data:image/jpeg;base64,/9j/4AAQSkZJRg=='];
  global.document.getElementById = (id) => {
    if (id === 'studentHwNoteInput') return { value: 'Em nộp bài ạ, câu 5 em làm 2 cách.' };
    return origGetElementById ? origGetElementById(id) : null;
  };
  App.submitPhotoHomework('HW-PHOTO-12AB');

  const hs951Sub = App.getStudentLatestHwSubmission('HW-PHOTO-12AB', 'HS951');
  assert.ok(hs951Sub, 'Photo homework submission recorded');
  assert.strictEqual(hs951Sub.isHomework, true, 'Marked as homework submission');
  assert.strictEqual(hs951Sub.hwMode, 'photo', 'Mode is photo');
  assert.strictEqual(hs951Sub.isLate, true, 'Detected late submission accurately');
  assert.strictEqual(hs951Sub.pendingManualGrade, true, 'Awaiting teacher grade');

  // Khi đang chờ chấm, chưa cộng điểm thưởng sai lệch
  const rewardBeforeGrade = App.getStudentRewardStats('HS951');
  assert.strictEqual(rewardBeforeGrade.earnedPoints, 0, 'Pending ungraded BTVN does not award 0/premature points');

  // Danh sách nhắc nộp Zalo chỉ liệt kê HS952 (vì HS951 đã nộp)
  const missingTxt = await App.copyMissingHwStudentsList('HW-PHOTO-12AB');
  assert.ok(missingTxt.includes('HS952') && !missingTxt.includes('HS951'), 'Missing list includes HS952 and excludes submitted HS951');

  // Giáo viên mở modal chấm ảnh vở thấy ảnh nộp + chấm điểm 9.25đ + nhận xét cho HS951
  App.state.currentUser = { username: 'ADMIN', role: 'admin', fullName: 'Thầy Chí' };
  let gradeModalNode = null;
  global.document.body.appendChild = (node) => { gradeModalNode = node; return node; };
  App.showGradePhotoHomeworkModal(hs951Sub.id);
  assert.ok(gradeModalNode && gradeModalNode.innerHTML.includes('data:image/jpeg;base64,/9j/4AAQSkZJRg=='), 'Teacher grade modal renders student uploaded notebook photo');

  global.document.getElementById = (id) => {
    if (id === 'gradePhotoScoreInput') return { value: '9.25' };
    if (id === 'gradePhotoCommentInput') return { value: 'Cách 2 câu 5 rất sáng tạo!' };
    return origGetElementById ? origGetElementById(id) : null;
  };
  App.savePhotoHomeworkGrade(hs951Sub.id);
  global.document.getElementById = origGetElementById;

  assert.strictEqual(hs951Sub.pendingManualGrade, false, 'Marked graded');
  assert.strictEqual(hs951Sub.teacherScore, 9.25, 'Teacher score saved');
  assert.strictEqual(hs951Sub.scoreResult.totalScore, 9.25, 'scoreResult synced with teacherScore');
  assert.strictEqual(hs951Sub.scoreResult.maxTotal, 10, 'scoreResult preserves maxTotal = 10');
  assert.strictEqual(hs951Sub.teacherComment, 'Cách 2 câu 5 rất sáng tạo!', 'Teacher comment saved');

  const rewardAfterGrade = App.getStudentRewardStats('HS951');
  assert.ok(rewardAfterGrade.earnedPoints > 0, 'Graded BTVN earns reward points for student');

  // 27.4 Đổi tên nhóm lớp nguyên tử (renameClassGroupInternal) cập nhật đồng bộ HS + Đề + BTVN
  App.renameClassGroupInternal('12A 2K9', '12A1 VIP 2K9', 12, 'T3-T6 17h30');
  assert.strictEqual(st12A.className, '12A1 VIP 2K9', 'Student className updated atomically');
  assert.ok(classExam.allowed_classes.includes('12A1 VIP 2K9'), 'Exam allowed_classes updated atomically');
  assert.ok(photoHw.allowedClasses.includes('12A1 VIP 2K9'), 'Homework allowedClasses updated atomically');

  // 27.5 Giao Bài tập về nhà chế độ Điền đáp án chấm tự động (interactive) & tắt cảnh báo thoát phòng thi
  const interHw = App.normalizeHomeworkRecord({
    id: 'HW-INTER-10A',
    itemKind: 'homework',
    hwMode: 'interactive',
    title: 'BTVN Trắc nghiệm Mệnh đề & Tập hợp',
    grade: 10,
    pdfUrl: 'pdfs/sample.pdf',
    time_minutes: 0,
    accessType: 'class',
    allowedAll: false,
    allowedClasses: ['10A 2K11'],
    part1: [{ id: 1, correct_answer: 'B' }, { id: 2, correct_answer: 'D' }],
    part2: [],
    part3: []
  });
  App.state.homeworks.unshift(interHw);
  App.state.currentUser = { ...st10A, role: 'student' };
  await App.startInteractiveHomework('HW-INTER-10A');

  assert.ok(App.state.activeExam && App.state.activeExam.id === 'HW-INTER-10A', 'Interactive homework opens exam/PDF workspace');
  assert.strictEqual(App.state.activeExam.isHomeworkRoom, true, 'isHomeworkRoom flag active');
  assert.strictEqual(App.state.activeExam.noTimeLimit, true, '0 minutes enables free-time BTVN mode');
  assert.strictEqual(App.isExamExitWarningEnabled(), false, 'Exit anti-cheat warning disabled during BTVN');
  assert.strictEqual(App.isScreenshotWarningEnabled(), false, 'Screenshot warning disabled during BTVN');

  App.state.answers = { part1: { 1: 'B', 2: 'D' }, part2: {}, part3: {}, part4: {}, flagged: {} };
  App.submitExam(true);
  if (App.state.timerInterval) {
    clearInterval(App.state.timerInterval);
    App.state.timerInterval = null;
  }
  const hs953HwSub = App.getStudentLatestHwSubmission('HW-INTER-10A', 'HS953');
  assert.ok(hs953HwSub, 'Interactive homework submission recorded');
  assert.strictEqual(hs953HwSub.isHomework, true, 'Interactive submission flagged as homework');
  assert.strictEqual(hs953HwSub.hwMode, 'interactive', 'Mode is interactive');
  assert.strictEqual(hs953HwSub.scoreResult.part1.correctCount, 2, 'Interactive BTVN auto-graded 2/2 correct');

  // 27.6 Đồng bộ đám mây mergeCloudState giữ điểm GV đã chấm mới hơn
  const olderUngradedClone = { ...hs951Sub, pendingManualGrade: true, teacherScore: null, gradedAt: '', updatedAt: '2020-01-01T00:00:00.000Z' };
  App.mergeCloudState({ submissions: [olderUngradedClone] });
  const mergedSub = App.state.submissions.find(s => s.id === hs951Sub.id);
  assert.strictEqual(mergedSub.pendingManualGrade, false, 'Cloud merge preserves newer teacher-graded BTVN');
  assert.strictEqual(mergedSub.teacherScore, 9.25, 'Cloud merge preserves teacherScore 9.25');

  console.log('[OK] Test 27 Passed: Ecosystem data sync, 13 class groups & Photo/Interactive homework system verified 100%.');

  // Test 28: Tối ưu giao diện Điện thoại (320px - 390px): chống tràn viền, chống tràn/cắt chữ nút bấm & chống đè nút nổi
  const indexHtmlSrc = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const cssSrc = fs.readFileSync(path.join(__dirname, '..', 'css', 'app.css'), 'utf8');
  const swSrc = fs.readFileSync(path.join(__dirname, '..', 'sw.js'), 'utf8');
  const appJsLatest = fs.readFileSync(path.join(__dirname, '..', 'js', 'app.js'), 'utf8');

  assert.ok(/screens\s*:\s*\{\s*xs\s*:\s*['"]375px['"]/.test(indexHtmlSrc), 'index.html must define Tailwind xs: 375px breakpoint');
  assert.ok(swSrc.includes("khao-thi-toan-shell-v31"), 'sw.js must bump shell cache to v31');
  assert.ok(cssSrc.includes('max-width: calc(100vw - 1rem)') && cssSrc.includes('max-width: min(100%, calc(100vw - 1.5rem))'), 'app.css must constrain popovers and modals within mobile viewport');
  assert.ok(cssSrc.includes(':where([id$="Modal"].fixed.inset-0:not(#previewPdfModal), #appSystemDialog.fixed.inset-0) > div'), 'app.css must use zero-specificity :where() fallback so desktop .max-w-* classes on modals are never overridden');
  assert.ok(cssSrc.includes('max-height: calc(100dvh'), 'app.css must constrain modal card height within viewport');
  assert.ok(cssSrc.includes('.pdf-viewer-scroll.panning') && cssSrc.includes('cursor: var(--cursor-grabbing)'), 'app.css must define grabbing cursor during PDF pan');
  assert.ok(/@media\s*\(max-width:\s*1023px\)\s*\{\s*\.scroll-top-fab\s*\{\s*display:\s*none\s*!important;/.test(cssSrc), 'app.css must hide floating .scroll-top-fab on mobile/tablet to prevent overlapping right-aligned buttons');
  assert.ok(/body\.in-exam\s+\.scroll-top-fab\s*\{\s*display:\s*none\s*!important;/.test(cssSrc), 'app.css must hide .scroll-top-fab inside exam room');
  assert.ok(cssSrc.includes('text-overflow: clip;') && cssSrc.includes('overflow-wrap: anywhere;'), 'app.css must allow mobile .ui-btn labels to wrap cleanly instead of chopping text');
  assert.ok(!appJsLatest.includes('</button>\n            </button>') && !appJsLatest.includes('</button>\r\n            </button>'), 'renderExamRoom must not contain stray duplicate </button> after #examTopSubmitBtn');
  assert.ok(appJsLatest.includes('id="examTopSubmitBtn"') && appJsLatest.includes('<span>Nộp<span class="hidden sm:inline"> Bài</span></span>'), '#examTopSubmitBtn must always show visible Nộp text on narrow phones');

  // Kiểm tra bảng theo dõi nộp BTVN (#hwSubmissionsModal) bọc trong overflow-x-auto trên điện thoại
  let hwTrackerModalNode = null;
  global.document.body.appendChild = (node) => { hwTrackerModalNode = node; return node; };
  App.state.currentUser = { username: 'ADMIN', role: 'admin', fullName: 'Thầy Chí' };
  App.showHomeworkSubmissionsModal('HW-PHOTO-12AB');
  assert.ok(hwTrackerModalNode && hwTrackerModalNode.innerHTML.includes('overflow-x-auto') && hwTrackerModalNode.innerHTML.includes('min-w-[580px]'), '#hwSubmissionsModal table must be wrapped in overflow-x-auto for horizontal swipe on mobile');

  console.log('[OK] Test 28 Passed: Mobile anti-overflow, anti-chopped-button & zero-overlap layout verified 100%.');

  // Test 29: Đồng bộ 1:1 Giao diện Vở Ô Ly & Đỏ Đô Thầy Chí (#650f12) với Website Giới Thiệu (https://thanhchi113.github.io/)
  console.log('--- TEST 29: Ruled Math Notebook & Crimson Academic UI Sync ---');
  const manifestSrc = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'manifest.webmanifest'), 'utf8'));
  assert.strictEqual(manifestSrc.short_name, 'Ch1 Math', 'PWA manifest short_name must be Ch1 Math');
  assert.ok(indexHtmlSrc.includes('content="Ch1 Math"'), 'index.html apple-mobile-web-app-title must be Ch1 Math');
  assert.strictEqual(manifestSrc.theme_color, '#650f12', 'PWA manifest theme_color must be #650f12');
  assert.strictEqual(manifestSrc.background_color, '#fbf7ef', 'PWA manifest background_color must be #fbf7ef');
  assert.ok(indexHtmlSrc.includes('content="#650f12"'), 'index.html meta theme-color must be #650f12');

  // Kiểm tra bộ màu mặc định & di trú tự động từ Indigo cũ sang Đỏ Đô Thầy Chí (#650f12)
  App.resetAppearance();
  assert.strictEqual(App.state.accentHex, '#650f12', 'Default accentHex must be #650f12');
  assert.strictEqual(App.state.accentPreset, 'thaychi', 'Default accentPreset must be thaychi');
  const crimsonScale = App.generateAccentScale('#650f12', false);
  assert.strictEqual(crimsonScale['600'], '101 15 18', 'Crimson scale 600 stop must match exact #650f12 RGB');
  assert.ok(crimsonScale._meta.primaryContrast >= 10, '#650f12 primary button contrast must exceed WCAG AAA (>=10:1)');

  // Giả lập trình duyệt cũ lưu indigo mặc định chưa có cờ brandSyncedV2 -> tự động nâng cấp lên #650f12
  const memLs = {};
  global.localStorage = {
    getItem: (k) => (Object.prototype.hasOwnProperty.call(memLs, k) ? memLs[k] : null),
    setItem: (k, v) => { memLs[k] = String(v); },
    removeItem: (k) => { delete memLs[k]; }
  };
  App.state.accentHex = '#4f46e5';
  App.state.accentPreset = 'indigo';
  global.localStorage.setItem('thpt_appearance', JSON.stringify({ theme: 'light', accentHex: '#4f46e5', accentPreset: 'indigo' }));
  App.loadAppearance();
  assert.strictEqual(App.state.accentHex, '#650f12', 'Legacy un-versioned indigo preference must auto-migrate to #650f12');
  assert.strictEqual(App.state.accentPreset, 'thaychi', 'Legacy un-versioned preset must auto-migrate to thaychi');

  // Kiểm tra CSS Vở kẻ ngang, con trỏ Retina WebP và các lớp đặc trưng (.ltac-topbar, .ltac-notebook-sheet, .ltac-crimson-banner, .hero-em-hl)
  assert.ok(cssSrc.includes('--paper: #fbf7ef;') && cssSrc.includes('--rule: #d8e3ef;') && cssSrc.includes('--margin: #e8a9ab;'), 'app.css must define ruled math notebook paper tokens');
  assert.ok(cssSrc.includes('.ltac-topbar') && cssSrc.includes('.ltac-notebook-sheet') && cssSrc.includes('.ltac-crimson-banner') && cssSrc.includes('.hero-em-hl'), 'app.css must define synchronized LTAC layout classes');
  assert.ok(fs.existsSync(path.join(__dirname, '..', 'cursor', 'arrow.webp')) && fs.existsSync(path.join(__dirname, '..', 'cursor-text.svg')), 'Retina custom cursor assets must exist');

  // Kiểm tra cả 3 giao diện (Đăng nhập, Học sinh, Giáo viên) render đúng cấu trúc LTAC mới
  const syncedLogin = { innerHTML: '' };
  App.renderLoginView(syncedLogin);
  assert.ok(syncedLogin.innerHTML.includes('ltac-topbar') && syncedLogin.innerHTML.includes('ltac-notebook-sheet') && syncedLogin.innerHTML.includes('hero-em-hl'), 'Login view renders LTAC topbar, notebook sheet & yellow swipe heading');

  const syncedStudent = { innerHTML: '' };
  App.state.currentUser = { username: 'HS901', fullName: 'Nguyễn Văn Minh', role: 'student', studentId: 'HS901', grade: 12, className: '12A1 VIP 2K9' };
  App.renderStudentPortal(syncedStudent);
  assert.ok(syncedStudent.innerHTML.includes('ltac-topbar') && syncedStudent.innerHTML.includes('ltac-crimson-banner'), 'Student portal renders LTAC topbar & crimson-gold banner');

  const syncedAdmin = { innerHTML: '' };
  App.state.currentUser = { username: 'ADMIN', role: 'admin', fullName: 'Thầy Chí' };
  App.renderAdminDashboard(syncedAdmin);
  assert.ok(syncedAdmin.innerHTML.includes('ltac-admin-header'), 'Admin dashboard renders LTAC crimson studio header');

  // Kiểm tra tài sản Logo Ch1 Math (Penrose triangle + Ch1 Σath) hiện diện đầy đủ trong cả mã nguồn & UI
  assert.ok(
    fs.existsSync(path.join(__dirname, '..', 'icons', 'logo-ch1math.png')) &&
    fs.existsSync(path.join(__dirname, '..', 'icons', 'logo-mark.png')) &&
    fs.existsSync(path.join(__dirname, '..', 'icons', 'favicon.png')),
    'Ch1 Math logo PNG assets must exist in icons/'
  );
  assert.ok(indexHtmlSrc.includes('icons/favicon.png') && indexHtmlSrc.includes('icons/logo-ch1math.png'), 'index.html must reference Ch1 Math favicon and loading logo');
  assert.ok(syncedLogin.innerHTML.includes('icons/logo-ch1math.png'), 'Login view must embed icons/logo-ch1math.png');
  assert.ok(syncedStudent.innerHTML.includes('icons/logo-ch1math.png'), 'Student portal must embed icons/logo-ch1math.png');
  assert.ok(syncedAdmin.innerHTML.includes('icons/logo-ch1math.png'), 'Admin dashboard must embed icons/logo-ch1math.png');

  let introLogoNode = null;
  global.document.body.appendChild = (node) => { introLogoNode = node; return node; };
  App.showTeacherIntroModal();
  assert.ok(introLogoNode && introLogoNode.innerHTML.includes('icons/logo-ch1math.png'), 'Teacher intro modal must embed icons/logo-ch1math.png');

  console.log('[OK] Test 29 Passed: 1:1 Ruled Math Notebook, Crimson Academic UI & Ch1 Math Logo verified 100%.');

  // Test 30: Kho Phiếu Bài Tập 3 Chế Độ (Bảng Google Sheet / Cây Thư Mục / Thẻ) Khối 10, 11, 12 + Phân Quyền Khối & Giáo Viên Cấp Quyền
  console.log('--- TEST 30: Curriculum Sheet/Tree Explorer (Grades 10, 11, 12), Grade Isolation & Teacher Access ---');
  const curriculumData = require('../js/curriculum_data.js');
  assert.strictEqual(curriculumData.chapters.filter(c => c.grade === 12).length, 6, 'Toan 12 curriculum must have 6 chapters');
  assert.strictEqual(curriculumData.chapters.filter(c => c.grade === 11).length, 9, 'Toan 11 curriculum must have 9 chapters');
  assert.strictEqual(curriculumData.chapters.filter(c => c.grade === 10).length, 9, 'Toan 10 curriculum must have 9 chapters');
  assert.strictEqual(curriculumData.items.filter(it => it.grade === 12).length, 56, 'Toan 12 curriculum must have 56 dang items');
  assert.strictEqual(curriculumData.items.filter(it => it.grade === 11).length, 48, 'Toan 11 curriculum must have 48 dang items');
  assert.strictEqual(curriculumData.items.filter(it => it.grade === 10).length, 46, 'Toan 10 curriculum must have 46 dang items');
  assert.strictEqual(curriculumData.items.length, 150, 'Total curriculum items across Grades 10, 11, 12 must be 150');
  curriculumData.items.forEach((it) => {
    assert.ok(it.lessonTitle && it.lessonTitle.trim().length > 0, `${it.id} (${it.code}) must have non-empty lessonTitle`);
    assert.ok(it.title && it.title.trim().length > 0, `${it.id} (${it.code}) must have non-empty title`);
    assert.strictEqual(it.accessType, 'grade', `${it.id} must default to grade-restricted access`);
    assert.strictEqual(it.allowedAll, false, `${it.id} must not allow public/all-grade access by default`);
  });
  const dang01 = App.findHomeworkById('CUR-12-D01');
  const dang11_01 = App.findHomeworkById('CUR-11-D01');
  const dang10_01 = App.findHomeworkById('CUR-10-D01');
  assert.ok(dang01 && dang01.pdfUrl.includes('drive.google.com/file/d/') && dang01.solutionPdfUrl.includes('drive.google.com/file/d/'), 'Dạng 01 Khối 12 must include Drive question & solution URLs');
  assert.ok(dang11_01 && dang11_01.grade === 11 && dang11_01.chapterTitle.includes('LƯỢNG GIÁC'), 'CUR-11-D01 must belong to Grade 11 Chapter I');
  assert.ok(dang10_01 && dang10_01.grade === 10 && dang10_01.chapterTitle.includes('MỆNH ĐỀ VÀ TẬP HỢP'), 'CUR-10-D01 must belong to Grade 10 Chapter I');

  // 30.0 Kiểm tra phân quyền nghiêm ngặt theo Khối (10, 11, 12) & Cấp quyền từ Giáo viên
  const stu10 = { studentId: 'HS052', fullName: 'Hoài Giang', role: 'student', grade: 10, className: '10A 2K11' };
  const stu10Other = { studentId: 'HS053', fullName: 'Minh Khôi', role: 'student', grade: 10, className: '10B 2K11' };
  const stu11 = { studentId: 'HS017', fullName: 'Bảo Nghi', role: 'student', grade: 11, className: '11B 2K10' };
  const stu12 = { studentId: 'HS001', fullName: 'Quốc Việt', role: 'student', grade: 12, className: '12B 2K9' };

  // Khách chưa đăng nhập không xem được lộ trình của bất kỳ khối nào & cài đặt requireStudentLoginForDocs bật mặc định
  App.state.currentUser = null;
  App.state.studentHwGradeFilter = 'ALL';
  assert.strictEqual(App.isStudentLoginRequiredForDocs(), true, 'requireStudentLoginForDocs must default to true');
  assert.strictEqual(App.getFilteredCurriculumItems('public').length, 0, 'Unauthenticated guest must see 0 items when requireStudentLoginForDocs is true');
  assert.strictEqual(await App.openPdfModal('Test PDF', dang01.pdfUrl, 'CUR-12-D01'), false, 'Unauthenticated guest blocked from opening PDF when requireStudentLoginForDocs is true');
  assert.strictEqual(await App.downloadHomeworkPdf('CUR-12-D01'), false, 'Unauthenticated guest cannot download Grade 12 PDF');

  // Học sinh Khối 10 chỉ xem được đúng 46 dạng của Khối 10, bị chặn Khối 11 & 12
  App.state.currentUser = stu10;
  App.state.studentHwGradeFilter = 'ALL';
  const itemsForStu10 = App.getFilteredCurriculumItems('student').filter(it => it.isCurriculumSlot);
  assert.strictEqual(itemsForStu10.length, 46, 'Grade 10 student must see exactly 46 Grade 10 curriculum items');
  assert.ok(itemsForStu10.every(it => it.grade === 10), 'Grade 10 student items must all be Grade 10');
  assert.strictEqual(App.isStudentAllowedHomework(dang10_01, stu10), true, 'Grade 10 student allowed on CUR-10-D01');
  assert.strictEqual(App.isStudentAllowedHomework(dang11_01, stu10), false, 'Grade 10 student blocked on CUR-11-D01');
  assert.strictEqual(App.isStudentAllowedHomework(dang01, stu10), false, 'Grade 10 student blocked on CUR-12-D01');
  assert.strictEqual(App.onStudentHwFilterInput('grade', '12'), false, 'Grade 10 student blocked from switching filter to Grade 12');

  // Học sinh Khối 11 chỉ xem được đúng 48 dạng của Khối 11, bị chặn Khối 10 & 12
  App.state.currentUser = stu11;
  App.state.studentHwGradeFilter = 'ALL';
  const itemsForStu11 = App.getFilteredCurriculumItems('student').filter(it => it.isCurriculumSlot);
  assert.strictEqual(itemsForStu11.length, 48, 'Grade 11 student must see exactly 48 Grade 11 curriculum items');
  assert.ok(itemsForStu11.every(it => it.grade === 11), 'Grade 11 student items must all be Grade 11');
  assert.strictEqual(App.isStudentAllowedHomework(dang11_01, stu11), true, 'Grade 11 student allowed on CUR-11-D01');
  assert.strictEqual(App.isStudentAllowedHomework(dang10_01, stu11), false, 'Grade 11 student blocked on CUR-10-D01');
  assert.strictEqual(App.isStudentAllowedHomework(dang01, stu11), false, 'Grade 11 student blocked on CUR-12-D01');

  // Học sinh Khối 12 chỉ xem được đúng 56 dạng của Khối 12, bị chặn Khối 10 & 11
  App.state.currentUser = stu12;
  App.state.studentHwGradeFilter = 'ALL';
  const itemsForStu12 = App.getFilteredCurriculumItems('student').filter(it => it.isCurriculumSlot);
  assert.strictEqual(itemsForStu12.length, 56, 'Grade 12 student must see exactly 56 Grade 12 curriculum items');
  assert.ok(itemsForStu12.every(it => it.grade === 12), 'Grade 12 student items must all be Grade 12');

  // Giáo viên (Thầy Chí) cấp quyền cho lớp '11B 2K10' và học sinh 'HS052' được xem thêm Khối 12
  App.grantCurriculumAccess({ grade: 12, classNames: ['11B 2K10'], studentIds: ['HS052'] });
  assert.strictEqual(App.isStudentAllowedHomework(dang01, stu11), true, 'Grade 11 student in granted class 11B 2K10 can now access CUR-12-D01');
  assert.strictEqual(App.isStudentAllowedHomework(dang01, stu10), true, 'Grade 10 student HS052 explicitly granted by teacher can now access CUR-12-D01');
  assert.strictEqual(App.isStudentAllowedHomework(dang01, stu10Other), false, 'Other Grade 10 student HS053 remains blocked from CUR-12-D01');
  // Khôi phục lại mặc định chỉ học sinh đúng khối được xem
  App.grantCurriculumAccess({ grade: 12, classNames: [], studentIds: [], allowAllStudents: false, allowPublic: false });
  assert.strictEqual(App.isStudentAllowedHomework(dang01, stu11), false, 'Revoking teacher grant restores strict grade isolation');

  // 30.1 Chuẩn hóa URL Google Drive (/preview iframe thuần không bọc <object type="application/pdf"> & uc?export=download)
  const driveNorm = App.normalizeExternalPdfUrl(dang01.pdfUrl);
  assert.ok(driveNorm.isExternalEmbed && driveNorm.embedUrl.endsWith('/preview'), 'Drive URL must normalize to /preview iframe embed');
  assert.ok(driveNorm.downloadUrl.includes('uc?export=download&id='), 'Drive URL must derive direct export=download link');
  const driveEmbedHtml = App.renderPdfFallbackHtml(driveNorm.embedUrl, driveNorm.isExternalEmbed);
  assert.ok(driveEmbedHtml.includes('<iframe') && !driveEmbedHtml.includes('type="application/pdf"'), 'Drive preview must render clean <iframe> without <object type="application/pdf">');

  // 30.2 Render Bảng Google Sheet và Cây Thư Mục cho Học sinh & Admin (Khối 10, 11, 12)
  const allMergedItems = App.getMergedWorksheets({ includeEmptySlots: true });
  assert.ok(allMergedItems.length >= 150, 'Merged worksheets include all 150 curriculum slots across Grades 10, 11, 12');
  const sheetHtmlStu = App.renderCurriculumSheetHtml({ scope: 'student', items: allMergedItems });
  assert.ok(sheetHtmlStu.includes('TOÁN 12') && sheetHtmlStu.includes('TOÁN 11') && sheetHtmlStu.includes('TOÁN 10') && sheetHtmlStu.includes('Dạng 01') && sheetHtmlStu.includes('Làm Trực Tiếp'), 'Sheet view renders TOÁN 12, TOÁN 11, TOÁN 10 chapters, Dạng 01 and Làm Trực Tiếp action');
  const treeHtmlAdmin = App.renderCurriculumTreeHtml({ scope: 'admin', items: allMergedItems });
  assert.ok(treeHtmlAdmin.includes('ltac-tree-branch') && treeHtmlAdmin.includes('Bài 1.') && treeHtmlAdmin.includes('Up PDF'), 'Tree view renders hierarchical chapters, lessons and admin upload buttons');

  // 30.3 Kiểm tra openPdfModal kiểu Google Drive: Nút chuyển Đề/Đáp án, Nút Làm trực tiếp & Khóa tải về khi allowDownload=false
  let capturedPdfModal = null;
  global.document.body.appendChild = (node) => { capturedPdfModal = node; return node; };
  App.state.currentUser = { username: 'HS901', fullName: 'Nguyễn Văn Minh', role: 'student', studentId: 'HS901', grade: 12, className: '12A1 VIP 2K9' };
  const prevWin30 = global.window;
  global.window = { ...prevWin30 };
  const restrictedHw = App.normalizeHomeworkRecord({
    id: 'HW-VIEWONLY-1',
    itemKind: 'document',
    grade: 12,
    code: 'Phiếu 99',
    title: 'Phiếu Chỉ Xem Online',
    pdfUrl: 'https://drive.google.com/file/d/1_Yxb3SL69RqG7rvr0u1jv6Ipgf47Euq4/view',
    solutionPdfUrl: 'https://drive.google.com/file/d/1tax8uiMtDlekUWbElnE0RSryCcvXXRtI/view',
    allowOnlineView: true,
    allowDownload: false,
    allowDirectPractice: true
  });
  App.state.homeworks.unshift(restrictedHw);
  await App.openPdfModal(restrictedHw.title, restrictedHw.pdfUrl, restrictedHw.id);
  assert.ok(capturedPdfModal && capturedPdfModal.innerHTML.includes('pdfModalDocSwitcher') && capturedPdfModal.innerHTML.includes('pdfModalPracticeBtn'), 'Drive-style viewer renders Doc Switcher & Direct Practice button');
  assert.ok(!capturedPdfModal.innerHTML.includes('pdfModalDownloadLink') && capturedPdfModal.innerHTML.includes('pdfModalViewOnlyBadge'), 'Student view-only PDF must hide download button and show Chỉ xem online badge');
  const blockedDl = await App.downloadHomeworkPdf('HW-VIEWONLY-1');
  assert.strictEqual(blockedDl, false, 'downloadHomeworkPdf must block student download when allowDownload=false');

  // Admin vẫn thấy nút tải về ngay cả trên phiếu đặt Chỉ xem online
  App.state.currentUser = { username: 'ADMIN', role: 'admin', fullName: 'Thầy Chí' };
  await App.openPdfModal(restrictedHw.title, restrictedHw.pdfUrl, restrictedHw.id);
  assert.ok(capturedPdfModal.innerHTML.includes('pdfModalDownloadLink'), 'Admin still sees download/print link');

  // 30.4 Làm trực tiếp trên phiếu có sẵn đáp án .tex (CUR-12-D01) & phiếu chỉ có PDF (HW-VIEWONLY-1)
  App.state.currentUser = { username: 'HS901', fullName: 'Nguyễn Văn Minh', role: 'student', studentId: 'HS901', grade: 12, className: '12A1 VIP 2K9' };
  const launchedDirect = App.launchWorksheetDirectPractice('CUR-12-D01');
  await new Promise(r => setTimeout(r, 25));
  assert.strictEqual(launchedDirect, true, 'launchWorksheetDirectPractice launches on CUR-12-D01');
  assert.ok(App.state.activeExam && App.state.activeExam.id === 'CUR-12-D01' && App.state.activeExam.part1.length === 12 && App.state.activeExam.part2.length === 4 && App.state.activeExam.part3.length === 6, 'CUR-12-D01 loads 12 P.I, 4 P.II, 6 P.III auto-graded questions');
  if (App.state.timerInterval) { clearInterval(App.state.timerInterval); App.state.timerInterval = null; }
  App.state.activeExam = null;

  const launchedPdfOnly = App.launchWorksheetDirectPractice('HW-VIEWONLY-1');
  await new Promise(r => setTimeout(r, 25));
  assert.strictEqual(launchedPdfOnly, true, 'launchWorksheetDirectPractice launches on PDF-only worksheet HW-VIEWONLY-1');
  assert.ok(App.state.activeExam && App.state.activeExam.id === 'HW-VIEWONLY-1' && App.state.activeExam.part4.length === 1, 'PDF-only worksheet auto-creates part4 interactive practice workspace');
  if (App.state.timerInterval) { clearInterval(App.state.timerInterval); App.state.timerInterval = null; }
  App.state.activeExam = null;

  // 30.5 Tự động ghép cặp file hàng loạt (<stem>.pdf + <stem>-ANS.pdf & _DapAn.pdf)
  const batchPairs = App.pairBatchWorksheetFiles([
    { name: 'Dang05_Phieu1.pdf', size: 120000 },
    { name: 'Dang05_Phieu1-ANS.pdf', size: 140000 },
    { name: 'ChuyenDe_02.pdf', size: 220000 },
    { name: 'ChuyenDe_02_DapAn.pdf', size: 240000 },
    { name: 'ChuyenDe_03.pdf', size: 180000 }
  ]);
  assert.strictEqual(batchPairs.length, 3, 'Batch pairer detects 3 distinct worksheets from 5 files');
  assert.strictEqual(batchPairs[0].solutionFile.name, 'Dang05_Phieu1-ANS.pdf', 'Auto-pairs -ANS.pdf with question PDF');
  assert.strictEqual(batchPairs[1].solutionFile.name, 'ChuyenDe_02_DapAn.pdf', 'Auto-pairs _DapAn.pdf with question PDF');
  assert.strictEqual(batchPairs[2].solutionFile, null, 'Handles standalone worksheet PDF without solution cleanly');

  // 30.6 Phân tích TSV/CSV đồng bộ Google Sheet (=HYPERLINK)
  const parsedRows = App.parseGoogleSheetTsvOrCsv(
    'STT\tChương\tBài\tDạng\tĐề\tĐáp án\tNguồn\tCN\n' +
    'Dạng 05\tChương 1\tBài 1. Tính đơn điệu\tDạng 2. Tham số m\t=HYPERLINK("https://drive.google.com/file/d/abc123XYZ/view"; "Đề")\t=HYPERLINK("https://drive.google.com/file/d/sol789XYZ/view"; "Đáp án")\tLaTeX (.tex)\t18/11/2026',
    12
  );
  assert.strictEqual(parsedRows.length, 1, 'Sheet parser extracts 1 data row skipping header');
  assert.strictEqual(parsedRows[0].id, 'CUR-12-D05', 'Matches existing CUR-12-D05 slot by code');
  assert.strictEqual(parsedRows[0].pdfUrl, 'https://drive.google.com/file/d/abc123XYZ/view', 'Extracts Drive PDF link from =HYPERLINK formula');
  assert.strictEqual(parsedRows[0].solutionPdfUrl, 'https://drive.google.com/file/d/sol789XYZ/view', 'Extracts Drive Solution link from =HYPERLINK formula');
  global.window = prevWin30;

  // 30.7 Kiểm tra hồi quy bảng thông báo & kết quả thi gọn nhẹ (không bị tràn màn hình)
  let compactScoreNode = null;
  let compactDialogNode = null;
  const prevAppend30 = global.document.body.appendChild;
  const prevCreateEl30 = global.document.createElement;
  const prevAddDocEvt30 = global.document.addEventListener;
  const prevRemDocEvt30 = global.document.removeEventListener;
  const prevDocListeners = [];
  global.document.addEventListener = (_, fn) => prevDocListeners.push(fn);
  global.document.removeEventListener = () => {};
  global.document.createElement = (tag) => {
    const el = {
      tagName: tag.toUpperCase(),
      id: '',
      className: '',
      innerHTML: '',
      style: {},
      attributes: {},
      setAttribute(k, v) { this.attributes[k] = v; },
      addEventListener() {},
      remove() {},
      querySelector(sel) {
        if (sel === '#appDialogConfirmBtn') return { addEventListener() {}, focus() {} };
        return null;
      }
    };
    return el;
  };
  global.document.body.appendChild = (node) => {
    if (node.id === 'scoreModal') compactScoreNode = node;
    if (node.id === 'appSystemDialog') compactDialogNode = node;
    return node;
  };
  App.showScoreModal({
    id: 'SUB-COMPACT-1',
    examTitle: 'Dạng 1. Xét tính đơn điệu từ công thức – [Phiếu 1]',
    studentId: 'HS901',
    scoreResult: {
      totalScore: 8.5, maxTotal: 10, percentage: 85, rank: 'Giỏi',
      part1: { score: 3, maxScore: 3 },
      part2: { score: 3, maxScore: 4 },
      part3: { score: 2.5, maxScore: 3 },
      part4: { totalQuestions: 1, maxScore: 1, pendingManual: true, score: 0 }
    }
  }, 5, 15);
  assert.ok(compactScoreNode && compactScoreNode.innerHTML.includes('max-w-[400px]') && compactScoreNode.innerHTML.includes('line-clamp-2'), '#scoreModal must use compact max-w-[400px] width and 2-line title clamp');
  App.showDialog({ type: 'info', title: 'Thông báo', message: 'Nội dung kiểm tra gọn nhẹ' });
  assert.ok(compactDialogNode && compactDialogNode.innerHTML.includes('max-w-[360px]'), '#appSystemDialog must use compact max-w-[360px] width');
  global.document.body.appendChild = prevAppend30;
  global.document.createElement = prevCreateEl30;
  global.document.addEventListener = prevAddDocEvt30;
  global.document.removeEventListener = prevRemDocEvt30;

  // 30.8 Kiểm tra thao tác kéo rê chuột (drag-to-pan / lướt xem PDF) & nhả quán tính
  assert.strictEqual(typeof App.initPdfViewerPan, 'function', 'App.initPdfViewerPan must be defined');
  const mockScrollEl = {
    scrollLeft: 10,
    scrollTop: 20,
    classList: {
      _classes: new Set(),
      add(c) { this._classes.add(c); },
      remove(c) { this._classes.delete(c); },
      contains(c) { return this._classes.has(c); }
    },
    addEventListener(name, fn) { this[`on_${name}`] = fn; }
  };
  App.initPdfViewerPan(mockScrollEl, 'testViewer');
  assert.strictEqual(mockScrollEl._panBound, true, 'initPdfViewerPan must bind pan handler');
  assert.strictEqual(typeof mockScrollEl.on_mousedown, 'function', 'scrollEl must listen to mousedown');

  console.log('[OK] Test 30 Passed: Curriculum Sheet/Tree views, Drive online viewer, view-only lock, direct practice & batch upload verified 100%.');

  // Test 31: Bỏ cột Nguồn / CN, Nút Xem & Tải 5 Phiên Bản PDF (PTMP_Muc1), Upload .tex lấy Đáp án & Hiển thị Đề PDF không đáp án khi Làm Trực Tiếp
  console.log('--- TEST 31: Multi-Variant PDF View/Download, .tex Auto Answer Key & No-Answer Direct Practice PDF ---');
  assert.ok(!sheetHtmlStu.includes('Nguồn / CN'), 'Sheet view must NOT contain Nguồn / CN column');

  // 31.1 Kiểm tra 5 file PDF PTMP_Muc1 và file PTMP_Muc1.tex tồn tại thực tế & gắn vào CUR-12-D42
  const ptmpPdfNames = [
    'PTMP_Muc1-GV-DapAn.pdf',
    'PTMP_Muc1-HS-CoVD-CoOli.pdf',
    'PTMP_Muc1-HS-CoVD-KhongOli.pdf',
    'PTMP_Muc1-HS-KhongVD-CoOli.pdf',
    'PTMP_Muc1-HS-KhongVD-KhongOli.pdf',
    'PTMP_Muc1.tex'
  ];
  ptmpPdfNames.forEach((fn) => {
    assert.ok(fs.existsSync(path.join(__dirname, '..', 'pdfs', fn)), `pdfs/${fn} must exist on disk`);
  });

  const d42 = App.findHomeworkById('CUR-12-D42');
  assert.ok(d42, 'CUR-12-D42 (Phương trình mặt phẳng — Mức 1) must exist');
  assert.strictEqual(d42.pdfUrl, 'pdfs/PTMP_Muc1-HS-KhongVD-KhongOli.pdf', 'CUR-12-D42 primary pdfUrl must be the no-answer student PDF (HS-KhongVD-KhongOli.pdf)');
  assert.strictEqual(d42.solutionPdfUrl, 'pdfs/PTMP_Muc1-GV-DapAn.pdf', 'CUR-12-D42 solutionPdfUrl must be GV-DapAn.pdf');
  const d42Variants = App.getWorksheetPdfVariants(d42, { includeSolution: true });
  assert.strictEqual(d42Variants.length, 5, 'CUR-12-D42 must expose all 5 PDF variants (4 student + 1 teacher solution)');
  const d42StuVariants = App.getWorksheetPdfVariants(d42, { includeSolution: false });
  assert.strictEqual(d42StuVariants.length, 4, 'CUR-12-D42 must expose 4 student PDF variants in the Đề / Các Bản PDF column');
  assert.ok(sheetHtmlStu.includes('HS · K.VD · K.Ôly') && sheetHtmlStu.includes('HS · K.VD · Có Ôly') && sheetHtmlStu.includes('HS · Có VD · K.Ôly') && sheetHtmlStu.includes('HS · Có VD · Có Ôly'), 'Sheet view renders View & Download buttons for all 4 student PDF variants');
  assert.ok(sheetHtmlStu.includes('Xem ĐA') && sheetHtmlStu.includes("App.downloadHomeworkPdf('CUR-12-D42', true"), 'Sheet view renders Xem ĐA & Tải buttons for GV-DapAn.pdf');

  // 31.2 Kiểm tra bộ phân tích file .tex (PTMP_Muc1.tex) trích xuất chính xác 12 câu P.I, 2 câu P.II, 4 câu P.III, 2 câu P.IV (bỏ qua \begin{vd})
  const ptmpTexRaw = fs.readFileSync(path.join(__dirname, '..', 'pdfs', 'PTMP_Muc1.tex'), 'utf8');
  const parsedPtmp = App.parseTexAnswerKey(ptmpTexRaw);
  assert.deepStrictEqual(parsedPtmp.p1, ['C', 'D', 'D', 'C', 'C', 'A', 'A', 'A', 'D', 'C', 'D', 'B'], 'PTMP_Muc1.tex Part I must match exact 12 answers');
  assert.strictEqual(parsedPtmp.p2.length, 2, 'PTMP_Muc1.tex Part II must have 2 TF questions');
  assert.deepStrictEqual(parsedPtmp.p2[0], { a: true, b: true, c: false, d: false }, 'PTMP_Muc1.tex Part II Q1 must be Đ Đ S S');
  assert.deepStrictEqual(parsedPtmp.p2[1], { a: true, b: false, c: true, d: false }, 'PTMP_Muc1.tex Part II Q2 must be Đ S Đ S');
  assert.deepStrictEqual(parsedPtmp.p3, ['8', '8', '-4', '1'], 'PTMP_Muc1.tex Part III must be 8, 8, -4, 1');
  assert.strictEqual(parsedPtmp.p4.length, 2, 'PTMP_Muc1.tex Part IV must have 2 essay questions');

  // 31.3 Khi bấm Làm Trực Tiếp trên CUR-12-D42: tiếp nhận đáp án từ .tex và hiển thị file PDF không đáp án (HS-KhongVD-KhongOli.pdf)
  App.state.currentUser = stu12;
  const launchedD42 = App.launchWorksheetDirectPractice('CUR-12-D42');
  await new Promise(r => setTimeout(r, 25));
  assert.strictEqual(launchedD42, true, 'launchWorksheetDirectPractice launches on CUR-12-D42');
  assert.strictEqual(App.state.activeExam.pdf_url, 'pdfs/PTMP_Muc1-HS-KhongVD-KhongOli.pdf', 'Direct practice displays the clean no-answer PDF (PTMP_Muc1-HS-KhongVD-KhongOli.pdf)');
  assert.strictEqual(App.state.activeExam.part1.length, 12, 'Direct practice loads 12 Part I questions from .tex');
  assert.strictEqual(App.state.activeExam.part2.length, 2, 'Direct practice loads 2 Part II questions from .tex');
  assert.strictEqual(App.state.activeExam.part3.length, 4, 'Direct practice loads 4 Part III questions from .tex');
  assert.strictEqual(App.state.activeExam.part4.length, 2, 'Direct practice loads 2 Part IV questions from .tex');
  if (App.state.timerInterval) { clearInterval(App.state.timerInterval); App.state.timerInterval = null; }
  App.state.activeExam = null;

  // 31.4 Kiểm tra ghép tự động 5 file PDF + 1 file .tex khi upload hàng loạt (pairBatchWorksheetFiles)
  const multiVariantBatch = App.pairBatchWorksheetFiles([
    { name: 'PTMP_Muc1-GV-DapAn.pdf', size: 405782 },
    { name: 'PTMP_Muc1-HS-CoVD-CoOli.pdf', size: 346676 },
    { name: 'PTMP_Muc1-HS-CoVD-KhongOli.pdf', size: 310898 },
    { name: 'PTMP_Muc1-HS-KhongVD-CoOli.pdf', size: 317760 },
    { name: 'PTMP_Muc1-HS-KhongVD-KhongOli.pdf', size: 287679 },
    { name: 'PTMP_Muc1.tex', size: 12400, _text: ptmpTexRaw }
  ]);
  assert.strictEqual(multiVariantBatch.length, 1, 'pairBatchWorksheetFiles groups 5 PDF variants + 1 .tex file into 1 worksheet');
  assert.strictEqual(multiVariantBatch[0].questionFile.name, 'PTMP_Muc1-HS-KhongVD-KhongOli.pdf', 'pairBatchWorksheetFiles picks HS-KhongVD-KhongOli.pdf as primary no-answer question PDF');
  assert.strictEqual(multiVariantBatch[0].solutionFile.name, 'PTMP_Muc1-GV-DapAn.pdf', 'pairBatchWorksheetFiles picks GV-DapAn.pdf as solution PDF');
  assert.strictEqual(multiVariantBatch[0].texFile.name, 'PTMP_Muc1.tex', 'pairBatchWorksheetFiles attaches .tex file');
  assert.strictEqual(multiVariantBatch[0].variantFiles.length, 5, 'pairBatchWorksheetFiles retains all 5 PDF variants');

  console.log('[OK] Test 31 Passed: Multi-variant PDF View/Download, .tex answer key extraction & no-answer PDF direct practice verified 100%.');

  // Test 32: Quản trị trực tiếp Cây Thư Mục (Sửa tên Chương/Bài/Dạng, Thêm Dạng, Upload file nhanh) & Chế độ Giáo Viên Xem Như Học Sinh
  console.log('--- TEST 32: Admin Folder Tree Rename/Upload/Add Topic & Teacher View-As-Student Mode ---');
  App.state.currentUser = { ...App.state.admin, role: 'admin' };
  App.state.hwGradeFilter = '12';
  App.state.hwViewMode = 'tree';

  const adminTreeItems = App.getFilteredCurriculumItems('admin');
  const adminTreeGrouped = App.groupCurriculumItems(adminTreeItems);
  const adminToolbarHtml = App.renderWorksheetViewToolbarHtml('admin', adminTreeItems, adminTreeGrouped);
  const adminTreeHtml = App.renderCurriculumTreeHtml({ scope: 'admin', items: adminTreeItems });

  assert.ok(adminToolbarHtml.includes('+ Chương') && adminToolbarHtml.includes('+ Bài Học') && adminToolbarHtml.includes('+ Thêm Dạng'), 'Admin toolbar must include + Chương, + Bài Học, + Thêm Dạng buttons');
  assert.ok(adminToolbarHtml.includes('Xem Như Học Sinh'), 'Admin toolbar must include Xem Như Học Sinh button');
  assert.ok(adminTreeHtml.includes('Sửa tên Chương') && adminTreeHtml.includes('+ Thêm Bài') && adminTreeHtml.includes('Sửa tên Bài'), 'Admin tree view must include chapter & lesson rename/add buttons');
  assert.ok(adminTreeHtml.includes('Up File') && adminTreeHtml.includes('Sửa tên') && adminTreeHtml.includes('triggerQuickTreeUpload'), 'Admin tree leaf must include Up File & Sửa tên buttons');

  // 32.1 Thêm Dạng mới vào Cây Thư Mục (chưa cần file PDF) -> sau đó Upload nhanh file PDF + .tex vào Dạng vừa tạo
  const addedSlot = await App.addCurriculumTopicSlot({
    grade: 12,
    chapterCode: 'Chương 5',
    lessonTitle: 'Bài 1. Phương trình mặt phẳng',
    code: 'Dạng 05',
    title: 'Dạng 5. Bài toán thực tế về phương trình mặt phẳng'
  });
  assert.ok(addedSlot && addedSlot.id, 'addCurriculumTopicSlot must create a new topic slot in the folder tree');
  assert.strictEqual(addedSlot.code, 'Dạng 05');
  assert.strictEqual(addedSlot.title, 'Dạng 5. Bài toán thực tế về phương trình mặt phẳng');

  // Sửa tên Dạng trực tiếp
  const renamedSlot = App.renameCurriculumItem(addedSlot.id, {
    code: 'Dạng 05 (Mới)',
    title: 'Dạng 5. Ứng dụng phương trình mặt phẳng trong không gian Oxyz'
  });
  assert.strictEqual(renamedSlot.code, 'Dạng 05 (Mới)', 'renameCurriculumItem must update topic code');
  assert.strictEqual(renamedSlot.title, 'Dạng 5. Ứng dụng phương trình mặt phẳng trong không gian Oxyz', 'renameCurriculumItem must update topic title');

  // Upload nhanh file PDF + .tex vào Dạng trong Cây Thư Mục
  const uploadedSlot = await App.attachFilesToHomeworkRecord(addedSlot.id, [
    { name: 'PTMP_Dang5-HS-KhongVD-KhongOli.pdf', size: 280000 },
    { name: 'PTMP_Dang5-GV-DapAn.pdf', size: 390000 },
    { name: 'PTMP_Dang5.tex', size: 12000, _text: ptmpTexRaw }
  ]);
  assert.ok(uploadedSlot.pdfUrl, 'attachFilesToHomeworkRecord must set primary student pdfUrl');
  assert.ok(uploadedSlot.solutionPdfUrl, 'attachFilesToHomeworkRecord must set teacher solutionPdfUrl');
  assert.strictEqual(uploadedSlot.part1.length, 12, 'attachFilesToHomeworkRecord must extract 12 P.I answers from .tex');
  assert.strictEqual(uploadedSlot.part3.length, 4, 'attachFilesToHomeworkRecord must extract 4 P.III answers from .tex');

  // 32.2 Đổi tên Bài học & Đổi tên Chương trong Cây Thư Mục
  await App.addCurriculumTopicSlot({
    grade: 12,
    chapterCode: 'Chương 6',
    lessonTitle: 'Bài Tạm Để Test Đổi Tên',
    code: 'Dạng 01',
    title: 'Dạng test trong bài học tạm'
  });
  const renamedLessonCount = App.renameCurriculumLesson(12, 'Chương 6', 'Bài Tạm Để Test Đổi Tên', 'Bài Đã Đổi Tên Thành Công');
  assert.strictEqual(renamedLessonCount, 1, 'renameCurriculumLesson must update items in that lesson');
  assert.ok(
    App.getMergedWorksheets().some(x => x.lessonTitle === 'Bài Đã Đổi Tên Thành Công'),
    'Merged worksheets must reflect new lesson title'
  );
  const deletedLessonCount = App.deleteCurriculumLesson(12, 'Chương 6', 'Bài Đã Đổi Tên Thành Công', { skipConfirm: true });
  assert.strictEqual(deletedLessonCount, 1, 'deleteCurriculumLesson must remove the test lesson');

  const updatedChapMeta = App.renameCurriculumChapter(12, 'Chương 5', {
    newChapterCode: 'Chương 5',
    newChapterTitle: 'KHỐI 12 — CHƯƠNG V. PHƯƠNG TRÌNH MẶT PHẲNG, ĐƯỜNG THẲNG, MẶT CẦU (ĐÃ CẬP NHẬT)'
  });
  assert.ok(updatedChapMeta.chapterTitle.includes('(ĐÃ CẬP NHẬT)'), 'renameCurriculumChapter must update chapter title');
  assert.ok(
    App.getCurriculumCatalog().chapters.some(c => c.grade === 12 && c.chapterTitle.includes('(ĐÃ CẬP NHẬT)')),
    'getCurriculumCatalog must return the updated chapter title'
  );

  // 32.3 Chế độ Giáo Viên Xem Như Học Sinh (không cần đăng xuất / thoát ra vào lại)
  App.state.currentUser = { ...App.state.admin, role: 'admin', fullName: 'Thầy Huỳnh Thanh Chí' };
  App.saveSessionUser(App.state.currentUser);
  assert.strictEqual(App.isTeacherPreviewingAsStudent(), false, 'Initially not in student preview mode');

  // Bật chế độ Xem Như Học Sinh (mặc định xem theo Khối 12 đang lọc)
  App.toggleAdminStudentViewMode(true, { grade: '11', studentMainTab: 'homeworks', studentHwViewMode: 'tree' });
  assert.strictEqual(App.isTeacherPreviewingAsStudent(), true, 'isTeacherPreviewingAsStudent must be true after enabling');
  assert.strictEqual(App.state.currentUser.role, 'student', 'Effective currentUser role must be student during preview');
  assert.strictEqual(App.state.currentUser._isTeacherPreview, true, 'Effective currentUser must carry _isTeacherPreview flag');
  assert.strictEqual(App.isStudentAllowedGradeCurriculum(11), true, 'When previewing as Grade 11 student, Grade 11 must be unlocked');
  assert.strictEqual(App.isStudentAllowedGradeCurriculum(12), false, 'When previewing as Grade 11 student, Grade 12 must be locked just like a real Grade 11 student');

  // Chuyển sang góc nhìn Tất cả Khối trong chế độ Xem Như Học Sinh
  App.setAdminPreviewTarget({ grade: 'ALL' });
  assert.strictEqual(App.isStudentAllowedGradeCurriculum(12), true, 'ALL preview unlocks Grade 12');
  assert.strictEqual(App.isStudentAllowedGradeCurriculum(11), true, 'ALL preview unlocks Grade 11');
  assert.strictEqual(App.isStudentAllowedGradeCurriculum(10), true, 'ALL preview unlocks Grade 10');
  const previewBannerHtml = App.renderTeacherPreviewBannerHtml();
  assert.ok(previewBannerHtml.includes('Quay Lại Trang Giáo Viên'), 'Preview banner must render button to return to Teacher Portal');

  // Quay lại Trang Giáo Viên chỉ với 1 chạm (không cần đăng nhập lại)
  App.toggleAdminStudentViewMode(false);
  assert.strictEqual(App.isTeacherPreviewingAsStudent(), false, 'isTeacherPreviewingAsStudent must be false after returning to Admin');
  assert.strictEqual(App.state.currentUser.role, 'admin', 'Admin role must be restored immediately without logging in again');

  console.log('[OK] Test 32 Passed: Folder Tree rename/upload/add topic & Teacher View-As-Student mode verified 100%.');

  // ==========================================
  // TEST 33: Bộ Lịch & Đếm Ngược Kỳ Thi THPT QG Lớp 2027 (Khóa 2K9) Trên Ô Đăng Nhập + Cơ Chế Tự Tham Chiếu Nguồn Chính Xác Cho Các Năm Khác
  // ==========================================
  console.log('--- TEST 33: THPT QG 2027 Calendar & Countdown Above Login Input + Multi-Year Auto-Reference Engine ---');

  // 33.1 Kiểm tra nguồn pháp quy chính thức Kỳ thi THPT QG 2027 (Lớp 12 · 2K9)
  const sched2027 = App.resolveThptExamSchedule(2027);
  assert.strictEqual(sched2027.year, 2027, 'Default schedule year must be 2027');
  assert.strictEqual(sched2027.cohort, '2K9', '2027 cohort must be 2K9');
  assert.strictEqual(sched2027.procedureDate, '2027-06-10', '2027 procedure date must be 10/06/2027');
  assert.strictEqual(sched2027.examDay1, '2027-06-11', '2027 exam day 1 (Literature & Math) must be 11/06/2027');
  assert.strictEqual(sched2027.examDay2, '2027-06-12', '2027 exam day 2 (Electives) must be 12/06/2027');
  assert.strictEqual(sched2027.backupDate, '2027-06-13', '2027 backup date must be 13/06/2027');
  assert.ok(sched2027.legalDoc.includes('2308/QĐ-BGDĐT'), '2027 schedule must cite official MOET Decision 2308/QĐ-BGDĐT');

  // 33.2 Kiểm tra cơ chế tự tham chiếu nguồn cho các năm khác (2025, 2026, 2028, 2029, 2030)
  const sched2026 = App.resolveThptExamSchedule(2026);
  assert.strictEqual(sched2026.examDay1, '2026-06-11', '2026 official exam day 1 must be 11/06/2026');
  assert.ok(sched2026.legalDoc.includes('1257/BGDĐT-QLCL'), '2026 schedule must cite official MOET dispatch 1257/BGDĐT-QLCL');

  const sched2028 = App.resolveThptExamSchedule(2028);
  assert.strictEqual(sched2028.cohort, '2K10', '2028 cohort must be 2K10 (Grade 11)');
  assert.strictEqual(sched2028.examDay1, '2028-06-08', '2028 auto-referenced Thursday week-2 June exam day 1 must be 08/06/2028');
  assert.strictEqual(sched2028.examDay2, '2028-06-09', '2028 auto-referenced Friday week-2 June exam day 2 must be 09/06/2028');
  assert.strictEqual(sched2028.status, 'auto_reference', '2028 schedule must carry auto_reference status before official decision override');

  const sched2029 = App.resolveThptExamSchedule(2029);
  assert.strictEqual(sched2029.cohort, '2K11', '2029 cohort must be 2K11 (Grade 10)');
  assert.strictEqual(sched2029.examDay1, '2029-06-14', '2029 auto-referenced exam day 1 must be 14/06/2029');

  // Tự động nhảy năm mục tiêu khi thời gian thực đã qua kỳ thi năm 2027
  assert.strictEqual(App.getDefaultThptTargetYear(new Date('2026-11-19T12:00:00+07:00')), 2027, 'Before June 2027 exam ends, default target year must be 2027');
  assert.strictEqual(App.getDefaultThptTargetYear(new Date('2027-06-15T12:00:00+07:00')), 2028, 'After June 2027 exam ends, default target year must auto-advance to 2028');

  // 33.3 Kiểm tra tính toán đếm ngược và ma trận tờ lịch Tháng 06/2027
  const snap2027 = App.getThptCountdownSnapshot(2027, 'math_exam', new Date('2027-06-10T14:20:00+07:00'));
  assert.strictEqual(snap2027.phase, 'upcoming', '1 day before Math exam must be upcoming');
  assert.strictEqual(snap2027.days, 1, 'Exactly 24h before 14:20 11/06/2027 must be 1 day');
  assert.strictEqual(snap2027.hours, 0, 'Hours remainder must be 0');

  const cal2027 = App.buildThptJuneCalendarMatrix(2027);
  const mathCell = cal2027.cells.find(c => !c.empty && c.day === 11);
  assert.ok(mathCell && mathCell.role === 'day1_math' && mathCell.badge.includes('TOÁN'), 'June 2027 calendar cell 11 must highlight Math exam day');

  // 33.4 Kiểm tra vị trí hiển thị: Bắt buộc nằm BÊN TRÊN ô điền tài khoản đăng nhập (#loginStudentId / #loginAdminUser)
  App.state.thptCountdownYear = 2027;
  const loginBoxTest = { innerHTML: '' };
  App.renderLoginView(loginBoxTest);
  const loginHtml = loginBoxTest.innerHTML;
  const cdPos = loginHtml.indexOf('id="thptCountdownWidget"');
  const studentInputPos = loginHtml.indexOf('id="loginStudentId"');
  const adminInputPos = loginHtml.indexOf('id="loginAdminUser"');
  assert.ok(cdPos !== -1, 'Login view must render #thptCountdownWidget');
  assert.ok(cdPos < studentInputPos && cdPos < adminInputPos, '#thptCountdownWidget must appear ABOVE the student and admin login account input fields');
  assert.ok(loginHtml.includes('2308/QĐ-BGDĐT') && loginHtml.includes('2027 · 2K9'), 'Countdown widget must display 2027 (2K9) and official MOET source badge');

  console.log('[OK] Test 33 Passed: THPT QG 2027 Calendar & Countdown above login input + Multi-Year Auto-Reference Engine verified 100%.');
  console.log('[OK] TẤT CẢ 33 BỘ TEST ĐÃ HOÀN TẤT VÀ ĐẠT 100%!');
})().catch((err) => {
  console.error('[FAIL] Test suite failed:', err);
  process.exit(1);
});
