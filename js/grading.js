// Logic chấm điểm Toán GDPT 2018 & THPT QG (Hỗ trợ 3 phần hoặc 4 phần có Tự luận, thang điểm mặc định THPT QG, chia đều theo phần hoặc điểm riêng từng câu)

const GradingSystem = {
  defaultPerQuestion: {
    part1: 0.25,
    part2: 1.0,
    part3: 0.5,
    part4: 1.0
  },

  // Thang điểm Phần II chuẩn Bộ GD&ĐT cho câu 1.0đ (tự động nhân tỉ lệ nếu câu có số điểm tối đa khác 1.0đ)
  part2Scale: [0.0, 0.1, 0.25, 0.5, 1.0],

  hasNum(v) {
    return v !== null && v !== undefined && String(v).trim() !== '' && !isNaN(Number(v)) && Number(v) >= 0;
  },

  // Chuẩn hóa câu trả lời ngắn: trim, đổi dấu trừ Unicode & chấp nhận cả dấu "." lẫn dấu "," cho số thập phân
  normalizeAnswer(ans) {
    if (ans === undefined || ans === null) return '';
    let s = String(ans).trim().toLowerCase()
      .replace(/[\u2212\u2013\u2014]/g, '-')
      .replace(/,/g, '.')
      .replace(/\s+/g, '');
    s = s.replace(/^(-?)\.(\d+)$/, '$10.$2').replace(/^(-?\d+)\.$/, '$1');
    if (s.includes('.') && /^-?\d+\.\d+$/.test(s)) {
      s = s.replace(/\.?0+$/, '');
    }
    if (s === '-0') s = '0';
    return s;
  },

  // So sánh 2 đáp án số (hỗ trợ phân số ví dụ '1/2' == '0.5' hoặc sai số làm tròn 0.02)
  isShortAnsMatch(userAns, correctAns) {
    const u = this.normalizeAnswer(userAns);
    const c = this.normalizeAnswer(correctAns);
    if (!u || !c) return false;
    if (u === c) return true;

    const parseVal = (str) => {
      if (str.includes('/')) {
        const parts = str.split('/');
        if (parts.length === 2 && parts[0] !== '' && parts[1] !== '' && !isNaN(parts[0]) && !isNaN(parts[1]) && Number(parts[1]) !== 0) {
          return Number(parts[0]) / Number(parts[1]);
        }
      }
      const num = Number(str);
      return isNaN(num) ? null : num;
    };

    const valU = parseVal(u);
    const valC = parseVal(c);
    if (valU !== null && valC !== null) {
      return Math.abs(valU - valC) <= 0.02;
    }
    return false;
  },

  // Tính điểm tối đa của 1 câu hỏi dựa trên cấu hình chấm điểm của đề (mặc định chuẩn THPT QG nếu bỏ trống)
  getQuestionMaxPoints(exam, partKey, q) {
    const list = Array.isArray(exam && exam[partKey]) ? exam[partKey] : [];
    const n = list.length;
    const scoring = (exam && exam.scoring) || {};
    const totalMap = {
      part1: scoring.p1Total,
      part2: scoring.p2Total,
      part3: scoring.p3Total,
      part4: scoring.p4Total
    };
    const secTotal = totalMap[partKey];
    const baseMax = (this.hasNum(secTotal) && n > 0)
      ? (Number(secTotal) / n)
      : (this.defaultPerQuestion[partKey] ?? 0.25);

    if (scoring.mode === 'custom' && q && this.hasNum(q.points)) {
      return Number(q.points);
    }
    return baseMax;
  },

  computeSectionMax(exam, partKey) {
    const list = Array.isArray(exam && exam[partKey]) ? exam[partKey] : [];
    if (list.length === 0) return 0;
    const scoring = (exam && exam.scoring) || {};
    const totalMap = {
      part1: scoring.p1Total,
      part2: scoring.p2Total,
      part3: scoring.p3Total,
      part4: scoring.p4Total
    };
    if (scoring.mode !== 'custom' && this.hasNum(totalMap[partKey])) {
      return +Number(totalMap[partKey]).toFixed(2);
    }
    const sum = list.reduce((acc, q) => acc + this.getQuestionMaxPoints(exam, partKey, q), 0);
    return +sum.toFixed(2);
  },

  computeExamMaxSummary(exam) {
    const p1Max = this.computeSectionMax(exam, 'part1');
    const p2Max = this.computeSectionMax(exam, 'part2');
    const p3Max = this.computeSectionMax(exam, 'part3');
    const p4Max = this.computeSectionMax(exam, 'part4');
    const maxTotal = +(p1Max + p2Max + p3Max + p4Max).toFixed(2);
    return { p1Max, p2Max, p3Max, p4Max, maxTotal };
  },

  grade(studentAnswers, exam) {
    const p1List = Array.isArray(exam && exam.part1) ? exam.part1 : [];
    const p2List = Array.isArray(exam && exam.part2) ? exam.part2 : [];
    const p3List = Array.isArray(exam && exam.part3) ? exam.part3 : [];
    const p4List = Array.isArray(exam && exam.part4) ? exam.part4 : [];

    const result = {
      part1: { score: 0, maxScore: this.computeSectionMax(exam, 'part1'), totalQuestions: p1List.length, correctCount: 0, details: {} },
      part2: { score: 0, maxScore: this.computeSectionMax(exam, 'part2'), totalQuestions: p2List.length, correctStatements: 0, details: {} },
      part3: { score: 0, maxScore: this.computeSectionMax(exam, 'part3'), totalQuestions: p3List.length, correctCount: 0, details: {} },
      part4: { score: 0, maxScore: this.computeSectionMax(exam, 'part4'), totalQuestions: p4List.length, gradedCount: 0, pendingManual: false, details: {} },
      totalScore: 0.0,
      maxTotal: 10.0,
      percentage: 0,
      rank: ''
    };

    const answers = studentAnswers || {};
    const p1Ans = answers.part1 || {};
    const p2Ans = answers.part2 || {};
    const p3Ans = answers.part3 || {};
    const p4Ans = answers.part4 || {};
    const p4Scores = answers.part4Scores || {};

    // 1. Chấm Phần I (Trắc nghiệm 4 lựa chọn)
    let rawP1 = 0;
    p1List.forEach((q) => {
      const qMax = this.getQuestionMaxPoints(exam, 'part1', q);
      const userChoice = String(p1Ans[q.id] || '').trim().toUpperCase();
      const correctChoice = String(q.correct_answer || '').trim().toUpperCase();
      const isCorrect = userChoice !== '' && userChoice === correctChoice;
      const earned = isCorrect ? qMax : 0;
      if (isCorrect) {
        rawP1 += qMax;
        result.part1.correctCount++;
      }
      result.part1.details[q.id] = {
        userAnswer: userChoice,
        correctAnswer: correctChoice,
        isCorrect,
        maxPoints: +qMax.toFixed(3),
        scoreEarned: +earned.toFixed(3)
      };
    });
    result.part1.score = +rawP1.toFixed(2);

    // 2. Chấm Phần II (Trắc nghiệm Đúng/Sai lũy tiến tỉ lệ theo điểm câu)
    let rawP2 = 0;
    p2List.forEach((q) => {
      const qMax = this.getQuestionMaxPoints(exam, 'part2', q);
      const qAns = p2Ans[q.id] || {};
      let correctInThisQ = 0;
      const subDetails = {};
      const stmts = q.statements || q.items || [];

      stmts.forEach((st) => {
        const subId = st.sub_id || st.key;
        const userVal = qAns[subId];
        const correctVal = Boolean(st.correct);
        const isCorrect = userVal !== undefined && userVal !== null && Boolean(userVal) === correctVal;

        if (isCorrect) {
          correctInThisQ++;
          result.part2.correctStatements++;
        }

        subDetails[subId] = {
          userAnswer: userVal !== undefined && userVal !== null ? Boolean(userVal) : null,
          correctAnswer: correctVal,
          isCorrect
        };
      });

      const ratio = this.part2Scale[Math.min(correctInThisQ, 4)] || 0.0;
      const earned = ratio * qMax;
      rawP2 += earned;

      result.part2.details[q.id] = {
        correctStatementsCount: correctInThisQ,
        maxPoints: +qMax.toFixed(3),
        scoreEarned: +earned.toFixed(3),
        statements: subDetails
      };
    });
    result.part2.score = +rawP2.toFixed(2);

    // 3. Chấm Phần III (Trả lời ngắn)
    let rawP3 = 0;
    p3List.forEach((q) => {
      const qMax = this.getQuestionMaxPoints(exam, 'part3', q);
      const userVal = p3Ans[q.id];
      const correctVal = q.correct_answer;
      const isCorrect = this.isShortAnsMatch(userVal, correctVal);
      const earned = isCorrect ? qMax : 0;

      if (isCorrect) {
        rawP3 += qMax;
        result.part3.correctCount++;
      }

      result.part3.details[q.id] = {
        userAnswer: userVal || '',
        correctAnswer: correctVal,
        isCorrect,
        maxPoints: +qMax.toFixed(3),
        scoreEarned: +earned.toFixed(3)
      };
    });
    result.part3.score = +rawP3.toFixed(2);

    // 4. Chấm Phần IV (Tự luận — nếu đề có 4 phần)
    let rawP4 = 0;
    p4List.forEach((q) => {
      const qMax = this.getQuestionMaxPoints(exam, 'part4', q);
      const rawEntry = p4Ans[q.id];
      const userText = typeof rawEntry === 'object' && rawEntry !== null ? (rawEntry.text || '') : String(rawEntry || '');
      const userImages = typeof rawEntry === 'object' && rawEntry !== null && Array.isArray(rawEntry.images) ? rawEntry.images : [];
      const hasManualScore = this.hasNum(p4Scores[q.id]);
      let earned = 0;
      if (hasManualScore) {
        earned = Math.max(0, Math.min(qMax, Number(p4Scores[q.id])));
        rawP4 += earned;
        result.part4.gradedCount++;
      } else {
        result.part4.pendingManual = true;
      }

      result.part4.details[q.id] = {
        userText,
        imageCount: userImages.length,
        correctAnswer: q.correct_answer || '',
        isGraded: hasManualScore,
        maxPoints: +qMax.toFixed(3),
        scoreEarned: +earned.toFixed(3)
      };
    });
    result.part4.score = +rawP4.toFixed(2);

    // Tổng điểm toàn bài
    const computedMax = +(result.part1.maxScore + result.part2.maxScore + result.part3.maxScore + result.part4.maxScore).toFixed(2);
    result.maxTotal = computedMax > 0 ? computedMax : 10.0;
    result.totalScore = +(result.part1.score + result.part2.score + result.part3.score + result.part4.score).toFixed(2);
    result.percentage = +((result.totalScore / result.maxTotal) * 100).toFixed(1);

    const scaledTen = (result.totalScore / result.maxTotal) * 10;
    if (scaledTen >= 9.0) result.rank = 'Xuất sắc';
    else if (scaledTen >= 8.0) result.rank = 'Giỏi';
    else if (scaledTen >= 6.5) result.rank = 'Khá';
    else if (scaledTen >= 5.0) result.rank = 'Trung bình';
    else result.rank = 'Cần cố gắng';

    return result;
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = GradingSystem;
}
