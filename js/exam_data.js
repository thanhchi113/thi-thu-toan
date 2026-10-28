// Đề thi mẫu chuẩn THPT Quốc Gia môn Toán 2027 (Cấu trúc 3 phần theo GDPT 2018)
// Hiển thị trực tiếp từ file PDF gốc và chấm điểm tự động qua bảng đáp án 3 phần

const SAMPLE_EXAM_2027 = {
  id: "EXAM-2027-01",
  title: "Đề Kiểm Tra Giữa Kỳ 1 Môn Toán 12 — Trường THPT Lê Thánh Tông TP.HCM",
  description: "Cấu trúc 3 phần chuẩn Bộ GD&ĐT: Phần I (12 câu ABCD), Phần II (4 câu Đúng/Sai), Phần III (6 câu Trả lời ngắn).",
  time_minutes: 90,
  is_active: true,
  allowed_all: true,
  allowed_students: ["HS202701", "HS202702", "HS202703"],
  pdf_url: "de-toan-12-le-thanh-tong.pdf",
  solution_pdf_url: "dethi_toan_thpt_2027_ma101.pdf",
  allow_view_answers: true,
  part1: [
    { id: 1, correct_answer: "C" },
    { id: 2, correct_answer: "D" },
    { id: 3, correct_answer: "A" },
    { id: 4, correct_answer: "C" },
    { id: 5, correct_answer: "C" },
    { id: 6, correct_answer: "B" },
    { id: 7, correct_answer: "A" },
    { id: 8, correct_answer: "D" },
    { id: 9, correct_answer: "D" },
    { id: 10, correct_answer: "D" },
    { id: 11, correct_answer: "B" },
    { id: 12, correct_answer: "A" }
  ],
  part2: [
    {
      id: 1,
      statements: [
        { sub_id: "a", correct: false },
        { sub_id: "b", correct: false },
        { sub_id: "c", correct: true },
        { sub_id: "d", correct: true }
      ]
    },
    {
      id: 2,
      statements: [
        { sub_id: "a", correct: true },
        { sub_id: "b", correct: false },
        { sub_id: "c", correct: true },
        { sub_id: "d", correct: true }
      ]
    },
    {
      id: 3,
      statements: [
        { sub_id: "a", correct: false },
        { sub_id: "b", correct: true },
        { sub_id: "c", correct: false },
        { sub_id: "d", correct: true }
      ]
    },
    {
      id: 4,
      statements: [
        { sub_id: "a", correct: true },
        { sub_id: "b", correct: false },
        { sub_id: "c", correct: false },
        { sub_id: "d", correct: false }
      ]
    }
  ],
  part3: [
    { id: 1, correct_answer: "0.03" },
    { id: 2, correct_answer: "150" },
    { id: 3, correct_answer: "1080" },
    { id: 4, correct_answer: "3" },
    { id: 5, correct_answer: "6.09" },
    { id: 6, correct_answer: "1.98" }
  ]
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = SAMPLE_EXAM_2027;
}
