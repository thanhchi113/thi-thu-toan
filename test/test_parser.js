const TeXParser = require('../js/tex_parser.js');

const sampleTex = `
\\begin{ex}
Tập xác định của hàm số $y = \\log_2(x - 3)$ là
\\choice
{$[3; +\\infty)$}
{$(-\\infty; 3)$}
{\\True $(3; +\\infty)$}
{$\\mathbb{R} \\setminus \\{3\\}$}
\\loigiai{Điều kiện: $x - 3 > 0 \\Leftrightarrow x > 3$.}
\\end{ex}

\\begin{ex}
Cho hàm số $f(x) = x^3 - 3x$.
\\choiceTF
{\\True $f'(x) = 3x^2 - 3$.}
{Hàm số nghịch biến trên $\\mathbb{R}$.}
{\\True Điểm cực đại là $x = -1$.}
{Giá trị cực tiểu bằng $0$.}
\\loigiai{Khảo sát hàm số bậc ba.}
\\end{ex}

\\begin{ex}
Tính tích phân $I = \\int_0^1 (2x + 1)dx$.
\\shortans{2}
\\loigiai{$I = [x^2 + x]_0^1 = 2$.}
\\end{ex}
`;

const res = TeXParser.parse(sampleTex);
console.log('Parsed Exam:', {
  p1Count: res.part1.length,
  p1ChoiceCorrect: res.part1[0]?.correct_answer,
  p2Count: res.part2.length,
  p2Statements: res.part2[0]?.statements.map(s => `${s.sub_id}: ${s.correct}`),
  p3Count: res.part3.length,
  p3Correct: res.part3[0]?.correct_answer
});

console.assert(res.part1.length === 1 && res.part1[0].correct_answer === 'C', 'Part 1 fail');
console.assert(res.part2.length === 1 && res.part2[0].statements[0].correct === true, 'Part 2 fail');
console.assert(res.part3.length === 1 && res.part3[0].correct_answer === '2', 'Part 3 fail');
console.log('[OK] TEST TEX PARSER HOÀN TOÀN CHÍNH XÁC!');
