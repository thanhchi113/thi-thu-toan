// Assert-based unit tests for TeXCompiler & upgraded TeXParser
const assert = require('assert');
const TeXCompiler = require('../js/tex_compiler.js');
const TeXParser = require('../js/tex_parser.js');
const { TikZToSVG } = require('../js/math_svg.js');

const arbitraryTex = `
\\documentclass[12pt]{article}
\\usepackage{amsmath,amssymb,tkz-tab}
\\usetikzlibrary{intersections}
\\newcommand{\\myvec}[1]{\\overrightarrow{#1}}
\\title{Chuyên đề Kiểm định TeX}
\\begin{document}
\\maketitle
\\chapter{Hàm số}
\\section{Cực trị}
\\begin{ex}
\\immini[thm]{Cho hệ $\\heva{x + \\dfrac{1}{2}y = 1 \\\\ 2x - y = \\left\\{ 0 \\right.}$ và $\\myvec{AB}$.}
{\\begin{tikzpicture}
  \\tkzTabInit{$x$/1,$y'$/1,$y$/2}{$-\\infty$,$0$,$+\\infty$}
  \\tkzTabLine{,+,0,-,}
  \\tkzTabVar{-/$-\\infty$,+/$2$,-/$-\\infty$}
\\end{tikzpicture}}
\\choice
{$x = 1$}
{\\True $x = \\dfrac{1}{2}$}
{$x \\in \\{1; 2\\}$}
{$x = 0$}
\\loigiai{
Ta có
\\allowdisplaybreaks
\\begin{eqnarray*}
  A &=& x^2 + 2x + 1 \\\\
  &=& (x + 1)^2.
\\end{eqnarray*}
\\begin{tabular}{|c|r|}
\\hline
$x$ & $1$ \\\\
\\hline
\\end{tabular}
}
\\end{ex}
\\end{document}
`;

const compiled = TeXCompiler.compileDocument(arbitraryTex);
assert.strictEqual(compiled.title, 'Chuyên đề Kiểm định TeX');
assert.strictEqual(compiled.preamble.macros['\\myvec'], '\\overrightarrow{#1}');
assert.strictEqual(compiled.stats.tikz, 1);
assert.strictEqual(compiled.stats.tables, 1);
assert.strictEqual(compiled.stats.questions, 1);
assert.ok(!compiled.html.includes('@@TXV_'), 'No unexpanded vault tokens');
assert.ok(compiled.html.includes('class="tex-immini'), 'Should render 2-column immini');
assert.ok(compiled.html.includes('type="text/tikz"'), 'Should emit real TikZJax script');
assert.ok(compiled.html.includes('tkz-tab'), 'Should auto-enable tkz-tab package');
assert.ok(compiled.html.includes('intersections'), 'Should inherit preamble tikz library');
assert.ok(compiled.html.includes('\\begin{aligned}'), 'Should convert eqnarray* to aligned');
assert.ok(compiled.html.includes('<table class="tex-table">'), 'Should compile tabular to HTML table');

// TikZToSVG real delegation check
const tikzHtml = TikZToSVG.render('\\begin{tikzpicture}\\draw (0,0)--(1,1);\\end{tikzpicture}');
assert.ok(tikzHtml.includes('<script type="text/tikz"'), 'TikZToSVG should emit real TikZJax block');

// Standalone HTML export check
const standalone = TeXCompiler.buildStandaloneHtml(arbitraryTex, 'Test Export');
assert.ok(standalone.includes('@rod2ik/tikzjax@1.6.0/dist/tikzjax.min.js'));
assert.ok(standalone.includes('mhchem.min.js'));
assert.ok(standalone.includes('\\myvec'));

// TeXParser check with escaped braces \left\{ ... \right.
const parsed = TeXParser.parse(arbitraryTex);
assert.strictEqual(parsed.part1.length, 1);
assert.strictEqual(parsed.part1[0].correct_answer, 'B');
assert.ok(parsed.part1[0].content.includes('tex-immini'));
assert.ok(parsed.part1[0].explanation.includes('<table class="tex-table">'));

// \setcounter check
const scDoc = TeXCompiler.compileDocument('\\setcounter{bt}{13}\\begin{bt}Nội dung bài 14.\\end{bt}');
assert.ok(scDoc.html.includes('Bài 14.'), 'Should honor \\setcounter{bt}{13}');

// HTML Exam Mode: stripHtmlAnswers & extractTexFromHtml & lockAnswers & fallback HTML
const docWithShortans = TeXCompiler.compileDocument('\\begin{ex}Tính $2+3$.\\shortans{5}\\loigiai{Vì $2+3=5$.}\\end{ex}').html;
assert.ok(docWithShortans.includes('tex-shortans-box'), 'Compiled shortans must emit tex-shortans-box');
const stripped = TeXCompiler.stripHtmlAnswers(compiled.html + docWithShortans);
assert.ok(!stripped.includes('tex-loigiai'), 'stripHtmlAnswers must remove loigiai blocks');
assert.ok(!stripped.includes('tex-choice-correct'), 'stripHtmlAnswers must remove correct choice highlight');
assert.ok(!stripped.includes('tex-shortans-box'), 'stripHtmlAnswers must remove shortans answer box with extra Tailwind classes');

const recoveredTex = TeXCompiler.extractTexFromHtml(standalone);
assert.strictEqual(recoveredTex, arbitraryTex.trim(), 'extractTexFromHtml must round-trip raw TeX from exported HTML');

