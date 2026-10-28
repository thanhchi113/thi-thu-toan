// TeXCompiler: Bộ biên dịch LaTeX (.tex bất kì) sang HTML tương tác trên trình duyệt
// Kết hợp Tiền xử lý LaTeX/ex_test Việt Nam + KaTeX (mhchem) + @rod2ik/tikzjax (WASM TikZ/tkz-tab/pgfplots) + latex.js

const TeXCompiler = {
  // Kho lưu macro tùy chỉnh trích xuất từ các file .tex đã biên dịch
  activeMacros: {},

  // Macro Toán học & ex_test phổ biến tại Việt Nam cho KaTeX
  DEFAULT_KATEX_MACROS: {
    '\\R': '\\mathbb{R}',
    '\\N': '\\mathbb{N}',
    '\\Z': '\\mathbb{Z}',
    '\\Q': '\\mathbb{Q}',
    '\\C': '\\mathbb{C}',
    '\\vv': '\\vec{#1}',
    '\\overrightarrow': '\\vec{#1}',
    '\\wideparen': '\\overset{\\frown}{#1}',
    '\\arc': '\\overset{\\frown}{#1}',
    '\\abs': '\\left|#1\\right|',
    '\\norm': '\\left\\|#1\\right\\|',
    '\\d': '\\mathrm{d}',
    '\\dx': '\\,\\mathrm{d}x',
    '\\dy': '\\,\\mathrm{d}y',
    '\\dt': '\\,\\mathrm{d}t',
    '\\True': '',
    '\\true': '',
    '\\False': '',
    '\\false': '',
    '\\indam': '\\mathbf{#1}',
    '\\iff': '\\Longleftrightarrow',
    '\\implies': '\\Longrightarrow'
  },

  getKaTeXMacros(extra = {}) {
    return Object.assign({}, this.DEFAULT_KATEX_MACROS, this.activeMacros, extra || {});
  },

  registerMacros(macros) {
    if (macros && typeof macros === 'object') {
      Object.assign(this.activeMacros, macros);
    }
  },

  isEscaped(str, idx) {
    let bs = 0;
    let i = idx - 1;
    while (i >= 0 && str[i] === '\\') {
      bs++;
      i--;
    }
    return (bs % 2) === 1;
  },

  // Trích xuất cặp ngoặc cân bằng { ... } hoặc [ ... ], bỏ qua ký tự đã escape \{ \}
  extractBalanced(str, startPos = 0, openChar = '{', closeChar = '}') {
    let openIdx = -1;
    for (let i = startPos; i < str.length; i++) {
      if (str[i] === openChar && !this.isEscaped(str, i)) {
        openIdx = i;
        break;
      }
    }
    if (openIdx === -1) return null;

    let depth = 0;
    for (let i = openIdx; i < str.length; i++) {
      if (this.isEscaped(str, i)) continue;
      if (str[i] === openChar) depth++;
      else if (str[i] === closeChar) {
        depth--;
        if (depth === 0) {
          return {
            content: str.substring(openIdx + 1, i),
            openIdx,
            endIdx: i
          };
        }
      }
    }
    return null;
  },

  skipWhitespace(str, idx) {
    while (idx < str.length && /\s/.test(str[idx])) idx++;
    return idx;
  },

  // Đọc lời gọi lệnh \cmd[opt]{arg1}{arg2}... bắt đầu ngay sau tên lệnh (tại afterCmdIdx)
  parseCommandArgs(str, afterCmdIdx, numArgs = 1, hasOptArg = false) {
    let curr = this.skipWhitespace(str, afterCmdIdx);
    let opt = null;

    if (hasOptArg && curr < str.length && str[curr] === '[') {
      const optBox = this.extractBalanced(str, curr, '[', ']');
      if (optBox && optBox.openIdx === curr) {
        opt = optBox.content;
        curr = this.skipWhitespace(str, optBox.endIdx + 1);
      }
    }

    const args = [];
    for (let k = 0; k < numArgs; k++) {
      curr = this.skipWhitespace(str, curr);
      if (curr >= str.length || str[curr] !== '{') return null;
      const brace = this.extractBalanced(str, curr, '{', '}');
      if (!brace || brace.openIdx !== curr) return null;
      args.push(brace.content);
      curr = brace.endIdx + 1;
    }

    return { opt, args, endIdx: curr };
  },

  // Thay thế toàn bộ lời gọi \cmdName[opt]{arg1}... bằng hàm replacer (hỗ trợ lồng nhau)
  replaceCommand(str, cmdName, numArgs, hasOptArg, replacer, allowStar = false) {
    if (!str || !str.includes('\\' + cmdName)) return str;
    const cmdPrefix = '\\' + cmdName;
    let out = '';
    let i = 0;

    while (i < str.length) {
      const idx = str.indexOf(cmdPrefix, i);
      if (idx === -1) {
        out += str.slice(i);
        break;
      }

      // Đảm bảo không phải lệnh con của lệnh dài hơn (VD: \d vs \dfrac, \section vs \sectionmark)
      const afterNameIdx = idx + cmdPrefix.length;
      const nextCh = str[afterNameIdx] || '';
      if (/[A-Za-z@]/.test(nextCh) || this.isEscaped(str, idx)) {
        out += str.slice(i, afterNameIdx);
        i = afterNameIdx;
        continue;
      }

      let argStart = afterNameIdx;
      let isStar = false;
      if (allowStar && str[argStart] === '*') {
        isStar = true;
        argStart++;
      }

      const parsed = this.parseCommandArgs(str, argStart, numArgs, hasOptArg);
      if (!parsed) {
        out += str.slice(i, afterNameIdx);
        i = afterNameIdx;
        continue;
      }

      out += str.slice(i, idx);
      out += replacer(parsed.opt, ...parsed.args, isStar);
      i = parsed.endIdx;
    }
    return out;
  },

  // Xóa comment % an toàn (giữ nguyên \% và môi trường verbatim/lstlisting)
  stripComments(rawTex) {
    if (!rawTex) return '';
    const verbVault = [];
    let s = String(rawTex).replace(/\\begin\{(verbatim|lstlisting)\}([\s\S]*?)\\end\{\1\}/g, (m) => {
      const token = `@@VERB_HOLD_${verbVault.length}@@`;
      verbVault.push(m);
      return token;
    });

    const lines = s.split(/\r?\n/);
    const cleaned = lines.map(line => {
      for (let i = 0; i < line.length; i++) {
        if (line[i] === '%' && !this.isEscaped(line, i)) {
          return line.slice(0, i);
        }
      }
      return line;
    });
    s = cleaned.join('\n');

    verbVault.forEach((v, idx) => {
      s = s.split(`@@VERB_HOLD_${idx}@@`).join(v);
    });
    return s;
  },

  // Bóc tách Preamble: lấy \newcommand, \renewcommand, \def, \DeclareMathOperator, \usetikzlibrary, \title...
  extractPreamble(rawTex) {
    const clean = this.stripComments(rawTex || '');
    const info = {
      title: '',
      author: '',
      date: '',
      docClass: '',
      macros: {},
      tikzLibraries: [],
      texPackages: [],
      pgfplotsCompat: '',
      preambleRaw: '',
      body: clean
    };

    const clsMatch = clean.match(/\\documentclass(?:\[[^\]]*\])?\{([^}]+)\}/);
    if (clsMatch) info.docClass = clsMatch[1].trim();

    const docStart = clean.indexOf('\\begin{document}');
    if (docStart !== -1) {
      info.preambleRaw = clean.slice(0, docStart);
      let body = clean.slice(docStart + 16);
      const docEnd = body.lastIndexOf('\\end{document}');
      if (docEnd !== -1) body = body.slice(0, docEnd);
      info.body = body;
    }

    const scanSource = info.preambleRaw + '\n' + info.body.slice(0, 2000);

    // Metadata: \title, \author, \date
    ['title', 'author', 'date'].forEach(field => {
      const pos = scanSource.indexOf('\\' + field);
      if (pos !== -1 && !/[A-Za-z@]/.test(scanSource[pos + field.length + 1] || '')) {
        const b = this.extractBalanced(scanSource, pos + field.length + 1, '{', '}');
        if (b) info[field] = b.content.trim();
      }
    });

    // Thư viện TikZ khai báo trong preamble
    const libRegex = /\\usetikzlibrary\{([^}]+)\}/g;
    let m;
    while ((m = libRegex.exec(info.preambleRaw)) !== null) {
      m[1].split(',').map(x => x.trim()).filter(Boolean).forEach(lib => {
        if (!info.tikzLibraries.includes(lib)) info.tikzLibraries.push(lib);
      });
    }

    // Macro: \newcommand, \renewcommand, \providecommand
    const BLOCKED_MACROS = new Set([
      '\\loigiai', '\\choice', '\\choiceTF', '\\shortans', '\\immini',
      '\\heva', '\\hoac', '\\begin', '\\end', '\\section', '\\chapter',
      '\\subsection', '\\textbf', '\\textit', '\\underline', '\\item'
    ]);

    const isNonMathMacro = (name, bodyVal) => {
      if (/^\\the[A-Z]|^\\the(?:page|section|subsection|chapter|part|equation|figure|table|enum|ex|bt|vd)\b/.test(name)) return true;
      return /\\(?:begin|end)\{(?:tikzpicture|tabular|minipage|multicols|enumerate|itemize)\}|\\(?:newpage|vfill|tikz|draw|arabic|roman|Roman|alph|Alph|counter|setcounter|color|definecolor)/.test(bodyVal);
    };

    const parseNewCommands = (src) => {
      const re = /\\(?:re)?(?:new|provide)command\*?\s*/g;
      let match;
      while ((match = re.exec(src)) !== null) {
        let curr = this.skipWhitespace(src, match.index + match[0].length);
        let name = '';
        if (src[curr] === '{') {
          const nb = this.extractBalanced(src, curr, '{', '}');
          if (!nb) continue;
          name = nb.content.trim();
          curr = nb.endIdx + 1;
        } else if (src[curr] === '\\') {
          const nm = src.slice(curr).match(/^\\[A-Za-z]+/);
          if (!nm) continue;
          name = nm[0];
          curr += nm[0].length;
        }
        if (!name || !name.startsWith('\\') || name.includes('@') || BLOCKED_MACROS.has(name)) continue;

        curr = this.skipWhitespace(src, curr);
        if (src[curr] === '[') {
          const argCntBox = this.extractBalanced(src, curr, '[', ']');
          if (argCntBox) curr = this.skipWhitespace(src, argCntBox.endIdx + 1);
        }
        if (src[curr] === '[') {
          const defOptBox = this.extractBalanced(src, curr, '[', ']');
          if (defOptBox) curr = this.skipWhitespace(src, defOptBox.endIdx + 1);
        }
        if (src[curr] !== '{') continue;
        const bodyBox = this.extractBalanced(src, curr, '{', '}');
        if (!bodyBox) continue;
        const bodyVal = bodyBox.content.trim();
        if (isNonMathMacro(name, bodyVal)) continue;
        info.macros[name] = bodyVal;
      }
    };
    parseNewCommands(info.preambleRaw);

    // \DeclareMathOperator(*){ \cmd }{ text }
    const opRe = /\\DeclareMathOperator(\*?)\s*/g;
    while ((m = opRe.exec(info.preambleRaw)) !== null) {
      const isStar = m[1] === '*';
      const parsed = this.parseCommandArgs(info.preambleRaw, m.index + m[0].length, 2, false);
      if (parsed) {
        const name = parsed.args[0].trim();
        const opText = parsed.args[1].trim();
        if (name.startsWith('\\') && !BLOCKED_MACROS.has(name)) {
          info.macros[name] = isStar ? `\\operatorname*{${opText}}` : `\\operatorname{${opText}}`;
        }
      }
    }

    // \def\foo{...} hoặc \def\foo#1{...} đơn giản trong preamble
    const defRe = /\\def\s*(\\[A-Za-z]+)((?:#[1-9])*)\s*\{/g;
    while ((m = defRe.exec(info.preambleRaw)) !== null) {
      const name = m[1];
      if (name.includes('@') || BLOCKED_MACROS.has(name)) continue;
      const brace = this.extractBalanced(info.preambleRaw, m.index + m[0].length - 1, '{', '}');
      if (brace) {
        const bodyVal = brace.content.trim();
        if (!/\\(?:begin|end|tikz|draw|newpage|catcode|csname|expandafter)/.test(bodyVal)) {
          info.macros[name] = bodyVal;
        }
      }
    }

    this.registerMacros(info.macros);
    return info;
  },

  // Chuẩn hóa ký tự tiếng Việt / Unicode bên trong khối TikZ để tex.wasm (OT1/CM) không bao giờ lỗi inputenc
  sanitizeTikzSource(tikzSrc) {
    let s = String(tikzSrc || '').trim();
    s = s.replace(/\\vv\{/g, '\\vec{');
    s = s.replace(/−/g, '-').replace(/–/g, '--').replace(/—/g, '---');
    s = s.replace(/×/g, '\\times ').replace(/÷/g, '\\div ').replace(/±/g, '\\pm ');
    s = s.replace(/∞/g, '\\infty ').replace(/≤/g, '\\le ').replace(/≥/g, '\\ge ').replace(/≠/g, '\\ne ');
    s = s.replace(/°/g, '^\\circ ');

    // Bỏ dấu tiếng Việt trên các ký tự chữ trong node TikZ (vì bộ font CM chuẩn của tex.wasm không nạp T5 vietnam)
    s = s.replace(/đ/g, 'd').replace(/Đ/g, 'D');
    s = s.replace(/[^\x00-\x7F]/g, (ch) => {
      const norm = ch.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return /^[\x00-\x7F]+$/.test(norm) ? norm : '';
    });

    // Chặn thẻ đóng </script> nếu vô tình xuất hiện
    s = s.replace(/<\/script/gi, '<\\/script');
    return s;
  },

  // Tự động phát hiện packages & tikzlibraries cần thiết và sinh thẻ <script type="text/tikz"> cho @rod2ik/tikzjax
  renderTikzToHtml(rawTikz, preambleInfo = null) {
    if (!rawTikz || !String(rawTikz).trim()) return '';
    let code = this.stripComments(String(rawTikz)).trim();

    const isChemfigOnly = !/\\begin\{(?:tikzpicture|circuitikz)\}/.test(code) && /\\chemfig/.test(code);
    if (!isChemfigOnly && !/\\begin\{(?:tikzpicture|circuitikz)\}/.test(code)) {
      code = `\\begin{tikzpicture}\n${code}\n\\end{tikzpicture}`;
    }

    const pkgs = new Set(['amsmath', 'amssymb']);
    const libs = new Set(['calc', 'arrows', 'arrows.meta']);

    if (preambleInfo && Array.isArray(preambleInfo.tikzLibraries)) {
      preambleInfo.tikzLibraries.forEach(l => {
        if (this.SUPPORTED_TIKZ_LIBS.has(l)) libs.add(l);
      });
    }

    if (/\\tkzTab/i.test(code)) pkgs.add('tkz-tab');
    if (/\\begin\{axis\}|\\begin\{semilogxaxis\}|\\begin\{semilogyaxis\}|\\begin\{loglogaxis\}|\\addplot/i.test(code)) pkgs.add('pgfplots');
    if (/\\begin\{circuitikz\}|\\draw[\s\S]*?\bto\[[A-Za-z]/i.test(code)) pkgs.add('circuitikz');
    if (/\\chemfig|\\chemname|\\schemestart/i.test(code)) pkgs.add('chemfig');
    if (/\\tdplot/i.test(code)) pkgs.add('tikz-3dplot');
    if (/\\begin\{tikzcd\}/i.test(code)) pkgs.add('tikz-cd');
    if (/\\vb\b|\\va\b|\\dv\b|\\pdv\b|\\bra\b|\\ket\b/i.test(code)) pkgs.add('physics');
    if (/\\ce\{/i.test(code)) pkgs.add('mhchem');
    if (/\\bm\{/i.test(code)) pkgs.add('bm');
    if (/\\cancel|\\bcancel|\\xcancel/i.test(code)) pkgs.add('cancel');
    if (/\\ifthenelse/i.test(code)) pkgs.add('ifthen');

    if (/\bpic\b|\bangle\b|\bright angle\b/.test(code)) {
      libs.add('angles');
      libs.add('quotes');
    }
    if (/name path|name intersections|intersection of/i.test(code)) libs.add('intersections');
    if (/pattern\s*=|north east lines|north west lines|crosshatch|dots/i.test(code)) {
      libs.add('patterns');
      libs.add('patterns.meta');
    }
    if (/canvas is |3d/i.test(code)) {
      libs.add('3d');
      libs.add('perspective');
    }
    if (/right\s*=\s*.*of\b|left\s*=\s*.*of\b|above\s*=\s*.*of\b|below\s*=\s*.*of\b/i.test(code)) libs.add('positioning');
    if (/decoration\s*=|postaction\s*=\s*\{decorate\}|snake|brace|zigzag|coil/i.test(code)) {
      libs.add('decorations.markings');
      libs.add('decorations.pathreplacing');
      libs.add('decorations.pathmorphing');
    }
    if (/tikzmath|\\tikzmath/i.test(code)) libs.add('math');
    if (/matrix of |\\matrix\b/i.test(code)) libs.add('matrix');
    if (/hobby|quick curve/i.test(code)) libs.add('hobby');
    if (/trapezium|regular polygon|cylinder|diamond|ellipse|isosceles triangle/i.test(code)) libs.add('shapes.geometric');
    if (/through|circle through/i.test(code)) libs.add('through');
    if (/on background layer/i.test(code)) libs.add('backgrounds');
    if (/spy /i.test(code)) libs.add('spy');

    const sanitized = this.sanitizeTikzSource(code);
    const pkgAttr = Array.from(pkgs).join(',');
    const libAttr = Array.from(libs).join(',');
    const preambleParts = [];
    if (pkgs.has('pgfplots')) preambleParts.push('\\pgfplotsset{compat=1.16}');
    const preambleAttr = preambleParts.length ? ` data-add-to-preamble="${this.escapeAttr(preambleParts.join(' '))}"` : '';
    const isWide = pkgs.has('tkz-tab') || /espcl|\\tkzTabInit/.test(code);

    return `<div class="math-svg-container tex-tikz-figure ${isWide ? 'tex-tikz-wide' : ''} my-3 flex flex-col items-center justify-center p-3 rounded-2xl border border-slate-200 bg-white overflow-x-auto"><script type="text/tikz" data-tex-packages="${this.escapeAttr(pkgAttr)}" data-tikz-libraries="${this.escapeAttr(libAttr)}"${preambleAttr}>\n${sanitized}\n</script></div>`;
  },

  SUPPORTED_TIKZ_LIBS: new Set([
    '3d', 'angles', 'animations', 'arrows', 'arrows.meta', 'automata', 'babel',
    'backgrounds', 'bending', 'braids', 'calc', 'calendar', 'cd', 'chains',
    'circuits', 'circuits.ee', 'circuits.ee.IEC', 'circuits.logic', 'circuits.logic.IEC', 'circuits.logic.US',
    'decorations', 'decorations.footprints', 'decorations.fractals', 'decorations.markings',
    'decorations.pathmorphing', 'decorations.pathreplacing', 'decorations.shapes', 'decorations.text',
    'er', 'fadings', 'fit', 'fixedpointarithmetic', 'folding', 'fpu', 'graphs', 'graphs.standard',
    'hobby', 'intersections', 'lindenmayersystems', 'math', 'matrix', 'mindmap',
    'patterns', 'patterns.meta', 'perspective', 'petri', 'plothandlers', 'plotmarks',
    'positioning', 'quotes', 'scopes', 'shadings', 'shadows', 'shapes', 'shapes.arrows',
    'shapes.callouts', 'shapes.geometric', 'shapes.misc', 'shapes.multipart', 'shapes.symbols',
    'snakes', 'spy', 'svg.path', 'through', 'trees', 'turtle', 'views'
  ]),

  escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  },

  escapeAttr(str) {
    return this.escapeHtml(str).replace(/"/g, '&quot;');
  },

  // Chuyển đổi nội dung \heva{...} hoặc \hoac{...} sang khối aligned chuẩn KaTeX
  formatSystemBody(body, leftDelim = '\\{') {
    let inner = this.expandMathMacros(body);
    inner = inner.replace(/\\cr\b/g, '\\\\');
    const rows = inner.split(/\\\\/).map(r => {
      const tr = r.trim();
      if (!tr) return '';
      return tr.includes('&') ? tr : '&' + tr;
    }).filter(Boolean);
    return `\\left${leftDelim}\\begin{aligned} ${rows.join(' \\\\ ')} \\end{aligned}\\right.`;
  },

  expandMathMacros(mathStr) {
    if (!mathStr) return '';
    let m = mathStr;
    // Mở rộng lồng nhau cho \heva và \hoac bên trong công thức Toán
    let guard = 0;
    while ((m.includes('\\heva') || m.includes('\\hoac')) && guard++ < 8) {
      m = this.replaceCommand(m, 'heva', 1, false, (_opt, body) => this.formatSystemBody(body, '\\{'));
      m = this.replaceCommand(m, 'hoac', 1, false, (_opt, body) => this.formatSystemBody(body, '['));
    }
    m = m.replace(/\\vv\{/g, '\\vec{');
    return m;
  },

  // Chuyển đổi bảng LaTeX \begin{tabular}{|c|c|...} ... \end{tabular} sang HTML <table>
  compileTabular(colSpec, bodyHtmlReady, compileCellFn) {
    // Phân tích định dạng cột: l, c, r, p{...}, m{...}, b{...}, X và vạch dọc |
    const cols = [];
    let spec = String(colSpec || '');
    // Mở rộng *{n}{pattern}
    spec = spec.replace(/\*\s*\{(\d+)\}\s*\{([^}]*)\}/g, (_m, n, pat) => pat.repeat(Math.min(20, parseInt(n, 10) || 1)));

    let pendingLeftBorder = false;
    for (let i = 0; i < spec.length; i++) {
      const ch = spec[i];
      if (ch === '|') {
        if (cols.length === 0) pendingLeftBorder = true;
        else cols[cols.length - 1].borderRight = true;
      } else if (ch === 'l' || ch === 'c' || ch === 'r' || ch === 'X') {
        cols.push({
          align: ch === 'l' ? 'left' : (ch === 'r' ? 'right' : 'center'),
          borderLeft: pendingLeftBorder,
          borderRight: false
        });
        pendingLeftBorder = false;
      } else if (ch === 'p' || ch === 'm' || ch === 'b') {
        const b = this.extractBalanced(spec, i + 1, '{', '}');
        if (b) i = b.endIdx;
        cols.push({ align: 'left', borderLeft: pendingLeftBorder, borderRight: false });
        pendingLeftBorder = false;
      } else if (ch === '>' || ch === '<' || ch === '@') {
        const b = this.extractBalanced(spec, i + 1, '{', '}');
        if (b) i = b.endIdx;
      }
    }

    const rawRows = String(bodyHtmlReady || '').split(/\\\\(?:\*|\s*\[[^\]]*\])?/);
    const htmlRows = [];
    let nextTopBorder = false;

    rawRows.forEach((rawRow) => {
      let row = rawRow.trim();
      if (!row) return;

      let hasTopRule = nextTopBorder;
      nextTopBorder = false;

      // Kiểm tra các lệnh kẻ ngang ở đầu dòng
      const ruleLeadRe = /^(?:\\(?:hline|toprule|midrule|bottomrule|cline\s*\{[^}]*\})\s*)+/;
      if (ruleLeadRe.test(row)) {
        hasTopRule = true;
        row = row.replace(ruleLeadRe, '').trim();
      }
      if (!row) {
        if (htmlRows.length > 0) {
          htmlRows[htmlRows.length - 1].bottomBorder = true;
        } else {
          nextTopBorder = true;
        }
        return;
      }

      // Kiểm tra lệnh kẻ ngang ở cuối dòng
      let hasBottomRule = false;
      const ruleTailRe = /(?:\s*\\(?:hline|toprule|midrule|bottomrule|cline\s*\{[^}]*\}))+$/;
      if (ruleTailRe.test(row)) {
        hasBottomRule = true;
        row = row.replace(ruleTailRe, '').trim();
      }

      // Chia ô theo ký tự & không bị escape
      const cells = [];
      let start = 0;
      let braceDepth = 0;
      for (let i = 0; i < row.length; i++) {
        if (this.isEscaped(row, i)) continue;
        if (row[i] === '{') braceDepth++;
        else if (row[i] === '}' && braceDepth > 0) braceDepth--;
        else if (row[i] === '&' && braceDepth === 0) {
          cells.push(row.slice(start, i));
          start = i + 1;
        }
      }
      cells.push(row.slice(start));

      let colCursor = 0;
      const tdHtml = cells.map((rawCell) => {
        let cell = rawCell.trim();
        let colspan = 1;
        let rowspan = 1;
        let align = cols[colCursor]?.align || 'center';
        let bLeft = cols[colCursor]?.borderLeft || false;
        let bRight = cols[colCursor]?.borderRight || false;

        // Xử lý \multicolumn{n}{spec}{content}
        if (cell.startsWith('\\multicolumn')) {
          const mc = this.parseCommandArgs(cell, 12, 3, false);
          if (mc) {
            colspan = Math.max(1, parseInt(mc.args[0], 10) || 1);
            const mcSpec = mc.args[1];
            if (mcSpec.includes('l')) align = 'left';
            else if (mcSpec.includes('r')) align = 'right';
            else align = 'center';
            if (mcSpec.trim().startsWith('|')) bLeft = true;
            if (mcSpec.trim().endsWith('|')) bRight = true;
            cell = mc.args[2].trim();
          }
        }
        // Xử lý \multirow{n}{*}{content}
        if (cell.startsWith('\\multirow')) {
          const mr = this.parseCommandArgs(cell, 9, 3, true);
          if (mr) {
            rowspan = Math.max(1, parseInt(mr.args[0], 10) || 1);
            cell = mr.args[2].trim();
          }
        }

        colCursor += colspan;
        const borderCls = [
          bLeft ? 'tex-td-bl' : '',
          bRight ? 'tex-td-br' : ''
        ].filter(Boolean).join(' ');
        const spanAttrs = `${colspan > 1 ? ` colspan="${colspan}"` : ''}${rowspan > 1 ? ` rowspan="${rowspan}"` : ''}`;
        return `<td${spanAttrs} class="tex-td text-${align} ${borderCls}">${compileCellFn(cell)}</td>`;
      }).join('');

      htmlRows.push({
        topBorder: hasTopRule,
        bottomBorder: hasBottomRule,
        tdHtml
      });
    });

    const trs = htmlRows.map((r, idx) => {
      const cls = [
        r.topBorder ? 'tex-tr-bt' : '',
        r.bottomBorder ? 'tex-tr-bb' : '',
        idx === 0 && htmlRows.length > 1 ? 'tex-tr-head' : ''
      ].filter(Boolean).join(' ');
      return `<tr class="${cls}">${r.tdHtml}</tr>`;
    }).join('');

    return `<div class="tex-table-wrap my-3 overflow-x-auto"><table class="tex-table">${trs}</table></div>`;
  },

  // Bóc tách và render \choice, \choiceTF, \shortans bên trong môi trường bài tập (chế độ tài liệu HTML)
  compileExChoicesInDoc(blockText, compileInlineFn) {
    let s = blockText;
    let extraHtml = '';

    // 1. \choiceTF[...]{a}{b}{c}{d}
    const tfMatch = s.match(/\\choiceTF(?:\[[^\]]*\])?/);
    if (tfMatch) {
      const pos = tfMatch.index;
      const parsed = this.parseCommandArgs(s, pos + 9, 4, true);
      if (parsed) {
        const letters = ['a', 'b', 'c', 'd'];
        const itemsHtml = parsed.args.map((raw, idx) => {
          const isTrue = /\\True\b|\\true\b/.test(raw);
          const clean = raw.replace(/\\True\b|\\true\b/g, '').trim();
          return `<div class="tex-tf-item" data-correct="${isTrue ? 'true' : 'false'}">
            <span class="tex-tf-label">${letters[idx]})</span>
            <div class="tex-tf-text flex-1">${compileInlineFn(clean)}</div>
            <span class="tex-ans-pill ${isTrue ? 'tex-ans-true' : 'tex-ans-false'}">${isTrue ? 'Đúng' : 'Sai'}</span>
          </div>`;
        }).join('');
        extraHtml += `<div class="tex-tf-list mt-3 space-y-1.5">${itemsHtml}</div>`;
        s = s.slice(0, pos) + s.slice(parsed.endIdx);
      }
    }

    // 2. \choice[...]{A}{B}{C}{D} hoặc \motcot / \haicot / \boncot
    const choiceMatch = s.match(/\\(choice|motcot|haicot|boncot)(?:\[[^\]]*\])?/);
    if (choiceMatch) {
      const cmd = choiceMatch[1];
      const pos = choiceMatch.index;
      const parsed = this.parseCommandArgs(s, pos + cmd.length + 1, 4, true);
      if (parsed) {
        const letters = ['A', 'B', 'C', 'D'];
        let cols = 2;
        if (cmd === 'motcot' || parsed.opt === '1') cols = 1;
        else if (cmd === 'boncot' || parsed.opt === '4') cols = 4;
        const choicesHtml = parsed.args.map((raw, idx) => {
          const isTrue = /\\True\b|\\true\b/.test(raw);
          const clean = raw.replace(/\\True\b|\\true\b/g, '').trim();
          return `<div class="tex-choice-item ${isTrue ? 'tex-choice-correct' : ''}">
            <span class="tex-choice-letter">${letters[idx]}.</span>
            <span class="tex-choice-body">${compileInlineFn(clean)}</span>
          </div>`;
        }).join('');
        extraHtml += `<div class="tex-choices-grid tex-choices-cols-${cols} mt-3">${choicesHtml}</div>`;
        s = s.slice(0, pos) + s.slice(parsed.endIdx);
      }
    }

    // 3. \shortans[...]{ans}
    const saMatch = s.match(/\\shortans(?:\[[^\]]*\])?/);
    if (saMatch) {
      const pos = saMatch.index;
      const parsed = this.parseCommandArgs(s, pos + 9, 1, true);
      if (parsed) {
        const ansClean = parsed.args[0].replace(/^\$+|\$+$/g, '').trim();
        extraHtml += `<div class="tex-shortans-box mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-amber-200 bg-amber-50/70 text-xs">
          <span class="font-bold text-amber-800"><i class="fa-solid fa-pen-to-square mr-1"></i>Đáp số trả lời ngắn:</span>
          <span class="tex-shortans-val font-mono font-extrabold text-amber-900 px-2 py-0.5 rounded bg-white border border-amber-300">${this.escapeHtml(ansClean)}</span>
        </div>`;
        s = s.slice(0, pos) + s.slice(parsed.endIdx);
      }
    }

    return { bodyRest: s, extraHtml };
  },

  // Biên dịch một đoạn/khối LaTeX sang HTML (dùng chung cho cả câu hỏi lẻ lẫn toàn bộ tài liệu .tex)
  compileFragment(rawTex, options = {}) {
    if (!rawTex || typeof rawTex !== 'string') return '';

    const preambleInfo = options.preambleInfo || null;
    const counters = options.counters || { ex: 0, bt: 0, vd: 0, dl: 0, dn: 0, dang: 0, section: 0, subsection: 0, chapter: 0 };

    // Dùng chung 1 kho Vault xuyên suốt các lời gọi đệ quy để không bao giờ HTML-escape lại bảng/hình/công thức con
    const isRoot = !options._vault;
    const vault = options._vault || [];
    const putVault = (content) => {
      const key = `@@TXV_${vault.length}_END@@`;
      vault.push(content);
      return key;
    };
    const subOpts = (extra = {}) => Object.assign({}, options, {
      alreadyStrippedComments: true,
      counters,
      _vault: vault
    }, extra);

    const restoreVault = (text) => {
      let res = text;
      let guard = 0;
      while (res.includes('@@TXV_') && guard++ < 15) {
        res = res.replace(/@@TXV_(\d+)_END@@/g, (_m, idx) => vault[Number(idx)] ?? '');
      }
      return res;
    };

    let s = options.alreadyStrippedComments ? rawTex : this.stripComments(rawTex);

    // Bảo vệ các khối TikZJax / SVG / math-svg-container đã được biên dịch hoặc nhúng sẵn
    s = s.replace(/<div[^>]*class="[^"]*tex-tikz-figure[^"]*"[\s\S]*?<\/script>\s*<\/div>/gi, m => putVault(m));
    s = s.replace(/<script\s+type="text\/tikz"[\s\S]*?<\/script>/gi, m => putVault(m));
    s = s.replace(/<div[^>]*class="[^"]*math-svg-container[^"]*"[\s\S]*?<\/div>\s*<\/div>/gi, m => putVault(m));
    s = s.replace(/<svg[\s\S]*?<\/svg>/gi, m => putVault(m));

    // Bước 1: Bảo vệ verbatim / lstlisting
    s = s.replace(/\\begin\{(verbatim|lstlisting)\}(?:\[[^\]]*\])?([\s\S]*?)\\end\{\1\}/g, (_m, _env, code) => {
      return putVault(`<pre class="tex-verbatim my-3 p-3 rounded-xl bg-slate-900 text-slate-100 text-xs font-mono overflow-x-auto"><code>${this.escapeHtml(code.replace(/^\r?\n/, ''))}</code></pre>`);
    });

    // Bước 2: Xử lý \immini[...]{nội dung trái}{hình vẽ phải} bằng ngoặc nhọn cân bằng
    let imminiGuard = 0;
    while (s.includes('\\immini') && imminiGuard++ < 15) {
      s = this.replaceCommand(s, 'immini', 2, true, (_opt, leftText, rightFig) => {
        const leftHtml = this.compileFragment(leftText, subOpts());
        const rightHtml = this.compileFragment(rightFig, subOpts());
        return putVault(`<div class="tex-immini my-2"><div class="tex-immini-content">${leftHtml}</div><div class="tex-immini-figure">${rightHtml}</div></div>`);
      });
    }

    // Bước 3: Biên dịch mọi khối TikZ / tkz-tab / pgfplots / circuitikz / chemfig sang <script type="text/tikz">
    s = s.replace(/\\begin\{(tikzpicture|circuitikz)\}([\s\S]*?)\\end\{\1\}/g, (fullMatch) => {
      return putVault(this.renderTikzToHtml(fullMatch, preambleInfo));
    });
    if (s.includes('\\chemfig')) {
      s = this.replaceCommand(s, 'chemfig', 1, true, (opt, body) => {
        const raw = `\\chemfig${opt ? `[${opt}]` : ''}{${body}}`;
        return putVault(this.renderTikzToHtml(raw, preambleInfo));
      });
    }

    // Bước 4: Chuẩn hóa các môi trường Toán nhiều dòng (eqnarray*, align*, gather*, multline*, equation*)
    s = s.replace(/\\allowdisplaybreaks(?:\[\d*\])?/g, '');

    s = s.replace(/\\begin\{eqnarray\*?\}([\s\S]*?)\\end\{eqnarray\*?\}/g, (_m, body) => {
      let aligned = body.replace(/\\nonumber|\\notag/g, '');
      aligned = aligned.replace(/&\s*([^&\\\r\n]+?)\s*&/g, '&$1 ');
      return `\\[\\begin{aligned}${this.expandMathMacros(aligned)}\\end{aligned}\\]`;
    });

    s = s.replace(/\\begin\{(align|flalign|alignat)\*?\}(?:\{[^}]*\})?([\s\S]*?)\\end\{\1\*?\}/g, (_m, _env, body) => {
      const cleaned = body.replace(/\\nonumber|\\notag|\\label\{[^}]*\}/g, '');
      return `\\[\\begin{aligned}${this.expandMathMacros(cleaned)}\\end{aligned}\\]`;
    });

    s = s.replace(/\\begin\{(gather|multline)\*?\}([\s\S]*?)\\end\{\1\*?\}/g, (_m, _env, body) => {
      const cleaned = body.replace(/\\nonumber|\\notag|\\label\{[^}]*\}/g, '');
      return `\\[\\begin{gathered}${this.expandMathMacros(cleaned)}\\end{gathered}\\]`;
    });

    s = s.replace(/\\begin\{equation\*?\}([\s\S]*?)\\end\{equation\*?\}/g, (_m, body) => {
      const cleaned = body.replace(/\\label\{[^}]*\}/g, '');
      return `\\[${this.expandMathMacros(cleaned)}\\]`;
    });

    // Bước 5: Bảo vệ toàn bộ khối Toán ($...$, $$...$$, \[...\], \(...\)) vào Vault
    const mathBlockRe = /\$\$[\s\S]*?\$\$|\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\)|\$(?:\\.|[^\$\\\r\n]|\r?\n(?!\r?\n))+?\$/g;
    s = s.replace(mathBlockRe, (mathToken) => {
      if (mathToken.startsWith('$$')) {
        return putVault(`$$${this.expandMathMacros(mathToken.slice(2, -2))}$$`);
      }
      if (mathToken.startsWith('\\[')) {
        return putVault(`\\[${this.expandMathMacros(mathToken.slice(2, -2))}\\]`);
      }
      if (mathToken.startsWith('\\(')) {
        return putVault(`\\(${this.expandMathMacros(mathToken.slice(2, -2))}\\)`);
      }
      return putVault(`$${this.expandMathMacros(mathToken.slice(1, -1))}$`);
    });

    // Xử lý \heva và \hoac đứng trần ngoài $...$ (nếu có)
    if (s.includes('\\heva') || s.includes('\\hoac')) {
      s = this.replaceCommand(s, 'heva', 1, false, (_opt, body) => putVault(`$${this.formatSystemBody(body, '\\{')}$`));
      s = this.replaceCommand(s, 'hoac', 1, false, (_opt, body) => putVault(`$${this.formatSystemBody(body, '[')}$`));
    }

    // Bước 6: Bảng biểu \begin{tabular}{spec} ... \end{tabular} và tabularx / longtable
    s = s.replace(/\\begin\{tabularx\}\s*\{[^}]*\}\s*\{([^}]*)\}([\s\S]*?)\\end\{tabularx\}/g, (_m, spec, body) => {
      return putVault(this.compileTabular(spec, body, (cell) => this.compileFragment(cell, subOpts({ inlineQuestion: true }))));
    });
    s = s.replace(/\\begin\{(tabular|longtable)\}(?:\[[^\]]*\])?\s*\{([^}]*)\}([\s\S]*?)\\end\{\1\}/g, (_m, _env, spec, body) => {
      return putVault(this.compileTabular(spec, body, (cell) => this.compileFragment(cell, subOpts({ inlineQuestion: true }))));
    });

    // Bước 7: Môi trường Bài tập / Ví dụ / Định lí / Chú ý / Lời giải (cho chế độ biên dịch tài liệu .tex đầy đủ)
    if (!options.inlineQuestion) {
      const envMeta = {
        ex: { prefix: 'Câu', cls: 'tex-env-ex', counter: 'ex', icon: 'fa-circle-question' },
        cau: { prefix: 'Câu', cls: 'tex-env-ex', counter: 'ex', icon: 'fa-circle-question' },
        bt: { prefix: 'Bài', cls: 'tex-env-bt', counter: 'bt', icon: 'fa-pen-ruler' },
        vd: { prefix: 'Ví dụ', cls: 'tex-env-vd', counter: 'vd', icon: 'fa-lightbulb' },
        dl: { prefix: 'Định lí', cls: 'tex-env-dl', counter: 'dl', icon: 'fa-bookmark' },
        dn: { prefix: 'Định nghĩa', cls: 'tex-env-dn', counter: 'dn', icon: 'fa-book' },
        tc: { prefix: 'Tính chất', cls: 'tex-env-dl', counter: null, icon: 'fa-layer-group' },
        hq: { prefix: 'Hệ quả', cls: 'tex-env-dl', counter: null, icon: 'fa-code-branch' },
        nx: { prefix: 'Nhận xét', cls: 'tex-env-note', counter: null, icon: 'fa-comment-dots' },
        cy: { prefix: 'Chú ý', cls: 'tex-env-warn', counter: null, icon: 'fa-triangle-exclamation' },
        luuy: { prefix: 'Lưu ý', cls: 'tex-env-warn', counter: null, icon: 'fa-triangle-exclamation' },
        dang: { prefix: 'Dạng', cls: 'tex-env-dang', counter: 'dang', icon: 'fa-compass-drafting' },
        tomtat: { prefix: 'Tóm tắt lý thuyết', cls: 'tex-env-dn', counter: null, icon: 'fa-clipboard-list' },
        boxdn: { prefix: 'Kiến thức trọng tâm', cls: 'tex-env-dn', counter: null, icon: 'fa-star' }
      };

      const envNames = Object.keys(envMeta).join('|');
      const envRe = new RegExp(`\\\\setcounter\\{(ex|cau|bt|vd|dl|dn|dang|chapter|section|subsection)\\}\\{(\\d+)\\}|\\\\begin\\{(${envNames})\\}(?:\\[([^\\]]*)\\])?([\\s\\S]*?)\\\\end\\{\\3\\}`, 'gi');
      s = s.replace(envRe, (_m, scName, scVal, rawName, optTitle, rawBody) => {
        if (scName) {
          const cKey = scName.toLowerCase() === 'cau' ? 'ex' : scName.toLowerCase();
          counters[cKey] = parseInt(scVal, 10) || 0;
          return '';
        }
        const key = rawName.toLowerCase();
        const meta = envMeta[key];
        const num = meta.counter ? (++counters[meta.counter]) : '';
        let body = rawBody.trim();

        // Tách \loigiai{...} nếu có
        let loigiaiHtml = '';
        const lgPos = body.indexOf('\\loigiai');
        if (lgPos !== -1) {
          const lgBox = this.extractBalanced(body, lgPos + 8, '{', '}');
          if (lgBox) {
            const lgContent = this.compileFragment(lgBox.content.trim(), subOpts());
            loigiaiHtml = `<details class="tex-loigiai mt-3" open><summary class="tex-loigiai-summary"><i class="fa-solid fa-wand-magic-sparkles mr-1.5"></i>Lời giải chi tiết</summary><div class="tex-loigiai-body">${lgContent}</div></details>`;
            body = body.slice(0, lgPos) + body.slice(lgBox.endIdx + 1);
          }
        }

        const { bodyRest, extraHtml } = this.compileExChoicesInDoc(body, (frag) =>
          this.compileFragment(frag, subOpts({ inlineQuestion: true }))
        );

        const compiledStem = this.compileFragment(bodyRest, subOpts({ inlineQuestion: true }));
        const optBadge = optTitle ? ` <span class="tex-env-opt">(${this.compileFragment(optTitle, subOpts({ inlineQuestion: true }))})</span>` : '';
        const headerLabel = `${meta.prefix}${num ? ' ' + num : ''}.${optBadge}`;

        return putVault(`<article class="tex-env ${meta.cls} my-4"><div class="tex-env-header"><span class="tex-env-badge"><i class="fa-solid ${meta.icon} mr-1.5"></i>${headerLabel}</span></div><div class="tex-env-body">${compiledStem}${extraHtml}${loigiaiHtml}</div></article>`);
      });
    }

    // Xử lý \loigiai{...} lẻ bên ngoài môi trường
    if (s.includes('\\loigiai')) {
      s = this.replaceCommand(s, 'loigiai', 1, true, (_opt, lgBody) => {
        const lgContent = this.compileFragment(lgBody, subOpts());
        return putVault(`<details class="tex-loigiai mt-3" open><summary class="tex-loigiai-summary"><i class="fa-solid fa-wand-magic-sparkles mr-1.5"></i>Lời giải chi tiết</summary><div class="tex-loigiai-body">${lgContent}</div></details>`);
      });
    }

    // Bước 8: Danh sách lồng nhau (enumerate, itemize, description, listEX)
    const leafListRe = /\\begin\{(enumerate|itemize|description|listEX)\}(?:\[([^\]]*)\])?((?:(?!\\begin\{(?:enumerate|itemize|description|listEX)\})[\s\S])*?)\\end\{\1\}/i;
    let listGuard = 0;
    while (leafListRe.test(s) && listGuard++ < 25) {
      s = s.replace(leafListRe, (_m, envName, optSpec, inner) => {
        const lowerEnv = envName.toLowerCase();
        const parts = inner.split(/\\item\b/);
        parts.shift(); // Bỏ phần trống trước \item đầu tiên
        if (parts.length === 0) return '';

        const formatAutoLabel = (idx, spec) => {
          if (!spec) return `${idx + 1}.`;
          const sp = spec.trim();
          if (/\\alph|a\)|a\./.test(sp)) {
            const ch = String.fromCharCode(97 + (idx % 26));
            return sp.includes(')') ? `${ch})` : `${ch}.`;
          }
          if (/\\Alph|A\)|A\./.test(sp)) {
            const ch = String.fromCharCode(65 + (idx % 26));
            return sp.includes(')') ? `${ch})` : `${ch}.`;
          }
          if (/\\roman|i\)|i\./.test(sp)) {
            const romans = ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x'];
            const r = romans[idx] || (idx + 1);
            return sp.includes(')') ? `${r})` : `${r}.`;
          }
          if (/1\)/.test(sp)) return `${idx + 1})`;
          return `${idx + 1}.`;
        };

        const liHtml = parts.map((rawItem, idx) => {
          let itemStr = rawItem.trim();
          let customLabel = null;
          if (itemStr.startsWith('[')) {
            const lb = this.extractBalanced(itemStr, 0, '[', ']');
            if (lb && lb.openIdx === 0) {
              customLabel = this.compileFragment(lb.content, subOpts({ inlineQuestion: true }));
              itemStr = itemStr.slice(lb.endIdx + 1).trim();
            }
          }
          const bodyHtml = this.compileFragment(itemStr, subOpts());
          if (lowerEnv === 'itemize' && customLabel === null) {
            return `<li class="tex-li tex-li-bullet"><span class="tex-bullet">•</span><div class="flex-1 min-w-0">${bodyHtml}</div></li>`;
          }
          const badge = customLabel !== null ? customLabel : formatAutoLabel(idx, optSpec);
          return `<li class="tex-li"><span class="tex-li-marker">${badge}</span><div class="flex-1 min-w-0">${bodyHtml}</div></li>`;
        }).join('');

        const cols = (lowerEnv === 'listex' && optSpec && /^[234]$/.test(optSpec.trim())) ? Number(optSpec.trim()) : 1;
        const gridCls = cols > 1 ? `tex-list-grid tex-list-cols-${cols}` : 'space-y-1.5';
        return putVault(`<ul class="tex-list ${gridCls} my-2">${liHtml}</ul>`);
      });
    }

    // Bước 9: Các môi trường bố cục (multicols, center, flushright, flushleft, quote, minipage, proof, tcolorbox, figure, table)
    let layoutGuard = 0;
    const layoutRe = /\\begin\{(multicols|center|flushright|flushleft|quote|quotation|abstract|proof|minipage|tcolorbox|figure|table)\}(?:\[[^\]]*\])?(?:\{([^}]*)\})?([\s\S]*?)\\end\{\1\}/i;
    while (layoutRe.test(s) && layoutGuard++ < 25) {
      s = s.replace(layoutRe, (_m, env, arg, body) => {
        const e = env.toLowerCase();
        let cleanBody = body;
        let captionHtml = '';
        if (e === 'figure' || e === 'table') {
          cleanBody = this.replaceCommand(cleanBody, 'caption', 1, true, (_opt, cap) => {
            captionHtml = `<figcaption class="tex-caption text-xs text-slate-500 font-semibold mt-1.5 text-center">${this.compileFragment(cap, subOpts({ inlineQuestion: true }))}</figcaption>`;
            return '';
          });
          cleanBody = cleanBody.replace(/\\centering\b|\\label\{[^}]*\}/g, '');
        }
        const innerHtml = this.compileFragment(cleanBody, subOpts());
        if (e === 'multicols') {
          const cols = Math.min(4, Math.max(1, parseInt(arg, 10) || 2));
          return putVault(`<div class="tex-multicols tex-multicols-${cols} my-2">${innerHtml}</div>`);
        }
        if (e === 'center') return putVault(`<div class="tex-center my-2 text-center">${innerHtml}</div>`);
        if (e === 'flushright') return putVault(`<div class="tex-right my-2 text-right">${innerHtml}</div>`);
        if (e === 'flushleft') return putVault(`<div class="tex-left my-2 text-left">${innerHtml}</div>`);
        if (e === 'minipage') return putVault(`<div class="tex-minipage inline-block align-top my-1">${innerHtml}</div>`);
        if (e === 'proof') return putVault(`<div class="tex-proof my-2"><span class="italic font-semibold">Chứng minh. </span>${innerHtml}<span class="float-right font-serif">∎</span><div class="clear-both"></div></div>`);
        if (e === 'tcolorbox') return putVault(`<div class="tex-env tex-env-dn my-3"><div class="tex-env-body">${innerHtml}</div></div>`);
        if (e === 'figure' || e === 'table') return putVault(`<figure class="tex-float my-3 flex flex-col items-center">${innerHtml}${captionHtml}</figure>`);
        return putVault(`<blockquote class="tex-quote my-2 pl-3 border-l-3 border-indigo-300 italic text-slate-600">${innerHtml}</blockquote>`);
      });
    }

    // Bước 10: Phân mục tiêu đề (\part, \chapter, \section, \subsection, \subsubsection, \paragraph)
    s = this.replaceCommand(s, 'part', 1, true, (_opt, title) => {
      const t = this.compileFragment(title, subOpts({ inlineQuestion: true }));
      return putVault(`<div class="tex-part-heading my-5">${t}</div>`);
    }, true);

    s = this.replaceCommand(s, 'chapter', 1, true, (_opt, title, isStar) => {
      const num = isStar ? '' : `Chương ${++counters.chapter}. `;
      const t = this.compileFragment(title, subOpts({ inlineQuestion: true }));
      return putVault(`<h1 class="tex-chapter-heading mt-6 mb-3">${num}${t}</h1>`);
    }, true);

    s = this.replaceCommand(s, 'section', 1, true, (_opt, title, isStar) => {
      if (!isStar) {
        counters.section++;
        counters.subsection = 0;
      }
      const num = isStar ? '' : `${counters.section}. `;
      const t = this.compileFragment(title, subOpts({ inlineQuestion: true }));
      return putVault(`<h2 class="tex-section-heading mt-5 mb-2.5">${num}${t}</h2>`);
    }, true);

    s = this.replaceCommand(s, 'subsection', 1, true, (_opt, title, isStar) => {
      const num = isStar ? '' : `${counters.section ? counters.section + '.' : ''}${++counters.subsection} `;
      const t = this.compileFragment(title, subOpts({ inlineQuestion: true }));
      return putVault(`<h3 class="tex-subsection-heading mt-4 mb-2">${num}${t}</h3>`);
    }, true);

    s = this.replaceCommand(s, 'subsubsection', 1, true, (_opt, title) => {
      const t = this.compileFragment(title, subOpts({ inlineQuestion: true }));
      return putVault(`<h4 class="tex-subsubsection-heading mt-3 mb-1.5 font-bold">${t}</h4>`);
    }, true);

    s = this.replaceCommand(s, 'paragraph', 1, true, (_opt, title) => {
      const t = this.compileFragment(title, subOpts({ inlineQuestion: true }));
      return putVault(`<p class="font-bold mt-2 mb-1">${t}</p>`);
    }, true);

    if (s.includes('\\maketitle') && preambleInfo && preambleInfo.title) {
      const titleHtml = this.compileFragment(preambleInfo.title, subOpts({ inlineQuestion: true }));
      const authorHtml = preambleInfo.author ? `<div class="text-sm text-slate-600 mt-1">${this.compileFragment(preambleInfo.author, subOpts({ inlineQuestion: true }))}</div>` : '';
      const dateHtml = preambleInfo.date ? `<div class="text-xs text-slate-400 mt-0.5">${this.escapeHtml(preambleInfo.date)}</div>` : '';
      s = s.replace(/\\maketitle\b/g, () => putVault(`<header class="tex-doc-title text-center pb-4 mb-5 border-b border-slate-200"><h1 class="text-xl font-extrabold text-slate-900">${titleHtml}</h1>${authorHtml}${dateHtml}</header>`));
    } else {
      s = s.replace(/\\maketitle\b/g, '');
    }

    // Bước 11: Loại bỏ các lệnh điều khiển trang / file đáp án không hiển thị
    // Riêng \Opensolutionfile{ans}[Ans/Dapan] có tham số tùy chọn ở CUỐI sau {ans}
    s = s.replace(/\\Opensolutionfile\s*\{[^}]*\}\s*(?:\[[^\]]*\])?/gi, '');
    ['Closesolutionfile', 'Readsolutionfile', 'pagestyle', 'thispagestyle', 'pagenumbering', 'bibliographystyle', 'input', 'include', 'label', 'ref', 'eqref'].forEach(cmd => {
      if (cmd === 'ref' || cmd === 'eqref') {
        s = this.replaceCommand(s, cmd, 1, false, (_opt, r) => putVault(`<span class="font-mono text-indigo-600">(${this.escapeHtml(restoreVault(r))})</span>`));
      } else {
        s = this.replaceCommand(s, cmd, 1, true, () => '');
      }
    });
    ['setcounter', 'addtocounter', 'setlength', 'addtolength', 'indapan'].forEach(cmd => {
      s = this.replaceCommand(s, cmd, 2, false, () => '');
    });
    ['fancyhf', 'fancyhead', 'fancyfoot', 'lhead', 'rhead', 'chead', 'lfoot', 'rfoot', 'cfoot', 'vspace', 'hspace'].forEach(cmd => {
      s = this.replaceCommand(s, cmd, 1, true, () => '', true);
    });

    // Bước 12: Các lệnh định dạng văn bản inline có ngoặc nhọn cân bằng (hỗ trợ lồng nhau)
    let fmtGuard = 0;
    const inlineCmds = ['textbf', 'textit', 'emph', 'underline', 'texttt', 'textsc', 'textsf', 'textrm', 'centerline', 'circlenum', 'textcolor', 'href', 'url', 'footnote'];
    while (inlineCmds.some(c => s.includes('\\' + c)) && fmtGuard++ < 12) {
      s = this.replaceCommand(s, 'centerline', 1, false, (_opt, body) => {
        return putVault(`<div class="tex-center my-1.5 text-center">${this.compileFragment(body, subOpts({ inlineQuestion: true }))}</div>`);
      });
      s = this.replaceCommand(s, 'textbf', 1, false, (_opt, body) => {
        return putVault(`<strong>${this.compileFragment(body, subOpts({ inlineQuestion: true }))}</strong>`);
      });
      s = this.replaceCommand(s, 'textit', 1, false, (_opt, body) => {
        return putVault(`<em>${this.compileFragment(body, subOpts({ inlineQuestion: true }))}</em>`);
      });
      s = this.replaceCommand(s, 'emph', 1, false, (_opt, body) => {
        return putVault(`<em>${this.compileFragment(body, subOpts({ inlineQuestion: true }))}</em>`);
      });
      s = this.replaceCommand(s, 'underline', 1, false, (_opt, body) => {
        return putVault(`<span class="underline underline-offset-2">${this.compileFragment(body, subOpts({ inlineQuestion: true }))}</span>`);
      });
      s = this.replaceCommand(s, 'texttt', 1, false, (_opt, body) => {
        return putVault(`<code class="px-1.5 py-0.5 rounded bg-slate-100 font-mono text-[0.92em]">${this.compileFragment(body, subOpts({ inlineQuestion: true }))}</code>`);
      });
      s = this.replaceCommand(s, 'textsc', 1, false, (_opt, body) => {
        return putVault(`<span class="uppercase tracking-wider text-[0.92em] font-semibold">${this.compileFragment(body, subOpts({ inlineQuestion: true }))}</span>`);
      });
      s = this.replaceCommand(s, 'textsf', 1, false, (_opt, body) => this.compileFragment(body, subOpts({ inlineQuestion: true })));
      s = this.replaceCommand(s, 'textrm', 1, false, (_opt, body) => this.compileFragment(body, subOpts({ inlineQuestion: true })));
      s = this.replaceCommand(s, 'circlenum', 1, false, (_opt, body) => {
        return putVault(`<span class="tex-circlenum">${this.escapeHtml(restoreVault(body).trim())}</span>`);
      });
      s = this.replaceCommand(s, 'textcolor', 2, true, (_opt, col, body) => {
        const safeCol = /^[#A-Za-z0-9(),.%\s-]+$/.test(col) ? col.trim() : 'inherit';
        return putVault(`<span style="color:${safeCol}">${this.compileFragment(body, subOpts({ inlineQuestion: true }))}</span>`);
      });
      s = this.replaceCommand(s, 'href', 2, false, (_opt, url, text) => {
        const safeUrl = /^https?:\/\/|^mailto:/i.test(url.trim()) ? url.trim() : '#';
        return putVault(`<a href="${this.escapeAttr(safeUrl)}" target="_blank" rel="noopener noreferrer" class="text-indigo-600 underline hover:text-indigo-800">${this.compileFragment(text, subOpts({ inlineQuestion: true }))}</a>`);
      });
      s = this.replaceCommand(s, 'url', 1, false, (_opt, url) => {
        const safeUrl = /^https?:\/\/|^mailto:/i.test(url.trim()) ? url.trim() : '#';
        return putVault(`<a href="${this.escapeAttr(safeUrl)}" target="_blank" rel="noopener noreferrer" class="font-mono text-indigo-600 underline">${this.escapeHtml(url.trim())}</a>`);
      });
      s = this.replaceCommand(s, 'footnote', 1, false, (_opt, note) => {
        return putVault(`<span class="text-xs text-slate-500 italic"> (${this.compileFragment(note, subOpts({ inlineQuestion: true }))})</span>`);
      });
    }

    // Lệnh tạo dòng kẻ / ngắt trang / căn đều 2 bên (\hfill)
    s = s.replace(/\\(?:newpage|clearpage|pagebreak)\b/g, () => putVault('<hr class="tex-pagebreak my-5 border-dashed border-slate-300">'));
    s = s.replace(/\\(?:hrule|vhrulefill|hrulefill)\b/g, () => putVault('<hr class="my-3 border-slate-300">'));
    s = s.replace(/\\dotfill\b/g, () => putVault('<span class="tex-dotfill"></span>'));
    s = s.replace(/\\hfill\b/g, '@@TEX_HFILL@@');

    // Xóa các cờ chuyển font kích thước LaTeX trần (\large, \Large, \LARGE, \huge, \Huge, \footnotesize, \small, \normalsize, \bfseries, \itshape, \centering, \noindent)
    s = s.replace(/\\(?:tiny|scriptsize|footnotesize|small|normalsize|large|Large|LARGE|huge|Huge|bfseries|mdseries|itshape|slshape|upshape|scshape|rmfamily|sffamily|ttfamily|normalfont|centering|raggedright|raggedleft|noindent|indent|quad|qquad|smallskip|medskip|bigskip|vfill)\b\s*/g, (cmd) => {
      if (/quad/.test(cmd)) return ' ';
      return '';
    });

    // Bước 13: Nhận diện một số biểu thức Toán trần phổ biến ngoài $...$ (tương thích dữ liệu cũ)
    s = s.replace(/(\b\d+(?:[,\.]\d+)?\s*\^\s*\\circ)/g, (m) => putVault(`$${m}$`));
    s = s.replace(/(\\vec\{[^{}]+\}|\\d?frac\{[^{}]+\}\{[^{}]+\}|\\sqrt(?:\[[^\]]*\])?\{[^{}]+\}|\\mathbb\{[A-Za-z]+\})/g, (m) => putVault(`$${m}$`));
    s = s.replace(/(\\Rightarrow|\\Leftrightarrow|\\perp|\\parallel|\\approx|\\pm|\\mp|\\in|\\notin|\\subset|\\cup|\\cap|\\forall|\\exists)(?![A-Za-z])/g, (m) => putVault(`$${m}$`));

    // Bước 14: Escape HTML phần văn bản thuần còn lại & chuyển đổi dấu câu/xuống dòng LaTeX
    s = s.replace(/\\&/g, '@@ESC_AMP@@')
         .replace(/\\%/g, '@@ESC_PCT@@')
         .replace(/\\#/g, '@@ESC_HASH@@')
         .replace(/\\_/g, '@@ESC_US@@')
         .replace(/\\\{/g, '@@ESC_LB@@')
         .replace(/\\\}/g, '@@ESC_RB@@');

    // Gỡ bỏ cặp ngoặc nhọn nhóm đơn thuần {\bf ...} -> ... còn sót trong văn xuôi
    let braceCleanup = 0;
    while (/\{([^{}]*)\}/.test(s) && braceCleanup++ < 5) {
      s = s.replace(/\{([^{}\\]*)\}/g, '$1');
    }

    s = this.escapeHtml(s);

    s = s.replace(/\\lq\\lq|``/g, '“')
         .replace(/\\rq\\rq|''/g, '”')
         .replace(/\\lq\b/g, '‘')
         .replace(/\\rq\b/g, '’')
         .replace(/---/g, '—')
         .replace(/--/g, '–')
         .replace(/~/g, '&nbsp;');

    s = s.replace(/@@ESC_AMP@@/g, '&amp;')
         .replace(/@@ESC_PCT@@/g, '%')
         .replace(/@@ESC_HASH@@/g, '#')
         .replace(/@@ESC_US@@/g, '_')
         .replace(/@@ESC_LB@@/g, '{')
         .replace(/@@ESC_RB@@/g, '}');

    // Xuống dòng LaTeX \\, \newline, \par và dòng trống
    s = s.replace(/\s*\\\\(?:\*|\s*\[[^\]]*\])?\s*\r?\n?/g, '<br>');
    s = s.replace(/\s*\\newline\b\s*\r?\n?/g, '<br>');
    s = s.replace(/\s*\\par\b\s*\r?\n?/g, '<br><br>');
    if (options.inlineQuestion) {
      s = s.replace(/\r?\n/g, '<br>');
    } else {
      s = s.replace(/(?:\r?\n\s*){2,}/g, '<div class="tex-para-gap"></div>');
      s = s.replace(/\r?\n/g, ' ');
    }

    // Biến các dòng có \hfill thành thanh căn đều các mục trên cùng 1 hàng (VD: quốc hiệu, A. B. C. D.)
    if (s.includes('@@TEX_HFILL@@')) {
      const parts = s.split(/(<br>|<div class="tex-para-gap"><\/div>)/);
      s = parts.map(seg => {
        if (!seg.includes('@@TEX_HFILL@@')) return seg;
        const cols = seg.split('@@TEX_HFILL@@').map(x => `<span class="tex-hfill-seg">${x.trim()}</span>`).join('');
        return `<div class="tex-header-flex">${cols}</div>`;
      }).join('');
    }

    if (isRoot) {
      s = restoreVault(s);
    }
    s = s.trim().replace(/^(?:<br\s*\/?>|\s)+|(?:<br\s*\/?>|\s)+$/gi, '');
    return s;
  },

  // Biên dịch toàn bộ một file .tex bất kì sang HTML hoàn chỉnh kèm thống kê cấu trúc
  compileDocument(rawTex, options = {}) {
    if (!rawTex || !String(rawTex).trim()) {
      return { html: '', preamble: null, stats: { macros: 0, tikz: 0, tables: 0, questions: 0, mathBlocks: 0 } };
    }

    const preamble = this.extractPreamble(rawTex);
    const body = preamble.body;

    // Đếm thống kê nhanh trên tài liệu
    const tikzCount = (body.match(/\\begin\{(?:tikzpicture|circuitikz)\}|\\chemfig/g) || []).length;
    const tableCount = (body.match(/\\begin\{(?:tabular|tabularx|longtable)\}/g) || []).length;
    const exCount = (body.match(/\\begin\{(?:ex|bt|vd|cau)\}/gi) || []).length ||
                    (body.match(/(?:\\textbf\{Câu\s+\d+[:.]?\}|(?:^|\n)\s*Câu\s+\d+[:.])/gi) || []).length;
    const mathCount = (body.match(/\$\$[\s\S]*?\$\$|\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\)|\\begin\{(?:eqnarray|align|gather|equation)\*?\}|\$[^$\n]+\$/g) || []).length;

    let html = '';

    // Nếu người dùng chọn engine thuần latex.js và file không chứa macro ex_test/TikZ đặc thù
    if (options.engine === 'latexjs' && typeof window !== 'undefined' && window.latexjs && tikzCount === 0 && !/\\(?:begin\{(?:ex|bt|vd|eqnarray)|immini|choice|loigiai|heva|hoac)/.test(body)) {
      try {
        const gen = new window.latexjs.HtmlGenerator({ hyphenate: false });
        const doc = window.latexjs.parse(rawTex, { generator: gen });
        const wrapper = document.createElement('div');
        wrapper.appendChild(doc.domFragment());
        html = `<div class="tex-doc">${wrapper.innerHTML}</div>`;
      } catch (_err) {
        html = `<div class="tex-doc">${this.compileFragment(body, { preambleInfo: preamble, alreadyStrippedComments: true })}</div>`;
      }
    } else {
      const compiledBody = this.compileFragment(body, {
        preambleInfo: preamble,
        alreadyStrippedComments: true,
        inlineQuestion: false
      });
      html = `<div class="tex-doc">${compiledBody}</div>`;
    }

    // Tự động suy luận tiêu đề tài liệu nếu chưa có \title
    let inferredTitle = preamble.title ? preamble.title.replace(/\\[A-Za-z]+\s*|\{|\}/g, '').trim() : '';
    if (!inferredTitle) {
      const chapOrSec = body.match(/\\(?:chapter|section)\*?\{([^}]+)\}/);
      if (chapOrSec) inferredTitle = chapOrSec[1].replace(/\\[A-Za-z]+\s*|\{|\}/g, '').trim();
    }

    return {
      html,
      title: inferredTitle || 'Tài liệu LaTeX biên dịch',
      preamble,
      stats: {
        macros: Object.keys(preamble.macros).length,
        tikz: tikzCount,
        tables: tableCount,
        questions: exCount,
        mathBlocks: mathCount
      }
    };
  },

  // Kích hoạt KaTeX (kèm mhchem & macro tùy chỉnh) trên container DOM; TikZJax tự bắt <script type="text/tikz"> qua MutationObserver
  renderDom(rootEl, extraMacros = {}) {
    const target = rootEl || (typeof document !== 'undefined' ? document.body : null);
    if (!target || typeof renderMathInElement !== 'function') return;

    renderMathInElement(target, {
      delimiters: [
        { left: '$$', right: '$$', display: true },
        { left: '\\[', right: '\\]', display: true },
        { left: '$', right: '$', display: false },
        { left: '\\(', right: '\\)', display: false }
      ],
      macros: this.getKaTeXMacros(extraMacros),
      ignoredTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code', 'option', 'svg'],
      ignoredClasses: ['tikzjax-wrapper', 'katex'],
      throwOnError: false,
      strict: false
    });
  },

  // Loại bỏ hoàn toàn dấu vết đáp án & lời giải khỏi HTML khi hiển thị hoặc tải đề trong giờ thi
  stripHtmlAnswers(html) {
    if (!html) return '';
    return String(html)
      .replace(/<details\s+[^>]*\btex-loigiai\b[^>]*>[\s\S]*?<\/details>/gi, '')
      .replace(/<div\s+[^>]*\btex-shortans-box\b[^>]*>[\s\S]*?<\/div>/gi, '')
      .replace(/<span\s+[^>]*\btex-ans-pill\b[^>]*>[\s\S]*?<\/span>/gi, '')
      .replace(/\btex-choice-correct\b/g, '');
  },

  // Bóc tách mã nguồn TeX nhúng sẵn từ file .html đã xuất bởi hệ thống (nếu có)
  extractTexFromHtml(htmlText) {
    if (!htmlText) return '';
    const m = String(htmlText).match(/<script\s+type="application\/x-tex-source"\s+id="texSourceEmbed">([\s\S]*?)<\/script>/i);
    if (!m) return '';
    return m[1].replace(/<\\\/script/gi, '</script').trim();
  },

  // Tạo tài liệu HTML chuẩn từ dữ liệu câu hỏi 3 phần (dự phòng khi đề thi không lưu raw_tex)
  compileExamDataFallbackHtml(ex) {
    if (!ex) return '<div class="tex-doc"></div>';
    const renderQ = (frag) => this.compileFragment(String(frag || ''), { inlineQuestion: true });
    let partsHtml = `<div class="tex-maketitle text-center my-4 pb-3 border-b border-slate-200"><h1 class="text-xl font-extrabold text-slate-900">${this.escapeHtml(ex.title || 'Đề Thi Môn Toán')}</h1></div>`;

    if (Array.isArray(ex.part1) && ex.part1.length > 0) {
      partsHtml += `<h2 class="tex-section-heading mt-5 mb-2.5">PHẦN I. Câu trắc nghiệm nhiều phương án lựa chọn</h2>`;
      ex.part1.forEach(q => {
        const letters = ['A', 'B', 'C', 'D'];
        const choicesHtml = `<div class="tex-choices-grid tex-choices-cols-2">${(q.choices || []).map((c, idx) => {
          const letter = letters[idx] || '';
          const isCorr = q.correct_answer === letter;
          const cleanChoice = String(c || '').replace(/^[A-D]\.\s*/, '');
          return `<div class="tex-choice-item ${isCorr ? 'tex-choice-correct' : ''}"><span class="tex-choice-letter">${letter}.</span><span class="tex-choice-body">${renderQ(cleanChoice)}</span></div>`;
        }).join('')}</div>`;
        const lgHtml = q.explanation ? `<details class="tex-loigiai mt-3" open><summary class="tex-loigiai-summary"><i class="fa-solid fa-wand-magic-sparkles mr-1.5"></i>Lời giải chi tiết</summary><div class="tex-loigiai-body">${renderQ(q.explanation)}</div></details>` : '';
        partsHtml += `<article class="tex-env tex-env-ex my-4"><div class="tex-env-header"><span class="tex-env-badge"><i class="fa-solid fa-circle-question mr-1.5"></i>Câu ${q.id}.</span></div><div class="tex-env-body">${renderQ(q.content)}${choicesHtml}${lgHtml}</div></article>`;
      });
    }

    if (Array.isArray(ex.part2) && ex.part2.length > 0) {
      partsHtml += `<h2 class="tex-section-heading mt-5 mb-2.5">PHẦN II. Câu trắc nghiệm Đúng / Sai</h2>`;
      ex.part2.forEach(q => {
        const stList = q.statements || q.items || [];
        const tfHtml = `<div class="tex-tf-list space-y-1.5 mt-2.5">${stList.map(st => {
          const subId = st.sub_id || st.key || '';
          const badge = st.correct ? '<span class="tex-ans-pill tex-ans-true">Đúng</span>' : '<span class="tex-ans-pill tex-ans-false">Sai</span>';
          return `<div class="tex-tf-item"><span class="tex-tf-label">${subId})</span><div class="tex-tf-body flex-1">${renderQ(st.text)}</div>${badge}</div>`;
        }).join('')}</div>`;
        const lgHtml = q.explanation ? `<details class="tex-loigiai mt-3" open><summary class="tex-loigiai-summary"><i class="fa-solid fa-wand-magic-sparkles mr-1.5"></i>Lời giải chi tiết</summary><div class="tex-loigiai-body">${renderQ(q.explanation)}</div></details>` : '';
        partsHtml += `<article class="tex-env tex-env-ex my-4"><div class="tex-env-header"><span class="tex-env-badge"><i class="fa-solid fa-circle-question mr-1.5"></i>Câu ${q.id}.</span></div><div class="tex-env-body">${renderQ(q.content)}${tfHtml}${lgHtml}</div></article>`;
      });
    }

    if (Array.isArray(ex.part3) && ex.part3.length > 0) {
      partsHtml += `<h2 class="tex-section-heading mt-5 mb-2.5">PHẦN III. Câu trắc nghiệm trả lời ngắn</h2>`;
      ex.part3.forEach(q => {
        const ansHtml = q.correct_answer !== undefined && q.correct_answer !== ''
          ? `<div class="tex-shortans-box"><span class="tex-shortans-label">Đáp án:</span><span class="tex-shortans-val">${this.escapeHtml(String(q.correct_answer))}</span></div>`
          : '';
        const lgHtml = q.explanation ? `<details class="tex-loigiai mt-3" open><summary class="tex-loigiai-summary"><i class="fa-solid fa-wand-magic-sparkles mr-1.5"></i>Lời giải chi tiết</summary><div class="tex-loigiai-body">${renderQ(q.explanation)}</div></details>` : '';
        partsHtml += `<article class="tex-env tex-env-ex my-4"><div class="tex-env-header"><span class="tex-env-badge"><i class="fa-solid fa-circle-question mr-1.5"></i>Câu ${q.id}.</span></div><div class="tex-env-body">${renderQ(q.content)}${ansHtml}${lgHtml}</div></article>`;
      });
    }

    return `<div class="tex-doc">${partsHtml}</div>`;
  },

  // Xuất file .html độc lập hoàn chỉnh (nhúng CDN KaTeX + mhchem + @rod2ik/tikzjax + CSS + nút ẩn/hiện lời giải)
  buildStandaloneHtml(rawTex, customTitle = '', options = {}) {
    const lockAnswers = Boolean(options.lockAnswers);
    const res = rawTex && String(rawTex).trim()
      ? this.compileDocument(rawTex)
      : { html: options.precompiledHtml || '<div class="tex-doc"></div>', title: customTitle, preamble: null };
    const docTitle = customTitle || res.title || 'Tài liệu Toán học (TeX -> HTML)';
    const macrosJson = JSON.stringify(this.getKaTeXMacros(res.preamble?.macros || {}));
    const finalBodyHtml = lockAnswers ? this.stripHtmlAnswers(res.html) : res.html;
    const embeddedSourceTag = (!lockAnswers && rawTex && String(rawTex).trim())
      ? `\n  <script type="application/x-tex-source" id="texSourceEmbed">${String(rawTex).replace(/<\/script/gi, '<\\/script')}</script>`
      : '';

    return `<!DOCTYPE html>
<html lang="vi" data-theme="light">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${this.escapeHtml(docTitle)}</title>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css" crossorigin="anonymous">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css" crossorigin="anonymous">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@rod2ik/tikzjax@1.6.0/dist/fonts.min.css" crossorigin="anonymous">
  <script>
    window.TikzJaxOptions = {
      theme: { selector: 'html', applyTargetStyles: false, attribute: 'data-theme', darkValue: 'dark', lightValue: 'light', fallbackTheme: 'light' },
      renderTimeout: 30000,
      maxRetries: 1,
      restartWorkerOnFail: true
    };
  </script>
  <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.js" crossorigin="anonymous"></script>
  <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/contrib/mhchem.min.js" crossorigin="anonymous"></script>
  <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/contrib/auto-render.min.js" crossorigin="anonymous"></script>
  <script defer src="https://cdn.jsdelivr.net/npm/@rod2ik/tikzjax@1.6.0/dist/tikzjax.min.js" crossorigin="anonymous"></script>
  <style>
    :root { --bg: #f8fafc; --card: #ffffff; --text: #0f172a; --muted: #475569; --border: #e2e8f0; --accent: #4f46e5; --accent-soft: #eef2ff; }
    html[data-theme="dark"] { --bg: #0f172a; --card: #1e293b; --text: #f1f5f9; --muted: #94a3b8; --border: #334155; --accent: #818cf8; --accent-soft: #1e1b4b; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; background: var(--bg); color: var(--text); line-height: 1.7; }
    .toolbar { position: sticky; top: 0; z-index: 20; background: var(--card); border-bottom: 1px solid var(--border); padding: 0.75rem 1.25rem; display: flex; align-items: center; justify-content: space-between; gap: 1rem; flex-wrap: wrap; }
    .toolbar-title { font-weight: 800; font-size: 0.95rem; }
    .toolbar-actions { display: flex; gap: 0.5rem; flex-wrap: wrap; }
    .btn { border: 1px solid var(--border); background: var(--card); color: var(--text); padding: 0.4rem 0.85rem; border-radius: 0.6rem; font-size: 0.8rem; font-weight: 700; cursor: pointer; }
    .btn:hover { border-color: var(--accent); color: var(--accent); }
    .container { max-width: 960px; margin: 1.5rem auto; padding: 2rem; background: var(--card); border: 1px solid var(--border); border-radius: 1.25rem; box-shadow: 0 4px 20px rgba(15,23,42,0.04); }
    .tex-chapter-heading { font-size: 1.5rem; font-weight: 800; color: var(--accent); border-bottom: 2px solid var(--border); padding-bottom: 0.5rem; margin: 1.5rem 0 1rem; }
    .tex-section-heading { font-size: 1.2rem; font-weight: 800; margin: 1.35rem 0 0.75rem; }
    .tex-subsection-heading { font-size: 1.05rem; font-weight: 700; margin: 1rem 0 0.5rem; }
    .tex-para-gap { height: 0.65rem; }
    .tex-header-flex { display: flex; justify-content: space-between; align-items: baseline; gap: 1rem; flex-wrap: wrap; margin: 0.15rem 0; }
    .tex-immini { display: flex; flex-wrap: wrap; gap: 1.25rem; align-items: flex-start; margin: 0.75rem 0; }
    .tex-immini-content { flex: 1 1 320px; min-width: 0; }
    .tex-immini-figure { flex: 0 1 auto; margin: 0 auto; }
    .tex-tikz-figure { display: flex; justify-content: center; padding: 0.75rem; margin: 0.75rem auto; border: 1px solid var(--border); border-radius: 0.9rem; background: var(--card); overflow-x: auto; max-width: 100%; }
    .tex-table-wrap { overflow-x: auto; margin: 0.85rem 0; }
    .tex-table { border-collapse: collapse; margin: 0 auto; font-size: 0.92rem; border-top: 1.5px solid var(--border); border-bottom: 1.5px solid var(--border); }
    .tex-td { padding: 0.45rem 0.8rem; }
    .tex-td.text-left { text-align: left; } .tex-td.text-right { text-align: right; } .tex-td.text-center { text-align: center; }
    .tex-td-bl { border-left: 1px solid var(--border); } .tex-td-br { border-right: 1px solid var(--border); }
    .tex-tr-bt td { border-top: 1px solid var(--border); } .tex-tr-bb td { border-bottom: 1px solid var(--border); }
    .tex-env { border: 1px solid var(--border); border-radius: 1rem; padding: 1rem 1.2rem; margin: 1rem 0; background: var(--card); }
    .tex-env-header { margin-bottom: 0.45rem; }
    .tex-env-badge { display: inline-flex; align-items: center; font-weight: 800; font-size: 0.85rem; color: var(--accent); background: var(--accent-soft); padding: 0.2rem 0.65rem; border-radius: 0.5rem; }
    .tex-choices-grid { display: grid; gap: 0.5rem; margin-top: 0.75rem; grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .tex-choices-cols-1 { grid-template-columns: 1fr; }
    .tex-choices-cols-4 { grid-template-columns: repeat(4, minmax(0, 1fr)); }
    .tex-choice-item { padding: 0.45rem 0.7rem; border: 1px solid var(--border); border-radius: 0.6rem; display: flex; gap: 0.4rem; }
    body.show-answers .tex-choice-correct { border-color: #10b981; background: rgba(16,185,129,0.1); font-weight: 700; }
    .tex-choice-letter, .tex-tf-label, .tex-li-marker { font-weight: 800; color: var(--accent); flex-shrink: 0; }
    .tex-tf-item { display: flex; align-items: flex-start; gap: 0.5rem; padding: 0.4rem 0.65rem; border: 1px solid var(--border); border-radius: 0.6rem; }
    .tex-ans-pill, .tex-shortans-box { display: none; }
    body.show-answers .tex-ans-pill { display: inline-block; font-size: 0.72rem; font-weight: 800; padding: 0.1rem 0.5rem; border-radius: 999px; }
    .tex-ans-true { background: #d1fae5; color: #065f46; } .tex-ans-false { background: #ffe4e6; color: #9f1239; }
    body.show-answers .tex-shortans-box { display: inline-flex; margin-top: 0.65rem; gap: 0.4rem; font-size: 0.85rem; font-weight: 700; }
    .tex-loigiai { margin-top: 0.85rem; border-top: 1px dashed var(--border); padding-top: 0.65rem; }
    body:not(.show-answers) .tex-loigiai { display: none; }
    .tex-loigiai-summary { cursor: pointer; font-weight: 700; font-size: 0.85rem; color: #059669; }
    .tex-list { list-style: none; padding-left: 0.25rem; margin: 0.5rem 0; }
    .tex-li { display: flex; align-items: flex-start; gap: 0.5rem; margin: 0.25rem 0; }
    .tex-circlenum { display: inline-flex; width: 1.35rem; height: 1.35rem; border-radius: 999px; border: 1.5px solid currentColor; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 700; }
    .katex-display { overflow-x: auto; overflow-y: hidden; }
    @media (max-width: 640px) { .container { padding: 1.1rem; margin: 0.5rem; } .tex-choices-grid { grid-template-columns: 1fr; } }
    @media print { .toolbar { display: none !important; } .container { border: 0; box-shadow: none; margin: 0; max-width: 100%; } }
  </style>
</head>
<body class="${lockAnswers ? '' : 'show-answers'}">
  <div class="toolbar">
    <div class="toolbar-title"><i class="fa-solid fa-book-open-reader" style="margin-right:6px;color:var(--accent)"></i>${this.escapeHtml(docTitle)}</div>
    <div class="toolbar-actions">
      ${lockAnswers ? '' : '<button class="btn" onclick="document.body.classList.toggle(\'show-answers\')"><i class="fa-solid fa-eye"></i> Ẩn / Hiện lời giải &amp; đáp án</button>'}
      <button class="btn" onclick="const h=document.documentElement;h.setAttribute('data-theme',h.getAttribute('data-theme')==='dark'?'light':'dark')"><i class="fa-solid fa-circle-half-stroke"></i> Sáng / Tối</button>
      <button class="btn" onclick="window.print()"><i class="fa-solid fa-print"></i> In / Lưu PDF</button>
    </div>
  </div>
  <main class="container">${finalBodyHtml}</main>${embeddedSourceTag}
  <script>
    (function() {
      var p = new URLSearchParams(window.location.search);
      if (p.get('mode') === 'exam') {
        document.body.classList.remove('show-answers');
        var tb = document.querySelector('.toolbar');
        if (tb) tb.remove();
      }
    })();
    window.addEventListener('DOMContentLoaded', function() {
      if (typeof renderMathInElement === 'function') {
        renderMathInElement(document.body, {
          delimiters: [
            { left: '$$', right: '$$', display: true },
            { left: '\\\\[', right: '\\\\]', display: true },
            { left: '$', right: '$', display: false },
            { left: '\\\\(', right: '\\\\)', display: false }
          ],
          macros: ${macrosJson},
          ignoredTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code', 'option', 'svg'],
          ignoredClasses: ['tikzjax-wrapper', 'katex'],
          throwOnError: false,
          strict: false
        });
      }
    });
  </script>
</body>
</html>`;
  }
};

if (typeof window !== 'undefined') {
  window.TeXCompiler = TeXCompiler;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TeXCompiler;
}
