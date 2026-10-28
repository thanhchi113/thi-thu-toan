// TeXCompiler: Bộ biên dịch LaTeX (.tex bất kì) sang HTML tương tác trên trình duyệt
// Kết hợp Tiền xử lý LaTeX/ex_test Việt Nam + KaTeX (mhchem) + @rod2ik/tikzjax (WASM TikZ/tkz-tab/pgfplots) + latex.js

const TeXCompiler = {
  // Kho lưu cấu hình preamble tùy chỉnh trích xuất từ các file .tex đã biên dịch
  activeMacros: {},
  activeTikzLibraries: [],
  activeTexPackages: [],
  activeTikzPreamble: [],
  activeColors: {},

  // Macro Toán học & ex_test phổ biến tại Việt Nam cho KaTeX
  DEFAULT_KATEX_MACROS: {
    '\\R': '\\mathbb{R}',
    '\\N': '\\mathbb{N}',
    '\\Z': '\\mathbb{Z}',
    '\\Q': '\\mathbb{Q}',
    '\\C': '\\mathbb{C}',
    '\\K': '\\mathbb{K}',
    '\\mathds': '\\mathbb{#1}',
    '\\vv': '\\overrightarrow{#1}',
    '\\wideparen': '\\overset{\\frown}{#1}',
    '\\arc': '\\overset{\\frown}{#1}',
    '\\overarc': '\\overset{\\frown}{#1}',
    '\\abs': '\\left|#1\\right|',
    '\\norm': '\\left\\|#1\\right\\|',
    '\\ceil': '\\left\\lceil #1 \\right\\rceil',
    '\\floor': '\\left\\lfloor #1 \\right\\rfloor',
    '\\va': '\\vec{#1}',
    '\\vb': '\\mathbf{#1}',
    '\\vu': '\\hat{\\mathbf{#1}}',
    '\\dv': '\\frac{\\mathrm{d}#1}{\\mathrm{d}#2}',
    '\\pdv': '\\frac{\\partial #1}{\\partial #2}',
    '\\bra': '\\left\\langle #1 \\right|',
    '\\ket': '\\left| #1 \\right\\rangle',
    '\\eval': '\\left.#1\\right|',
    '\\d': '\\mathrm{d}',
    '\\dx': '\\,\\mathrm{d}x',
    '\\dy': '\\,\\mathrm{d}y',
    '\\dt': '\\,\\mathrm{d}t',
    '\\varparallel': '\\parallel',
    '\\coloneqq': '\\mathrel{:=}',
    '\\eqqcolon': '\\mathrel{=:}',
    '\\degree': '^\\circ',
    '\\ang': '#1^\\circ',
    '\\True': '',
    '\\true': '',
    '\\False': '',
    '\\false': '',
    '\\indam': '\\mathbf{#1}',
    '\\iff': '\\Longleftrightarrow',
    '\\implies': '\\Longrightarrow'
  },

  // Bảng màu chuẩn xcolor + Khaibao/ex_test phục vụ nội suy màu (VD: blue!75!black, \maincolor)
  BASE_XCOLORS: {
    black: [0, 0, 0],
    white: [255, 255, 255],
    red: [220, 38, 38],
    green: [22, 163, 74],
    blue: [37, 99, 235],
    cyan: [6, 182, 212],
    magenta: [217, 70, 239],
    yellow: [234, 179, 8],
    orange: [234, 88, 12],
    violet: [124, 58, 237],
    purple: [147, 51, 234],
    brown: [146, 64, 14],
    lime: [132, 204, 22],
    olive: [101, 163, 13],
    pink: [236, 72, 153],
    teal: [13, 148, 136],
    darkgray: [64, 64, 64],
    gray: [128, 128, 128],
    lightgray: [191, 191, 191],
    darkblue: [41, 84, 163],
    lightblue: [74, 155, 202],
    chuy: [230, 126, 34],
    mau1: [41, 84, 163],
    colexam: [185, 28, 28],
    '\\maincolor': [30, 64, 175],
    '\\maudo': [185, 28, 28],
    '\\mauvang': [217, 119, 6],
    '\\mauxanh': [13, 148, 136]
  },

  // Danh sách các gói .sty có thật trong WebAssembly @rod2ik/tikzjax@1.6.0 (tránh lỗi File .sty not found)
  SUPPORTED_TIKZ_PACKAGES: new Set([
    'amsmath', 'amssymb', 'amsfonts', 'amsbsy', 'amstext', 'amsopn', 'mathtools',
    'array', 'bm', 'braids', 'calc', 'cancel', 'chemfig', 'chemgreek', 'circuitikz',
    'etoolbox', 'hf-tikz', 'ifthen', 'kinematikz', 'listofitems', 'mhchem',
    'pgfcalendar', 'pgfopts', 'pgfplots', 'pgf-spectra', 'physics',
    'tikz-3dplot', 'tikz-cd', 'tikz-feynhand', 'tkz-tab',
    'xparse', 'xpatch', 'xstring', 'yquant'
  ]),

  getKaTeXMacros(extra = {}) {
    return Object.assign({}, this.DEFAULT_KATEX_MACROS, this.activeMacros, extra || {});
  },

  registerMacros(macros) {
    if (macros && typeof macros === 'object') {
      Object.assign(this.activeMacros, macros);
    }
  },

  registerPreamble(info) {
    if (!info || typeof info !== 'object') return;
    if (info.macros) this.registerMacros(info.macros);
    if (Array.isArray(info.tikzLibraries)) {
      info.tikzLibraries.forEach(l => {
        if (l && !this.activeTikzLibraries.includes(l)) this.activeTikzLibraries.push(l);
      });
    }
    if (Array.isArray(info.texPackages)) {
      info.texPackages.forEach(p => {
        if (p && !this.activeTexPackages.includes(p)) this.activeTexPackages.push(p);
      });
    }
    if (Array.isArray(info.tikzPreamble)) {
      info.tikzPreamble.forEach(line => {
        if (line && !this.activeTikzPreamble.includes(line)) this.activeTikzPreamble.push(line);
      });
    }
    if (info.colors && typeof info.colors === 'object') {
      Object.assign(this.activeColors, info.colors);
    }
  },

  parseColorSpecToRgb(model, spec, customMap = {}) {
    const m = String(model || '').trim();
    const parts = String(spec || '').split(',').map(x => parseFloat(x.trim()));
    if (m === 'RGB' && parts.length >= 3) {
      return parts.slice(0, 3).map(v => Math.max(0, Math.min(255, Math.round(v || 0))));
    }
    if (m === 'rgb' && parts.length >= 3) {
      return parts.slice(0, 3).map(v => Math.max(0, Math.min(255, Math.round((v || 0) * 255))));
    }
    if ((m === 'HTML' || m === 'html') && /^[0-9A-Fa-f]{6}$/.test(String(spec || '').trim())) {
      const hex = String(spec).trim();
      return [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)];
    }
    if (m === 'gray' && parts.length >= 1) {
      const g = Math.max(0, Math.min(255, Math.round((parts[0] || 0) * 255)));
      return [g, g, g];
    }
    if (m === 'cmyk' && parts.length >= 4) {
      const [c, yM, y, k] = parts;
      return [
        Math.round(255 * (1 - Math.min(1, c || 0)) * (1 - Math.min(1, k || 0))),
        Math.round(255 * (1 - Math.min(1, yM || 0)) * (1 - Math.min(1, k || 0))),
        Math.round(255 * (1 - Math.min(1, y || 0)) * (1 - Math.min(1, k || 0)))
      ];
    }
    return this.resolveColorRgb(spec, customMap);
  },

  resolveColorRgb(expr, customMap = {}, depth = 0) {
    if (!expr || depth > 5) return null;
    let s = String(expr).trim();
    if (!s) return null;
    const merged = Object.assign({}, this.BASE_XCOLORS, this.activeColors, customMap);
    if (merged[s]) {
      return Array.isArray(merged[s]) ? merged[s] : this.resolveColorRgb(merged[s], customMap, depth + 1);
    }
    const lower = s.toLowerCase();
    if (merged[lower]) {
      return Array.isArray(merged[lower]) ? merged[lower] : this.resolveColorRgb(merged[lower], customMap, depth + 1);
    }
    // Hỗ trợ cú pháp trộn màu xcolor: blue!75!black, \maincolor!80!white, black!10
    if (s.includes('!')) {
      const tokens = s.split('!').map(t => t.trim()).filter(Boolean);
      let curr = this.resolveColorRgb(tokens[0], customMap, depth + 1) || [30, 64, 175];
      let idx = 1;
      while (idx < tokens.length) {
        const pct = Math.max(0, Math.min(100, parseFloat(tokens[idx]))) / 100;
        if (Number.isNaN(pct)) break;
        const nextName = tokens[idx + 1] || 'white';
        const nextRgb = this.resolveColorRgb(nextName, customMap, depth + 1) || [255, 255, 255];
        curr = [
          Math.round(curr[0] * pct + nextRgb[0] * (1 - pct)),
          Math.round(curr[1] * pct + nextRgb[1] * (1 - pct)),
          Math.round(curr[2] * pct + nextRgb[2] * (1 - pct))
        ];
        idx += 2;
      }
      return curr;
    }
    return null;
  },

  resolveLaTeXColor(expr, preambleInfo = null) {
    if (!expr) return 'inherit';
    const raw = String(expr).trim();
    if (/^#[0-9A-Fa-f]{3,8}$|^rgb\(/i.test(raw)) return raw;
    const rgb = this.resolveColorRgb(raw, preambleInfo?.colors || {});
    if (rgb) return `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
    return /^[A-Za-z]+$/.test(raw) ? raw : 'inherit';
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

  // Bóc tách Preamble: gói lệnh (\usepackage), thư viện TikZ, màu sắc (\definecolor/\colorlet), \tikzset, macro Toán & tiêu đề
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
      tikzPreamble: [],
      colors: {},
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

    const stripInternalBlocks = (src) => String(src || '')
      .replace(/\\ExplSyntaxOn[\s\S]*?\\ExplSyntaxOff/g, '')
      .replace(/\\makeatletter[\s\S]*?\\makeatother/g, '');

    const rawDeclSource = stripInternalBlocks(info.preambleRaw || info.body.slice(0, 4000));
    const scanSource = stripInternalBlocks(info.preambleRaw + '\n' + info.body.slice(0, 3000));

    // Metadata: \title, \author, \date
    ['title', 'author', 'date'].forEach(field => {
      const pos = scanSource.indexOf('\\' + field);
      if (pos !== -1 && !/[A-Za-z@]/.test(scanSource[pos + field.length + 1] || '')) {
        const b = this.extractBalanced(scanSource, pos + field.length + 1, '{', '}');
        if (b) info[field] = b.content.trim();
      }
    });

    // Nhận diện \usepackage[opt]{pkg1,pkg2} & \RequirePackage[opt]{pkg1,pkg2}
    const pkgRegex = /\\(?:usepackage|RequirePackage)(?:\[[^\]]*\])?\{([^}]+)\}/g;
    let m;
    while ((m = pkgRegex.exec(rawDeclSource)) !== null) {
      m[1].split(',').map(x => x.trim().replace(/^.*\//, '')).filter(Boolean).forEach(pkg => {
        if (!info.texPackages.includes(pkg)) info.texPackages.push(pkg);
      });
    }

    // Nhận diện \usetikzlibrary{...} (kể cả khai báo đầu file con không có \begin{document})
    const fullLibScan = stripInternalBlocks((info.preambleRaw || '') + '\n' + info.body);
    const libRegex = /\\usetikzlibrary\{([^}]+)\}/g;
    while ((m = libRegex.exec(fullLibScan)) !== null) {
      m[1].split(',').map(x => x.trim()).filter(Boolean).forEach(lib => {
        if (!info.tikzLibraries.includes(lib)) info.tikzLibraries.push(lib);
      });
    }

    const compatMatch = rawDeclSource.match(/\\pgfplotsset\{[^}]*compat\s*=\s*([0-9.]+|newest)/);
    if (compatMatch) info.pgfplotsCompat = compatMatch[1];

    // Nhận diện màu tùy chỉnh: \definecolor{name}{model}{spec}, \providecolor, \colorlet{name}{expr}
    const defColorRe = /\\(?:define|provide)color\b/g;
    while ((m = defColorRe.exec(fullLibScan)) !== null) {
      const parsed = this.parseCommandArgs(fullLibScan, m.index + m[0].length, 3, true);
      if (parsed) {
        const cName = parsed.args[0].trim();
        const rgb = this.parseColorSpecToRgb(parsed.args[1], parsed.args[2], info.colors);
        if (cName && rgb) info.colors[cName] = rgb;
      }
    }
    const colorletRe = /\\colorlet\b/g;
    while ((m = colorletRe.exec(fullLibScan)) !== null) {
      const parsed = this.parseCommandArgs(fullLibScan, m.index + m[0].length, 2, true);
      if (parsed) {
        const cName = parsed.args[0].trim();
        const rgb = this.resolveColorRgb(parsed.args[1], info.colors);
        if (cName && rgb) info.colors[cName] = rgb;
      }
    }

    // Macro: \newcommand, \renewcommand, \providecommand
    const BLOCKED_MACROS = new Set([
      '\\loigiai', '\\choice', '\\choicefix', '\\choiceTF', '\\choiceTFt', '\\choiceTFtColor',
      '\\shortans', '\\shortansfix', '\\SA', '\\immini', '\\imminiL',
      '\\heva', '\\hoac', '\\begin', '\\end', '\\section', '\\chapter',
      '\\subsection', '\\textbf', '\\textit', '\\underline', '\\item', '\\itemch',
      '\\ExamBanner', '\\ExamBannerEven', '\\caulc', '\\cautn', '\\cauds', '\\caukq', '\\cautl'
    ]);

    const COLOR_MACRO_NAMES = new Set(['\\maincolor', '\\maudo', '\\mauvang', '\\mauxanh', '\\colorEX']);

    const isNonMathMacro = (name, bodyVal) => {
      if (/^\\the[A-Z]|^\\the(?:page|section|subsection|chapter|part|equation|figure|table|enum|ex|bt|vd)\b/.test(name)) return true;
      return /\\(?:begin|end)\{(?:tikzpicture|tabular|minipage|multicols|enumerate|itemize|tcolorbox)\}|\\(?:newpage|vfill|tikz|draw|fill|node|arabic|roman|Roman|alph|Alph|counter|setcounter|definecolor|ifthenelse|fontsize|fontfamily|selectfont)/.test(bodyVal);
    };

    const registerMacroCandidate = (name, bodyVal) => {
      if (!name || !name.startsWith('\\') || name.includes('@') || BLOCKED_MACROS.has(name)) return;
      if (COLOR_MACRO_NAMES.has(name) || /^[A-Za-z]+(?:![0-9.]+(?:![A-Za-z]+)*)+$/.test(bodyVal)) {
        const colExpr = bodyVal.replace(/^\\color\{([^}]*)\}$/, '$1').trim();
        const rgb = this.resolveColorRgb(colExpr, info.colors);
        if (rgb) info.colors[name] = rgb;
        return;
      }
      if (name === '\\tkzTabDefaultLineWidth' && /^[0-9.]+(?:pt|mm|cm)$/.test(bodyVal)) {
        info.tikzPreamble.push(`\\def\\tkzTabDefaultLineWidth{${bodyVal}}`);
        return;
      }
      if (isNonMathMacro(name, bodyVal)) return;
      info.macros[name] = bodyVal;
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
        if (!name) continue;

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
        registerMacroCandidate(name, bodyBox.content.trim());
      }
    };
    parseNewCommands(rawDeclSource);

    // \DeclareMathOperator(*){ \cmd }{ text }
    const opRe = /\\DeclareMathOperator(\*?)\s*/g;
    while ((m = opRe.exec(rawDeclSource)) !== null) {
      const isStar = m[1] === '*';
      const parsed = this.parseCommandArgs(rawDeclSource, m.index + m[0].length, 2, false);
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
    while ((m = defRe.exec(rawDeclSource)) !== null) {
      const name = m[1];
      const brace = this.extractBalanced(rawDeclSource, m.index + m[0].length - 1, '{', '}');
      if (brace) {
        const bodyVal = brace.content.trim();
        if (!/\\(?:catcode|csname|expandafter|makeatletter)/.test(bodyVal)) {
          registerMacroCandidate(name, bodyVal);
        }
      }
    }

    // Nhận diện \tikzset{...} và \tikzstyle{name}=[... ] ở cấp preamble (ngoài tikzpicture)
    if (info.preambleRaw) {
      const preambleNoPic = stripInternalBlocks(info.preambleRaw).replace(/\\begin\{tikzpicture\}[\s\S]*?\\end\{tikzpicture\}/g, '');
      const tsRe = /\\tikzset\s*\{/g;
      while ((m = tsRe.exec(preambleNoPic)) !== null) {
        const b = this.extractBalanced(preambleNoPic, m.index + m[0].length - 1, '{', '}');
        if (b && !/@|\\NewDocumentCommand|\\ExplSyntax/.test(b.content)) {
          const cleanedTs = this.sanitizeTikzSource(b.content);
          if (cleanedTs) info.tikzPreamble.push(`\\tikzset{${cleanedTs}}`);
        }
      }
      const tstyleRe = /\\tikzstyle\s*\{([^}]+)\}\s*=\s*\[/g;
      while ((m = tstyleRe.exec(preambleNoPic)) !== null) {
        const b = this.extractBalanced(preambleNoPic, m.index + m[0].length - 1, '[', ']');
        if (b && !/@/.test(b.content)) {
          info.tikzPreamble.push(`\\tikzset{${m[1].trim()}/.style={${this.sanitizeTikzSource(b.content)}}}`);
        }
      }
    }

    // Suy luận tiêu đề từ \ExamBanner hoặc \begin{name}{...}{Title} nếu không có \title
    if (!info.title) {
      const ebIdx = info.body.indexOf('\\ExamBanner');
      if (ebIdx !== -1 && !/[A-Za-z]/.test(info.body[ebIdx + 11] || '')) {
        const eb = this.parseCommandArgs(info.body, ebIdx + 11, 3, true);
        if (eb) {
          const cleanBannerTxt = (s) => s.replace(/\\fontsize\{[^}]*\}\{[^}]*\}|\\selectfont|\\textmd|\\textbf|\\bf/g, '').replace(/\\\\/g, ' - ').replace(/[{}]/g, '').replace(/\s+/g, ' ').trim();
          info.title = [cleanBannerTxt(eb.args[0].split(/\\\\/)[0] || ''), cleanBannerTxt(eb.args[1].split(/\\\\/)[0] || '')].filter(Boolean).join(' • ');
        }
      }
      if (!info.title) {
        const nameEnv = info.body.match(/\\begin\{name\}\s*\{[^}]*\}\s*\{([\s\S]*?)\}\s*\\end\{name\}/);
        if (nameEnv) {
          info.title = nameEnv[1].replace(/\\\\/g, ' - ').replace(/\\[A-Za-z]+\s*|[{}]/g, '').replace(/\s+/g, ' ').trim();
        }
      }
    }

    this.registerPreamble(info);
    return info;
  },

  // Biên dịch các lệnh hình học phẳng tkz-euclide sang TikZ thuần (vì WebAssembly tikzjax không đóng gói tkz-euclide.sty)
  transpileTkzEuclide(rawCode) {
    let s = String(rawCode || '');
    s = s.replace(/\\usetkzobj\s*\{[^}]*\}/g, '');

    let bounds = { xmin: -5, xmax: 5, ymin: -5, ymax: 5 };
    const parseKvNum = (optStr, key, fallback) => {
      if (!optStr) return fallback;
      const m = optStr.match(new RegExp(`\\b${key}\\s*=\\s*([+-]?[0-9.]+)`));
      return m ? parseFloat(m[1]) : fallback;
    };
    const cleanDrawOpts = (opt) => {
      if (!opt) return '';
      return opt.split(',').map(x => x.trim()).filter(x => x && !/^(?:size|add|mark|mkpos|space|sub|subxstep|subystep|kr|kl|pos|dist)\s*=/.test(x) && !/^(?:R|diameter|compass|arc)$/.test(x)).join(', ');
    };
    const fmtPtLabel = (p) => {
      const tr = p.trim();
      const mSub = tr.match(/^([A-Za-z]+)_?(\d+)$/);
      return mSub ? `${mSub[1]}_{${mSub[2]}}` : tr;
    };

    s = s.replace(/\\tkzInit(?:\s*\[([^\]]*)\])?/g, (_m, opt) => {
      bounds.xmin = parseKvNum(opt, 'xmin', -5);
      bounds.xmax = parseKvNum(opt, 'xmax', 5);
      bounds.ymin = parseKvNum(opt, 'ymin', -5);
      bounds.ymax = parseKvNum(opt, 'ymax', 5);
      return '';
    });

    s = s.replace(/\\tkzClip(?:\s*\[([^\]]*)\])?/g, (_m, opt) => {
      const sp = parseKvNum(opt, 'space', 0);
      const x1 = parseKvNum(opt, 'xmin', bounds.xmin) - sp;
      const x2 = parseKvNum(opt, 'xmax', bounds.xmax) + sp;
      const y1 = parseKvNum(opt, 'ymin', bounds.ymin) - sp;
      const y2 = parseKvNum(opt, 'ymax', bounds.ymax) + sp;
      return `\\clip (${x1},${y1}) rectangle (${x2},${y2});`;
    });

    s = s.replace(/\\tkzGrid(?:\s*\[[^\]]*\])?(?:\s*\(([^,)]+),([^)]+)\)\s*\(([^,)]+),([^)]+)\))?/g, (_m, x1, y1, x2, y2) => {
      return `\\draw[help lines, opacity=0.3] (${x1 ?? bounds.xmin},${y1 ?? bounds.ymin}) grid (${x2 ?? bounds.xmax},${y2 ?? bounds.ymax});`;
    });

    s = s.replace(/\\tkzDrawX(?:\s*\[([^\]]*)\])?/g, (_m, opt) => {
      const lblM = opt && opt.match(/label\s*=\s*(\{[^}]*\}|[^,\]]+)/);
      const lbl = lblM ? lblM[1].replace(/^\{|\}$/g, '') : '$x$';
      return `\\draw[->] (${bounds.xmin},0) -- (${bounds.xmax},0) node[below right] {${lbl}};`;
    });

    s = s.replace(/\\tkzDrawY(?:\s*\[([^\]]*)\])?/g, (_m, opt) => {
      const lblM = opt && opt.match(/label\s*=\s*(\{[^}]*\}|[^,\]]+)/);
      const lbl = lblM ? lblM[1].replace(/^\{|\}$/g, '') : '$y$';
      return `\\draw[->] (0,${bounds.ymin}) -- (0,${bounds.ymax}) node[above left] {${lbl}};`;
    });

    // \tkzDefPoints{x1/y1/A, x2/y2/B, ...}
    s = this.replaceCommand(s, 'tkzDefPoints', 1, false, (_opt, body) => {
      const coords = [];
      body.split(',').map(x => x.trim()).filter(Boolean).forEach(entry => {
        const parts = entry.split('/').map(p => p.trim());
        if (parts.length >= 3) coords.push(`(${parts[0]},${parts[1]}) coordinate (${parts[2]})`);
      });
      return coords.length ? `\\path ${coords.join(' ')};` : '';
    });

    s = s.replace(/\\tkzDefPoint(?:\s*\[[^\]]*\])?\s*\(([^)]+)\)\s*\{([^}]+)\}/g, (_m, xy, name) => {
      return `\\path (${xy.trim()}) coordinate (${name.trim()});`;
    });

    s = s.replace(/\\tkzDefShiftPoint\s*\[([^\]]+)\]\s*\(([^)]+)\)\s*\{([^}]+)\}/g, (_m, base, shift, name) => {
      return `\\path ($(${base.trim()})+(${shift.trim()})$) coordinate (${name.trim()});`;
    });

    s = s.replace(/\\tkzDefMidPoint\s*\(\s*([^,)]+)\s*,\s*([^)]+)\s*\)/g, (_m, a, b) => {
      return `\\path ($(${a.trim()})!0.5!(${b.trim()})$) coordinate (tkzPointResult);`;
    });

    s = s.replace(/\\tkzDefBarycentricPoint\s*\(([^)]+)\)/g, (_m, spec) => {
      return `\\path (barycentric cs:${spec.trim()}) coordinate (tkzPointResult);`;
    });

    s = s.replace(/\\tkzDefPointBy\s*\[([^\]]+)\]\s*\(\s*([^)]+)\s*\)/g, (_m, opt, pt) => {
      const p = pt.trim();
      let mOp;
      if ((mOp = opt.match(/translation\s*=\s*from\s+([^\s]+)\s+to\s+([^\s,\]]+)/))) {
        return `\\path ($(${p})+(${mOp[2]})-(${mOp[1]})$) coordinate (tkzPointResult);`;
      }
      if ((mOp = opt.match(/homothety\s*=\s*center\s+([^\s]+)\s+ratio\s+([^\s,\]]+)/))) {
        return `\\path ($(${mOp[1]})!${mOp[2]}!(${p})$) coordinate (tkzPointResult);`;
      }
      if ((mOp = opt.match(/rotation\s*=\s*center\s+([^\s]+)\s+angle\s+([^\s,\]]+)/))) {
        return `\\path ($(${mOp[1]})!1!${mOp[2]}:(${p})$) coordinate (tkzPointResult);`;
      }
      if ((mOp = opt.match(/symmetry\s*=\s*center\s+([^\s,\]]+)/))) {
        return `\\path ($(${mOp[1]})!-1!(${p})$) coordinate (tkzPointResult);`;
      }
      if ((mOp = opt.match(/projection\s*=\s*onto\s+([^-,\s]+)--([^\s,\]]+)/))) {
        return `\\path ($(${mOp[1]})!(${p})!(${mOp[2]})$) coordinate (tkzPointResult);`;
      }
      if ((mOp = opt.match(/reflection\s*=\s*over\s+([^-,\s]+)--([^\s,\]]+)/))) {
        return `\\path ($($(${mOp[1]})!(${p})!(${mOp[2]})$)!-1!(${p})$) coordinate (tkzPointResult);`;
      }
      return `\\path (${p}) coordinate (tkzPointResult);`;
    });

    s = s.replace(/\\tkzDefLine\s*\[([^\]]+)\]\s*\(\s*([^,)]+)\s*(?:,\s*([^)]+))?\s*\)/g, (_m, opt, a, b) => {
      const pA = a.trim();
      const pB = (b || a).trim();
      let mOp;
      if ((mOp = opt.match(/parallel\s*=\s*through\s+([^\s,\]]+)/))) {
        return `\\path ($(${mOp[1]})+(${pB})-(${pA})$) coordinate (tkzPointResult);`;
      }
      if ((mOp = opt.match(/(?:orthogonal|perpendicular)\s*=\s*through\s+([^\s,\]]+)/))) {
        return `\\path ($(${mOp[1]})+($(${pA})!1!90:(${pB})$)-(${pA})$) coordinate (tkzPointResult);`;
      }
      if (/mediator/.test(opt)) {
        return `\\path ($(${pA})!0.5!(${pB})$) coordinate (_tkzMed) ($(_tkzMed)!1!90:(${pB})$) coordinate (tkzFirstPointResult) ($(_tkzMed)!1!-90:(${pB})$) coordinate (tkzSecondPointResult) (tkzFirstPointResult) coordinate (tkzPointResult);`;
      }
      return '';
    });

    s = s.replace(/\\tkzInterLL\s*\(\s*([^,)]+)\s*,\s*([^)]+)\s*\)\s*\(\s*([^,)]+)\s*,\s*([^)]+)\s*\)/g, (_m, a, b, c, d) => {
      return `\\path (intersection of ${a.trim()}--${b.trim()} and ${c.trim()}--${d.trim()}) coordinate (tkzPointResult);`;
    });

    s = s.replace(/\\tkzInterLC(?:\s*\[([^\]]*)\])?\s*\(\s*([^,)]+)\s*,\s*([^)]+)\s*\)\s*\(\s*([^,)]+)\s*,\s*([^)]+)\s*\)/g, (_m, opt, a, b, o, p) => {
      const circleCmd = (opt && /\bR\b/.test(opt))
        ? `\\path[name path=_tkzILCc] (${o.trim()}) circle (${p.trim()});`
        : `\\node[name path=_tkzILCc, circle through=(${p.trim()}), draw=none] at (${o.trim()}) {};`;
      return `\\path[name path=_tkzILCl] ($(${a.trim()})!-4!(${b.trim()})$) -- ($(${a.trim()})!5!(${b.trim()})$); ${circleCmd} \\path[name intersections={of=_tkzILCl and _tkzILCc, by={tkzFirstPointResult,tkzSecondPointResult}}];`;
    });

    s = s.replace(/\\tkzInterCC(?:\s*\[([^\]]*)\])?\s*\(\s*([^,)]+)\s*,\s*([^)]+)\s*\)\s*\(\s*([^,)]+)\s*,\s*([^)]+)\s*\)/g, (_m, opt, o1, p1, o2, p2) => {
      const isR = opt && /\bR\b/.test(opt);
      const c1 = isR ? `\\path[name path=_tkzIC1] (${o1.trim()}) circle (${p1.trim()});` : `\\node[name path=_tkzIC1, circle through=(${p1.trim()}), draw=none] at (${o1.trim()}) {};`;
      const c2 = isR ? `\\path[name path=_tkzIC2] (${o2.trim()}) circle (${p2.trim()});` : `\\node[name path=_tkzIC2, circle through=(${p2.trim()}), draw=none] at (${o2.trim()}) {};`;
      return `${c1} ${c2} \\path[name intersections={of=_tkzIC1 and _tkzIC2, by={tkzFirstPointResult,tkzSecondPointResult}}];`;
    });

    s = s.replace(/\\tkzGetPoints\s*\{([^}]+)\}\s*\{([^}]+)\}/g, (_m, p1, p2) => `\\path (tkzFirstPointResult) coordinate (${p1.trim()}) (tkzSecondPointResult) coordinate (${p2.trim()});`);
    s = s.replace(/\\tkzGetFirstPoint\s*\{([^}]+)\}/g, (_m, p1) => `\\path (tkzFirstPointResult) coordinate (${p1.trim()});`);
    s = s.replace(/\\tkzGetSecondPoint\s*\{([^}]+)\}/g, (_m, p2) => `\\path (tkzSecondPointResult) coordinate (${p2.trim()});`);
    s = s.replace(/\\tkzGetPoint\s*\{([^}]+)\}/g, (_m, p) => `\\path (tkzPointResult) coordinate (${p.trim()});`);

    // Vẽ đoạn thẳng, đường thẳng, đa giác, đường tròn, điểm
    s = s.replace(/\\tkzDrawSegments?(?:\s*\[([^\]]*)\])?\s*\(([^)]+)\)/g, (_m, opt, pairsStr) => {
      const segs = [];
      const pairRe = /([^\s,()]+)\s*,\s*([^\s,()]+)/g;
      let pm;
      while ((pm = pairRe.exec(pairsStr)) !== null) {
        segs.push(`(${pm[1]})--(${pm[2]})`);
      }
      if (!segs.length) return '';
      const co = cleanDrawOpts(opt);
      return `\\draw${co ? `[${co}]` : ''} ${segs.join(' ')};`;
    });

    s = s.replace(/\\tkzDrawLines?(?:\s*\[([^\]]*)\])?\s*\(([^)]+)\)/g, (_m, opt, pairsStr) => {
      let k1 = 0.2, k2 = 0.2;
      const addM = opt && opt.match(/add\s*=\s*([0-9.]+)\s+and\s+([0-9.]+)/);
      if (addM) { k1 = parseFloat(addM[1]); k2 = parseFloat(addM[2]); }
      const segs = [];
      const pairRe = /([^\s,()]+)\s*,\s*([^\s,()]+)/g;
      let pm;
      while ((pm = pairRe.exec(pairsStr)) !== null) {
        segs.push(`($(${pm[1]})!-${k1}!(${pm[2]})$)--($(${pm[2]})!-${k2}!(${pm[1]})$)`);
      }
      if (!segs.length) return '';
      const co = cleanDrawOpts(opt);
      return `\\draw${co ? `[${co}]` : ''} ${segs.join(' ')};`;
    });

    s = s.replace(/\\tkzDrawPolygon(?:\s*\[([^\]]*)\])?\s*\(([^)]+)\)/g, (_m, opt, ptsStr) => {
      const pts = ptsStr.split(',').map(p => p.trim()).filter(Boolean);
      if (pts.length < 2) return '';
      const co = cleanDrawOpts(opt);
      return `\\draw${co ? `[${co}]` : ''} ${pts.map(p => `(${p})`).join('--')}--cycle;`;
    });

    s = s.replace(/\\tkzFillPolygon(?:\s*\[([^\]]*)\])?\s*\(([^)]+)\)/g, (_m, opt, ptsStr) => {
      const pts = ptsStr.split(',').map(p => p.trim()).filter(Boolean);
      if (pts.length < 2) return '';
      const co = cleanDrawOpts(opt);
      return `\\fill${co ? `[${co}]` : ''} ${pts.map(p => `(${p})`).join('--')}--cycle;`;
    });

    s = s.replace(/\\tkzDrawCircle(?:\s*\[([^\]]*)\])?\s*\(\s*([^,)]+)\s*,\s*([^)]+)\s*\)/g, (_m, opt, o, a) => {
      const co = cleanDrawOpts(opt);
      if (opt && /\bR\b/.test(opt)) {
        return `\\draw${co ? `[${co}]` : ''} (${o.trim()}) circle (${a.trim()});`;
      }
      if (opt && /\bdiameter\b/.test(opt)) {
        return `\\path ($(${o.trim()})!0.5!(${a.trim()})$) coordinate (_tkzDiaO); \\node[draw${co ? `, ${co}` : ''}, circle through=(${a.trim()})] at (_tkzDiaO) {};`;
      }
      return `\\node[draw${co ? `, ${co}` : ''}, circle through=(${a.trim()})] at (${o.trim()}) {};`;
    });

    s = s.replace(/\\tkzDrawPoints?(?:\s*\[([^\]]*)\])?\s*\(([^)]+)\)/g, (_m, opt, ptsStr) => {
      const pts = ptsStr.split(',').map(p => p.trim()).filter(Boolean);
      const fillM = opt && opt.match(/fill\s*=\s*([^,\]]+)/);
      const fillCol = fillM ? fillM[1].trim() : 'black';
      return pts.map(p => `\\draw[fill=${fillCol}] (${p}) circle (1.3pt);`).join(' ');
    });

    // Ký hiệu góc vuông, cung góc, đánh dấu đoạn bằng nhau & nhãn
    s = s.replace(/\\tkzMarkRightAngles?(?:\s*\[([^\]]*)\])?\s*((?:\([^)]+\)\s*)+)/g, (_m, opt, groups) => {
      const sz = parseKvNum(opt, 'size', 0.22);
      const co = cleanDrawOpts(opt);
      const out = [];
      const gRe = /\(\s*([^,)]+)\s*,\s*([^,)]+)\s*,\s*([^)]+)\s*\)/g;
      let gm;
      while ((gm = gRe.exec(groups)) !== null) {
        out.push(`\\path pic[draw${co ? `, ${co}` : ''}, angle radius=${sz}cm] {right angle = ${gm[1].trim()}--${gm[2].trim()}--${gm[3].trim()}};`);
      }
      return out.join(' ');
    });

    s = s.replace(/\\tkz(Mark|Fill)Angles?(?:\s*\[([^\]]*)\])?\s*((?:\([^)]+\)\s*)+)/g, (_m, kind, opt, groups) => {
      const sz = parseKvNum(opt, 'size', 0.55);
      const co = cleanDrawOpts(opt);
      const mode = kind === 'Fill' ? 'fill' : 'draw';
      const out = [];
      const gRe = /\(\s*([^,)]+)\s*,\s*([^,)]+)\s*,\s*([^)]+)\s*\)/g;
      let gm;
      while ((gm = gRe.exec(groups)) !== null) {
        out.push(`\\path pic[${mode}${co ? `, ${co}` : ''}, angle radius=${sz}cm] {angle = ${gm[1].trim()}--${gm[2].trim()}--${gm[3].trim()}};`);
      }
      return out.join(' ');
    });

    s = s.replace(/\\tkzMarkSegments?(?:\s*\[([^\]]*)\])?\s*\(([^)]+)\)/g, (_m, opt, pairsStr) => {
      const isDouble = opt && /\|\||s\|\|/.test(opt);
      const out = [];
      const pairRe = /([^\s,()]+)\s*,\s*([^\s,()]+)/g;
      let pm;
      while ((pm = pairRe.exec(pairsStr)) !== null) {
        const a = pm[1], b = pm[2];
        if (isDouble) {
          out.push(`\\draw ($($(${a})!0.47!(${b})$)!2.8pt!90:(${b})$)--($($(${a})!0.47!(${b})$)!-2.8pt!90:(${b})$) ($($(${a})!0.53!(${b})$)!2.8pt!90:(${b})$)--($($(${a})!0.53!(${b})$)!-2.8pt!90:(${b})$);`);
        } else {
          out.push(`\\draw ($($(${a})!0.5!(${b})$)!2.8pt!90:(${b})$)--($($(${a})!0.5!(${b})$)!-2.8pt!90:(${b})$);`);
        }
      }
      return out.join(' ');
    });

    s = s.replace(/\\tkzLabelPoints(?:\s*\[([^\]]*)\])?\s*\(([^)]+)\)/g, (_m, opt, ptsStr) => {
      const posOpt = (opt && opt.trim()) ? opt.trim() : 'below right';
      return ptsStr.split(',').map(p => p.trim()).filter(Boolean)
        .map(p => `\\node[${posOpt}] at (${p}) {$${fmtPtLabel(p)}$};`).join(' ');
    });

    s = s.replace(/\\tkzLabelPoint(?:\s*\[([^\]]*)\])?\s*\(([^)]+)\)\s*\{([^}]*)\}/g, (_m, opt, p, lbl) => {
      const posOpt = (opt && opt.trim()) ? opt.trim() : 'below right';
      return `\\node[${posOpt}] at (${p.trim()}) {${lbl}};`;
    });

    s = s.replace(/\\tkzLabelSegment(?:\s*\[([^\]]*)\])?\s*\(\s*([^,)]+)\s*,\s*([^)]+)\s*\)\s*\{([^}]*)\}/g, (_m, opt, a, b, lbl) => {
      const posOpt = (opt && opt.trim()) ? opt.trim() : 'auto';
      return `\\path (${a.trim()}) -- node[${posOpt}] {${lbl}} (${b.trim()});`;
    });

    s = s.replace(/\\tkzLabelAngles?(?:\s*\[([^\]]*)\])?\s*\(\s*([^,)]+)\s*,\s*([^,)]+)\s*,\s*([^)]+)\s*\)\s*\{([^}]*)\}/g, (_m, opt, a, b, c, lbl) => {
      const pos = parseKvNum(opt, 'pos', parseKvNum(opt, 'dist', 0.8));
      return `\\path pic["${lbl}", angle radius=${pos}cm, angle eccentricity=1] {angle = ${a.trim()}--${b.trim()}--${c.trim()}};`;
    });

    s = s.replace(/\\tkzText(?:\s*\[([^\]]*)\])?\s*\(([^)]+)\)\s*\{([^}]*)\}/g, (_m, opt, xy, txt) => {
      return `\\node${opt ? `[${opt}]` : ''} at (${xy.trim()}) {${txt}};`;
    });

    s = s.replace(/\\tkzCompass(?:\s*\[[^\]]*\])?\s*\([^)]*\)/g, '');
    return s;
  },

  // Chuẩn hóa lệnh font / macro / Unicode bên trong khối TikZ để tex.wasm (OT1/CM) không bao giờ lỗi thiếu .sty hoặc .tfm
  sanitizeTikzSource(tikzSrc) {
    let s = String(tikzSrc || '').trim();
    // Gỡ bỏ các lệnh đổi họ font ngoài CM (phv, qag, qhv, qcs...) gây crash thiếu TFM trên tex.wasm
    s = s.replace(/\\fontfamily\s*\{[^}]*\}/g, '')
         .replace(/\\fontsize\s*\{[^}]*\}\s*\{[^}]*\}/g, '')
         .replace(/\\selectfont\b/g, '')
         .replace(/\\(?:sffamily|ttfamily)\b/g, '');

    // Ánh xạ các macro thuộc gói không có trong tikzjax (mathrsfs, dsfont, esvect, yhmath, fontawesome)
    s = s.replace(/\\mathscr\s*\{/g, '\\mathcal{')
         .replace(/\\mathds\s*\{/g, '\\mathbb{')
         .replace(/\\vv\*\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g, '\\overrightarrow{$1}_{$2}')
         .replace(/\\vv\s*\{/g, '\\overrightarrow{')
         .replace(/\\(?:wideparen|arc|overarc)\s*\{/g, '\\widehat{')
         .replace(/\\varparallel\b/g, '\\parallel ')
         .replace(/\\fa[A-Z][A-Za-z0-9]*\b/g, '');

    s = s.replace(/−/g, '-').replace(/–/g, '--').replace(/—/g, '---').replace(/…/g, '...');
    s = s.replace(/×/g, '\\times ').replace(/÷/g, '\\div ').replace(/±/g, '\\pm ').replace(/[⋅∙]/g, '\\cdot ');
    s = s.replace(/∞/g, '\\infty ').replace(/≤/g, '\\le ').replace(/≥/g, '\\ge ').replace(/≠/g, '\\ne ').replace(/≈/g, '\\approx ');
    s = s.replace(/⇒/g, '\\Rightarrow ').replace(/⇔/g, '\\Leftrightarrow ').replace(/→/g, '\\to ');
    s = s.replace(/∈/g, '\\in ').replace(/∉/g, '\\notin ').replace(/⊂/g, '\\subset ').replace(/∪/g, '\\cup ').replace(/∩/g, '\\cap ').replace(/∅/g, '\\varnothing ');
    s = s.replace(/⊥/g, '\\perp ').replace(/∥/g, '\\parallel ').replace(/∠/g, '\\angle ').replace(/△/g, '\\triangle ');
    s = s.replace(/π/g, '\\pi ').replace(/Δ/g, '\\Delta ').replace(/α/g, '\\alpha ').replace(/β/g, '\\beta ').replace(/γ/g, '\\gamma ').replace(/φ/g, '\\varphi ').replace(/ω/g, '\\omega ').replace(/Ω/g, '\\Omega ');
    s = s.replace(/ℝ/g, '\\mathbb{R}').replace(/ℤ/g, '\\mathbb{Z}').replace(/ℕ/g, '\\mathbb{N}').replace(/ℚ/g, '\\mathbb{Q}').replace(/ℂ/g, '\\mathbb{C}');
    s = s.replace(/°/g, '^\\circ ').replace(/[“”]/g, '"').replace(/[‘’]/g, "'");

    // Bỏ dấu tiếng Việt trên các ký tự chữ trong node TikZ (vì bộ font CM chuẩn của tex.wasm không nạp T5 vietnam)
    s = s.replace(/đ/g, 'd').replace(/Đ/g, 'D');
    s = s.replace(/[^\x00-\x7F]/g, (ch) => {
      const norm = ch.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return /^[\x00-\x7F]+$/.test(norm) ? norm : '';
    });

    s = s.replace(/<\/script/gi, '<\\/script');
    return s;
  },

  // Tự động nhận diện packages, tikzlibraries, màu sắc & style preamble và sinh thẻ <script type="text/tikz"> cho @rod2ik/tikzjax
  renderTikzToHtml(rawTikz, preambleInfo = null, isInline = false) {
    if (!rawTikz || !String(rawTikz).trim()) return '';
    let code = this.stripComments(String(rawTikz)).trim();

    const pkgs = new Set(['amsmath', 'amssymb']);
    const libs = new Set(['calc', 'arrows', 'arrows.meta']);

    // Chuyển đổi tkz-euclide sang TikZ thuần trước khi kiểm tra thư viện
    if (/\\tkz(?:Init|Clip|Grid|DrawX|DrawY|Def|Draw(?!Tab)|Label|Mark|Inter|Calc|Get|Fill|Text|Compass)|\\usetkzobj\b/.test(code)) {
      code = this.transpileTkzEuclide(code);
      ['calc', 'angles', 'quotes', 'intersections', 'through'].forEach(l => libs.add(l));
    }

    const isChemfigOnly = !/\\begin\{(?:tikzpicture|circuitikz)\}/.test(code) && /\\chemfig/.test(code);
    if (!isChemfigOnly && !/\\begin\{(?:tikzpicture|circuitikz)\}/.test(code)) {
      code = code.replace(/^\\tikz\b\s*/, '');
      let optTikz = '';
      if (code.startsWith('[')) {
        const ob = this.extractBalanced(code, 0, '[', ']');
        if (ob && ob.openIdx === 0) {
          optTikz = `[${ob.content}]`;
          code = code.slice(ob.endIdx + 1).trim();
        }
      }
      if (code.startsWith('{') && code.endsWith('}')) {
        const bb = this.extractBalanced(code, 0, '{', '}');
        if (bb && bb.openIdx === 0 && bb.endIdx === code.length - 1) code = bb.content.trim();
      }
      code = `\\begin{tikzpicture}${optTikz}\n${code}\n\\end{tikzpicture}`;
    }

    // Nạp các thư viện TikZ khai báo trong preamble tài liệu hoặc đã đăng ký
    const UNSAFE_AUTO_LIBS = new Set(['babel', 'animations']);
    const candidateLibs = [...this.activeTikzLibraries, ...(preambleInfo?.tikzLibraries || [])];
    candidateLibs.forEach(l => {
      if (this.SUPPORTED_TIKZ_LIBS.has(l) && !UNSAFE_AUTO_LIBS.has(l)) libs.add(l);
    });

    // Nạp các gói nhẹ hợp lệ từ preamble (các gói nặng chỉ nạp khi hình thực sự dùng tới để tăng tốc WASM)
    const LIGHT_PREAMBLE_PKGS = new Set(['mathtools', 'bm', 'cancel', 'ifthen', 'calc', 'etoolbox', 'xparse', 'xstring', 'listofitems']);
    const candidatePkgs = [...this.activeTexPackages, ...(preambleInfo?.texPackages || [])];
    candidatePkgs.forEach(p => {
      if (LIGHT_PREAMBLE_PKGS.has(p) && this.SUPPORTED_TIKZ_PACKAGES.has(p)) pkgs.add(p);
    });

    // Tự động nhận diện gói lệnh theo nội dung hình (kể cả khi biên dịch file con không có preamble)
    if (/\\tkzTab/i.test(code)) pkgs.add('tkz-tab');
    if (/\\begin\{(?:axis|semilogxaxis|semilogyaxis|loglogaxis|polaraxis|groupplot)\}|\\addplot|\\pgfplotsset/i.test(code)) pkgs.add('pgfplots');
    if (/\\begin\{circuitikz\}|\\draw[\s\S]*?\bto\[[A-Za-z]/i.test(code)) pkgs.add('circuitikz');
    if (/\\chemfig|\\chemname|\\schemestart/i.test(code)) pkgs.add('chemfig');
    if (/\\tdplot/i.test(code)) pkgs.add('tikz-3dplot');
    if (/\\begin\{tikzcd\}/i.test(code)) pkgs.add('tikz-cd');
    if (/\\vb\b|\\va\b|\\dv\b|\\pdv\b|\\bra\b|\\ket\b/i.test(code)) pkgs.add('physics');
    if (/\\ce\{/i.test(code)) pkgs.add('mhchem');
    if (/\\bm\{/i.test(code)) pkgs.add('bm');
    if (/\\(?:cancel|bcancel|xcancel|cancelto)\b/.test(code)) pkgs.add('cancel');
    if (/\\ifthenelse\b/.test(code)) pkgs.add('ifthen');
    if (/\\(?:coloneqq|eqqcolon|dcases|rcases|prescript)\b/.test(code)) pkgs.add('mathtools');

    // Tự động nhận diện đầy đủ thư viện TikZ theo cú pháp dùng trong hình
    if (/\bpic\b|\bangle\b|\bright angle\b/.test(code)) {
      libs.add('angles');
      libs.add('quotes');
    }
    if (/name path|name intersections|intersection of/i.test(code)) libs.add('intersections');
    if (/pattern\s*=|north east lines|north west lines|crosshatch|fivepointed stars|\bdots\b/i.test(code)) {
      libs.add('patterns');
      libs.add('patterns.meta');
    }
    if (/canvas is |3d/i.test(code)) {
      libs.add('3d');
      libs.add('perspective');
    }
    if (/(?:right|left|above|below)\s*=\s*[^,\]]*\bof\b|node distance/i.test(code)) libs.add('positioning');
    if (/decoration\s*=|\bdecorate\b|snake|brace|zigzag|coil|random steps|mark\s*=\s*at position/i.test(code)) {
      libs.add('decorations.markings');
      libs.add('decorations.pathreplacing');
      libs.add('decorations.pathmorphing');
      libs.add('decorations.text');
    }
    if (/\bbend\b|\bflex\b/i.test(code)) libs.add('bending');
    if (/shading\s*=|ball color|top color|bottom color|left color|right color|inner color|outer color|path fading/i.test(code)) {
      libs.add('shadings');
      libs.add('fadings');
    }
    if (/drop shadow|circular drop shadow|general shadow|copy shadow/i.test(code)) libs.add('shadows');
    if (/plot\s*\[[^\]]*mark\s*=|plotmarks/i.test(code)) libs.add('plotmarks');
    if (/tikzmath|\\tikzmath/i.test(code)) libs.add('math');
    if (/matrix of |\\matrix\b/i.test(code)) libs.add('matrix');
    if (/\bhobby\b|quick curve/i.test(code)) libs.add('hobby');
    if (/trapezium|regular polygon|cylinder|diamond|ellipse|isosceles triangle|semicircle|\bstar\b/i.test(code)) libs.add('shapes.geometric');
    if (/cross out|strike out|rounded rectangle|chamfered rectangle/i.test(code)) libs.add('shapes.misc');
    if (/callout/i.test(code)) libs.add('shapes.callouts');
    if (/single arrow|double arrow|arrow box/i.test(code)) libs.add('shapes.arrows');
    if (/rectangle split|circle split/i.test(code)) libs.add('shapes.multipart');
    if (/cloud|starburst|signal/i.test(code)) libs.add('shapes.symbols');
    if (/\bfit\s*=/i.test(code)) libs.add('fit');
    if (/\bfpu\b/i.test(code)) libs.add('fpu');
    if (/through|circle through/i.test(code)) libs.add('through');
    if (/on background layer|background rectangle|\bframed\b/i.test(code)) libs.add('backgrounds');
    if (/\bspy\b/i.test(code)) libs.add('spy');
    if (/\bchild\s*\{|level distance|sibling distance/i.test(code)) libs.add('trees');

    const sanitized = this.sanitizeTikzSource(code);
    const pkgAttr = Array.from(pkgs).filter(p => this.SUPPORTED_TIKZ_PACKAGES.has(p)).join(',');
    const libAttr = Array.from(libs).filter(l => this.SUPPORTED_TIKZ_LIBS.has(l)).join(',');
    const preambleParts = [];

    if (pkgs.has('pgfplots')) {
      preambleParts.push(`\\pgfplotsset{compat=${preambleInfo?.pgfplotsCompat || '1.16'}}`);
    }

    // Tiêm các màu tùy chỉnh & màu chuẩn Khaibao/ex_test (darkblue, lightblue, chuy, \maincolor...) khi xuất hiện trong hình hoặc tikzset
    const STD_XCOLORS = new Set(['black', 'white', 'red', 'green', 'blue', 'cyan', 'magenta', 'yellow', 'orange', 'violet', 'purple', 'brown', 'lime', 'olive', 'pink', 'teal', 'darkgray', 'gray', 'lightgray']);
    const mergedColors = Object.assign({}, this.BASE_XCOLORS, this.activeColors, preambleInfo?.colors || {});
    const extraTikzLines = preambleInfo?.tikzPreamble || [];
    const colorTargetStr = sanitized + '\n' + extraTikzLines.join('\n');

    Object.keys(mergedColors).forEach((cKey) => {
      if (STD_XCOLORS.has(cKey)) return;
      const rgb = mergedColors[cKey];
      if (!Array.isArray(rgb) || rgb.length < 3) return;
      if (cKey.startsWith('\\')) {
        if (colorTargetStr.includes(cKey)) {
          const safeAlias = '_txc_' + cKey.slice(1);
          preambleParts.push(`\\definecolor{${safeAlias}}{RGB}{${rgb[0]},${rgb[1]},${rgb[2]}}\\providecommand{${cKey}}{${safeAlias}}`);
        }
      } else if (new RegExp(`\\b${cKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(colorTargetStr)) {
        preambleParts.push(`\\definecolor{${cKey}}{RGB}{${rgb[0]},${rgb[1]},${rgb[2]}}`);
      }
    });

    extraTikzLines.forEach(line => {
      if (line && !preambleParts.includes(line)) preambleParts.push(line);
    });

    // Hỗ trợ macro đường tròn lượng giác \trucLG & \pointLG trong Khaibao/Moitruong.tex nếu được gọi
    if (sanitized.includes('\\trucLG')) {
      preambleParts.push('\\providecommand{\\trucLG}{\\draw[->] (-1.5,0)--(1.5,0) node[below]{$\\cos$}; \\draw[->] (0,-1.5)--(0,1.5) node[left]{$\\sin$}; \\draw (0,0) circle (1cm);}');
    }
    if (sanitized.includes('\\pointLG')) {
      preambleParts.push('\\providecommand{\\pointLG}[4]{\\draw[fill=#4] (#1:1cm) circle (1.5pt) node[#3]{#2};}');
    }

    const mergedMacros = Object.assign({}, this.activeMacros, preambleInfo?.macros || {});
    Object.keys(mergedMacros).forEach((mName) => {
      if (!sanitized.includes(mName)) return;
      const mBody = this.sanitizeTikzSource(mergedMacros[mName]);
      const argNums = (mBody.match(/#[1-9]/g) || []).map(x => Number(x[1]));
      const argCount = argNums.length ? Math.max(...argNums) : 0;
      preambleParts.push(`\\providecommand{${mName}}${argCount ? `[${argCount}]` : ''}{${mBody}}`);
    });

    const preambleAttr = preambleParts.length ? ` data-add-to-preamble="${this.escapeAttr(preambleParts.join(' '))}"` : '';
    if (isInline) {
      return `<span class="math-svg-container tex-tikz-inline inline-flex items-center align-middle mx-1"><script type="text/tikz" data-tex-packages="${this.escapeAttr(pkgAttr)}" data-tikz-libraries="${this.escapeAttr(libAttr)}"${preambleAttr}>\n${sanitized}\n</script></span>`;
    }
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
    // Tách dòng ở cấp ngoặc 0 để không cắt nhầm \heva / \hoac / matrix lồng bên trong
    const rawRows = [];
    let start = 0;
    let depth = 0;
    for (let i = 0; i < inner.length; i++) {
      if (inner[i] === '{' && !this.isEscaped(inner, i)) depth++;
      else if (inner[i] === '}' && !this.isEscaped(inner, i) && depth > 0) depth--;
      else if (depth === 0 && inner[i] === '\\' && inner[i + 1] === '\\' && !this.isEscaped(inner, i)) {
        rawRows.push(inner.slice(start, i));
        i++;
        if (inner[i + 1] === '*') i++;
        const afterBr = this.skipWhitespace(inner, i + 1);
        if (inner[afterBr] === '[') {
          const ob = this.extractBalanced(inner, afterBr, '[', ']');
          if (ob && ob.openIdx === afterBr) i = ob.endIdx;
        }
        start = i + 1;
      }
    }
    rawRows.push(inner.slice(start));

    const rows = rawRows.map(r => {
      const tr = r.trim();
      if (!tr) return '';
      return tr.includes('&') ? tr : '&' + tr;
    }).filter(Boolean);
    return `\\left${leftDelim}\\begin{aligned} ${rows.join(' \\\\ ')} \\end{aligned}\\right.`;
  },

  expandMathMacros(mathStr) {
    if (!mathStr) return '';
    let m = String(mathStr)
      .replace(/\\allowdisplaybreaks(?:\[\d*\])?/g, '')
      .replace(/\\renewcommand\s*\{\\arraystretch\}\s*\{[^}]*\}/g, '')
      .replace(/\\hfill\b/g, '\\qquad ');

    // Mở rộng lồng nhau cho \heva và \hoac bên trong công thức Toán
    let guard = 0;
    while ((m.includes('\\heva') || m.includes('\\hoac')) && guard++ < 8) {
      m = this.replaceCommand(m, 'heva', 1, false, (_opt, body) => this.formatSystemBody(body, '\\{'));
      m = this.replaceCommand(m, 'hoac', 1, false, (_opt, body) => this.formatSystemBody(body, '['));
    }
    m = m.replace(/\\vv\*\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g, '\\overrightarrow{$1}_{$2}')
         .replace(/\\vv\s*\{/g, '\\overrightarrow{');
    return m;
  },

  // Chuyển đổi eqnarray / eqnarray* 3 cột sang aligned 2 cột chuẩn KaTeX (hỗ trợ &\Leftrightarrow&, \hoac lồng nhau...)
  convertEqnarrayBody(body) {
    const cleaned = String(body || '').replace(/\\nonumber|\\notag|\\label\{[^}]*\}/g, '');
    const rawRows = [];
    let rStart = 0, bDepth = 0, envDepth = 0;
    for (let i = 0; i < cleaned.length; i++) {
      if (cleaned.slice(i).startsWith('\\begin{')) envDepth++;
      else if (cleaned.slice(i).startsWith('\\end{') && envDepth > 0) envDepth--;
      else if (cleaned[i] === '{' && !this.isEscaped(cleaned, i)) bDepth++;
      else if (cleaned[i] === '}' && !this.isEscaped(cleaned, i) && bDepth > 0) bDepth--;
      else if (bDepth === 0 && envDepth === 0 && cleaned[i] === '\\' && cleaned[i + 1] === '\\' && !this.isEscaped(cleaned, i)) {
        rawRows.push(cleaned.slice(rStart, i));
        i++;
        if (cleaned[i + 1] === '*') i++;
        const afterBr = this.skipWhitespace(cleaned, i + 1);
        if (cleaned[afterBr] === '[') {
          const ob = this.extractBalanced(cleaned, afterBr, '[', ']');
          if (ob && ob.openIdx === afterBr) i = ob.endIdx;
        }
        rStart = i + 1;
      }
    }
    rawRows.push(cleaned.slice(rStart));

    const alignedRows = rawRows.map(row => {
      const tr = row.trim();
      if (!tr) return '';
      const cols = [];
      let cStart = 0, cb = 0, ce = 0;
      for (let i = 0; i < tr.length; i++) {
        if (tr.slice(i).startsWith('\\begin{')) ce++;
        else if (tr.slice(i).startsWith('\\end{') && ce > 0) ce--;
        else if (tr[i] === '{' && !this.isEscaped(tr, i)) cb++;
        else if (tr[i] === '}' && !this.isEscaped(tr, i) && cb > 0) cb--;
        else if (cb === 0 && ce === 0 && tr[i] === '&' && !this.isEscaped(tr, i)) {
          cols.push(tr.slice(cStart, i));
          cStart = i + 1;
        }
      }
      cols.push(tr.slice(cStart));
      if (cols.length === 1) return cols[0].trim();
      if (cols.length === 2) return `${cols[0].trim()} & ${cols[1].trim()}`;
      return `${cols[0].trim()} & ${cols[1].trim()} ${cols.slice(2).join(' ').trim()}`;
    }).filter(Boolean);

    return `\\[\\begin{aligned}${this.expandMathMacros(alignedRows.join(' \\\\\n'))}\\end{aligned}\\]`;
  },

  // Chuyển đổi bảng LaTeX (tabular, tabularx, longtable, tblr) sang HTML <table> (hỗ trợ p{2cm}, >{\centering\arraybackslash}, bảng lồng)
  compileTabular(colSpec, bodyHtmlReady, compileCellFn, tblrOpts = {}) {
    const cols = [];
    let spec = String(colSpec || '');
    // Mở rộng *{n}{pattern} với ngoặc nhọn cân bằng
    let starGuard = 0;
    while (/\*\s*\{\d+\}\s*\{/.test(spec) && starGuard++ < 10) {
      const sm = spec.match(/\*\s*\{(\d+)\}\s*/);
      if (!sm) break;
      const patBox = this.extractBalanced(spec, sm.index + sm[0].length, '{', '}');
      if (!patBox) break;
      const rep = patBox.content.repeat(Math.min(20, parseInt(sm[1], 10) || 1));
      spec = spec.slice(0, sm.index) + rep + spec.slice(patBox.endIdx + 1);
    }

    let pendingLeftBorder = Boolean(tblrOpts.vlines);
    let pendingAlignHint = null;
    for (let i = 0; i < spec.length; i++) {
      const ch = spec[i];
      if (ch === '|') {
        if (cols.length === 0) pendingLeftBorder = true;
        else cols[cols.length - 1].borderRight = true;
      } else if (ch === 'l' || ch === 'c' || ch === 'r' || ch === 'X' || ch === 'Q') {
        if (ch === 'Q' && spec[i + 1] === '[') {
          const qb = this.extractBalanced(spec, i + 1, '[', ']');
          if (qb) {
            if (/\bl\b/.test(qb.content)) pendingAlignHint = 'left';
            else if (/\br\b/.test(qb.content)) pendingAlignHint = 'right';
            else if (/\bc\b/.test(qb.content)) pendingAlignHint = 'center';
            i = qb.endIdx;
          }
        }
        cols.push({
          align: pendingAlignHint || (ch === 'l' ? 'left' : (ch === 'r' ? 'right' : 'center')),
          borderLeft: pendingLeftBorder,
          borderRight: Boolean(tblrOpts.vlines)
        });
        pendingLeftBorder = false;
        pendingAlignHint = null;
      } else if (ch === 'p' || ch === 'm' || ch === 'b') {
        const b = this.extractBalanced(spec, i + 1, '{', '}');
        if (b) i = b.endIdx;
        cols.push({
          align: pendingAlignHint || 'left',
          borderLeft: pendingLeftBorder,
          borderRight: Boolean(tblrOpts.vlines)
        });
        pendingLeftBorder = false;
        pendingAlignHint = null;
      } else if (ch === '>' || ch === '<' || ch === '@' || ch === '!') {
        const b = this.extractBalanced(spec, i + 1, '{', '}');
        if (b) {
          if (ch === '>') {
            if (/\\centering/.test(b.content)) pendingAlignHint = 'center';
            else if (/\\raggedleft/.test(b.content)) pendingAlignHint = 'right';
            else if (/\\raggedright/.test(b.content)) pendingAlignHint = 'left';
          }
          i = b.endIdx;
        }
      }
    }

    const normalizedBody = String(bodyHtmlReady || '').replace(/\\tabularnewline\b/g, '\\\\');
    const rawRows = normalizedBody.split(/\\\\(?:\*|\s*\[[^\]]*\])?/);
    const htmlRows = [];
    let nextTopBorder = Boolean(tblrOpts.hlines);

    rawRows.forEach((rawRow) => {
      let row = rawRow.replace(/\\rowcolor(?:\[[^\]]*\])?\{[^}]*\}/g, '').trim();
      if (!row) return;

      let hasTopRule = nextTopBorder;
      nextTopBorder = Boolean(tblrOpts.hlines);

      const ruleLeadRe = /^(?:\\(?:hline|toprule|midrule|bottomrule|cmidrule(?:\([^)]*\))?\s*\{[^}]*\}|cline\s*\{[^}]*\}|specialrule\s*\{[^}]*\}\{[^}]*\}\{[^}]*\})\s*)+/;
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

      let hasBottomRule = Boolean(tblrOpts.hlines);
      const ruleTailRe = /(?:\s*\\(?:hline|toprule|midrule|bottomrule|cmidrule(?:\([^)]*\))?\s*\{[^}]*\}|cline\s*\{[^}]*\}|specialrule\s*\{[^}]*\}\{[^}]*\}\{[^}]*\}))+$/;
      if (ruleTailRe.test(row)) {
        hasBottomRule = true;
        row = row.replace(ruleTailRe, '').trim();
      }

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
        let cell = rawCell.replace(/\\cellcolor(?:\[[^\]]*\])?\{[^}]*\}/g, '').trim();
        let colspan = 1;
        let rowspan = 1;
        let align = cols[colCursor]?.align || 'center';
        let bLeft = cols[colCursor]?.borderLeft || (colCursor === 0 && Boolean(tblrOpts.vlines));
        let bRight = cols[colCursor]?.borderRight || Boolean(tblrOpts.vlines);

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
        if (cell.startsWith('\\multirow')) {
          const mr = this.parseCommandArgs(cell, 9, 3, true);
          if (mr) {
            rowspan = Math.max(1, parseInt(mr.args[0], 10) || 1);
            cell = mr.args[2].trim();
          }
        }
        if (cell.includes('\\makecell')) {
          cell = this.replaceCommand(cell, 'makecell', 1, true, (_o, body) => body);
        }
        if (cell.includes('\\diagbox') || cell.includes('\\backslashbox')) {
          cell = this.replaceCommand(cell, 'diagbox', 2, true, (_o, a, b) => `${a} / ${b}`);
          cell = this.replaceCommand(cell, 'backslashbox', 2, true, (_o, a, b) => `${a} / ${b}`);
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

  // Biên dịch tất cả bảng biểu từ trong ra ngoài (leaf-first) với ngoặc {colSpec} cân bằng
  compileAllTables(str, putVault, compileCellFn) {
    let s = str;
    const tblEnvRe = /\\begin\{(tabularx|tabular\*|tabular|longtable|xtabular|tblr|longtblr|talltblr)\}/g;
    let guard = 0;
    while (guard++ < 20) {
      tblEnvRe.lastIndex = 0;
      let leafMatch = null;
      let m;
      while ((m = tblEnvRe.exec(s)) !== null) {
        const envName = m[1];
        const endTag = `\\end{${envName}}`;
        const closeIdx = s.indexOf(endTag, m.index + m[0].length);
        if (closeIdx === -1) continue;
        const between = s.slice(m.index + m[0].length, closeIdx);
        if (!/\\begin\{(?:tabularx|tabular\*|tabular|longtable|xtabular|tblr|longtblr|talltblr)\}/.test(between)) {
          leafMatch = { envName, startIdx: m.index, afterBeginIdx: m.index + m[0].length, closeIdx, endIdx: closeIdx + endTag.length };
          break;
        }
      }
      if (!leafMatch) break;

      let curr = this.skipWhitespace(s, leafMatch.afterBeginIdx);
      if (s[curr] === '[') {
        const ob = this.extractBalanced(s, curr, '[', ']');
        if (ob && ob.openIdx === curr) curr = this.skipWhitespace(s, ob.endIdx + 1);
      }
      if (leafMatch.envName === 'tabularx' || leafMatch.envName === 'tabular*') {
        const wb = this.extractBalanced(s, curr, '{', '}');
        if (wb && wb.openIdx === curr) curr = this.skipWhitespace(s, wb.endIdx + 1);
      }
      let colSpec = '';
      let tblrOpts = {};
      if (s[curr] === '{') {
        const sb = this.extractBalanced(s, curr, '{', '}');
        if (sb && sb.openIdx === curr) {
          colSpec = sb.content;
          curr = sb.endIdx + 1;
          if (/tblr$/.test(leafMatch.envName)) {
            tblrOpts.hlines = /\bhlines\b/.test(colSpec);
            tblrOpts.vlines = /\bvlines\b/.test(colSpec);
            const csIdx = colSpec.indexOf('colspec');
            if (csIdx !== -1) {
              const eqIdx = colSpec.indexOf('=', csIdx);
              if (eqIdx !== -1) {
                const csb = this.extractBalanced(colSpec, eqIdx + 1, '{', '}');
                if (csb) colSpec = csb.content;
              }
            }
          }
        }
      }
      const tableBody = s.slice(curr, leafMatch.closeIdx);
      const htmlTable = this.compileTabular(colSpec, tableBody, compileCellFn, tblrOpts);
      s = s.slice(0, leafMatch.startIdx) + putVault(htmlTable) + s.slice(leafMatch.endIdx);
    }
    return s;
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
    return !/\\(?:begin\{(?:ex|exrd|bt|vd|vdex|cau|tikzpicture|circuitikz|tabular|tabularx|longtable|tblr|eqnarray|align|enumerate|itemize|listEX|enumEX|itemchoice|name)\}|immini|choice|choiceTF|shortans|loigiai|ExamBanner|caulc|cauds|caukq)/.test(withoutTikzScript);
  },

  unwrapChoiceBraces(str) {
    let t = String(str || '').trim();
    while (t.startsWith('{') && t.endsWith('}')) {
      const b = this.extractBalanced(t, 0, '{', '}');
      if (b && b.openIdx === 0 && b.endIdx === t.length - 1) {
        const inner = b.content.trim();
        if (/^\\(?:bf|bfseries|it|itshape|tt|ttfamily|sf|rm|color)\b/.test(inner)) break;
        t = inner;
      } else {
        break;
      }
    }
    return t;
  },

  cleanShortAnsValue(rawAns) {
    return String(rawAns || '')
      .trim()
      .replace(/\$/g, '')
      .replace(/\\,|\\;|\\!|\\:|\\\s+/g, '')
      .replace(/\{,\}/g, ',')
      .replace(/\\text\s*\{[^}]*\}/g, '')
      .replace(/\s+/g, '')
      .replace(/^([+-]?\d+(?:[.,]\d+)?(?:\s*\/\s*\d+)?)(?:\\mathrm\{[^}]*\}|[a-zA-Z°%])+$/, '$1')
      .trim();
  },

  texDimToCss(dimStr, fallback = '1px') {
    const s = String(dimStr || '').trim();
    if (!s) return fallback;
    const lw = s.match(/^([0-9.]*)\s*\\(?:linewidth|textwidth|columnwidth|hsize)$/);
    if (lw) {
      const ratio = lw[1] === '' ? 1 : parseFloat(lw[1]);
      return `${Math.min(100, Math.max(0, (ratio || 1) * 100))}%`;
    }
    const dm = s.match(/^([+-]?[0-9.]+)\s*(pt|px|cm|mm|ex|em|in)$/);
    if (dm) {
      const val = parseFloat(dm[1]);
      if (val === 0) return '0px';
      return `${val}${dm[2]}`;
    }
    return fallback;
  },

  // Bóc tách và render \choice, \choiceTF, \shortans, \shortansfix tương tác trực tiếp bên trong môi trường bài tập
  compileExChoicesInDoc(blockText, compileInlineFn, qMeta = {}) {
    let s = blockText;
    let extraHtml = '';
    let ansSummary = '';
    const qId = qMeta.qId || 1;

    // 1. \choiceTF, \choiceTFt, \choiceTFtColor, \haibang
    const tfMatch = s.match(/\\(choiceTFtColor|choiceTFt|choiceTF|haibang)(?:\[[^\]]*\])?(?![A-Za-z])/);
    if (tfMatch) {
      const cmd = tfMatch[1];
      const pos = tfMatch.index;
      const parsed = this.parseCommandArgs(s, pos + cmd.length + 1, 4, true);
      if (parsed) {
        const letters = ['a', 'b', 'c', 'd'];
        const ansParts = [];
        const itemsHtml = parsed.args.map((raw, idx) => {
          const unwrapped = this.unwrapChoiceBraces(raw);
          const isTrue = /\\True\b|\\true\b/.test(unwrapped);
          const clean = this.unwrapChoiceBraces(unwrapped.replace(/\\True\b|\\true\b|\\sh\b(?:\[[^\]]*\])?/g, '')).trim();
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

    // 2. \choice, \choicefix, \motcot, \haicot, \boncot (4 lựa chọn) & \choicefive, \nammot, \bahai, \haiba, \motnam (5 lựa chọn)
    const choiceMatch = s.match(/\\(choicefive|choicefix|choice|motcot|haicot|boncot|nammot|bahai|haiba|motnam)(?:\[[^\]]*\])?(?![A-Za-z])/);
    if (choiceMatch) {
      const cmd = choiceMatch[1];
      const pos = choiceMatch.index;
      const isFive = /^(?:choicefive|nammot|bahai|haiba|motnam)$/.test(cmd);
      const numOpts = isFive ? 5 : 4;
      const parsed = this.parseCommandArgs(s, pos + cmd.length + 1, numOpts, true);
      if (parsed) {
        const letters = isFive ? ['A', 'B', 'C', 'D', 'E'] : ['A', 'B', 'C', 'D'];
        let cols = 2;
        if (cmd === 'motcot' || cmd === 'motnam' || parsed.opt === '1') cols = 1;
        else if (cmd === 'boncot' || parsed.opt === '4') cols = 4;
        let corrLetter = '';
        const choicesHtml = parsed.args.map((raw, idx) => {
          const unwrapped = this.unwrapChoiceBraces(raw);
          const isTrue = /\\True\b|\\true\b/.test(unwrapped);
          if (isTrue) corrLetter = letters[idx];
          const clean = this.unwrapChoiceBraces(unwrapped.replace(/\\True\b|\\true\b|\\sh\b(?:\[[^\]]*\])?/g, '')).trim();
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

    // 3. \shortans[...]{ans}, \SA[...]{ans}, hoặc \shortansfix[...]{boxes}
    const saMatch = s.match(/\\(shortansfix|shortans|SA)(?:\[[^\]]*\])?(?![A-Za-z])/);
    if (saMatch) {
      const cmd = saMatch[1];
      const pos = saMatch.index;
      const parsed = this.parseCommandArgs(s, pos + cmd.length + 1, 1, true);
      if (parsed) {
        const isBlankFix = cmd === 'shortansfix';
        const ansClean = isBlankFix ? '' : this.cleanShortAnsValue(parsed.args[0]);
        if (ansClean) ansSummary = `Đáp số chuẩn: ${this.escapeHtml(ansClean)}`;
        extraHtml += `<div class="tex-shortans-interact mt-3 flex flex-wrap items-center gap-2" data-part="p3" data-qid="${qId}"${ansClean ? ` data-correct="${this.escapeAttr(ansClean)}"` : ''}>
          <label class="text-xs font-bold text-slate-600"><i class="fa-solid fa-keyboard mr-1 text-indigo-600"></i>Nhập đáp số:</label>
          <input type="text" maxlength="12" placeholder="Điền kết quả..." class="tex-shortans-input px-3 py-1.5 rounded-xl border border-slate-300 bg-white text-xs font-mono font-bold text-slate-800 w-36 focus:border-indigo-500 outline-none">
          ${ansClean ? '<button type="button" class="tex-shortans-check-btn px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold cursor-pointer transition">Kiểm tra</button>' : ''}
          <span class="tex-shortans-feedback text-xs font-bold"></span>
        </div>`;
        if (ansClean) {
          extraHtml += `<div class="tex-shortans-box mt-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-amber-200 bg-amber-50/70 text-xs">
            <span class="font-bold text-amber-800"><i class="fa-solid fa-pen-to-square mr-1"></i>Đáp số trả lời ngắn:</span>
            <span class="tex-shortans-val font-mono font-extrabold text-amber-900 px-2 py-0.5 rounded bg-white border border-amber-300">${this.escapeHtml(ansClean)}</span>
          </div>`;
        }
        s = s.slice(0, pos) + s.slice(parsed.endIdx);
      }
    } else if (qMeta.qPart === 'p3') {
      // Câu thuộc PHẦN III (\caukq) nhưng tác giả không ghi lệnh \shortans -> vẫn tạo ô nhập đáp số tương tác
      extraHtml += `<div class="tex-shortans-interact mt-3 flex flex-wrap items-center gap-2" data-part="p3" data-qid="${qId}">
        <label class="text-xs font-bold text-slate-600"><i class="fa-solid fa-keyboard mr-1 text-indigo-600"></i>Nhập đáp số:</label>
        <input type="text" maxlength="12" placeholder="Điền kết quả..." class="tex-shortans-input px-3 py-1.5 rounded-xl border border-slate-300 bg-white text-xs font-mono font-bold text-slate-800 w-36 focus:border-indigo-500 outline-none">
        <span class="tex-shortans-feedback text-xs font-bold"></span>
      </div>`;
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
    const counters = options.counters || { ex: 0, bt: 0, vd: 0, dl: 0, dn: 0, dang: 0, section: 0, subsection: 0, chapter: 0, p1: 0, p2: 0, p3: 0, activePart: '' };
    if (counters.p1 === undefined) { counters.p1 = 0; counters.p2 = 0; counters.p3 = 0; }
    if (counters.activePart === undefined) counters.activePart = '';
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

    // Gỡ bỏ các khối mã nội bộ LaTeX3 / shipout watermark không hiển thị trong nội dung bài đọc
    s = s.replace(/\\ExplSyntaxOn[\s\S]*?\\ExplSyntaxOff/g, '')
         .replace(/\\makeatletter[\s\S]*?\\makeatother/g, '');
    ['AddToShipoutPictureBG', 'AddToShipoutPictureFG', 'AddToShipoutPicture'].forEach(scmd => {
      s = this.replaceCommand(s, scmd, 1, false, () => '', true);
    });

    // Bảo vệ các khối TikZJax / SVG / math-svg-container đã được biên dịch hoặc nhúng sẵn
    s = s.replace(/<div[^>]*class="[^"]*tex-tikz-figure[^"]*"[\s\S]*?<\/script>\s*<\/div>/gi, m => putVault(m));
    s = s.replace(/<span[^>]*class="[^"]*tex-tikz-inline[^"]*"[\s\S]*?<\/script>\s*<\/span>/gi, m => putVault(m));
    s = s.replace(/<script\s+type="text\/tikz"[\s\S]*?<\/script>/gi, m => putVault(m));
    s = s.replace(/<div[^>]*class="[^"]*math-svg-container[^"]*"[\s\S]*?<\/div>\s*<\/div>/gi, m => putVault(m));
    s = s.replace(/<svg[\s\S]*?<\/svg>/gi, m => putVault(m));

    // Bước 1: Bảo vệ verbatim / lstlisting
    s = s.replace(/\\begin\{(verbatim|lstlisting)\}(?:\[[^\]]*\])?([\s\S]*?)\\end\{\1\}/g, (_m, _env, code) => {
      return putVault(`<pre class="tex-verbatim my-3 p-3 rounded-xl bg-slate-900 text-slate-100 text-xs font-mono overflow-x-auto"><code>${this.escapeHtml(code.replace(/^\r?\n/, ''))}</code></pre>`);
    });

    // Bước 2: Biên dịch trước toàn bộ môi trường TikZ / tkz-tab / pgfplots / circuitikz / chemfig (hỗ trợ cả tikzpicture lồng nhau)
    const tikzEnvStartRe = /\\begin\{(tikzpicture|circuitikz)\}/g;
    let tikzGuard = 0;
    while (tikzEnvStartRe.test(s) && tikzGuard++ < 200) {
      tikzEnvStartRe.lastIndex = 0;
      const mStart = tikzEnvStartRe.exec(s);
      if (!mStart) break;
      const envType = mStart[1];
      const openSeq = `\\begin{${envType}}`;
      const closeSeq = `\\end{${envType}}`;
      let depth = 1;
      let cursor = mStart.index + openSeq.length;
      let endPos = -1;
      while (cursor < s.length && depth > 0) {
        const nextOpen = s.indexOf(openSeq, cursor);
        const nextClose = s.indexOf(closeSeq, cursor);
        if (nextClose === -1) break;
        if (nextOpen !== -1 && nextOpen < nextClose) {
          depth++;
          cursor = nextOpen + openSeq.length;
        } else {
          depth--;
          cursor = nextClose + closeSeq.length;
          if (depth === 0) endPos = cursor;
        }
      }
      if (endPos === -1) break;
      const fullTikz = s.slice(mStart.index, endPos);
      s = s.slice(0, mStart.index) + putVault(this.renderTikzToHtml(fullTikz, preambleInfo, false)) + s.slice(endPos);
    }

    if (s.includes('\\chemfig')) {
      s = this.replaceCommand(s, 'chemfig', 1, true, (opt, body) => {
        const raw = `\\chemfig${opt ? `[${opt}]` : ''}{${body}}`;
        return putVault(this.renderTikzToHtml(raw, preambleInfo, false));
      });
    }

    // Các huy hiệu TikZ inline của gói ex_test / Khaibao (\circled, \circl, \diaml, \circEX, \squareEX, \SquareTF, \oKQ, \dapso)
    ['circled', 'circl', 'diaml', 'circEX', 'squareEX'].forEach(bCmd => {
      if (s.includes('\\' + bCmd)) {
        s = this.replaceCommand(s, bCmd, 1, true, (_opt, val) => {
          return putVault(`<span class="tex-circlenum">${this.compileFragment(val, subOpts({ inlineQuestion: true }))}</span>`);
        });
      }
    });
    s = s.replace(/\\(?:SquareTF|EXboxTF|TF)\b/g, () => putVault('<span class="tex-fbox inline-block w-3.5 h-3.5 align-middle mx-0.5"></span>'));
    if (s.includes('\\oKQ') || s.includes('\\dapso')) {
      s = this.replaceCommand(s, 'oKQ', 1, true, (_opt, val) => {
        return putVault(`<span class="tex-fbox font-mono font-bold px-2 py-0.5 rounded bg-amber-50 border-amber-300 text-amber-900">${this.compileFragment(val, subOpts({ inlineQuestion: true }))}</span>`);
      });
      s = this.replaceCommand(s, 'dapso', 1, true, (_opt, val) => {
        return putVault(`<div class="my-1.5"><span class="tex-fbox font-semibold px-2.5 py-0.5 rounded bg-emerald-50 border-emerald-300 text-emerald-800">Đáp số: ${this.compileFragment(val, subOpts({ inlineQuestion: true }))}</span></div>`);
      });
    }
    if (s.includes('\\tikz')) {
      s = this.replaceCommand(s, 'tikz', 1, true, (opt, body) => {
        const raw = `\\tikz${opt ? `[${opt}]` : ''}{${body}}`;
        return putVault(this.renderTikzToHtml(raw, preambleInfo, true));
      });
      s = s.replace(/\\tikz\b\s*(\[[^\]]*\])?\s*(\\(?:draw|fill|filldraw|shade|node|path|clip)\b[^;]*;)/g, (fullMatch) => {
        return putVault(this.renderTikzToHtml(fullMatch, preambleInfo, true));
      });
    }

    // Bảo vệ ký tự \$ văn bản thành phần tử riêng để không bao giờ kích hoạt nhầm $...$ của KaTeX
    s = s.replace(/\\\$/g, () => putVault('<span class="tex-dollar">$</span>'));

    // Bước 3: Mở rộng Banner đề thi (\ExamBanner, \begin{name}) và các lệnh phân phần (\caulc, \cauds, \caukq, \cautl, \DAPAN)
    if (s.includes('\\ExamBannerEven')) {
      s = this.replaceCommand(s, 'ExamBannerEven', 3, true, () => '');
    }
    if (s.includes('\\ExamBanner')) {
      s = this.replaceCommand(s, 'ExamBanner', 3, true, (_opt, leftCol, centerCol, rightCol) => {
        const fmtBanner = (col) => this.compileFragment(col, subOpts({ inlineQuestion: true }));
        return putVault(`<div class="tex-exam-banner my-3"><svg class="tex-exam-banner-bg" viewBox="0 0 1000 100" preserveAspectRatio="none" aria-hidden="true"><rect width="1000" height="100" fill="#2954a3"/><polygon points="0,0 340,0 440,78 1000,78 1000,105 350,105 240,32 0,32" fill="#4a9bca"/><polygon points="400,0 760,0 700,62 460,62" fill="#4a9bca"/></svg><div class="tex-exam-banner-grid"><div class="tex-exam-banner-left">${fmtBanner(leftCol)}</div><div class="tex-exam-banner-center">${fmtBanner(centerCol)}</div><div class="tex-exam-banner-right">${fmtBanner(rightCol)}</div></div></div>`);
      });
    }
    if (s.includes('\\begin{name}')) {
      s = s.replace(/\\begin\{name\}\s*\{([\s\S]*?)\}\s*\{([\s\S]*?)\}\s*\\end\{name\}/g, (_m, leftInfo, rightTitle) => {
        const lHtml = this.compileFragment(leftInfo, subOpts({ inlineQuestion: true }));
        const rHtml = this.compileFragment(rightTitle, subOpts({ inlineQuestion: true }));
        return putVault(`<div class="tex-name-banner my-3"><div class="tex-name-banner-left">${lHtml}</div><div class="tex-name-banner-right">${rHtml}</div></div>`);
      });
    }
    if (s.includes('\\DAPANA')) {
      s = this.replaceCommand(s, 'DAPANA', 1, false, (_opt, t) => {
        return putVault(`<h2 class="tex-section-heading mt-6 mb-3">${this.compileFragment(t, subOpts({ inlineQuestion: true }))}</h2>`);
      });
    }
    s = s.replace(/\\DAPAN\b/g, () => putVault('<h2 class="tex-section-heading mt-6 mb-3">BẢNG ĐÁP ÁN &amp; HƯỚNG DẪN GIẢI CHI TIẾT</h2>'));

    // Chuyển môi trường \begin{caulc|cautn|cauds|caukq|cautl} về lệnh tương ứng trước khi biên dịch câu hỏi
    s = s.replace(/\\begin\{(caulc|cautn|cauds|caukq|cautl)\}/gi, (_m, pName) => `\\${pName.toLowerCase()}\n`);
    s = s.replace(/\\end\{(?:caulc|cautn|cauds|caukq|cautl)\}/gi, '');

    if (/\\(?:caulc|cautn|cauds|caukq|cautl)\b/.test(s)) {
      const PART_INFO = {
        caulc: { code: 'p1', title: 'PHẦN I. Câu trắc nghiệm nhiều phương án lựa chọn', desc: 'Mỗi câu hỏi thí sinh chỉ chọn một phương án.' },
        cautn: { code: 'p1', title: 'PHẦN I. Câu trắc nghiệm nhiều phương án lựa chọn', desc: 'Mỗi câu hỏi thí sinh chỉ chọn một phương án.' },
        cauds: { code: 'p2', title: 'PHẦN II. Câu trắc nghiệm đúng sai', desc: 'Trong mỗi ý a), b), c), d) ở mỗi câu, thí sinh chọn đúng hoặc sai.' },
        caukq: { code: 'p3', title: 'PHẦN III. Câu trắc nghiệm trả lời ngắn', desc: 'Thí sinh điền kết quả số vào ô trả lời tương ứng.' },
        cautl: { code: 'p4', title: 'PHẦN IV. Tự luận', desc: '' }
      };
      s = s.replace(/\\(caulc|cautn|cauds|caukq|cautl)(?:\s*\[([^\]]*)\])?(?![A-Za-z])/g, (full, cmd, customTitle, offset, fullStr) => {
        const meta = PART_INFO[cmd];
        const prevWindow = fullStr.slice(Math.max(0, offset - 240), offset);
        const alreadyHasHeading = /PHẦN\s+(?:I{1,3}|IV|[1-4])\b/i.test(prevWindow);
        const headingText = customTitle ? this.compileFragment(customTitle, subOpts({ inlineQuestion: true })) : meta.title;
        const descHtml = (!customTitle && meta.desc) ? `<p class="tex-part-desc text-xs text-slate-500 mt-0.5 mb-0">${meta.desc}</p>` : '';
        const headingVault = alreadyHasHeading ? '' : putVault(`<div class="tex-part-section mt-6 mb-3"><h2 class="tex-section-heading m-0">${headingText}</h2>${descHtml}</div>`);
        return `${headingVault}\\setcounter{ex}{0}@@SETPART_${meta.code}@@`;
      });
    }

    // Bước 4: Môi trường Bài tập / Ví dụ / Định lí / Chú ý / Dạng toán (chạy TRƯỚC \immini & bảo vệ Toán để không đứt ngoặc nhọn hay $8$ trong \shortans)
    if (!options.inlineQuestion) {
      const envMeta = {
        ex: { prefix: 'Câu', cls: 'tex-env-ex', counter: 'ex', icon: 'fa-circle-question' },
        cau: { prefix: 'Câu', cls: 'tex-env-ex', counter: 'ex', icon: 'fa-circle-question' },
        exrd: { prefix: 'Câu', cls: 'tex-env-ex', counter: 'ex', icon: 'fa-circle-question' },
        bt: { prefix: 'Bài', cls: 'tex-env-bt', counter: 'bt', icon: 'fa-pen-ruler' },
        vd: { prefix: 'Ví dụ', cls: 'tex-env-vd', counter: 'vd', icon: 'fa-lightbulb' },
        vdex: { prefix: 'Ví dụ', cls: 'tex-env-vd', counter: 'vd', icon: 'fa-lightbulb' },
        dl: { prefix: 'Định lí', cls: 'tex-env-dl', counter: 'dl', icon: 'fa-bookmark' },
        dn: { prefix: 'Định nghĩa', cls: 'tex-env-dn', counter: 'dn', icon: 'fa-book' },
        kn: { prefix: 'Khái niệm', cls: 'tex-env-dn', counter: null, icon: 'fa-book-open' },
        tc: { prefix: 'Tính chất', cls: 'tex-env-dl', counter: null, icon: 'fa-layer-group' },
        hq: { prefix: 'Hệ quả', cls: 'tex-env-dl', counter: null, icon: 'fa-code-branch' },
        nx: { prefix: 'Nhận xét', cls: 'tex-env-note', counter: null, icon: 'fa-comment-dots' },
        note: { prefix: 'Ghi chú', cls: 'tex-env-note', counter: null, icon: 'fa-note-sticky' },
        cy: { prefix: 'Chú ý', cls: 'tex-env-warn', counter: null, icon: 'fa-triangle-exclamation' },
        chuy: { prefix: 'Chú ý', cls: 'tex-env-warn', counter: null, icon: 'fa-triangle-exclamation' },
        luuy: { prefix: 'Lưu ý', cls: 'tex-env-warn', counter: null, icon: 'fa-triangle-exclamation' },
        dang: { prefix: 'Dạng', cls: 'tex-env-dang', counter: 'dang', icon: 'fa-compass-drafting' },
        tomtat: { prefix: 'Tóm tắt lý thuyết', cls: 'tex-env-dn', counter: null, icon: 'fa-clipboard-list' },
        boxdn: { prefix: 'Kiến thức trọng tâm', cls: 'tex-env-dn', counter: null, icon: 'fa-star' },
        khung: { prefix: 'Khung kiến thức', cls: 'tex-env-dn', counter: null, icon: 'fa-star' }
      };

      const envNames = Object.keys(envMeta).join('|');
      const leafEnvRe = new RegExp(`@@SETPART_(p[1-4])@@|\\\\setcounter\\{(ex|cau|bt|vd|dl|dn|dang|chapter|section|subsection)\\}\\{(\\d+)\\}|\\\\begin\\{(${envNames})\\}(?:\\[([^\\]]*)\\])?((?:(?!\\\\begin\\{(?:${envNames})\\})[\\s\\S])*?)\\\\end\\{\\4\\}`, 'gi');
      let envGuard = 0;
      while (leafEnvRe.test(s) && envGuard++ < 12) {
        leafEnvRe.lastIndex = 0;
        s = s.replace(leafEnvRe, (_m, partCode, scName, scVal, rawName, optTitle, rawBody) => {
          if (partCode) {
            counters.activePart = partCode;
            return '';
          }
          if (scName) {
            const cKey = scName.toLowerCase() === 'cau' ? 'ex' : scName.toLowerCase();
            counters[cKey] = parseInt(scVal, 10) || 0;
            return '';
          }
          const key = rawName.toLowerCase();
          const meta = envMeta[key];
          const num = meta.counter ? (++counters[meta.counter]) : '';
          let body = rawBody.trim();
          let titleParam = optTitle || '';

          // Hỗ trợ \begin{dang}{Tiêu đề dạng} dùng ngoặc nhọn bắt buộc
          if (!titleParam && ['dang', 'khung', 'boxdn', 'tomtat'].includes(key) && body.startsWith('{')) {
            const tb = this.extractBalanced(body, 0, '{', '}');
            if (tb && tb.openIdx === 0) {
              titleParam = tb.content.trim();
              body = body.slice(tb.endIdx + 1).trim();
            }
          }

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
          if (['ex', 'cau', 'exrd', 'bt', 'vd', 'vdex'].includes(key)) {
            if (/\\(?:choiceTFtColor|choiceTFt|choiceTF|haibang)(?:\[[^\]]*\])?(?![A-Za-z])/.test(body)) qPart = 'p2';
            else if (/\\(?:shortansfix|shortans|SA)(?:\[[^\]]*\])?(?![A-Za-z])/.test(body)) qPart = 'p3';
            else if (/\\(?:choicefix|choice|motcot|haicot|boncot|choicefive|nammot|bahai|haiba|motnam)(?:\[[^\]]*\])?(?![A-Za-z])/.test(body)) qPart = 'p1';
            else if (counters.activePart === 'p3' && ['ex', 'cau', 'exrd'].includes(key)) qPart = 'p3';
            else if (counters.activePart === 'p4') qPart = '';
            else if (['ex', 'cau', 'exrd'].includes(key)) qPart = counters.activePart || 'p1';

            if (qPart) qId = ++counters[qPart];
          }

          const { bodyRest, extraHtml, ansSummary } = this.compileExChoicesInDoc(
            body,
            (frag) => this.compileFragment(frag, subOpts({ inlineQuestion: true })),
            { qPart, qId: qId || num || 1 }
          );

          const loigiaiHtml = this.buildLoigiaiHtml(lgContent, ansSummary, openSolutions);
          const compiledStem = this.compileFragment(bodyRest, subOpts({ inlineQuestion: true }));
          const optBadge = titleParam ? ` <span class="tex-env-opt">(${this.compileFragment(titleParam, subOpts({ inlineQuestion: true }))})</span>` : '';
          const headerLabel = `${meta.prefix}${num ? ' ' + num : ''}.${optBadge}`;
          const qAttrs = qPart ? ` data-qpart="${qPart}" data-qid="${qId}" id="html_q_${qPart}_${qId}"` : '';
          const statusSpan = qPart ? '<span class="tex-q-status hidden"></span>' : '';

          return putVault(`<article class="tex-env ${meta.cls} my-4"${qAttrs}><div class="tex-env-header"><span class="tex-env-badge"><i class="fa-solid ${meta.icon} mr-1.5"></i>${headerLabel}</span>${statusSpan}</div><div class="tex-env-body">${compiledStem}${extraHtml}${loigiaiHtml}</div></article>`);
        });
      }
      s = s.replace(/@@SETPART_p[1-4]@@/g, '');
    }

    // Xử lý \loigiai{...} lẻ bên ngoài môi trường
    if (s.includes('\\loigiai')) {
      s = this.replaceCommand(s, 'loigiai', 1, true, (_opt, lgBody) => {
        const lgContent = this.compileFragment(lgBody, subOpts());
        return putVault(this.buildLoigiaiHtml(lgContent, '', openSolutions));
      });
    }

    // Bước 5: Xử lý \immini, \imminiL, \IMleftright, \IMrightleft bằng ngoặc nhọn cân bằng
    let imminiGuard = 0;
    while (/\\(?:imminiL|immini|IMleftright|IMrightleft)\b/.test(s) && imminiGuard++ < 15) {
      ['immini', 'IMleftright'].forEach(imCmd => {
        if (s.includes('\\' + imCmd)) {
          s = this.replaceCommand(s, imCmd, 2, true, (_opt, leftText, rightFig) => {
            const leftHtml = this.compileFragment(leftText, subOpts());
            const rightHtml = this.compileFragment(rightFig, subOpts());
            if (!leftHtml.trim()) return putVault(`<div class="tex-center my-2">${rightHtml}</div>`);
            if (!rightHtml.trim()) return putVault(leftHtml);
            return putVault(`<div class="tex-immini my-2"><div class="tex-immini-content">${leftHtml}</div><div class="tex-immini-figure">${rightHtml}</div></div>`);
          });
        }
      });
      ['imminiL', 'IMrightleft'].forEach(imCmd => {
        if (s.includes('\\' + imCmd)) {
          s = this.replaceCommand(s, imCmd, 2, true, (_opt, leftFig, rightText) => {
            const figHtml = this.compileFragment(leftFig, subOpts());
            const txtHtml = this.compileFragment(rightText, subOpts());
            if (!txtHtml.trim()) return putVault(`<div class="tex-center my-2">${figHtml}</div>`);
            if (!figHtml.trim()) return putVault(txtHtml);
            return putVault(`<div class="tex-immini my-2"><div class="tex-immini-figure">${figHtml}</div><div class="tex-immini-content">${txtHtml}</div></div>`);
          });
        }
      });
    }

    // Bước 6: Chuẩn hóa các môi trường Toán nhiều dòng (eqnarray*, align*, gather*, multline*, equation*)
    s = s.replace(/\\allowdisplaybreaks(?:\[\d*\])?/g, '');

    s = s.replace(/\\begin\{eqnarray\*?\}([\s\S]*?)\\end\{eqnarray\*?\}/g, (_m, body) => {
      return this.convertEqnarrayBody(body);
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

    // Bước 7: Bảo vệ toàn bộ khối Toán ($...$, $$...$$, \[...\], \(...\)) vào Vault
    const mathBlockRe = /\$\$[\s\S]*?\$\$|\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\)|\$(?:\\.|[^\$\\\r\n]|\r?\n(?!\r?\n))+?\$/g;
    s = s.replace(mathBlockRe, (mathToken) => {
      if (mathToken.startsWith('$$')) {
        return putVault(`$$${this.expandMathMacros(mathToken.slice(2, -2))}$$`);
      }
      if (mathToken.startsWith('\\[')) {
        return putVault(`\\[${this.expandMathMacros(mathToken.slice(2, -2))}\\]`);
      }
      if (mathToken.startsWith('\\(')) {
        return putVault(`\\(${this.expandMathMacros(mathToken.slice(2, -2).replace(/\r?\n/g, ' '))}\\)`);
      }
      return putVault(`$${this.expandMathMacros(mathToken.slice(1, -1).replace(/\r?\n/g, ' '))}$`);
    });

    // Xử lý \heva và \hoac đứng trần ngoài $...$ (nếu có)
    if (s.includes('\\heva') || s.includes('\\hoac')) {
      s = this.replaceCommand(s, 'heva', 1, false, (_opt, body) => putVault(`$${this.formatSystemBody(body, '\\{')}$`));
      s = this.replaceCommand(s, 'hoac', 1, false, (_opt, body) => putVault(`$${this.formatSystemBody(body, '[')}$`));
    }

    // Bước 8: Bảng biểu leaf-first (tabular, tabular*, tabularx, longtable, xtabular, tblr, longtblr, talltblr)
    if (/\\begin\{(?:tabularx|tabular\*|tabular|longtable|xtabular|tblr|longtblr|talltblr)\}/.test(s)) {
      s = this.compileAllTables(s, putVault, (cell) => this.compileFragment(cell, subOpts({ inlineQuestion: true })));
    }

    // Bước 9: Danh sách lồng nhau (itemchoice, enumerate, itemize, description, listEX, enumEX, enumEXV, taskEX, tasks, circ_enum)
    const LIST_ENV_NAMES = 'itemchoice|enumerate|itemize|description|listEX|enumEXV|enumEX|taskEX|tasks|circ_enum';
    const leafListRe = new RegExp(`\\\\begin\\{(${LIST_ENV_NAMES})\\}(?:\\[([^\\]]*)\\])?(?:\\{(\\d+)\\})?(?:\\((\\d+)\\))?((?:(?!\\\\begin\\{(?:${LIST_ENV_NAMES})\\})[\\s\\S])*?)\\\\end\\{\\1\\}`, 'i');
    let listGuard = 0;
    while (leafListRe.test(s) && listGuard++ < 25) {
      s = s.replace(leafListRe, (_m, envName, optSpec, braceCols, parenCols, inner) => {
        const lowerEnv = envName.toLowerCase();
        const splitRe = lowerEnv === 'itemchoice'
          ? /\\(?:itemch|item)\b/
          : ((lowerEnv === 'tasks' || lowerEnv === 'taskex') ? /\\(?:task|item)\b/ : /\\item\b/);
        const parts = inner.split(splitRe);
        const lead = (parts.shift() || '').trim();
        const leadHtml = lead ? this.compileFragment(lead, subOpts()) : '';
        if (parts.length === 0) return leadHtml ? putVault(leadHtml) : '';

        const effectiveSpec = lowerEnv === 'itemchoice' ? (optSpec || 'a)') : optSpec;

        const formatAutoLabel = (idx, spec) => {
          if (lowerEnv === 'circ_enum') {
            return `<span class="tex-circlenum">${idx + 1}</span>`;
          }
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
          const badge = customLabel !== null ? customLabel : formatAutoLabel(idx, effectiveSpec);
          return `<li class="tex-li"><span class="tex-li-marker">${badge}</span><div class="flex-1 min-w-0">${bodyHtml}</div></li>`;
        }).join('');

        let cols = 1;
        if (braceCols && /^[1-4]$/.test(braceCols)) cols = Number(braceCols);
        else if (parenCols && /^[1-4]$/.test(parenCols)) cols = Number(parenCols);
        else if ((lowerEnv === 'listex' || lowerEnv === 'enumex') && optSpec && /^[234]$/.test(optSpec.trim())) cols = Number(optSpec.trim());

        const gridCls = cols > 1 ? `tex-list-grid tex-list-cols-${cols}` : 'space-y-1.5';
        return putVault(`${leadHtml}<ul class="tex-list ${gridCls} my-2">${liHtml}</ul>`);
      });
    }

    // Bước 10: Các môi trường bố cục (multicols, center, flushright, flushleft, quote, minipage, proof, tcolorbox, figure, table)
    let layoutGuard = 0;
    const layoutRe = /\\begin\{(multicols|center|flushright|flushleft|quote|quotation|abstract|proof|minipage|tcolorbox|figure|table)\}(?:\[[^\]]*\])?(?:\{([^}]*)\})?((?:(?!\\begin\{(?:multicols|center|flushright|flushleft|quote|quotation|abstract|proof|minipage|tcolorbox|figure|table)\})[\s\S])*?)\\end\{\1\}/i;
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

    // Bước 11: Phân mục tiêu đề (\part, \chapter, \section, \subsection, \subsubsection, \paragraph)
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

    // Phòng trường hợp \itemch hoặc \item lẻ (VD: \immini tách \item ra khỏi \begin{itemize})
    if (s.includes('\\itemch')) {
      let strayIdx = 0;
      s = s.replace(/\\itemch\b\s*/g, () => {
        const ch = String.fromCharCode(97 + ((strayIdx++) % 4));
        return `<br><strong class="text-indigo-600">${ch})</strong> `;
      });
    }
    if (/\\item(?![A-Za-z])/.test(s)) {
      const iParts = s.split(/\\item(?![A-Za-z])/);
      const iLead = iParts.shift();
      const renderedItems = iParts.map((rawIt) => {
        let itStr = rawIt.trim();
        let marker = '<span class="tex-bullet">•</span>';
        let liCls = 'tex-li tex-li-bullet';
        if (itStr.startsWith('[')) {
          const lb = this.extractBalanced(itStr, 0, '[', ']');
          if (lb && lb.openIdx === 0) {
            marker = `<span class="tex-li-marker">${this.compileFragment(lb.content, subOpts({ inlineQuestion: true }))}</span>`;
            liCls = 'tex-li';
            itStr = itStr.slice(lb.endIdx + 1).trim();
          }
        }
        return `<li class="${liCls}">${marker}<div class="flex-1 min-w-0">${this.compileFragment(itStr, subOpts())}</div></li>`;
      }).join('');
      s = `${iLead}${putVault(`<ul class="tex-list space-y-1.5 my-1.5">${renderedItems}</ul>`)}`;
    }

    // Bước 12: Loại bỏ hoàn toàn các lệnh khai báo gói, thư viện, bảng đáp án ngoài lề và điều khiển trang
    s = s.replace(/\\Opensolutionfile\s*\{[^}]*\}\s*(?:\[[^\]]*\])?/gi, '');
    s = s.replace(/\\OPTN\b/g, '');
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
    ['documentclass', 'usepackage', 'RequirePackage', 'usetikzlibrary', 'usepgfplotslibrary', 'tcbuselibrary', 'UseTblrLibrary', 'SetTblrInner', 'SetTblrOuter', 'DefTblrTemplate', 'tcbset', 'tikzset', 'pgfplotsset', 'sisetup', 'captionsetup', 'geometry', 'linespread', 'fontfamily', 'everymath', 'everydisplay', 'hideansEX', 'showansEX', 'dotlineans', 'dotlinefull', 'title', 'author', 'date', 'Closesolutionfile', 'Readsolutionfile', 'pagestyle', 'thispagestyle', 'pagenumbering', 'bibliographystyle', 'input', 'include', 'label', 'ref', 'eqref', 'vphantom'].forEach(cmd => {
      if (cmd === 'ref' || cmd === 'eqref') {
        s = this.replaceCommand(s, cmd, 1, false, (_opt, r) => putVault(`<span class="font-mono text-indigo-600">(${this.escapeHtml(restoreVault(r))})</span>`));
      } else {
        s = this.replaceCommand(s, cmd, 1, true, () => '');
      }
    });
    ['definecolor', 'providecolor'].forEach(cmd => {
      s = this.replaceCommand(s, cmd, 3, true, () => '');
    });
    ['setcounter', 'addtocounter', 'setlength', 'addtolength', 'indapan', 'inputansbox', 'colorlet', 'fontsize'].forEach(cmd => {
      s = this.replaceCommand(s, cmd, 2, true, () => '');
    });
    ['fancyhf', 'fancyhead', 'fancyfoot', 'lhead', 'rhead', 'chead', 'lfoot', 'rfoot', 'cfoot', 'vspace', 'hspace'].forEach(cmd => {
      s = this.replaceCommand(s, cmd, 1, true, () => '', true);
    });

    // Thanh kẻ \rule[raise]{width}{height} (VD: \textcolor{\maincolor}{\rule[0.5ex]{2cm}{1pt}} HẾT)
    if (s.includes('\\rule')) {
      s = this.replaceCommand(s, 'rule', 2, true, (raiseOpt, w, h) => {
        const cssW = this.texDimToCss(w, '2cm');
        const cssH = this.texDimToCss(h, '1px');
        const cssRaise = raiseOpt ? this.texDimToCss(raiseOpt, '0px') : '0px';
        return putVault(`<span class="tex-rule" style="width:${cssW};height:${cssH};vertical-align:${cssRaise}"></span>`);
      });
    }

    // Bước 13: Các lệnh định dạng văn bản inline có ngoặc nhọn cân bằng (hỗ trợ lồng nhau & giải mã màu \maincolor / xcolor!)
    let fmtGuard = 0;
    const inlineCmds = ['textbf', 'textit', 'emph', 'underline', 'texttt', 'textsc', 'textsf', 'textrm', 'textmd', 'textnormal', 'MakeUppercase', 'MakeLowercase', 'centerline', 'circlenum', 'textcolor', 'fcolorbox', 'fbox', 'framebox', 'mbox', 'makebox', 'parbox', 'raisebox', 'phantom', 'hphantom', 'href', 'url', 'footnote'];
    while (inlineCmds.some(c => s.includes('\\' + c)) && fmtGuard++ < 14) {
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
      s = this.replaceCommand(s, 'textmd', 1, false, (_opt, body) => {
        return putVault(`<span class="font-normal">${this.compileFragment(body, subOpts({ inlineQuestion: true }))}</span>`);
      });
      s = this.replaceCommand(s, 'textnormal', 1, false, (_opt, body) => {
        return putVault(`<span class="font-normal not-italic">${this.compileFragment(body, subOpts({ inlineQuestion: true }))}</span>`);
      });
      s = this.replaceCommand(s, 'MakeUppercase', 1, false, (_opt, body) => {
        return putVault(`<span class="uppercase">${this.compileFragment(body, subOpts({ inlineQuestion: true }))}</span>`);
      });
      s = this.replaceCommand(s, 'MakeLowercase', 1, false, (_opt, body) => {
        return putVault(`<span class="lowercase">${this.compileFragment(body, subOpts({ inlineQuestion: true }))}</span>`);
      });
      s = this.replaceCommand(s, 'textsf', 1, false, (_opt, body) => this.compileFragment(body, subOpts({ inlineQuestion: true })));
      s = this.replaceCommand(s, 'textrm', 1, false, (_opt, body) => this.compileFragment(body, subOpts({ inlineQuestion: true })));
      s = this.replaceCommand(s, 'mbox', 1, false, (_opt, body) => this.compileFragment(body, subOpts({ inlineQuestion: true })));
      s = this.replaceCommand(s, 'makebox', 1, true, (_opt, body) => this.compileFragment(body, subOpts({ inlineQuestion: true })));
      s = this.replaceCommand(s, 'parbox', 2, true, (_opt, _w, body) => {
        return putVault(`<span class="inline-block align-middle">${this.compileFragment(body, subOpts({ inlineQuestion: true }))}</span>`);
      });
      s = this.replaceCommand(s, 'raisebox', 2, false, (_opt, _lift, body) => this.compileFragment(body, subOpts({ inlineQuestion: true })));
      s = this.replaceCommand(s, 'fbox', 1, false, (_opt, body) => {
        return putVault(`<span class="tex-fbox">${this.compileFragment(body, subOpts({ inlineQuestion: true }))}</span>`);
      });
      s = this.replaceCommand(s, 'framebox', 1, true, (_opt, body) => {
        return putVault(`<span class="tex-fbox">${this.compileFragment(body, subOpts({ inlineQuestion: true }))}</span>`);
      });
      s = this.replaceCommand(s, 'fcolorbox', 3, true, (modelOpt, bCol, bgCol, body) => {
        const borderCss = modelOpt ? `rgb(${(this.parseColorSpecToRgb(modelOpt, bCol, preambleInfo?.colors) || [100, 116, 139]).join(',')})` : this.resolveLaTeXColor(bCol, preambleInfo);
        const bgCss = modelOpt ? `rgb(${(this.parseColorSpecToRgb(modelOpt, bgCol, preambleInfo?.colors) || [248, 250, 252]).join(',')})` : this.resolveLaTeXColor(bgCol, preambleInfo);
        return putVault(`<span class="tex-fbox" style="border-color:${borderCss};background-color:${bgCss}">${this.compileFragment(body, subOpts({ inlineQuestion: true }))}</span>`);
      });
      s = this.replaceCommand(s, 'phantom', 1, false, (_opt, body) => {
        return putVault(`<span class="invisible">${this.compileFragment(body, subOpts({ inlineQuestion: true }))}</span>`);
      });
      s = this.replaceCommand(s, 'hphantom', 1, false, (_opt, body) => {
        return putVault(`<span class="invisible">${this.compileFragment(body, subOpts({ inlineQuestion: true }))}</span>`);
      });
      s = this.replaceCommand(s, 'circlenum', 1, false, (_opt, body) => {
        return putVault(`<span class="tex-circlenum">${this.escapeHtml(restoreVault(body).trim())}</span>`);
      });
      s = this.replaceCommand(s, 'textcolor', 2, true, (modelOpt, col, body) => {
        let safeCol = 'inherit';
        if (modelOpt) {
          const rgb = this.parseColorSpecToRgb(modelOpt, col, preambleInfo?.colors);
          if (rgb) safeCol = `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
        } else {
          safeCol = this.resolveLaTeXColor(col, preambleInfo);
        }
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

    // Nhóm lệnh cổ điển trong ngoặc nhọn: {\bf ...}, {\bfseries ...}, {\it ...}, {\itshape ...}, {\color{...} ...}
    let grpGuard = 0;
    while (/\{\s*\\(?:bf|bfseries|it|itshape|sl|tt|ttfamily|color)\b/.test(s) && grpGuard++ < 10) {
      s = s.replace(/\{\s*\\(?:bf|bfseries)\b\s*([^{}]*)\}/g, (_m, inner) => putVault(`<strong>${this.compileFragment(inner, subOpts({ inlineQuestion: true }))}</strong>`));
      s = s.replace(/\{\s*\\(?:it|itshape|sl)\b\s*([^{}]*)\}/g, (_m, inner) => putVault(`<em>${this.compileFragment(inner, subOpts({ inlineQuestion: true }))}</em>`));
      s = s.replace(/\{\s*\\(?:tt|ttfamily)\b\s*([^{}]*)\}/g, (_m, inner) => putVault(`<code>${this.compileFragment(inner, subOpts({ inlineQuestion: true }))}</code>`));
      s = s.replace(/\{\s*\\color(?:\[([^\]]*)\])?\{([^}]*)\}\s*([^{}]*)\}/g, (_m, mOpt, col, inner) => {
        const cssCol = mOpt
          ? `rgb(${(this.parseColorSpecToRgb(mOpt, col, preambleInfo?.colors) || [30, 64, 175]).join(',')})`
          : this.resolveLaTeXColor(col, preambleInfo);
        return putVault(`<span style="color:${cssCol}">${this.compileFragment(inner, subOpts({ inlineQuestion: true }))}</span>`);
      });
    }
    if (s.includes('\\color')) {
      s = this.replaceCommand(s, 'color', 1, true, () => '');
    }

    // Biểu tượng FontAwesome LaTeX (\faGraduationCap, \faBook, \faCheck...)
    if (s.includes('\\fa')) {
      const FA_MAP = {
        faGraduationCap: 'fa-graduation-cap', faBook: 'fa-book', faLightbulbO: 'fa-lightbulb', faLightbulb: 'fa-lightbulb',
        faCheck: 'fa-check', faCheckCircle: 'fa-circle-check', faWarning: 'fa-triangle-exclamation', faExclamationTriangle: 'fa-triangle-exclamation',
        faStar: 'fa-star', faPencil: 'fa-pencil', faEdit: 'fa-pen-to-square', faCogs: 'fa-gears', faHeart: 'fa-heart', faBookmark: 'fa-bookmark'
      };
      s = s.replace(/\\(fa[A-Z][A-Za-z0-9]*)\b\s*/g, (_m, faName) => {
        const cls = FA_MAP[faName];
        return cls ? putVault(`<i class="fa-solid ${cls} mx-0.5"></i>`) : '';
      });
    }

    // Lệnh tạo dòng kẻ / ngắt trang / căn đều 2 bên (\hfill) / dấu ba chấm ngoài toán
    s = s.replace(/\\(?:newpage|clearpage|cleardoublepage|pagebreak)\b/g, () => putVault('<hr class="tex-pagebreak my-5 border-dashed border-slate-300">'));
    s = s.replace(/\\(?:hrule|vhrulefill|hrulefill)\b/g, () => putVault('<hr class="my-3 border-slate-300">'));
    s = s.replace(/\\dotfill\b/g, () => putVault('<span class="tex-dotfill"></span>'));
    s = s.replace(/\\(?:ldots|dots|cdots)\b\s*/g, '…');
    s = s.replace(/\\textdegree\b/g, '°').replace(/\\checkmark\b/g, '✓').replace(/\\slash\b/g, '/');
    s = s.replace(/\\hfill\b/g, '@@TEX_HFILL@@');

    // Xóa các cờ chuyển font / kích thước / căn lề LaTeX trần còn lại (bao gồm \bf, \it, \selectfont, \displaystyle, \arraybackslash, \big...)
    s = s.replace(/\\(?:tiny|scriptsize|footnotesize|small|normalsize|large|Large|LARGE|huge|Huge|bfseries|mdseries|itshape|slshape|upshape|scshape|rmfamily|sffamily|ttfamily|normalfont|bf|it|rm|sf|tt|sl|sc|cal|selectfont|displaystyle|textstyle|scriptstyle|arraybackslash|centering|raggedright|raggedleft|noindent|indent|leavevmode|relax|protect|sh|quad|qquad|smallskip|medskip|bigskip|vfill|big|Big|bigg|Bigg|linewidth|textwidth|columnwidth)\b\s*/g, (cmd) => {
      if (/quad/.test(cmd)) return ' ';
      return '';
    });

    // Bước 14: Nhận diện một số biểu thức Toán trần phổ biến ngoài $...$ (tương thích dữ liệu cũ)
    s = s.replace(/(\b\d+(?:[,\.]\d+)?\s*\^\s*\\circ)/g, (m) => putVault(`$${m}$`));
    s = s.replace(/(\\vec\{[^{}]+\}|\\d?frac\{[^{}]+\}\{[^{}]+\}|\\sqrt(?:\[[^\]]*\])?\{[^{}]+\}|\\mathbb\{[A-Za-z]+\})/g, (m) => putVault(`$${m}$`));
    s = s.replace(/(\\Rightarrow|\\Leftrightarrow|\\perp|\\parallel|\\approx|\\pm|\\mp|\\in|\\notin|\\subset|\\cup|\\cap|\\forall|\\exists)(?![A-Za-z])/g, (m) => putVault(`$${m}$`));

    // Bước 15: Escape HTML phần văn bản thuần còn lại & chuyển đổi dấu câu/xuống dòng LaTeX
    s = s.replace(/\\&/g, '@@ESC_AMP@@')
         .replace(/\\%/g, '@@ESC_PCT@@')
         .replace(/\\#/g, '@@ESC_HASH@@')
         .replace(/\\_/g, '@@ESC_US@@')
         .replace(/\\\{/g, '@@ESC_LB@@')
         .replace(/\\\}/g, '@@ESC_RB@@');

    // Bảo vệ các thẻ HTML định dạng an toàn đã được biên dịch từ bước trước (giữ nguyên tính lũy đẳng mà vẫn escape "a < b")
    s = s.replace(/<\/?(?:a|strong|em|br|hr|p|ul|ol|li|div|span|table|thead|tbody|tr|td|th|article|details|summary|pre|code|blockquote|figure|figcaption|header|h[1-4]|i|button|input|label)(?:\s+(?:id|href|target|rel|title|aria-hidden|class|style|colspan|rowspan|open|type|maxlength|placeholder|data-[a-z0-9-]+)(?:="[^"]*")?)*\s*\/?>/gi, m => putVault(m));

    // Gỡ bỏ cặp ngoặc nhọn nhóm đơn thuần { ... } còn sót trong văn xuôi
    let braceCleanup = 0;
    while (/\{([^{}\\]*)\}/.test(s) && braceCleanup++ < 5) {
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
    const tableCount = (body.match(/\\begin\{(?:tabular|tabular\*|tabularx|longtable|xtabular|tblr|longtblr|talltblr)\}/g) || []).length;
    const envExCount = (body.match(/\\begin\{(?:ex|exrd|bt|vd|vdex|cau)\}/gi) || []).length;
    const plainExCount = (body.match(/(?:\\textbf\{\s*(?:Câu|Bài)\s+\d+\s*[:.]?\s*\}|(?:^|\n)\s*(?:Câu|Bài)\s+\d+\s*[:.])/gi) || []).length;
    const exCount = envExCount || plainExCount;
    const mathCount = (body.match(/\$\$[\s\S]*?\$\$|\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\)|\\begin\{(?:eqnarray|align|gather|equation)\*?\}|\$[^$\n]+\$/g) || []).length;

    let html = '';
    const parserObj = (typeof TeXParser !== 'undefined' && TeXParser)
      ? TeXParser
      : (typeof require === 'function' ? (() => { try { return require('./tex_parser.js'); } catch (_) { return null; } })() : null);

    if (options.engine === 'latexjs' && typeof window !== 'undefined' && window.latexjs && tikzCount === 0 && !/\\(?:begin\{(?:ex|bt|vd|eqnarray|tblr|itemchoice|name)|immini|choice|loigiai|heva|hoac|ExamBanner|caulc|cauds|caukq)/.test(body)) {
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
    const preambleInfo = options.preambleInfo || ex.tex_preamble || (ex.tex_macros ? { macros: ex.tex_macros, tikzLibraries: [], texPackages: [] } : null);
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
    .tex-fbox { display: inline-block; padding: 0.1rem 0.45rem; border: 1.25px solid var(--border); border-radius: 0.35rem; }
    .tex-rule { display: inline-block; background-color: currentColor; }
    .tex-exam-banner { position: relative; overflow: hidden; border-radius: 0 0 0.85rem 0.85rem; padding: 0.9rem 1.2rem; color: #fff; background: #2954a3; }
    .tex-exam-banner-bg { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; }
    .tex-exam-banner-grid { position: relative; z-index: 1; display: grid; grid-template-columns: 1fr 1.35fr 0.85fr; gap: 0.75rem; align-items: center; font-weight: 700; font-size: 0.88rem; line-height: 1.45; }
    .tex-exam-banner-center { text-align: center; font-size: 1rem; font-weight: 800; }
    .tex-exam-banner-right { text-align: right; }
    .tex-name-banner { display: grid; grid-template-columns: 1fr 1.2fr; gap: 0.75rem; padding: 0.85rem 1.1rem; border: 1.5px solid var(--border); border-radius: 0.85rem; background: var(--accent-soft); align-items: center; font-size: 0.9rem; }
    .tex-name-banner-right { text-align: center; font-weight: 800; color: var(--accent); }
    .tex-part-section { border-left: 4px solid var(--accent); padding-left: 0.75rem; }
    .katex-display { overflow-x: auto; overflow-y: hidden; }
    @media (max-width: 640px) { .container { padding: 1.1rem; margin: 0.5rem; } .tex-choices-grid, .tex-exam-banner-grid, .tex-name-banner { grid-template-columns: 1fr; text-align: center; } .tex-exam-banner-right { text-align: center; } }
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
