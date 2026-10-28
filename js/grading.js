// Logic chấm điểm thi Toán THPT QG 2025 - 2027 chuẩn Bộ GD&ĐT
// Bản quyền kiến trúc 3 phần GDPT 2018

const GradingSystem = {
  // Chuẩn hóa câu trả lời ngắn: trim, đổi dấu phẩy thành dấu chấm
  normalizeAnswer(ans) {
    if (ans === undefined || ans === null) return '';
    let s = String(ans).trim().toLowerCase().replace(',', '.');
    // Bỏ số 0 thừa sau dấu phẩy thập phân: vd '3.50' -> '3.5'
    if (s.includes('.')) {
      s = s.replace(/\.?0+$/, '');
    }
    return s;
  },

  // So sánh 2 đáp án số (hỗ trợ phân số ví dụ '1/2' == '0.5' hoặc sai số 0.01)
  isShortAnsMatch(userAns, correctAns) {
    const u = this.normalizeAnswer(userAns);
    const c = this.normalizeAnswer(correctAns);
    if (!u || !c) return false;
    if (u === c) return true;

    // Thử parse số
    const parseVal = (str) => {
      if (str.includes('/')) {
        const parts = str.split('/');
        if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1]) && Number(parts[1]) !== 0) {
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

  // Thang điểm Phần II (Trắc nghiệm Đúng/Sai lũy tiến)
  // 0 ý đúng: 0.0đ | 1 ý đúng: 0.1đ | 2 ý đúng: 0.25đ | 3 ý đúng: 0.5đ | 4 ý đúng: 1.0đ
  part2Scale: [0.0, 0.1, 0.25, 0.5, 1.0],

  grade(studentAnswers, exam) {
    const result = {
      part1: { score: 0, maxScore: 3.0, totalQuestions: 12, correctCount: 0, details: {} },
      part2: { score: 0, maxScore: 4.0, totalQuestions: 4, correctStatements: 0, details: {} },
      part3: { score: 0, maxScore: 3.0, totalQuestions: 6, correctCount: 0, details: {} },
      totalScore: 0.0,
      maxTotal: 10.0,
      percentage: 0,
      rank: ''
    };

    const answers = studentAnswers || {};
    const p1Ans = answers.part1 || {};
    const p2Ans = answers.part2 || {};
    const p3Ans = answers.part3 || {};

    // 1. Chấm Phần I (12 câu x 0.25đ)
    if (exam.part1 && Array.isArray(exam.part1)) {
      result.part1.totalQuestions = exam.part1.length;
      result.part1.maxScore = +(exam.part1.length * 0.25).toFixed(2);

      exam.part1.forEach((q) => {
        const userChoice = (p1Ans[q.id] || '').trim().toUpperCase();
        const correctChoice = (q.correct_answer || '').trim().toUpperCase();
        const isCorrect = userChoice !== '' && userChoice === correctChoice;
        if (isCorrect) {
          result.part1.score += 0.25;
          result.part1.correctCount++;
        }
        result.part1.details[q.id] = {
          userAnswer: userChoice,
          correctAnswer: correctChoice,
          isCorrect
        };
      });
      result.part1.score = +result.part1.score.toFixed(2);
    }

    // 2. Chấm Phần II (4 câu Đúng/Sai lũy tiến)
    if (exam.part2 && Array.isArray(exam.part2)) {
      result.part2.totalQuestions = exam.part2.length;
      result.part2.maxScore = +(exam.part2.length * 1.0).toFixed(2);

      exam.part2.forEach((q) => {
        const qAns = p2Ans[q.id] || {};
        let correctInThisQ = 0;
        const subDetails = {};

        q.statements.forEach((st) => {
          const userVal = qAns[st.sub_id]; // true/false or undefined
          const correctVal = Boolean(st.correct);
          const isCorrect = userVal !== undefined && userVal !== null && Boolean(userVal) === correctVal;

          if (isCorrect) {
            correctInThisQ++;
            result.part2.correctStatements++;
          }

          subDetails[st.sub_id] = {
            userAnswer: userVal !== undefined && userVal !== null ? Boolean(userVal) : null,
            correctAnswer: correctVal,
            isCorrect
          };
        });

        const earned = this.part2Scale[Math.min(correctInThisQ, 4)] || 0.0;
        result.part2.score += earned;

        result.part2.details[q.id] = {
          correctStatementsCount: correctInThisQ,
          scoreEarned: earned,
          statements: subDetails
        };
      });
      result.part2.score = +result.part2.score.toFixed(2);
    }

    // 3. Chấm Phần III (6 câu Trả lời ngắn x 0.5đ)
    if (exam.part3 && Array.isArray(exam.part3)) {
      result.part3.totalQuestions = exam.part3.length;
      result.part3.maxScore = +(exam.part3.length * 0.5).toFixed(2);

      exam.part3.forEach((q) => {
        const userVal = p3Ans[q.id];
        const correctVal = q.correct_answer;
        const isCorrect = this.isShortAnsMatch(userVal, correctVal);

        if (isCorrect) {
          result.part3.score += 0.5;
          result.part3.correctCount++;
        }

        result.part3.details[q.id] = {
          userAnswer: userVal || '',
          correctAnswer: correctVal,
          isCorrect
        };
      });
      result.part3.score = +result.part3.score.toFixed(2);
    }

    // Tổng điểm
    const computedMax = +(result.part1.maxScore + result.part2.maxScore + result.part3.maxScore).toFixed(2);
    result.maxTotal = computedMax > 0 ? computedMax : 10.0;
    result.totalScore = +(result.part1.score + result.part2.score + result.part3.score).toFixed(2);
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
