// Bộ phân tích cú pháp TeX (LaTeX Parser) đa năng cho mọi file .tex Toán học & Đề thi 3 phần GDPT 2018
// Kết hợp cùng TeXCompiler để hỗ trợ ngoặc nhọn lồng nhau, preamble macros, bảng tabular, eqnarray*, immini và TikZ/tkz-tab WASM

const TeXParser = {
  getCompiler() {
    if (typeof TeXCompiler !== 'undefined') return TeXCompiler;
    if (typeof require === 'function') return require('./tex_compiler.js');
    return null;
  },

  // Trích xuất khối ngoặc nhọn cân bằng (bỏ qua ký tự đã escape \{ \})
  extractBalancedBrace(str, startPos = 0) {
    const compiler = this.getCompiler();
    if (compiler) {
      return compiler.extractBalanced(str, startPos, '{', '}');
    }
    const openIdx = str.indexOf('{', startPos);
    if (openIdx === -1) return null;
    let depth = 0;
    for (let i = openIdx; i < str.length; i++) {
      if (str[i] === '{') depth++;
      else if (str[i] === '}') {
        depth--;
        if (depth === 0) return { content: str.substring(openIdx + 1, i), openIdx, endIdx: i };
      }
    }
    return null;
  },

  // Bóc tách toàn bộ file hoặc chuỗi .tex bất kì
  parse(texString, examMeta = {}) {
    if (!texString) return null;
    const compiler = this.getCompiler();
    const preamble = compiler ? compiler.extractPreamble(texString) : null;

    let text = preamble ? preamble.body : String(texString);
    if (!preamble) {
      text = text.replace(/\\%/g, '___LITERAL_PERCENT___').replace(/%[^\r\n]*/g, '').replace(/___LITERAL_PERCENT___/g, '\\%');
      const docStart = text.indexOf('\\begin{document}');
      if (docStart !== -1) text = text.substring(docStart + 16);
      const docEnd = text.lastIndexOf('\\end{document}');
      if (docEnd !== -1) text = text.substring(0, docEnd);
    }

    // Gỡ bỏ dòng "--- HẾT ---" ở cuối đề để không dính vào câu cuối
    text = text.replace(/\\begin\{center\}\s*(?:\\textbf\{)?\s*[-–—]+\s*HẾT\s*[-–—]+\s*\}?\s*\\end\{center\}/gi, '');
    text = text.replace(/(?:\\textbf\{)?\s*[-–—]{2,}\s*HẾT\s*[-–—]{2,}\s*\}?/gi, '');

    const exam = {
      id: examMeta.id || 'EXAM-' + Date.now(),
      title: examMeta.title || (preamble && preamble.title ? preamble.title.replace(/\\[A-Za-z]+\s*|\{|\}/g, '').trim() : '') || 'Đề thi Toán (Biên dịch từ TeX)',
      time_minutes: examMeta.time_minutes || 90,
      is_active: true,
      allowed_all: true,
      allowed_students: [],
      pdf_url: examMeta.pdf_url || '',
      tex_macros: preamble ? preamble.macros : {},
      tex_preamble: preamble ? {
        macros: preamble.macros,
        tikzLibraries: preamble.tikzLibraries,
        texPackages: preamble.texPackages,
        tikzPreamble: preamble.tikzPreamble,
        colors: preamble.colors,
        pgfplotsCompat: preamble.pgfplotsCompat
      } : null,
      part1: [],
      part2: [],
      part3: []
    };

    // Đánh dấu vị trí các lệnh phân phần (\caulc, \cautn, \cauds, \caukq, \cautl) & tiêu đề PHẦN I..IV
    const partHeaders = [];
    const partRe = /\\(caulc|cautn|cauds|caukq|cautl)\b|PHẦN\s+(IV|I{1,3}|[1-4])\b/gi;
    let pm;
    while ((pm = partRe.exec(text)) !== null) {
      let pNum = 1;
      if (pm[1]) {
        const c = pm[1].toLowerCase();
        pNum = (c === 'cauds') ? 2 : ((c === 'caukq') ? 3 : ((c === 'cautl') ? 4 : 1));
      } else {
        const token = pm[2].toUpperCase();
        pNum = (token === 'I' || token === '1') ? 1 : ((token === 'II' || token === '2') ? 2 : ((token === 'III' || token === '3') ? 3 : 4));
      }
      partHeaders.push({ index: pm.index, part: pNum });
    }
    const getSectionHintAt = (pos) => {
      let hint = null;
      for (const ph of partHeaders) {
        if (ph.index <= pos) hint = ph.part;
      }
      return hint;
    };

    // 1. Tìm các khối môi trường \begin{ex|exrd|bt|vd|vdex|cau} ... \end{...}
    const exRegex = /\\begin\{(ex|exrd|bt|vd|vdex|cau)\}(?:\[[^\]]*\])?([\s\S]*?)\\end\{\1\}/gi;
    let match;
    const taggedBlocks = [];

    while ((match = exRegex.exec(text)) !== null) {
      taggedBlocks.push({
        block: match[2].trim(),
        sectionHint: getSectionHintAt(match.index),
        envType: match[1].toLowerCase()
      });
    }

    // 2. Nếu không dùng môi trường ex_test, chia theo PHẦN I / II / III và Câu 1, Câu 2, Bài 1...
    if (taggedBlocks.length === 0) {
      const qStartRe = /(?:\\textbf\{\s*(?:Câu|Bài)\s+\d+\s*[:.]?\s*\}|(?:^|\n)\s*(?:Câu|Bài)\s+\d+\s*[:.])/gi;
      const starts = [];
      let qm;
      while ((qm = qStartRe.exec(text)) !== null) {
        starts.push({ idx: qm.index, headLen: qm[0].length });
      }

      for (let i = 0; i < starts.length; i++) {
        const startPos = starts[i].idx;
        let endPos = (i + 1 < starts.length) ? starts[i + 1].idx : text.length;

        for (const ph of partHeaders) {
          if (ph.index > startPos && ph.index < endPos) {
            const lineStart = text.lastIndexOf('\n', ph.index);
            endPos = Math.min(endPos, lineStart > startPos ? lineStart : ph.index);
          }
        }

        const chunk = text.slice(startPos, endPos).trim();
        if (chunk.length > 10) {
          taggedBlocks.push({ block: chunk, sectionHint: getSectionHintAt(startPos), envType: 'plain' });
        }
      }
    }

    let p1Index = 1;
    let p2Index = 1;
    let p3Index = 1;

    taggedBlocks.forEach(({ block: rawBlock, sectionHint }) => {
      if (sectionHint === 4 && !/\\(?:choice|choiceTF|shortans)\b/.test(rawBlock)) return;
      let block = rawBlock;

      // Bóc tách lời giải \loigiai{...} bằng balanced brace
      let loigiai = '';
      const lgPos = block.indexOf('\\loigiai');
      if (lgPos !== -1) {
        const lgBrace = this.extractBalancedBrace(block, lgPos + 8);
        if (lgBrace) {
          loigiai = lgBrace.content.trim();
          block = block.substring(0, lgPos) + block.substring(lgBrace.endIdx + 1);
        }
      }

      // Phân loại Phần II: \choiceTF / \choiceTFt / \choiceTFtColor / \haibang hoặc sectionHint === 2 hoặc đủ 4 ý a) b) c) d)
      const hasPlainABCDStatements = /(?:^|\n|\\\\)\s*(?:\\textbf\{|\\underline\{)?a\)/.test(block) &&
                                     /(?:^|\n|\\\\)\s*(?:\\textbf\{|\\underline\{)?b\)/.test(block) &&
                                     /(?:^|\n|\\\\)\s*(?:\\textbf\{|\\underline\{)?c\)/.test(block) &&
                                     /(?:^|\n|\\\\)\s*(?:\\textbf\{|\\underline\{)?d\)/.test(block);

      if (/\\(?:choiceTFtColor|choiceTFt|choiceTF|haibang)(?:\[[^\]]*\])?(?![A-Za-z])/.test(block) || sectionHint === 2 || (!block.includes('\\choice') && hasPlainABCDStatements)) {
        const p2Item = this.parsePart2Question(block, p2Index, loigiai, preamble);
        if (p2Item) {
          exam.part2.push(p2Item);
          p2Index++;
          return;
        }
      }

      // Phân loại Phần III: \shortans / \shortansfix / \SA hoặc sectionHint === 3
      if (/\\(?:shortansfix|shortans|SA)(?:\[[^\]]*\])?(?![A-Za-z])/.test(block) || sectionHint === 3) {
        const p3Item = this.parsePart3Question(block, p3Index, loigiai, preamble);
        if (p3Item) {
          exam.part3.push(p3Item);
          p3Index++;
          return;
        }
      }

      // Phần I (Trắc nghiệm 4 lựa chọn)
      const p1Item = this.parsePart1Question(block, p1Index, loigiai, preamble);
      if (p1Item) {
        exam.part1.push(p1Item);
        p1Index++;
      }
    });

    return exam;
  },

  stripQuestionPrefix(str) {
    return String(str || '')
      .replace(/^\s*\\textbf\{\s*(?:Câu|Bài)\s*\d+\s*[:.]?\s*\}\s*/i, '')
      .replace(/^\s*(?:Câu|Bài)\s*\d+\s*[:.]\s*/i, '')
      .trim();
  },

  // Bóc tách Phần I: 4 phương án A, B, C, D (bảo toàn \immini khi \choice đặt bên trong \immini)
  parsePart1Question(block, id, loigiai, preamble = null) {
    const compiler = this.getCompiler();
    const unwrap = (s) => compiler ? compiler.unwrapChoiceBraces(s) : String(s || '').trim();
    let content = this.stripQuestionPrefix(block);
    let choices = [];
    let correct = 'A';
    const letters = ['A', 'B', 'C', 'D'];

    const choiceMatch = content.match(/\\(choicefive|choicefix|choice|motcot|haicot|boncot|nammot|bahai|haiba|motnam)(?:\[[^\]]*\])?(?![A-Za-z])/);
    if (choiceMatch) {
      const choicePos = choiceMatch.index;
      const afterCmd = choicePos + choiceMatch[0].length;
      const numArgs = /^(?:choicefive|nammot|bahai|haiba|motnam)$/.test(choiceMatch[1]) ? 5 : 4;
      let curr = afterCmd;
      const rawChoices = [];

      for (let i = 0; i < numArgs; i++) {
        const brace = this.extractBalancedBrace(content, curr);
        if (brace) {
          rawChoices.push(brace.content.trim());
          curr = brace.endIdx + 1;
        } else {
          break;
        }
      }

      if (rawChoices.length >= 4) {
        // Giữ nguyên phần đóng ngoặc & hình vẽ phía sau \choice (VD: khi \choice nằm trong \immini{...}{\begin{tikzpicture}...})
        content = (content.substring(0, choicePos) + ' ' + content.substring(curr)).trim();
        choices = rawChoices.slice(0, 4).map((raw, idx) => {
          const unwrapped = unwrap(raw);
          if (/\\True\b|\\true\b/.test(unwrapped)) {
            correct = letters[idx];
          }
          const cleanText = unwrap(unwrapped.replace(/\\True\b|\\true\b|\\sh\b(?:\[[^\]]*\])?/g, '')).trim();
          return `${letters[idx]}. ${cleanText}`;
        });
      }
    }

    // Nếu không dùng \choice, tìm A. B. C. D. (kể cả \textbf{A.}, \underline{A.}, phân tách bởi \hfill hoặc xuống dòng)
    if (choices.length < 4) {
      const markerRe = /(?:^|\s|\\hfill|\\\\)(?:\\(textbf|underline)\{\s*([A-D])\s*[.)]\s*\}|([A-D])\s*\.)\s*/g;
      const markers = [];
      let mm;
      while ((mm = markerRe.exec(content)) !== null) {
        const letter = mm[2] || mm[3];
        const isHighlighted = Boolean(mm[1]);
        markers.push({
          letter,
          isHighlighted,
          matchStart: mm.index,
          textStart: mm.index + mm[0].length
        });
      }

      // Tìm dãy A, B, C, D liên tiếp cuối cùng trong câu
      for (let i = markers.length - 4; i >= 0; i--) {
        if (markers[i].letter === 'A' && markers[i + 1].letter === 'B' && markers[i + 2].letter === 'C' && markers[i + 3].letter === 'D') {
          const picked = markers.slice(i, i + 4);
          const stem = content.slice(0, picked[0].matchStart).replace(/(?:\\\\|\s)+$/, '').trim();
          choices = picked.map((mk, idx) => {
            if (mk.isHighlighted) correct = letters[idx];
            const endPos = idx < 3 ? picked[idx + 1].matchStart : content.length;
            const optBody = content.slice(mk.textStart, endPos).replace(/\\hfill/g, '').replace(/(?:\\\\|\s)+$/, '').trim();
            return `${letters[idx]}. ${optBody}`;
          });
          content = stem;
          break;
        }
      }
    }

    if (choices.length < 4) {
      choices = ['A. Phương án A', 'B. Phương án B', 'C. Phương án C', 'D. Phương án D'];
    }

    const cleanedLoigiai = this.cleanMath(loigiai, preamble);
    return {
      id,
      content: this.cleanMath(content, preamble),
      choices: choices.map(c => this.cleanMath(c, preamble)),
      correct_answer: correct,
      explanation: cleanedLoigiai,
      solution: cleanedLoigiai
    };
  },

  // Bóc tách Phần II: Trắc nghiệm Đúng/Sai (4 ý a, b, c, d, bảo toàn \immini nếu có)
  parsePart2Question(block, id, loigiai, preamble = null) {
    const compiler = this.getCompiler();
    const unwrap = (s) => compiler ? compiler.unwrapChoiceBraces(s) : String(s || '').trim();
    let content = this.stripQuestionPrefix(block);
    const statements = [];
    const subLetters = ['a', 'b', 'c', 'd'];

    const tfMatch = content.match(/\\(choiceTFtColor|choiceTFt|choiceTF|haibang)(?:\[[^\]]*\])?(?![A-Za-z])/);
    if (tfMatch) {
      const tfPos = tfMatch.index;
      let curr = tfPos + tfMatch[0].length;
      const rawItems = [];

      for (let i = 0; i < 4; i++) {
        const brace = this.extractBalancedBrace(content, curr);
        if (brace) {
          rawItems.push(brace.content.trim());
          curr = brace.endIdx + 1;
        } else {
          break;
        }
      }

      if (rawItems.length === 4) {
        content = (content.substring(0, tfPos) + ' ' + content.substring(curr)).trim();
        for (let i = 0; i < 4; i++) {
          const unwrapped = unwrap(rawItems[i]);
          const isCorrect = /\\True\b|\\true\b/.test(unwrapped) || /^(?:Đúng|True)\b/i.test(unwrapped);
          const cleanText = unwrap(unwrapped.replace(/\\True\b|\\true\b|\\sh\b(?:\[[^\]]*\])?/g, '')).trim();
          statements.push({
            sub_id: subLetters[i],
            text: this.cleanMath(cleanText, preamble),
            correct: isCorrect
          });
        }
      }
    }

    // Fallback 1: định dạng văn bản a) ... b) ... c) ... d) ...
    if (statements.length < 4) {
      const subRe = /(?:^|\n|\\\\)\s*(?:\\(textbf|underline)\{\s*([a-d])\)\s*\}|([a-d])\))\s*/g;
      const found = [];
      let sm;
      while ((sm = subRe.exec(content)) !== null) {
        found.push({
          letter: sm[2] || sm[3],
          isHighlighted: Boolean(sm[1]),
          matchStart: sm.index,
          textStart: sm.index + sm[0].length
        });
      }
      if (found.length >= 4 && found[0].letter === 'a' && found[1].letter === 'b' && found[2].letter === 'c' && found[3].letter === 'd') {
        const stem = content.slice(0, found[0].matchStart).replace(/(?:\\\\|\s)+$/, '').trim();
        const hasAnyHighlight = found.slice(0, 4).some(f => f.isHighlighted);
        for (let i = 0; i < 4; i++) {
          const endPos = i < 3 ? found[i + 1].matchStart : content.length;
          let stBody = content.slice(found[i].textStart, endPos).replace(/(?:\\\\|\s)+$/, '').trim();
          const hasTrueTag = /\\True\b|\(\s*Đ(?:úng)?\s*\)\s*$/i.test(stBody);
          const hasFalseTag = /\(\s*S(?:ai)?\s*\)\s*$/i.test(stBody);
          stBody = stBody.replace(/\\True\b|\(\s*(?:Đ|Đúng|S|Sai)\s*\)\s*$/gi, '').trim();
          const isCorrect = hasTrueTag ? true : (hasFalseTag ? false : (hasAnyHighlight ? found[i].isHighlighted : true));
          statements.push({
            sub_id: subLetters[i],
            text: this.cleanMath(stBody, preamble),
            correct: isCorrect
          });
        }
        content = stem;
      }
    }

    // Fallback 2: \item
    if (statements.length < 4) {
      const items = content.split('\\item').slice(1);
      if (items.length >= 4) {
        content = content.split('\\item')[0].replace(/\\(?:choiceTFtColor|choiceTFt|choiceTF|haibang)(?:\[[^\]]*\])?/, '').trim();
        for (let i = 0; i < 4; i++) {
          const raw = items[i].trim();
          const isCorrect = /\\True\b|\\true\b/.test(raw);
          statements.push({
            sub_id: subLetters[i],
            text: this.cleanMath(raw.replace(/\\True\b|\\true\b/g, '').trim(), preamble),
            correct: isCorrect
          });
        }
      } else {
        statements.push(
          { sub_id: 'a', text: 'Mệnh đề a', correct: true },
          { sub_id: 'b', text: 'Mệnh đề b', correct: true },
          { sub_id: 'c', text: 'Mệnh đề c', correct: false },
          { sub_id: 'd', text: 'Mệnh đề d', correct: true }
        );
      }
    }

    const cleanedLoigiai = this.cleanMath(loigiai, preamble);
    return {
      id,
      content: this.cleanMath(content, preamble),
      statements,
      items: statements.map(s => ({ key: s.sub_id, text: s.text, correct: s.correct })),
      explanation: cleanedLoigiai,
      solution: cleanedLoigiai
    };
  },

  // Bóc tách Phần III: Trả lời ngắn (\shortans{...}, \SA{...}, \shortansfix{...} hoặc Đáp án/ĐS: ...)
  parsePart3Question(block, id, loigiai, preamble = null) {
    const compiler = this.getCompiler();
    let content = this.stripQuestionPrefix(block);
    let correct = '';

    const shortMatch = content.match(/\\(shortansfix|shortans|SA)(?:\[[^\]]*\])?(?![A-Za-z])/);
    if (shortMatch) {
      const cmd = shortMatch[1];
      const shortPos = shortMatch.index;
      const brace = this.extractBalancedBrace(content, shortPos + shortMatch[0].length);
      if (brace) {
        content = (content.substring(0, shortPos) + ' ' + content.substring(brace.endIdx + 1)).trim();
        if (cmd !== 'shortansfix') {
          correct = compiler
            ? compiler.cleanShortAnsValue(brace.content)
            : brace.content.trim().replace(/[$]/g, '').replace(/\\,|\\;/g, '').replace(/\{,\}/g, ',').replace(/\s+/g, '');
        }
      } else {
        content = content.substring(0, shortPos).trim();
      }
    }

    if (!correct) {
      const ansLine = (content + '\n' + (loigiai || '')).match(/(?:Đáp\s*(?:án|số)|ĐS|\\dapso\s*\{)\s*[:=]?\s*\$?([+-]?\d+(?:(?:\{,\}|[.,])\d+)?(?:\s*\/\s*\d+)?)\$?/i);
      if (ansLine) {
        correct = ansLine[1].replace(/\{,\}/g, ',').replace(/\s+/g, '');
        content = content.replace(/(?:\\\\|\n)?\s*(?:\\textbf\{)?(?:Đáp\s*(?:án|số)|ĐS)\s*[:=][^\\\n]*/i, '').trim();
      }
    }

    const cleanedLoigiai = this.cleanMath(loigiai, preamble);
    return {
      id,
      content: this.cleanMath(content, preamble),
      correct_answer: correct,
      explanation: cleanedLoigiai,
      solution: cleanedLoigiai
    };
  },

  // Biên dịch mảnh nội dung TeX của câu hỏi sang HTML + KaTeX + TikZJax
  cleanMath(str, preamble = null) {
    if (!str) return '';
    const compiler = this.getCompiler();
    if (compiler) {
      const cleaned = this.stripQuestionPrefix(str);
      return compiler.compileFragment(cleaned, {
        inlineQuestion: true,
        preambleInfo: preamble
      });
    }
    return String(str).trim();
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = TeXParser;
}
