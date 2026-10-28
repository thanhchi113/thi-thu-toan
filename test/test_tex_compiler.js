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

console.log('[OK] ALL TEX COMPILER & PARSER ASSERTIONS PASSED 100%!');
