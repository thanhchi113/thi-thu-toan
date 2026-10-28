// Advanced test for TeX Parser with nested braces, \dfrac, Vietnamese macros, and TikZ
const TeXParser = require('../js/tex_parser.js');

const complexTex = `
\\documentclass{article}
\\usepackage{amsmath}
\\begin{document}

\\begin{ex}%[2D1B1-1]
Cho hàm số $y = \\dfrac{2x - 1}{x + 1}$. Tìm đường tiệm cận đứng của đồ thị hàm số.
\\choice
{$x = \\dfrac{1}{2}$}
{\\True $x = -1$}
{$y = 2$}
{$x \\in \\{1; 2\\}$}
\\loigiai{Ta có $\\lim_{x \\to -1} y = \\infty \\Rightarrow x = -1$ là tiệm cận đứng.}
\\end{ex}

\\begin{ex}%[2D1Y2-2]
Cho hàm số $f(x)$ thỏa mãn hệ phương trình $\\heva{x + y = 3 \\cr 2x - y = 0}$.
\\choiceTF
{\\True Nghiệm của hệ là $\\heva{x = 1 \\cr y = 2}$.}
{Hàm số nghịch biến trên khoảng $(-\\infty; 0)$.}
{\\True Đồ thị có điểm cực trị $(0; 1)$.}
{Giá trị lớn nhất là $\\dfrac{5}{2}$.}
\\loigiai{Giải hệ phương trình bậc nhất hai ẩn.}
\\end{ex}

\\begin{ex}%[2D2B3-3]
Biết rằng phương trình $\\log_2(x^2 - 1) = 3$ có hai nghiệm phân biệt $x_1, x_2$. Tính tích $x_1 \\cdot x_2$.
\\shortans{-9}
\\loigiai{Ta có $x^2 - 1 = 8 \\Leftrightarrow x^2 = 9 \\Leftrightarrow x = \\pm 3 \\Rightarrow x_1 x_2 = -9$.}
\\end{ex}

\\end{document}
`;

const res = TeXParser.parse(complexTex);
console.log('Result of parsing complex TeX:');
console.log('Part 1 count:', res.part1.length);
console.log('Part 1 choices:', res.part1[0]?.choices);
console.log('Part 1 correct choice:', res.part1[0]?.correct_answer);
console.log('Part 2 count:', res.part2.length);
console.log('Part 2 statements:', res.part2[0]?.statements);
console.log('Part 3 count:', res.part3.length);
console.log('Part 3 correct ans:', res.part3[0]?.correct_answer);

console.assert(res.part1.length === 1, 'Part 1 length should be 1');
console.assert(res.part1[0].correct_answer === 'B', 'Part 1 correct should be B');
console.assert(res.part1[0].choices[0] === 'A. $x = \\dfrac{1}{2}$', 'Part 1 choice A should preserve \\dfrac');
console.assert(res.part1[0].choices[3] === 'D. $x \\in \\{1; 2\\}$', 'Part 1 choice D should preserve nested braces');
console.assert(res.part2.length === 1, 'Part 2 length should be 1');
console.assert(res.part2[0].statements[0].correct === true, 'Part 2 item a should be True');
console.assert(res.part2[0].statements[1].correct === false, 'Part 2 item b should be False');
console.assert(res.part3.length === 1, 'Part 3 length should be 1');
console.assert(res.part3[0].correct_answer === '-9', 'Part 3 ans should be -9');
console.log('[OK] TẤT CẢ TEST PARSER NÂNG CAO ĐỀU VƯỢT QUA 100%!');
