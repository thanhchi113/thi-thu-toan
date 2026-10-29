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

console.log('[OK] TẤT CẢ TEST CHẤM ĐIỂM 3-4 PHẦN, DẤU ./, PHẦN III, TIẾN ĐỘ LÀM BÀI & BẢNG ĐÁP ÁN NGANG ĐÃ ĐẠT 100%!');
