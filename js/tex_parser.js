// Bộ phân tích cú pháp TeX (LaTeX Parser) chuyên dụng cho đề thi Toán THPT QG 3 phần
// Hỗ trợ bóc tách ngoặc nhọn lồng nhau (Balanced Braces), công thức \dfrac, macro \heva, \hoac, \loigiai

const TeXParser = {
  // Trích xuất khối ngoặc nhọn cân bằng bắt đầu từ hoặc sau vị trí startPos
  extractBalancedBrace(str, startPos = 0) {
    const openIdx = str.indexOf('{', startPos);
    if (openIdx === -1) return null;
    let depth = 0;
    for (let i = openIdx; i < str.length; i++) {
      if (str[i] === '{') depth++;
      else if (str[i] === '}') {
        depth--;
        if (depth === 0) {
          return {
            content: str.substring(openIdx + 1, i),
            openIdx: openIdx,
            endIdx: i
          };
        }
      }
    }
    return null;
  },

  // Bóc tách toàn bộ file hoặc chuỗi .tex
  parse(texString, examMeta = {}) {
    if (!texString) return null;

    const exam = {
      id: examMeta.id || 'EXAM-' + Date.now(),
      title: examMeta.title || 'Đề thi Toán THPT QG (Biên dịch từ TeX)',
      time_minutes: examMeta.time_minutes || 90,
      is_active: true,
      allowed_all: true,
      allowed_students: [],
      pdf_url: examMeta.pdf_url || '',
      part1: [],
      part2: [],
      part3: []
    };

    // 1. Tiền xử lý: loại bỏ triệt để mọi comment % (giữ \%), bỏ preamble (\documentclass đến \begin{document})
    let text = texString.replace(/\\%/g, '___LITERAL_PERCENT___');
    text = text.replace(/%[^\r\n]*/g, '');
    text = text.replace(/___LITERAL_PERCENT___/g, '\\%');

    const docStart = text.indexOf('\\begin{document}');
    if (docStart !== -1) {
      text = text.substring(docStart + 16);
    }
    const docEnd = text.indexOf('\\end{document}');
    if (docEnd !== -1) {
      text = text.substring(0, docEnd);
    }

    // 2. Bóc tách từng câu hỏi: Tìm các khối \begin{ex} ... \end{ex} hoặc \begin{bt} ... \end{bt}
    const exRegex = /\\begin\{(?:ex|bt|vd|cau)\}(?:\[.*?\])?([\s\S]*?)\\end\{(?:ex|bt|vd|cau)\}/gi;
    let match;
    const allExBlocks = [];

    while ((match = exRegex.exec(text)) !== null) {
      allExBlocks.push(match[1].trim());
    }

    // Nếu không có \begin{ex}, chia theo \textbf{Câu 1}, Câu 1:
    if (allExBlocks.length === 0) {
      const splitBlocks = text.split(/(?=\\textbf\{Câu\s+\d+[:.]?\}|Câu\s+\d+[:.])/gi);
      splitBlocks.forEach(b => {
        const tr = b.trim();
        if (tr.length > 25) allExBlocks.push(tr);
      });
    }

    let p1Index = 1;
    let p2Index = 1;
    let p3Index = 1;

    allExBlocks.forEach((rawBlock) => {
      let block = rawBlock;

      // Trích xuất lời giải \loigiai{...} bằng balanced brace
      let loigiai = '';
      const lgPos = block.indexOf('\\loigiai');
      if (lgPos !== -1) {
        const lgBrace = this.extractBalancedBrace(block, lgPos);
        if (lgBrace) {
          loigiai = lgBrace.content.trim();
          block = block.substring(0, lgPos) + block.substring(lgBrace.endIdx + 1);
        }
      }

      // Phân loại Phần II: Đúng/Sai (\choiceTF)
      if (block.includes('\\choiceTF')) {
        const p2Item = this.parsePart2Question(block, p2Index, loigiai);
        if (p2Item) {
          exam.part2.push(p2Item);
          p2Index++;
          return;
        }
      }

      // Phân loại Phần III: Trả lời ngắn (\shortans)
      if (block.includes('\\shortans')) {
        const p3Item = this.parsePart3Question(block, p3Index, loigiai);
        if (p3Item) {
          exam.part3.push(p3Item);
          p3Index++;
          return;
        }
      }

      // Mặc định: Phần I (Trắc nghiệm 4 lựa chọn)
      const p1Item = this.parsePart1Question(block, p1Index, loigiai);
      if (p1Item) {
        exam.part1.push(p1Item);
        p1Index++;
      }
    });

    return exam;
  },

  // Bóc tách Phần I: 4 phương án A, B, C, D
  parsePart1Question(block, id, loigiai) {
    let content = block;
    let choices = [];
    let correct = 'A';
    const letters = ['A', 'B', 'C', 'D'];

    const choicePos = block.search(/\\choice(?:\[\d+\])?/);
    if (choicePos !== -1) {
      content = block.substring(0, choicePos).trim();
      let curr = choicePos + 7;
      const rawChoices = [];

      for (let i = 0; i < 4; i++) {
        const brace = this.extractBalancedBrace(block, curr);
        if (brace) {
          rawChoices.push(brace.content.trim());
          curr = brace.endIdx + 1;
        } else {
          break;
        }
      }

      if (rawChoices.length === 4) {
        choices = rawChoices.map((raw, idx) => {
          let isTrue = false;
          if (raw.includes('\\True') || raw.includes('\\true')) {
            isTrue = true;
            correct = letters[idx];
          }
          let cleanText = raw.replace(/\\True|\\true/g, '').trim();
          return `${letters[idx]}. ${cleanText}`;
        });
      }
    }

    // Nếu không bóc tách được bằng \choice, thử tìm các dòng A. B. C. D.
    if (choices.length < 4) {
      const optionMatches = block.match(/[A-D]\.\s*[\s\S]*?(?=[B-D]\.|$)/g);
      if (optionMatches && optionMatches.length >= 4) {
        choices = optionMatches.slice(0, 4).map(o => o.trim());
      } else {
        choices = [
          'A. Phương án A',
          'B. Phương án B',
          'C. Phương án C',
          'D. Phương án D'
        ];
      }
    }

    return {
      id: id,
      content: this.cleanMath(content),
      choices: choices.map(c => this.cleanMath(c)),
      correct_answer: correct,
      explanation: this.cleanMath(loigiai),
      solution: this.cleanMath(loigiai)
    };
  },

  // Bóc tách Phần II: Trắc nghiệm Đúng/Sai (4 ý a, b, c, d)
  parsePart2Question(block, id, loigiai) {
    let content = block;
    const statements = [];
    const subLetters = ['a', 'b', 'c', 'd'];

    const tfPos = block.search(/\\choiceTF(?:\[\d+\])?/);
    if (tfPos !== -1) {
      content = block.substring(0, tfPos).trim();
      let curr = tfPos + 9;
      const rawItems = [];

      for (let i = 0; i < 4; i++) {
        const brace = this.extractBalancedBrace(block, curr);
        if (brace) {
          rawItems.push(brace.content.trim());
          curr = brace.endIdx + 1;
        } else {
          break;
        }
      }

      if (rawItems.length === 4) {
        for (let i = 0; i < 4; i++) {
          const raw = rawItems[i];
          const isCorrect = raw.includes('\\True') || raw.includes('\\true') || raw.startsWith('Đ') || raw.startsWith('T');
          const cleanText = raw.replace(/\\True|\\true|True|False|Đúng|Sai/gi, '').trim();
          statements.push({
            sub_id: subLetters[i],
            text: this.cleanMath(cleanText),
            correct: isCorrect
          });
        }
      }
    }

    // Fallback nếu dùng \item
    if (statements.length < 4) {
      const items = block.split('\\item').slice(1);
      if (items.length >= 4) {
        content = block.split('\\item')[0].replace(/\\choiceTF(?:\[\d+\])?/, '').trim();
        for (let i = 0; i < 4; i++) {
          const raw = items[i].trim();
          const isCorrect = raw.includes('\\True');
          statements.push({
            sub_id: subLetters[i],
            text: this.cleanMath(raw.replace(/\\True/g, '').trim()),
            correct: isCorrect
          });
        }
      } else {
        // Fallback mặc định
        statements.push(
          { sub_id: 'a', text: 'Mệnh đề a', correct: true },
          { sub_id: 'b', text: 'Mệnh đề b', correct: true },
          { sub_id: 'c', text: 'Mệnh đề c', correct: false },
          { sub_id: 'd', text: 'Mệnh đề d', correct: true }
        );
      }
    }

    return {
      id: id,
      content: this.cleanMath(content),
      statements: statements,
      items: statements.map(s => ({ key: s.sub_id, text: s.text, correct: s.correct })),
      explanation: this.cleanMath(loigiai),
      solution: this.cleanMath(loigiai)
    };
  },

  // Bóc tách Phần III: Trả lời ngắn (\shortans{...})
  parsePart3Question(block, id, loigiai) {
    let content = block;
    let correct = '0';

    const shortPos = block.search(/\\shortans(?:\[.*?\])?/);
    if (shortPos !== -1) {
      content = block.substring(0, shortPos).trim();
      const brace = this.extractBalancedBrace(block, shortPos);
      if (brace) {
        correct = brace.content.trim().replace(/[$]/g, '');
      }
    }

    return {
      id: id,
      content: this.cleanMath(content),
      correct_answer: correct,
      explanation: this.cleanMath(loigiai),
      solution: this.cleanMath(loigiai)
    };
  },

  // Chuẩn hóa và làm sạch KaTeX
  cleanMath(str) {
    if (!str) return '';
    let s = str;

    // 0. Loại bỏ triệt để mọi comment % LaTeX (giữ lại ký tự \% thực tế)
    s = s.replace(/\\%/g, '___PERCENT_ESCAPED___');
    s = s.replace(/%[^\r\n]*/g, '');
    s = s.replace(/___PERCENT_ESCAPED___/g, '\\%');

    // 1. Chuyển đổi macro Tiếng Việt: \heva{...} -> \begin{cases} ... \end{cases}
    s = s.replace(/\\heva\{([\s\S]*?)\}/g, (match, body) => {
      const formatted = body.replace(/\\cr/g, '\\\\').replace(/\\\\/g, '\\\\');
      return `\\begin{cases} ${formatted} \\end{cases}`;
    });

    // 2. Chuyển đổi macro \hoac{...} -> \left[ \begin{array}{l} ... \end{array} \right.
    s = s.replace(/\\hoac\{([\s\S]*?)\}/g, (match, body) => {
      const formatted = body.replace(/\\cr/g, '\\\\').replace(/\\\\/g, '\\\\');
      return `\\left[\\begin{array}{l} ${formatted} \\end{array}\\right.`;
    });

    // 3. Tự động chuyển đổi các khối TikZ sang vector SVG trực tiếp (không dùng placeholder PDF)
    const svgHolders = [];
    const saveSvg = (html) => {
      if (!html) return '';
      const key = `___TIKZ_SVG_BLOCK_${svgHolders.length}___`;
      svgHolders.push(html);
      return key;
    };

    s = s.replace(/\\immini(?:\[.*?\])?\{([\s\S]*?)\}\{([\s\S]*?)\}/g, (match, text, figure) => {
      let figHtml = '';
      if (typeof TikZToSVG !== 'undefined') {
        figHtml = TikZToSVG.render(figure);
      }
      return text + '\n' + saveSvg(figHtml) + '\n';
    });
    s = s.replace(/\\begin\{tikzpicture\}([\s\S]*?)\\end\{tikzpicture\}/g, (match, tikzBody) => {
      let figHtml = '';
      if (typeof TikZToSVG !== 'undefined') {
        figHtml = TikZToSVG.render(tikzBody);
      }
      return '\n' + saveSvg(figHtml) + '\n';
    });
    s = s.replace(/<div[^>]*class="[^"]*math-svg-container[^"]*"[\s\S]*?<\/div>\s*<\/div>/gi, (match) => {
      return saveSvg(match);
    });
    s = s.replace(/<svg[\s\S]*?<\/svg>/gi, (match) => {
      return saveSvg(match);
    });

    s = s.replace(/\\textbf\{Câu\s*\d+[:.]?\}/gi, '');
    s = s.replace(/\\vv\{([\s\S]*?)\}/g, '\\vec{$1}');
    s = s.replace(/\\lq|\\rq/g, '"');
    s = s.replace(/\\hfill/g, ' ');
    s = s.replace(/\\vspace\{.*?\}/g, '');
    s = s.replace(/\\hspace\{.*?\}/g, '');

    // 5. Phân tách để xử lý xuống dòng \\ trong văn bản ngoài $
    const mathRegex = /(\$\$[\s\S]*?\$\$|\$[^\$]*?\$|\\\[[\s\S]*?\\\]|\\\(.*?\\\))/g;
    const parts = s.split(mathRegex);
    s = parts.map(part => {
      if (!part) return '';
      if (part.startsWith('$') || part.startsWith('\\(') || part.startsWith('\\[')) return part;
      let p = part;
      p = p.replace(/\s*\\\\(?:\*|\[.*?\])?\s*[\r\n]*/g, '<br>');
      p = p.replace(/\s*\\newline\s*[\r\n]*/g, '<br>');
      p = p.replace(/\s*\\par\b\s*[\r\n]*/g, '<br><br>');
      return p;
    }).join('');

    svgHolders.forEach((svgHtml, idx) => {
      s = s.split(`___TIKZ_SVG_BLOCK_${idx}___`).join(svgHtml);
    });

    return s.trim();
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = TeXParser;
}
