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

    // Thư viện TikZ khai báo trong preamble hoặc đầu đoạn mã TeX
    const declSource = info.preambleRaw || info.body;
    const libRegex = /\\usetikzlibrary\{([^}]+)\}/g;
    let m;
    while ((m = libRegex.exec(declSource)) !== null) {
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
    parseNewCommands(declSource);

    // \DeclareMathOperator(*){ \cmd }{ text }
    const opRe = /\\DeclareMathOperator(\*?)\s*/g;
    while ((m = opRe.exec(declSource)) !== null) {
      const isStar = m[1] === '*';
      const parsed = this.parseCommandArgs(declSource, m.index + m[0].length, 2, false);
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
    while ((m = defRe.exec(declSource)) !== null) {
      const name = m[1];
      if (name.includes('@') || BLOCKED_MACROS.has(name)) continue;
      const brace = this.extractBalanced(declSource, m.index + m[0].length - 1, '{', '}');
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
    s = s.replace(/\\vv\{/g, '\\vec{').replace(/\\(?:wideparen|arc)\{/g, '\\widehat{');
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
    if (/\\tkz(?:Def|Draw|Label|Mark|Inter|Calc|Get|Clip|Fill)/i.test(code)) pkgs.add('tkz-euclide');
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
    const mergedMacros = Object.assign({}, this.activeMacros, preambleInfo?.macros || {});
    Object.keys(mergedMacros).forEach((mName) => {
      if (!sanitized.includes(mName)) return;
      const mBody = this.sanitizeTikzSource(mergedMacros[mName]);
      const argNums = (mBody.match(/#[1-9]/g) || []).map(x => Number(x[1]));
      const argCount = argNums.length ? Math.max(...argNums) : 0;
      preambleParts.push(`\\providecommand{${mName}}${argCount ? `[${argCount}]` : ''}{${mBody}}`);
    });
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

  buildLoigiaiHtml(lgContentHtml, ansSummaryText = '', openByDefault = false) {
    if (!lgContentHtml && !ansSummaryText) return '';
    const ansBadge = ansSummaryText
      ? `<div class="tex-loigiai-ans-row mb-2"><span class="tex-loigiai-ans-badge"><i class="fa-solid fa-circle-check mr-1"></i>${ansSummaryText}</span></div>`
      : '';
    const detailBody = lgContentHtml
      ? `<div class="tex-loigiai-content">${lgContentHtml}</div>`
      : '';
    return `<details class="tex-loigiai mt-3.5"${openByDefault ? ' open' : ''}><summary class="tex-loigiai-summary"><span class="tex-loigiai-btn"><i class="fa-solid fa-lightbulb mr-1.5 text-amber-500"></i><span class="tex-lg-closed-txt">Xem lời giải chi tiết</span><span class="tex-lg-open-txt">Thu gọn lời giải</span><i class="fa-solid fa-chevron-down tex-lg-chevron ml-1.5 text-[10px]"></i></span></summary><div class="tex-loigiai-body">${ansBadge}${detailBody}</div></details>`;
  },

  isAlreadyCompiledHtml(str) {
    if (!str || typeof str !== 'string') return false;
    const withoutTikzScript = str.replace(/<script\s+type="text\/tikz"[\s\S]*?<\/script>/gi, '');
    const hasCompiledMarkup = /<(?:div|table|article|details|ul|ol|pre|blockquote|figure|h[1-4]|span)\b[^>]*class="[^"]*\b(?:tex-|math-svg-container)/i.test(withoutTikzScript);
    if (!hasCompiledMarkup) return false;
    return !/\\(?:begin\{(?:ex|bt|vd|cau|tikzpicture|circuitikz|tabular|tabularx|longtable|eqnarray|align|enumerate|itemize|listEX)\}|immini|choice|choiceTF|shortans|loigiai)/.test(withoutTikzScript);
  },

  // Bóc tách và render \choice, \choiceTF, \shortans tương tác trực tiếp bên trong môi trường bài tập
  compileExChoicesInDoc(blockText, compileInlineFn, qMeta = {}) {
    let s = blockText;
    let extraHtml = '';
    let ansSummary = '';
    const qId = qMeta.qId || 1;

    // 1. \choiceTF[...]{a}{b}{c}{d}
    const tfMatch = s.match(/\\choiceTF(?:\[[^\]]*\])?/);
    if (tfMatch) {
      const pos = tfMatch.index;
      const parsed = this.parseCommandArgs(s, pos + 9, 4, true);
      if (parsed) {
        const letters = ['a', 'b', 'c', 'd'];
        const ansParts = [];
        const itemsHtml = parsed.args.map((raw, idx) => {
          const isTrue = /\\True\b|\\true\b/.test(raw);
          const clean = raw.replace(/\\True\b|\\true\b/g, '').trim();
          ansParts.push(`${letters[idx]}) ${isTrue ? 'Đúng' : 'Sai'}`);
          return `<div class="tex-tf-item" data-part="p2" data-qid="${qId}" data-sub="${letters[idx]}" data-correct="${isTrue ? 'true' : 'false'}">
            <span class="tex-tf-label">${letters[idx]})</span>
            <div class="tex-tf-text flex-1 min-w-0">${compileInlineFn(clean)}</div>
            <div class="tex-tf-controls flex items-center gap-1 shrink-0">
              <button type="button" class="tex-tf-btn" data-tf-val="true">Đúng</button>
              <button type="button" class="tex-tf-btn" data-tf-val="false">Sai</button>
            </div>
            <span class="tex-ans-pill ${isTrue ? 'tex-ans-true' : 'tex-ans-false'}">${isTrue ? 'Đúng' : 'Sai'}</span>
          </div>`;
        }).join('');
        ansSummary = `Đáp án chuẩn: ${ansParts.join(' • ')}`;
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
        let corrLetter = '';
        const choicesHtml = parsed.args.map((raw, idx) => {
          const isTrue = /\\True\b|\\true\b/.test(raw);
          if (isTrue) corrLetter = letters[idx];
          const clean = raw.replace(/\\True\b|\\true\b/g, '').trim();
          return `<div class="tex-choice-item ${isTrue ? 'tex-choice-correct' : ''}" data-part="p1" data-qid="${qId}" data-choice="${letters[idx]}"${isTrue ? ' data-correct="1"' : ''}>
            <span class="tex-choice-letter">${letters[idx]}.</span>
            <span class="tex-choice-body flex-1 min-w-0">${compileInlineFn(clean)}</span>
          </div>`;
        }).join('');
        if (corrLetter) ansSummary = `Chọn đáp án ${corrLetter}`;
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
        const ansClean = parsed.args[0].replace(/^\$+|\$+$/g, '').replace(/\{,\}/g, ',').trim();
        ansSummary = `Đáp số chuẩn: ${this.escapeHtml(ansClean)}`;
        extraHtml += `<div class="tex-shortans-interact mt-3 flex flex-wrap items-center gap-2" data-part="p3" data-qid="${qId}" data-correct="${this.escapeAttr(ansClean)}">
          <label class="text-xs font-bold text-slate-600"><i class="fa-solid fa-keyboard mr-1 text-indigo-600"></i>Nhập đáp số:</label>
          <input type="text" maxlength="12" placeholder="Điền kết quả..." class="tex-shortans-input px-3 py-1.5 rounded-xl border border-slate-300 bg-white text-xs font-mono font-bold text-slate-800 w-36 focus:border-indigo-500 outline-none">
          <button type="button" class="tex-shortans-check-btn px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold cursor-pointer transition">Kiểm tra</button>
          <span class="tex-shortans-feedback text-xs font-bold"></span>
        </div>
        <div class="tex-shortans-box mt-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-amber-200 bg-amber-50/70 text-xs">
          <span class="font-bold text-amber-800"><i class="fa-solid fa-pen-to-square mr-1"></i>Đáp số trả lời ngắn:</span>
          <span class="tex-shortans-val font-mono font-extrabold text-amber-900 px-2 py-0.5 rounded bg-white border border-amber-300">${this.escapeHtml(ansClean)}</span>
        </div>`;
        s = s.slice(0, pos) + s.slice(parsed.endIdx);
      }
    }

    return { bodyRest: s, extraHtml, ansSummary };
  },

  // Biên dịch một đoạn/khối LaTeX sang HTML (dùng chung cho cả câu hỏi lẻ lẫn toàn bộ tài liệu .tex)
  compileFragment(rawTex, options = {}) {
    if (!rawTex || typeof rawTex !== 'string') return '';

    const isRoot = !options._vault;
    if (isRoot && this.isAlreadyCompiledHtml(rawTex)) {
      return rawTex.trim();
    }

    const preambleInfo = options.preambleInfo || null;
    const counters = options.counters || { ex: 0, bt: 0, vd: 0, dl: 0, dn: 0, dang: 0, section: 0, subsection: 0, chapter: 0, p1: 0, p2: 0, p3: 0 };
    if (counters.p1 === undefined) { counters.p1 = 0; counters.p2 = 0; counters.p3 = 0; }
    const openSolutions = Boolean(options.openSolutions);

    // Dùng chung 1 kho Vault xuyên suốt các lời gọi đệ quy để không bao giờ HTML-escape lại bảng/hình/công thức con
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

        // Tách \loigiai{...} trước khi phân tích lựa chọn
        let lgContent = '';
        const lgPos = body.indexOf('\\loigiai');
        if (lgPos !== -1) {
          const lgBox = this.extractBalanced(body, lgPos + 8, '{', '}');
          if (lgBox) {
            lgContent = this.compileFragment(lgBox.content.trim(), subOpts());
            body = body.slice(0, lgPos) + body.slice(lgBox.endIdx + 1);
          }
        }

        let qPart = '';
        let qId = 0;
        if (['ex', 'cau', 'bt', 'vd'].includes(key)) {
          if (body.includes('\\choiceTF')) qPart = 'p2';
          else if (body.includes('\\shortans')) qPart = 'p3';
          else qPart = 'p1';
          qId = ++counters[qPart];
        }

        const { bodyRest, extraHtml, ansSummary } = this.compileExChoicesInDoc(
          body,
          (frag) => this.compileFragment(frag, subOpts({ inlineQuestion: true })),
          { qPart, qId: qId || num || 1 }
        );

        const loigiaiHtml = this.buildLoigiaiHtml(lgContent, ansSummary, openSolutions);
        const compiledStem = this.compileFragment(bodyRest, subOpts({ inlineQuestion: true }));
        const optBadge = optTitle ? ` <span class="tex-env-opt">(${this.compileFragment(optTitle, subOpts({ inlineQuestion: true }))})</span>` : '';
        const headerLabel = `${meta.prefix}${num ? ' ' + num : ''}.${optBadge}`;
        const qAttrs = qPart ? ` data-qpart="${qPart}" data-qid="${qId}" id="html_q_${qPart}_${qId}"` : '';
        const statusSpan = qPart ? '<span class="tex-q-status hidden"></span>' : '';

        return putVault(`<article class="tex-env ${meta.cls} my-4"${qAttrs}><div class="tex-env-header"><span class="tex-env-badge"><i class="fa-solid ${meta.icon} mr-1.5"></i>${headerLabel}</span>${statusSpan}</div><div class="tex-env-body">${compiledStem}${extraHtml}${loigiaiHtml}</div></article>`);
      });
    }

    // Xử lý \loigiai{...} lẻ bên ngoài môi trường
    if (s.includes('\\loigiai')) {
      s = this.replaceCommand(s, 'loigiai', 1, true, (_opt, lgBody) => {
        const lgContent = this.compileFragment(lgBody, subOpts());
        return putVault(this.buildLoigiaiHtml(lgContent, '', openSolutions));
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

    // Bước 11: Loại bỏ các lệnh điều khiển trang / khai báo đầu snippet / file đáp án không hiển thị
    // Riêng \Opensolutionfile{ans}[Ans/Dapan] có tham số tùy chọn ở CUỐI sau {ans}
    s = s.replace(/\\Opensolutionfile\s*\{[^}]*\}\s*(?:\[[^\]]*\])?/gi, '');
    for (const defCmd of ['newcommand', 'renewcommand', 'providecommand', 'DeclareMathOperator']) {
      let defGuard = 0;
      const defRe = new RegExp(`\\\\${defCmd}\\*?`, 'g');
      let dm;
      while ((dm = defRe.exec(s)) !== null && defGuard++ < 30) {
        let p = dm.index + dm[0].length;
        while (p < s.length && /\s/.test(s[p])) p++;
        if (s[p] === '{') {
          const b1 = this.extractBalanced(s, p, '{', '}');
          if (!b1) break;
          p = b1.endIdx + 1;
        } else if (s[p] === '\\') {
          p++;
          while (p < s.length && /[A-Za-z@]/.test(s[p])) p++;
        } else break;
        while (p < s.length) {
          while (p < s.length && /\s/.test(s[p])) p++;
          if (s[p] === '[') {
            const optB = this.extractBalanced(s, p, '[', ']');
            if (!optB) break;
            p = optB.endIdx + 1;
          } else break;
        }
        if (s[p] === '{') {
          const b2 = this.extractBalanced(s, p, '{', '}');
          if (b2) {
            s = s.slice(0, dm.index) + s.slice(b2.endIdx + 1);
            defRe.lastIndex = dm.index;
          }
        }
      }
    }
    ['documentclass', 'usepackage', 'usetikzlibrary', 'geometry', 'pgfplotsset', 'title', 'author', 'date', 'Closesolutionfile', 'Readsolutionfile', 'pagestyle', 'thispagestyle', 'pagenumbering', 'bibliographystyle', 'input', 'include', 'label', 'ref', 'eqref'].forEach(cmd => {
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

    // Bảo vệ các thẻ HTML định dạng an toàn đã được biên dịch từ bước trước (giữ nguyên tính lũy đẳng mà vẫn escape "a < b")
    s = s.replace(/<\/?(?:strong|em|br|hr|p|ul|ol|li|div|span|table|thead|tbody|tr|td|th|article|details|summary|pre|code|blockquote|figure|figcaption|header|h[1-4]|i|button|input|label)(?:\s+(?:class|style|colspan|rowspan|open|type|maxlength|placeholder|data-[a-z0-9-]+)(?:="[^"]*")?)*\s*\/?>/gi, m => putVault(m));

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
    const openSolutions = Boolean(options.openSolutions);
    const docCls = openSolutions ? 'tex-doc reveal-all-answers' : 'tex-doc';

    // Đếm thống kê nhanh trên tài liệu
    const tikzCount = (body.match(/\\begin\{(?:tikzpicture|circuitikz)\}|\\chemfig/g) || []).length;
    const tableCount = (body.match(/\\begin\{(?:tabular|tabularx|longtable)\}/g) || []).length;
    const envExCount = (body.match(/\\begin\{(?:ex|bt|vd|cau)\}/gi) || []).length;
    const plainExCount = (body.match(/(?:\\textbf\{\s*(?:Câu|Bài)\s+\d+\s*[:.]?\s*\}|(?:^|\n)\s*(?:Câu|Bài)\s+\d+\s*[:.])/gi) || []).length;
    const exCount = envExCount || plainExCount;
    const mathCount = (body.match(/\$\$[\s\S]*?\$\$|\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\)|\\begin\{(?:eqnarray|align|gather|equation)\*?\}|\$[^$\n]+\$/g) || []).length;

    let html = '';
    const parserObj = (typeof TeXParser !== 'undefined' && TeXParser)
      ? TeXParser
      : (typeof require === 'function' ? (() => { try { return require('./tex_parser.js'); } catch (_) { return null; } })() : null);

    if (options.engine === 'latexjs' && typeof window !== 'undefined' && window.latexjs && tikzCount === 0 && !/\\(?:begin\{(?:ex|bt|vd|eqnarray)|immini|choice|loigiai|heva|hoac)/.test(body)) {
      try {
        const gen = new window.latexjs.HtmlGenerator({ hyphenate: false });
        const doc = window.latexjs.parse(rawTex, { generator: gen });
        const wrapper = document.createElement('div');
        wrapper.appendChild(doc.domFragment());
        html = `<div class="${docCls}">${wrapper.innerHTML}</div>`;
      } catch (_err) {
        html = `<div class="${docCls}">${this.compileFragment(body, { preambleInfo: preamble, alreadyStrippedComments: true, openSolutions })}</div>`;
      }
    } else if (
      envExCount === 0 &&
      plainExCount > 0 &&
      parserObj &&
      /\\(?:choice|choiceTF|shortans|loigiai)\b|(?:^|\n|\\\\)\s*\*?\s*(?:\\textbf\{|\\underline\{)?\*?[A-Da-d][.)]/m.test(body)
    ) {
      const parsedExam = parserObj.parse(rawTex, { title: preamble.title || '' });
      if ((parsedExam.part1.length + parsedExam.part2.length + parsedExam.part3.length) > 0) {
        html = this.compileExamDataFallbackHtml(parsedExam, { openSolutions, preambleInfo: preamble, hideTitle: !preamble.title });
      }
    }

    if (!html) {
      const compiledBody = this.compileFragment(body, {
        preambleInfo: preamble,
        alreadyStrippedComments: true,
        inlineQuestion: false,
        openSolutions
      });
      html = `<div class="${docCls}">${compiledBody}</div>`;
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

  // So sánh đáp số trả lời ngắn chuẩn hóa dấu phẩy/chấm & sai số số thực
  isShortAnsEqual(userVal, correctVal) {
    const norm = (v) => String(v ?? '').trim().replace(/\s+/g, '').replace(/,/g, '.');
    const u = norm(userVal);
    const c = norm(correctVal);
    if (!u || !c) return false;
    if (u.toLowerCase() === c.toLowerCase()) return true;
    const un = Number(u);
    const cn = Number(c);
    return Number.isFinite(un) && Number.isFinite(cn) && Math.abs(un - cn) < 1e-6;
  },

  // Gắn sự kiện tương tác trực tiếp trên câu hỏi HTML (hỗ trợ cả mode='practice' tự chấm và mode='exam' đồng bộ phiếu làm bài)
  bindInteractiveDom(rootEl, opts = {}) {
    if (!rootEl || typeof rootEl.addEventListener !== 'function') return;
    rootEl._texInteractOpts = Object.assign({ mode: 'practice' }, opts);
    if (rootEl._texInteractBound) return;
    rootEl._texInteractBound = true;

    const setStatusBadge = (card, text, tone) => {
      const st = card ? card.querySelector('.tex-q-status') : null;
      if (!st) return;
      if (!text) {
        st.textContent = '';
        st.className = 'tex-q-status hidden';
        return;
      }
      const clsMap = {
        right: 'tex-q-status tex-q-status-right',
        wrong: 'tex-q-status tex-q-status-wrong',
        info: 'tex-q-status tex-q-status-info'
      };
      st.className = clsMap[tone] || clsMap.info;
      st.textContent = text;
    };

    const evaluateShortAns = (wrap) => {
      if (!wrap) return;
      const inp = wrap.querySelector('.tex-shortans-input');
      const fb = wrap.querySelector('.tex-shortans-feedback');
      const card = wrap.closest('.tex-env');
      if (!inp) return;
      const val = inp.value.trim();
      const corr = wrap.dataset.correct;
      if (!val) {
        inp.classList.remove('is-right', 'is-wrong');
        if (fb) fb.textContent = '';
        setStatusBadge(card, '', '');
        return;
      }
      if (corr === undefined || corr === '') {
        setStatusBadge(card, `Đã điền: ${val}`, 'info');
        return;
      }
      const ok = this.isShortAnsEqual(val, corr);
      inp.classList.toggle('is-right', ok);
      inp.classList.toggle('is-wrong', !ok);
      if (fb) {
        fb.className = ok ? 'tex-shortans-feedback text-xs font-bold text-emerald-600' : 'tex-shortans-feedback text-xs font-bold text-rose-600';
        fb.textContent = ok ? 'Chính xác!' : `Chưa đúng (Đáp số: ${corr})`;
      }
      setStatusBadge(card, ok ? 'Chính xác' : `Sai • Đáp số: ${corr}`, ok ? 'right' : 'wrong');
    };

    rootEl.addEventListener('click', (e) => {
      if (e.target.closest('a')) return;
      const curOpts = rootEl._texInteractOpts || { mode: 'practice' };

      const choiceEl = e.target.closest('.tex-choice-item[data-choice]');
      if (choiceEl && rootEl.contains(choiceEl)) {
        const qId = Number(choiceEl.dataset.qid) || 1;
        const letter = choiceEl.dataset.choice;
        const grid = choiceEl.closest('.tex-choices-grid') || choiceEl.parentElement;
        const card = choiceEl.closest('.tex-env');
        if (grid) {
          grid.querySelectorAll('.tex-choice-item').forEach(el => {
            el.classList.remove('tex-choice-selected', 'tex-choice-user-right', 'tex-choice-user-wrong', 'tex-choice-reveal-correct');
          });
        }
        if (curOpts.mode === 'exam') {
          choiceEl.classList.add('tex-choice-selected');
          setStatusBadge(card, `Đã chọn ${letter}`, 'info');
          if (typeof curOpts.onPart1 === 'function') curOpts.onPart1(qId, letter);
        } else {
          const corrEl = grid ? grid.querySelector('.tex-choice-item[data-correct="1"]') : null;
          if (!corrEl) {
            choiceEl.classList.add('tex-choice-selected');
            setStatusBadge(card, `Đã chọn ${letter}`, 'info');
          } else if (choiceEl === corrEl) {
            choiceEl.classList.add('tex-choice-user-right');
            setStatusBadge(card, `Chính xác (${letter})`, 'right');
          } else {
            choiceEl.classList.add('tex-choice-user-wrong');
            corrEl.classList.add('tex-choice-reveal-correct');
            setStatusBadge(card, `Chưa đúng • Đáp án: ${corrEl.dataset.choice || ''}`, 'wrong');
          }
        }
        return;
      }

      const tfBtn = e.target.closest('.tex-tf-btn[data-tf-val]');
      if (tfBtn && rootEl.contains(tfBtn)) {
        const tfItem = tfBtn.closest('.tex-tf-item');
        if (!tfItem) return;
        const qId = Number(tfItem.dataset.qid) || 1;
        const sub = tfItem.dataset.sub || 'a';
        const valStr = tfBtn.dataset.tfVal;
        const boolVal = valStr === 'true';
        const card = tfItem.closest('.tex-env');

        tfItem.querySelectorAll('.tex-tf-btn').forEach(b => {
          b.classList.remove('is-selected-true', 'is-selected-false', 'is-right', 'is-wrong');
        });
        tfBtn.classList.add(boolVal ? 'is-selected-true' : 'is-selected-false');
        tfItem.dataset.userVal = valStr;

        if (curOpts.mode === 'exam') {
          const list = tfItem.closest('.tex-tf-list');
          const doneCnt = list ? list.querySelectorAll('.tex-tf-item[data-user-val]').length : 1;
          setStatusBadge(card, `Đã chọn ${doneCnt}/4 ý`, 'info');
          if (typeof curOpts.onPart2 === 'function') curOpts.onPart2(qId, sub, boolVal);
        } else if (tfItem.dataset.correct !== undefined) {
          const isRight = tfItem.dataset.correct === valStr;
          tfBtn.classList.add(isRight ? 'is-right' : 'is-wrong');
          tfItem.classList.toggle('tex-tf-row-right', isRight);
          tfItem.classList.toggle('tex-tf-row-wrong', !isRight);
          const list = tfItem.closest('.tex-tf-list');
          if (list) {
            const rows = Array.from(list.querySelectorAll('.tex-tf-item'));
            const answered = rows.filter(r => r.dataset.userVal !== undefined);
            const rightCnt = answered.filter(r => r.dataset.userVal === r.dataset.correct).length;
            setStatusBadge(card, `Đúng ${rightCnt}/${rows.length} ý (${answered.length}/${rows.length} đã chọn)`, rightCnt === rows.length ? 'right' : (rightCnt === answered.length ? 'info' : 'wrong'));
          }
        }
        return;
      }

      const checkBtn = e.target.closest('.tex-shortans-check-btn');
      if (checkBtn && rootEl.contains(checkBtn)) {
        evaluateShortAns(checkBtn.closest('.tex-shortans-interact'));
      }
    });

    rootEl.addEventListener('input', (e) => {
      const inp = e.target.closest('.tex-shortans-input');
      if (!inp || !rootEl.contains(inp)) return;
      const wrap = inp.closest('.tex-shortans-interact');
      const card = inp.closest('.tex-env');
      const curOpts = rootEl._texInteractOpts || { mode: 'practice' };
      if (curOpts.mode === 'exam') {
        const qId = Number(wrap?.dataset.qid) || 1;
        const cleanVal = inp.value.replace(/[^0-9.,\-/]/g, '').slice(0, 6);
        if (inp.value !== cleanVal) inp.value = cleanVal;
        setStatusBadge(card, cleanVal ? `Đáp số: ${cleanVal}` : '', 'info');
        if (typeof curOpts.onPart3 === 'function') curOpts.onPart3(qId, cleanVal);
      } else {
        inp.classList.remove('is-right', 'is-wrong');
        const fb = wrap ? wrap.querySelector('.tex-shortans-feedback') : null;
        if (fb) fb.textContent = '';
      }
    });

    rootEl.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return;
      const inp = e.target.closest('.tex-shortans-input');
      if (!inp || !rootEl.contains(inp)) return;
      const curOpts = rootEl._texInteractOpts || { mode: 'practice' };
      if (curOpts.mode !== 'exam') {
        e.preventDefault();
        evaluateShortAns(inp.closest('.tex-shortans-interact'));
      }
    });

    rootEl.addEventListener('toggle', (e) => {
      const det = e.target;
      if (det && det.classList && det.classList.contains('tex-loigiai') && det.open && typeof window !== 'undefined') {
        window.dispatchEvent(new Event('resize'));
      }
    }, true);
  },

  toggleAllSolutions(rootEl, forceOpen = null) {
    if (!rootEl) return false;
    const list = Array.from(rootEl.querySelectorAll('details.tex-loigiai'));
    const docEl = rootEl.classList?.contains('tex-doc') ? rootEl : rootEl.querySelector('.tex-doc');
    const nextOpen = forceOpen !== null
      ? Boolean(forceOpen)
      : (list.length ? list.some(d => !d.open) : !(docEl && docEl.classList.contains('reveal-all-answers')));
    list.forEach(d => { d.open = nextOpen; });
    if (docEl) docEl.classList.toggle('reveal-all-answers', nextOpen);
    return nextOpen;
  },

  resetPracticeState(rootEl) {
    if (!rootEl) return;
    rootEl.querySelectorAll('.tex-choice-selected, .tex-choice-user-right, .tex-choice-user-wrong, .tex-choice-reveal-correct').forEach(el => {
      el.classList.remove('tex-choice-selected', 'tex-choice-user-right', 'tex-choice-user-wrong', 'tex-choice-reveal-correct');
    });
    rootEl.querySelectorAll('.tex-tf-btn').forEach(btn => {
      btn.classList.remove('is-selected-true', 'is-selected-false', 'is-right', 'is-wrong');
    });
    rootEl.querySelectorAll('.tex-tf-item').forEach(row => {
      delete row.dataset.userVal;
      row.classList.remove('tex-tf-row-right', 'tex-tf-row-wrong');
    });
    rootEl.querySelectorAll('.tex-shortans-input').forEach(inp => {
      inp.value = '';
      inp.classList.remove('is-right', 'is-wrong');
    });
    rootEl.querySelectorAll('.tex-shortans-feedback').forEach(fb => {
      fb.textContent = '';
      fb.className = 'tex-shortans-feedback text-xs font-bold';
    });
    rootEl.querySelectorAll('.tex-q-status').forEach(st => {
      st.textContent = '';
      st.className = 'tex-q-status hidden';
    });
    this.toggleAllSolutions(rootEl, false);
  },

  // Loại bỏ hoàn toàn dấu vết đáp án & lời giải khỏi HTML khi hiển thị hoặc tải đề trong giờ thi
  stripHtmlAnswers(html) {
    if (!html) return '';
    return String(html)
      .replace(/<details\s+[^>]*\btex-loigiai\b[^>]*>[\s\S]*?<\/details>/gi, '')
      .replace(/<div\s+[^>]*\btex-shortans-box\b[^>]*>[\s\S]*?<\/div>/gi, '')
      .replace(/<button\s+[^>]*\btex-shortans-check-btn\b[^>]*>[\s\S]*?<\/button>/gi, '')
      .replace(/<span\s+[^>]*\btex-shortans-feedback\b[^>]*>[\s\S]*?<\/span>/gi, '')
      .replace(/<span\s+[^>]*\btex-ans-pill\b[^>]*>[\s\S]*?<\/span>/gi, '')
      .replace(/\sdata-correct="[^"]*"/gi, '')
      .replace(/\btex-choice-correct\b/g, '')
      .replace(/\breveal-all-answers\b/g, '');
  },

  // Bóc tách mã nguồn TeX nhúng sẵn từ file .html đã xuất bởi hệ thống (nếu có)
  extractTexFromHtml(htmlText) {
    if (!htmlText) return '';
    const m = String(htmlText).match(/<script\s+type="application\/x-tex-source"\s+id="texSourceEmbed">([\s\S]*?)<\/script>/i);
    if (!m) return '';
    return m[1].replace(/<\\\/script/gi, '</script').trim();
  },

  // Tạo tài liệu HTML tương tác chuẩn từ dữ liệu câu hỏi 3 phần (dự phòng khi đề thi không lưu đầy đủ raw_tex)
  compileExamDataFallbackHtml(ex, options = {}) {
    if (!ex) return '<div class="tex-doc"></div>';
    const openSolutions = Boolean(options.openSolutions);
    const preambleInfo = options.preambleInfo || (ex.tex_macros ? { macros: ex.tex_macros, tikzLibs: [], packages: [] } : null);
    const renderQ = (frag) => this.compileFragment(String(frag || ''), { inlineQuestion: true, preambleInfo });
    let partsHtml = options.hideTitle
      ? ''
      : `<div class="tex-maketitle text-center my-4 pb-3 border-b border-slate-200"><h1 class="text-xl font-extrabold text-slate-900">${this.escapeHtml(ex.title || 'Đề Thi Môn Toán')}</h1></div>`;

    if (Array.isArray(ex.part1) && ex.part1.length > 0) {
      partsHtml += `<h2 class="tex-section-heading mt-5 mb-2.5">PHẦN I. Câu trắc nghiệm nhiều phương án lựa chọn</h2>`;
      ex.part1.forEach(q => {
        const letters = ['A', 'B', 'C', 'D'];
        const corrLetter = q.correct_answer || '';
        const choicesHtml = `<div class="tex-choices-grid tex-choices-cols-2 mt-3">${(q.choices || []).map((c, idx) => {
          const letter = letters[idx] || '';
          const isCorr = corrLetter === letter;
          const cleanChoice = String(c || '').replace(/^[A-D][.:]\s*/, '');
          return `<div class="tex-choice-item ${isCorr ? 'tex-choice-correct' : ''}" data-part="p1" data-qid="${q.id}" data-choice="${letter}"${isCorr ? ' data-correct="1"' : ''}><span class="tex-choice-letter">${letter}.</span><span class="tex-choice-body flex-1 min-w-0">${renderQ(cleanChoice)}</span></div>`;
        }).join('')}</div>`;
        const ansSummary = corrLetter ? `Chọn đáp án ${corrLetter}` : '';
        const lgHtml = this.buildLoigiaiHtml(q.explanation ? renderQ(q.explanation) : '', ansSummary, openSolutions);
        partsHtml += `<article class="tex-env tex-env-ex my-4" data-qpart="p1" data-qid="${q.id}" id="html_q_p1_${q.id}"><div class="tex-env-header"><span class="tex-env-badge"><i class="fa-solid fa-circle-question mr-1.5"></i>Câu ${q.id}.</span><span class="tex-q-status hidden"></span></div><div class="tex-env-body">${renderQ(q.content)}${choicesHtml}${lgHtml}</div></article>`;
      });
    }

    if (Array.isArray(ex.part2) && ex.part2.length > 0) {
      partsHtml += `<h2 class="tex-section-heading mt-5 mb-2.5">PHẦN II. Câu trắc nghiệm Đúng / Sai</h2>`;
      ex.part2.forEach(q => {
        const stList = q.statements || q.items || [];
        const ansParts = [];
        const tfHtml = `<div class="tex-tf-list space-y-1.5 mt-3">${stList.map((st, idx) => {
          const subId = st.sub_id || st.key || ['a', 'b', 'c', 'd'][idx] || '';
          const hasKey = st.correct !== undefined && st.correct !== null;
          const isTrue = Boolean(st.correct);
          if (hasKey) ansParts.push(`${subId}) ${isTrue ? 'Đúng' : 'Sai'}`);
          const badge = `<span class="tex-ans-pill ${isTrue ? 'tex-ans-true' : 'tex-ans-false'}">${isTrue ? 'Đúng' : 'Sai'}</span>`;
          return `<div class="tex-tf-item" data-part="p2" data-qid="${q.id}" data-sub="${subId}"${hasKey ? ` data-correct="${isTrue ? 'true' : 'false'}"` : ''}><span class="tex-tf-label">${subId})</span><div class="tex-tf-text flex-1 min-w-0">${renderQ(st.text)}</div><div class="tex-tf-controls flex items-center gap-1 shrink-0"><button type="button" class="tex-tf-btn" data-tf-val="true">Đúng</button><button type="button" class="tex-tf-btn" data-tf-val="false">Sai</button></div>${badge}</div>`;
        }).join('')}</div>`;
        const ansSummary = ansParts.length ? `Đáp án chuẩn: ${ansParts.join(' • ')}` : '';
        const lgHtml = this.buildLoigiaiHtml(q.explanation ? renderQ(q.explanation) : '', ansSummary, openSolutions);
        partsHtml += `<article class="tex-env tex-env-ex my-4" data-qpart="p2" data-qid="${q.id}" id="html_q_p2_${q.id}"><div class="tex-env-header"><span class="tex-env-badge"><i class="fa-solid fa-circle-question mr-1.5"></i>Câu ${q.id}.</span><span class="tex-q-status hidden"></span></div><div class="tex-env-body">${renderQ(q.content)}${tfHtml}${lgHtml}</div></article>`;
      });
    }

    if (Array.isArray(ex.part3) && ex.part3.length > 0) {
      partsHtml += `<h2 class="tex-section-heading mt-5 mb-2.5">PHẦN III. Câu trắc nghiệm trả lời ngắn</h2>`;
      ex.part3.forEach(q => {
        const hasAns = q.correct_answer !== undefined && q.correct_answer !== null && String(q.correct_answer).trim() !== '';
        const ansClean = hasAns ? String(q.correct_answer).trim() : '';
        const interactHtml = `<div class="tex-shortans-interact mt-3 flex flex-wrap items-center gap-2" data-part="p3" data-qid="${q.id}"${hasAns ? ` data-correct="${this.escapeAttr(ansClean)}"` : ''}><label class="text-xs font-bold text-slate-600"><i class="fa-solid fa-keyboard mr-1 text-indigo-600"></i>Nhập đáp số:</label><input type="text" maxlength="12" placeholder="Điền kết quả..." class="tex-shortans-input px-3 py-1.5 rounded-xl border border-slate-300 bg-white text-xs font-mono font-bold text-slate-800 w-36 focus:border-indigo-500 outline-none"><button type="button" class="tex-shortans-check-btn px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold cursor-pointer transition">Kiểm tra</button><span class="tex-shortans-feedback text-xs font-bold"></span></div>`;
        const ansHtml = hasAns
          ? `<div class="tex-shortans-box mt-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-amber-200 bg-amber-50/70 text-xs"><span class="font-bold text-amber-800"><i class="fa-solid fa-pen-to-square mr-1"></i>Đáp số trả lời ngắn:</span><span class="tex-shortans-val font-mono font-extrabold text-amber-900 px-2 py-0.5 rounded bg-white border border-amber-300">${this.escapeHtml(ansClean)}</span></div>`
          : '';
        const ansSummary = hasAns ? `Đáp số chuẩn: ${this.escapeHtml(ansClean)}` : '';
        const lgHtml = this.buildLoigiaiHtml(q.explanation ? renderQ(q.explanation) : '', ansSummary, openSolutions);
        partsHtml += `<article class="tex-env tex-env-ex my-4" data-qpart="p3" data-qid="${q.id}" id="html_q_p3_${q.id}"><div class="tex-env-header"><span class="tex-env-badge"><i class="fa-solid fa-circle-question mr-1.5"></i>Câu ${q.id}.</span><span class="tex-q-status hidden"></span></div><div class="tex-env-body">${renderQ(q.content)}${interactHtml}${ansHtml}${lgHtml}</div></article>`;
      });
    }

    return `<div class="tex-doc${openSolutions ? ' reveal-all-answers' : ''}">${partsHtml}</div>`;
  },

  // Xuất file .html độc lập hoàn chỉnh (nhúng CDN KaTeX + mhchem + @rod2ik/tikzjax + CSS + tương tác tự kiểm tra & xem lời giải từng câu)
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
    window.toggleStandaloneSolutions = function() {
      var list = Array.prototype.slice.call(document.querySelectorAll('details.tex-loigiai'));
      var doc = document.querySelector('.tex-doc');
      var nextOpen = list.length ? list.some(function(d){ return !d.open; }) : !(doc && doc.classList.contains('reveal-all-answers'));
      list.forEach(function(d){ d.open = nextOpen; });
      if (doc) doc.classList.toggle('reveal-all-answers', nextOpen);
    };
    window.resetStandalonePractice = function() {
      document.querySelectorAll('.tex-choice-selected,.tex-choice-user-right,.tex-choice-user-wrong,.tex-choice-reveal-correct').forEach(function(el){
        el.classList.remove('tex-choice-selected','tex-choice-user-right','tex-choice-user-wrong','tex-choice-reveal-correct');
      });
      document.querySelectorAll('.tex-tf-btn').forEach(function(b){ b.classList.remove('is-selected-true','is-selected-false','is-right','is-wrong'); });
      document.querySelectorAll('.tex-shortans-input').forEach(function(i){ i.value=''; i.classList.remove('is-right','is-wrong'); });
      document.querySelectorAll('.tex-shortans-feedback,.tex-q-status').forEach(function(s){ s.textContent=''; });
      document.querySelectorAll('details.tex-loigiai').forEach(function(d){ d.open = false; });
      var doc = document.querySelector('.tex-doc');
      if (doc) doc.classList.remove('reveal-all-answers');
    };
    window.addEventListener('DOMContentLoaded', function() {
      var p = new URLSearchParams(window.location.search);
      if (p.get('mode') === 'exam') {
        var tb = document.querySelector('.toolbar');
        if (tb) tb.remove();
      }
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
      document.body.addEventListener('click', function(e) {
        var c = e.target.closest('.tex-choice-item[data-choice]');
        if (c) {
          var g = c.closest('.tex-choices-grid') || c.parentElement;
          g.querySelectorAll('.tex-choice-item').forEach(function(el){ el.classList.remove('tex-choice-selected','tex-choice-user-right','tex-choice-user-wrong','tex-choice-reveal-correct'); });
          var corr = g.querySelector('.tex-choice-item[data-correct="1"]');
          if (!corr) c.classList.add('tex-choice-selected');
          else if (c === corr) c.classList.add('tex-choice-user-right');
          else { c.classList.add('tex-choice-user-wrong'); corr.classList.add('tex-choice-reveal-correct'); }
          return;
        }
        var tf = e.target.closest('.tex-tf-btn[data-tf-val]');
        if (tf) {
          var row = tf.closest('.tex-tf-item');
          row.querySelectorAll('.tex-tf-btn').forEach(function(b){ b.classList.remove('is-selected-true','is-selected-false','is-right','is-wrong'); });
          tf.classList.add(tf.dataset.tfVal === 'true' ? 'is-selected-true' : 'is-selected-false');
          if (row.dataset.correct !== undefined) tf.classList.add(row.dataset.correct === tf.dataset.tfVal ? 'is-right' : 'is-wrong');
          return;
        }
        var chk = e.target.closest('.tex-shortans-check-btn');
        if (chk) {
          var w = chk.closest('.tex-shortans-interact');
          var inp = w && w.querySelector('.tex-shortans-input');
          var fb = w && w.querySelector('.tex-shortans-feedback');
          if (!inp || !w.dataset.correct) return;
          var u = inp.value.trim().replace(/\\s+/g,'').replace(/,/g,'.');
          var k = w.dataset.correct.trim().replace(/\\s+/g,'').replace(/,/g,'.');
          var ok = u && (u.toLowerCase() === k.toLowerCase() || (isFinite(Number(u)) && isFinite(Number(k)) && Math.abs(Number(u)-Number(k)) < 1e-6));
          inp.classList.toggle('is-right', Boolean(ok));
          inp.classList.toggle('is-wrong', !ok);
          if (fb) fb.textContent = ok ? 'Chính xác!' : ('Chưa đúng (Đáp số: ' + w.dataset.correct + ')');
        }
      });
    });
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
    .tex-env-header { margin-bottom: 0.45rem; display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; flex-wrap: wrap; }
    .tex-env-badge { display: inline-flex; align-items: center; font-weight: 800; font-size: 0.85rem; color: var(--accent); background: var(--accent-soft); padding: 0.2rem 0.65rem; border-radius: 0.5rem; }
    .tex-choices-grid { display: grid; gap: 0.5rem; margin-top: 0.75rem; grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .tex-choices-cols-1 { grid-template-columns: 1fr; }
    .tex-choices-cols-4 { grid-template-columns: repeat(4, minmax(0, 1fr)); }
    .tex-choice-item { padding: 0.5rem 0.75rem; border: 1.5px solid var(--border); border-radius: 0.65rem; display: flex; gap: 0.45rem; cursor: pointer; transition: all 0.15s; }
    .tex-choice-item:hover { border-color: var(--accent); }
    .tex-choice-selected { border-color: var(--accent); background: var(--accent-soft); font-weight: 700; }
    .tex-choice-user-right, .tex-doc.reveal-all-answers .tex-choice-correct, .tex-choice-reveal-correct { border-color: #10b981; background: rgba(16,185,129,0.12); font-weight: 700; }
    .tex-choice-user-wrong { border-color: #f43f5e; background: rgba(244,63,94,0.1); }
    .tex-choice-letter, .tex-tf-label, .tex-li-marker { font-weight: 800; color: var(--accent); flex-shrink: 0; }
    .tex-tf-item { display: flex; align-items: center; gap: 0.5rem; padding: 0.45rem 0.7rem; border: 1px solid var(--border); border-radius: 0.65rem; margin-top: 0.4rem; }
    .tex-tf-text { flex: 1; min-width: 0; }
    .tex-tf-controls { display: flex; gap: 0.3rem; flex-shrink: 0; }
    .tex-tf-btn { border: 1px solid var(--border); background: var(--card); color: var(--muted); border-radius: 0.45rem; padding: 0.2rem 0.55rem; font-size: 0.75rem; font-weight: 700; cursor: pointer; }
    .tex-tf-btn.is-selected-true, .tex-tf-btn.is-right { border-color: #10b981; background: #d1fae5; color: #065f46; }
    .tex-tf-btn.is-selected-false { border-color: var(--accent); background: var(--accent-soft); color: var(--accent); }
    .tex-tf-btn.is-wrong { border-color: #f43f5e; background: #ffe4e6; color: #9f1239; }
    .tex-shortans-interact { display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem; margin-top: 0.75rem; }
    .tex-shortans-input { padding: 0.35rem 0.65rem; border: 1.5px solid var(--border); border-radius: 0.55rem; font-family: monospace; font-weight: 700; width: 9rem; background: var(--card); color: var(--text); }
    .tex-shortans-input.is-right { border-color: #10b981; background: rgba(16,185,129,0.1); }
    .tex-shortans-input.is-wrong { border-color: #f43f5e; background: rgba(244,63,94,0.08); }
    .tex-shortans-check-btn { border: 0; background: var(--accent); color: #fff; padding: 0.38rem 0.8rem; border-radius: 0.55rem; font-size: 0.78rem; font-weight: 700; cursor: pointer; }
    .tex-ans-pill, .tex-shortans-box { display: none; }
    .tex-doc.reveal-all-answers .tex-ans-pill { display: inline-block; font-size: 0.72rem; font-weight: 800; padding: 0.1rem 0.5rem; border-radius: 999px; }
    .tex-ans-true { background: #d1fae5; color: #065f46; } .tex-ans-false { background: #ffe4e6; color: #9f1239; }
    .tex-doc.reveal-all-answers .tex-shortans-box { display: inline-flex; margin-top: 0.65rem; gap: 0.4rem; font-size: 0.85rem; font-weight: 700; }
    .tex-loigiai { margin-top: 0.85rem; border-top: 1px dashed var(--border); padding-top: 0.65rem; }
    .tex-loigiai-summary { list-style: none; cursor: pointer; display: inline-flex; }
    .tex-loigiai-summary::-webkit-details-marker { display: none; }
    .tex-loigiai-btn { display: inline-flex; align-items: center; gap: 0.35rem; padding: 0.35rem 0.8rem; border-radius: 999px; border: 1px solid #a7f3d0; background: #ecfdf5; color: #047857; font-weight: 700; font-size: 0.8rem; }
    .tex-loigiai .tex-lg-open-txt { display: none; }
    .tex-loigiai[open] .tex-lg-closed-txt { display: none; }
    .tex-loigiai[open] .tex-lg-open-txt { display: inline; }
    .tex-loigiai[open] .tex-lg-chevron { transform: rotate(180deg); }
    .tex-loigiai-body { margin-top: 0.65rem; padding: 0.85rem 1rem; border-radius: 0.85rem; border: 1px solid #a7f3d0; background: rgba(16,185,129,0.05); }
    .tex-loigiai-ans-badge { display: inline-flex; align-items: center; padding: 0.2rem 0.65rem; border-radius: 999px; background: #10b981; color: #fff; font-size: 0.78rem; font-weight: 800; }
    .tex-list { list-style: none; padding-left: 0.25rem; margin: 0.5rem 0; }
    .tex-li { display: flex; align-items: flex-start; gap: 0.5rem; margin: 0.25rem 0; }
    .tex-circlenum { display: inline-flex; width: 1.35rem; height: 1.35rem; border-radius: 999px; border: 1.5px solid currentColor; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 700; }
    .katex-display { overflow-x: auto; overflow-y: hidden; }
    @media (max-width: 640px) { .container { padding: 1.1rem; margin: 0.5rem; } .tex-choices-grid { grid-template-columns: 1fr; } }
    @media print { .toolbar { display: none !important; } .container { border: 0; box-shadow: none; margin: 0; max-width: 100%; } }
  </style>
</head>
<body>
  <div class="toolbar">
    <div class="toolbar-title"><i class="fa-solid fa-book-open-reader" style="margin-right:6px;color:var(--accent)"></i>${this.escapeHtml(docTitle)}</div>
    <div class="toolbar-actions">
      ${lockAnswers ? '' : '<button class="btn" onclick="toggleStandaloneSolutions()"><i class="fa-solid fa-lightbulb"></i> Mở / Thu gọn tất cả lời giải</button><button class="btn" onclick="resetStandalonePractice()"><i class="fa-solid fa-rotate-left"></i> Làm lại câu hỏi</button>'}
      <button class="btn" onclick="const h=document.documentElement;h.setAttribute('data-theme',h.getAttribute('data-theme')==='dark'?'light':'dark')"><i class="fa-solid fa-circle-half-stroke"></i> Sáng / Tối</button>
      <button class="btn" onclick="window.print()"><i class="fa-solid fa-print"></i> In / Lưu PDF</button>
    </div>
  </div>
  <main class="container">${finalBodyHtml}</main>${embeddedSourceTag}
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