const lockedStandalone = TeXCompiler.buildStandaloneHtml(arbitraryTex, 'Student Exam', { lockAnswers: true });
const lockedMain = lockedStandalone.split('<main')[1] || '';
assert.ok(!lockedStandalone.includes('texSourceEmbed'), 'Locked standalone HTML must not embed raw TeX answers');
assert.ok(!lockedMain.includes('tex-loigiai'), 'Locked standalone HTML main must strip loigiai DOM');
assert.ok(!lockedMain.includes('tex-choice-correct'), 'Locked standalone HTML main must strip correct choice class');

const fallbackHtml = TeXCompiler.compileExamDataFallbackHtml({
  part1: [{ id: 1, content: 'Tính $1+1$', choices: ['A. $1$', 'B. $2$', 'C. $3$', 'D. $4$'], correct_answer: 'B', explanation: 'Vì $1+1=2$.' }],
  part2: [{ id: 1, content: 'Xét $f(x)=x^2$', statements: [{ sub_id: 'a', text: '$f(0)=0$', correct: true }] }],
  part3: [{ id: 1, content: 'Tính $3\\cdot 4$', correct_answer: '12', explanation: '$3\\cdot 4=12$.' }]
});
assert.ok(fallbackHtml.includes('tex-choice-correct') && fallbackHtml.includes('tex-shortans-box') && fallbackHtml.includes('tex-loigiai'));
const fallbackStudentHtml = TeXCompiler.stripHtmlAnswers(fallbackHtml);
assert.ok(!fallbackStudentHtml.includes('tex-choice-correct') && !fallbackStudentHtml.includes('tex-shortans-box') && !fallbackStudentHtml.includes('tex-loigiai'));
assert.ok(!fallbackStudentHtml.includes('data-correct='), 'stripHtmlAnswers must strip data-correct attributes');
assert.ok(!fallbackStudentHtml.includes('tex-shortans-check-btn'), 'stripHtmlAnswers must remove practice check button in exam mode');
assert.ok(fallbackStudentHtml.includes('tex-shortans-input') && fallbackStudentHtml.includes('tex-tf-btn'), 'stripHtmlAnswers must keep interactive inputs/buttons for Exam Room');

// Idempotency & safe < escaping check
const onceFrag = TeXCompiler.compileFragment('Cho $a < b$ và x < y. \\begin{tikzpicture}\\draw (0,0)--(1,1);\\end{tikzpicture}');
assert.ok(onceFrag.includes('x &lt; y'), 'Raw < in prose must be escaped');
const twiceFrag = TeXCompiler.compileFragment(onceFrag);
assert.strictEqual(twiceFrag, onceFrag, 'compileFragment must be 100% idempotent when called on already-compiled HTML');

// Snippet preamble forwarding (without \begin{document}) & interactive Parts I/II/III
const snippetTex = `
\\usetikzlibrary{calc}
\\newcommand{\\myseg}[1]{\\overline{#1}}
\\begin{ex}
Xét mệnh đề đúng sai với $\\myseg{AB}$:
\\begin{tikzpicture}\\draw (0,0) -- ($(1,0)+(0,1)$);\\end{tikzpicture}
\\choiceTF
{\\True Mệnh đề a đúng}
{Mệnh đề b sai}
{\\True Mệnh đề c đúng}
{Mệnh đề d sai}
\\loigiai{Giải thích chi tiết từng ý a, b, c, d.}
\\end{ex}
\\begin{ex}
Tính giá trị $\\myseg{CD}$ làm tròn đến hàng phần mười.
\\shortans[]{12,5}
\\loigiai{Ta tính được kết quả là $12{,}5$.}
\\end{ex}
`;
const snippetCompiled = TeXCompiler.compileDocument(snippetTex);
assert.ok(!snippetCompiled.html.includes('\\newcommand'), 'Snippet preamble declarations must be stripped from output body');
assert.ok(snippetCompiled.html.includes('\\myseg'), 'Custom macro must be forwarded into TikZ preamble or math');
assert.ok(snippetCompiled.html.includes('tex-tf-btn') && snippetCompiled.html.includes('data-part="p2"'), 'choiceTF must emit interactive Đúng/Sai buttons');
assert.ok(snippetCompiled.html.includes('tex-shortans-input') && snippetCompiled.html.includes('data-correct="12,5"'), 'shortans must emit interactive input with data-correct');
assert.ok(snippetCompiled.html.includes('Xem lời giải chi tiết') && snippetCompiled.html.includes('tex-loigiai-ans-badge'), 'loigiai must emit clear expandable solution button and answer badge');

// Plain "Câu 1:" auto-upgrade in compileDocument & short-answer numeric equivalence
const plainTexDoc = TeXCompiler.compileDocument('Câu 1: Đạo hàm của $x^2$ là\nA. $x$\n*B. $2x$\nC. $2$\nD. $x^3$\nLời giải: $(x^2)\' = 2x$.');
assert.ok(plainTexDoc.html.includes('data-choice="B"') && plainTexDoc.html.includes('Xem lời giải chi tiết'), 'Plain Câu 1 TeX must auto-upgrade to interactive HTML with solution');
assert.strictEqual(TeXCompiler.isShortAnsEqual('12,5', '12.5'), true);
assert.strictEqual(TeXCompiler.isShortAnsEqual('-0,25', '-0.250'), true);
assert.strictEqual(TeXCompiler.isShortAnsEqual('40', '41'), false);

console.log('[OK] ALL TEX COMPILER & PARSER ASSERTIONS PASSED 100%!');
