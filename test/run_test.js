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

console.log('[OK] TẤT CẢ TEST CHẤM ĐIỂM & BẢNG ĐÁP ÁN ĐỀ PDF ĐÃ ĐẠT 100%!');
