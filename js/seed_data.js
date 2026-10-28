// Dữ liệu hạt giống khởi tạo hệ thống (Seed Data)
// Tự động nạp vào LocalStorage nếu chưa có dữ liệu

const INITIAL_SEED_DATA = {
  // 1. Tài khoản Giáo viên (Admin)
  admin: {
    username: "admin",
    password: "123", // Mật khẩu kiểm thử nhanh
    fullName: "Thầy Huỳnh Thanh Chí",
    role: "admin",
    email: "badaoqn132@gmail.com"
  },

  // 2. Danh sách Học sinh (Mã học sinh đi kèm tên và lớp)
  students: [
    {
      studentId: "HS202701",
      fullName: "Nguyễn Văn An",
      password: "123",
      className: "12A1",
      phone: "0912345601",
      parentName: "Bác Hùng (Bố)",
      notes: "Học sinh khá giỏi, tư duy nhanh",
      status: "active",
      createdAt: "2026-10-20T08:00:00Z",
      allowedExams: ["EXAM-2027-01", "EXAM-2027-02", "EXAM-2027-03"],
      allowedHomeworks: ["HW-2027-01", "HW-2027-02"]
    },
    {
      studentId: "HS202702",
      fullName: "Trần Thị Mai",
      password: "123",
      className: "12A1",
      phone: "0987654302",
      parentName: "Cô Lan (Mẹ)",
      notes: "Cần rèn luyện thêm bài toán thực tế GDPT 2018",
      status: "active",
      createdAt: "2026-10-21T09:00:00Z",
      allowedExams: ["EXAM-2027-01", "EXAM-2027-02", "EXAM-2027-03"],
      allowedHomeworks: ["HW-2027-01"]
    },
    {
      studentId: "HS202703",
      fullName: "Lê Hoàng Long",
      password: "123",
      className: "12A2",
      phone: "0934567803",
      parentName: "Bác Tuấn (Bố)",
      notes: "Điểm phần đúng/sai cần cải thiện",
      status: "active",
      createdAt: "2026-10-22T10:00:00Z",
      allowedExams: ["EXAM-2027-01", "EXAM-2027-02", "EXAM-2027-03"],
      allowedHomeworks: ["HW-2027-01"]
    },
    {
      studentId: "HS202704",
      fullName: "Phạm Quỳnh Anh",
      password: "123",
      className: "12A2",
      phone: "0901234504",
      parentName: "Cô Mai (Mẹ)",
      notes: "Học đều các chuyên đề",
      status: "active",
      createdAt: "2026-10-23T11:00:00Z",
      allowedExams: ["EXAM-2027-01", "EXAM-2027-02", "EXAM-2027-03"],
      allowedHomeworks: ["HW-2027-01", "HW-2027-02"]
    }
  ],

  // 3. Danh sách Đề thi theo Khối 6 – 12 & Phân loại (GK1, CK1, GK2, CK2, Đề thi vào 10, Thi thử THPT QG)
  exams: [
    {
      id: "EXAM-2027-01",
      title: "Đề Kiểm Tra Giữa Kì 1 Môn Toán 12 — THPT Lê Thánh Tông",
      grade: 12,
      category: "GK1",
      roundLabel: "GK1 • Đợt 1",
      description: "Cấu trúc 3 phần chuẩn Bộ GD&ĐT: Phần I (12 câu ABCD), Phần II (4 câu Đúng/Sai), Phần III (6 câu Trả lời ngắn).",
      time_minutes: 90,
      is_active: true,
      allowed_all: true,
      allowed_students: ["HS202701", "HS202702", "HS202703", "HS202704"],
      pdf_url: "de-toan-12-le-thanh-tong.pdf",
      solution_pdf_url: "dethi_toan_thpt_2027_ma101.pdf"
    },
    {
      id: "EXAM-2027-02",
      title: "Đề Kiểm Tra Cuối Kì 1 Môn Toán 12 — Khảo Sát Tổng Hợp",
      grade: 12,
      category: "CK1",
      roundLabel: "CK1 • Đợt 2",
      description: "Đề kiểm tra cuối học kì 1 đánh giá toàn diện hàm số, vectơ không gian và thống kê GDPT 2018.",
      time_minutes: 90,
      is_active: true,
      allowed_all: true,
      allowed_students: ["HS202701", "HS202702", "HS202703", "HS202704"],
      pdf_url: "dethi_toan_thpt_2027_ma101.pdf",
      solution_pdf_url: "de-toan-12-le-thanh-tong.pdf"
    },
    {
      id: "EXAM-2027-05",
      title: "Đề Kiểm Tra Giữa Kì 2 Môn Toán 11 — Mũ, Lôgarit & Hình Không Gian",
      grade: 11,
      category: "GK2",
      roundLabel: "GK2 • Đợt 1",
      description: "Đề kiểm tra định kì giữa học kì 2 môn Toán Khối 11 theo định dạng trắc nghiệm 3 phần.",
      time_minutes: 90,
      is_active: true,
      allowed_all: true,
      allowed_students: ["HS202701", "HS202702", "HS202703", "HS202704"],
      pdf_url: "de-toan-12-le-thanh-tong.pdf",
      solution_pdf_url: "dethi_toan_thpt_2027_ma101.pdf"
    },
    {
      id: "EXAM-2027-06",
      title: "Đề Kiểm Tra Cuối Kì 2 Môn Toán 10 — Đại Số Tổ Hợp & Xác Suất",
      grade: 10,
      category: "CK2",
      roundLabel: "CK2 • Đợt 1",
      description: "Đề kiểm tra cuối học kì 2 môn Toán Khối 10 bám sát chương trình GDPT 2018.",
      time_minutes: 90,
      is_active: true,
      allowed_all: true,
      allowed_students: ["HS202701", "HS202702", "HS202703", "HS202704"],
      pdf_url: "dethi_toan_thpt_2027_ma101.pdf",
      solution_pdf_url: "de-toan-12-le-thanh-tong.pdf"
    },
    {
      id: "EXAM-2027-04",
      title: "Đề Thi Thử Tuyển Sinh Vào Lớp 10 Môn Toán 9 — Lần 1",
      grade: 9,
      category: "TS10",
      roundLabel: "TS10 • Lần 1",
      description: "Đề luyện thi tuyển sinh vào lớp 10 bám sát cấu trúc mới dành cho học sinh Khối 9.",
      time_minutes: 90,
      is_active: true,
      allowed_all: true,
      allowed_students: ["HS202701", "HS202702", "HS202703", "HS202704"],
      pdf_url: "dethi_toan_thpt_2027_ma101.pdf",
      solution_pdf_url: "de-toan-12-le-thanh-tong.pdf"
    },
    {
      id: "EXAM-2027-03",
      title: "Đề Thi Thử Tốt Nghiệp THPT Quốc Gia Môn Toán — Lần 1",
      grade: 12,
      category: "THPTQG",
      roundLabel: "THPT QG • Lần 1",
      description: "Đề thi thử toàn diện chuẩn cấu trúc 3 phần phục vụ kỳ thi tốt nghiệp THPT Quốc gia.",
      time_minutes: 90,
      is_active: true,
      allowed_all: true,
      allowed_students: ["HS202701", "HS202702", "HS202703", "HS202704"],
      pdf_url: "de-toan-12-le-thanh-tong.pdf",
      solution_pdf_url: "dethi_toan_thpt_2027_ma101.pdf"
    }
  ],

  // 4. Danh sách Tài liệu & Chuyên đề phân theo Khối 6 – 12
  homeworks: [
    {
      id: "HW-2027-01",
      title: "Chuyên đề Toán 12: Ứng dụng Đạo hàm & Khảo sát hàm số (GDPT 2018)",
      grade: 12,
      description: "Tóm tắt lý thuyết, 12 dạng toán trọng tâm và 30 câu hỏi rèn luyện cấu trúc 3 phần.",
      pdfUrl: "dethi_toan_thpt_2027_ma101.pdf",
      fileName: "Chuyen_De_Dao_Ham_Toan12.pdf",
      fileSize: "2.4 MB",
      dateAdded: "2026-10-20",
      allowedAll: true,
      accessType: "all",
      allowedStudents: ["HS202701", "HS202702", "HS202703", "HS202704"]
    },
    {
      id: "HW-2027-02",
      title: "Tài liệu bồi dưỡng Toán 12: Hình học không gian & Oxyz Vận dụng cao",
      grade: 12,
      description: "Dành riêng cho nhóm học sinh mục tiêu 9+ môn Toán THPT Quốc gia.",
      pdfUrl: "de-toan-12-le-thanh-tong.pdf",
      fileName: "Hinh_Khong_Gian_Oxyz_9Plus.pdf",
      fileSize: "3.1 MB",
      dateAdded: "2026-10-24",
      allowedAll: false,
      accessType: "selected",
      allowedStudents: ["HS202701", "HS202704"]
    },
    {
      id: "HW-2027-03",
      title: "Chuyên đề Toán 11: Hàm số Mũ, Lôgarit & Quan hệ vuông góc trong không gian",
      grade: 11,
      description: "Hệ thống công thức trọng tâm, phân dạng bài tập GK2 – CK2 môn Toán Khối 11.",
      pdfUrl: "de-toan-12-le-thanh-tong.pdf",
      fileName: "Chuyen_De_Mu_Logarit_Toan11.pdf",
      fileSize: "2.1 MB",
      dateAdded: "2026-10-25",
      allowedAll: true,
      accessType: "all",
      allowedStudents: ["HS202701", "HS202702", "HS202703", "HS202704"]
    },
    {
      id: "HW-2027-04",
      title: "Chuyên đề Toán 10: Đại số Tổ hợp, Nhị thức Newton & Xác suất cổ điển",
      grade: 10,
      description: "Lý thuyết cô đọng kèm bài tập tự luyện theo định dạng trắc nghiệm mới Khối 10.",
      pdfUrl: "dethi_toan_thpt_2027_ma101.pdf",
      fileName: "To_Hop_Xac_Suat_Toan10.pdf",
      fileSize: "1.9 MB",
      dateAdded: "2026-10-26",
      allowedAll: true,
      accessType: "all",
      allowedStudents: ["HS202701", "HS202702", "HS202703", "HS202704"]
    },
    {
      id: "HW-2027-05",
      title: "Chuyên đề Toán 9: Hệ thức Vi-ét & Hình học đường tròn Ôn thi vào lớp 10",
      grade: 9,
      description: "Tổng hợp các dạng toán rút gọn, phương trình bậc hai và tứ giác nội tiếp thi vào 10.",
      pdfUrl: "dethi_toan_thpt_2027_ma101.pdf",
      fileName: "On_Thi_Vao_10_Toan9.pdf",
      fileSize: "2.8 MB",
      dateAdded: "2026-10-26",
      allowedAll: true,
      accessType: "all",
      allowedStudents: ["HS202701", "HS202702", "HS202703", "HS202704"]
    }
  ],

  // 5. Lịch sử bài nộp mẫu qua các đợt thi (Đợt 1, Đợt 2, Đợt 3)
  submissions: [
    // --- Học sinh 1: Nguyễn Văn An (Lớp 12A1) ---
    {
      id: "SUB-001",
      examId: "EXAM-2027-01",
      examTitle: "Đề Kiểm Tra Giữa Kì 1 Môn Toán 12 — THPT Lê Thánh Tông",
      studentId: "HS202701",
      studentName: "Nguyễn Văn An",
      submittedAt: "2026-10-22T14:30:00Z",
      durationTakenSeconds: 4320,
      scoreResult: {
        part1: { score: 2.75, maxScore: 3.0, totalQuestions: 12, correctCount: 11 },
        part2: { score: 3.25, maxScore: 4.0, totalQuestions: 4, correctStatements: 14 },
        part3: { score: 2.50, maxScore: 3.0, totalQuestions: 6, correctCount: 5 },
        totalScore: 8.50,
        percentage: 85.0,
        rank: "Giỏi"
      },
      answers: {
        part1: { 1: "C", 2: "D", 3: "A", 4: "C", 5: "C", 6: "B", 7: "A", 8: "D", 9: "D", 10: "D", 11: "B", 12: "B" },
        part2: {
          1: { a: false, b: false, c: true, d: true },
          2: { a: true, b: false, c: true, d: true },
          3: { a: false, b: true, c: false, d: true },
          4: { a: true, b: false, c: false, d: true }
        },
        part3: { 1: "0.03", 2: "150", 3: "1080", 4: "11.3", 5: "6.09", 6: "1.90" }
      }
    },
    {
      id: "SUB-002",
      examId: "EXAM-2027-02",
      examTitle: "Đề Kiểm Tra Cuối Kì 1 Môn Toán 12 — Khảo Sát Tổng Hợp",
      studentId: "HS202701",
      studentName: "Nguyễn Văn An",
      submittedAt: "2026-10-24T10:15:00Z",
      durationTakenSeconds: 4600,
      scoreResult: {
        part1: { score: 3.00, maxScore: 3.0, totalQuestions: 12, correctCount: 12 },
        part2: { score: 3.50, maxScore: 4.0, totalQuestions: 4, correctStatements: 15 },
        part3: { score: 2.50, maxScore: 3.0, totalQuestions: 6, correctCount: 5 },
        totalScore: 9.00,
        percentage: 90.0,
        rank: "Xuất sắc"
      },
      answers: { part1: {}, part2: {}, part3: {} }
    },
    {
      id: "SUB-003",
      examId: "EXAM-2027-03",
      examTitle: "Đề Thi Thử Tốt Nghiệp THPT Quốc Gia Môn Toán — Lần 1",
      studentId: "HS202701",
      studentName: "Nguyễn Văn An",
      submittedAt: "2026-10-26T08:45:00Z",
      durationTakenSeconds: 4800,
      scoreResult: {
        part1: { score: 2.75, maxScore: 3.0, totalQuestions: 12, correctCount: 11 },
        part2: { score: 3.00, maxScore: 4.0, totalQuestions: 4, correctStatements: 13 },
        part3: { score: 2.50, maxScore: 3.0, totalQuestions: 6, correctCount: 5 },
        totalScore: 8.25,
        percentage: 82.5,
        rank: "Giỏi"
      },
      answers: { part1: {}, part2: {}, part3: {} }
    },

    // --- Học sinh 2: Trần Thị Mai (Lớp 12A1) ---
    {
      id: "SUB-004",
      examId: "EXAM-2027-01",
      examTitle: "Đề Kiểm Tra Giữa Kì 1 Môn Toán 12 — THPT Lê Thánh Tông",
      studentId: "HS202702",
      studentName: "Trần Thị Mai",
      submittedAt: "2026-10-22T15:00:00Z",
      durationTakenSeconds: 4500,
      scoreResult: {
        part1: { score: 2.50, maxScore: 3.0, totalQuestions: 12, correctCount: 10 },
        part2: { score: 3.25, maxScore: 4.0, totalQuestions: 4, correctStatements: 14 },
        part3: { score: 2.00, maxScore: 3.0, totalQuestions: 6, correctCount: 4 },
        totalScore: 7.75,
        percentage: 77.5,
        rank: "Khá"
      },
      answers: { part1: {}, part2: {}, part3: {} }
    },
    {
      id: "SUB-005",
      examId: "EXAM-2027-02",
      examTitle: "Đề Kiểm Tra Cuối Kì 1 Môn Toán 12 — Khảo Sát Tổng Hợp",
      studentId: "HS202702",
      studentName: "Trần Thị Mai",
      submittedAt: "2026-10-24T11:20:00Z",
      durationTakenSeconds: 4200,
      scoreResult: {
        part1: { score: 2.75, maxScore: 3.0, totalQuestions: 12, correctCount: 11 },
        part2: { score: 3.00, maxScore: 4.0, totalQuestions: 4, correctStatements: 13 },
        part3: { score: 2.50, maxScore: 3.0, totalQuestions: 6, correctCount: 5 },
        totalScore: 8.25,
        percentage: 82.5,
        rank: "Giỏi"
      },
      answers: { part1: {}, part2: {}, part3: {} }
    },
    {
      id: "SUB-005B",
      examId: "EXAM-2027-03",
      examTitle: "Đề Thi Thử Tốt Nghiệp THPT Quốc Gia Môn Toán — Lần 1",
      studentId: "HS202702",
      studentName: "Trần Thị Mai",
      submittedAt: "2026-10-25T09:30:00Z",
      attemptNumber: 1,
      tabSwitches: 0,
      durationTakenSeconds: 4300,
      scoreResult: {
        part1: { score: 2.75, maxScore: 3.0, totalQuestions: 12, correctCount: 11 },
        part2: { score: 3.25, maxScore: 4.0, totalQuestions: 4, correctStatements: 14 },
        part3: { score: 2.50, maxScore: 3.0, totalQuestions: 6, correctCount: 5 },
        totalScore: 8.50,
        percentage: 85.0,
        rank: "Giỏi"
      },
      answers: { part1: {}, part2: {}, part3: {} }
    },
    {
      id: "SUB-005C",
      examId: "EXAM-2027-01",
      examTitle: "Đề Kiểm Tra Giữa Kì 1 Môn Toán 12 — THPT Lê Thánh Tông",
      studentId: "HS202702",
      studentName: "Trần Thị Mai",
      submittedAt: "2026-10-25T14:15:00Z",
      attemptNumber: 2,
      tabSwitches: 1,
      durationTakenSeconds: 3900,
      scoreResult: {
        part1: { score: 3.00, maxScore: 3.0, totalQuestions: 12, correctCount: 12 },
        part2: { score: 3.50, maxScore: 4.0, totalQuestions: 4, correctStatements: 15 },
        part3: { score: 2.50, maxScore: 3.0, totalQuestions: 6, correctCount: 5 },
        totalScore: 9.00,
        percentage: 90.0,
        rank: "Xuất sắc"
      },
      answers: { part1: {}, part2: {}, part3: {} }
    },
    {
      id: "SUB-005D",
      examId: "EXAM-2027-02",
      examTitle: "Đề Kiểm Tra Cuối Kì 1 Môn Toán 12 — Khảo Sát Tổng Hợp",
      studentId: "HS202702",
      studentName: "Trần Thị Mai",
      submittedAt: "2026-10-26T08:00:00Z",
      attemptNumber: 2,
      tabSwitches: 0,
      durationTakenSeconds: 3800,
      scoreResult: {
        part1: { score: 2.75, maxScore: 3.0, totalQuestions: 12, correctCount: 11 },
        part2: { score: 3.50, maxScore: 4.0, totalQuestions: 4, correctStatements: 15 },
        part3: { score: 2.50, maxScore: 3.0, totalQuestions: 6, correctCount: 5 },
        totalScore: 8.75,
        percentage: 87.5,
        rank: "Giỏi"
      },
      answers: { part1: {}, part2: {}, part3: {} }
    },


    // --- Học sinh 3: Lê Hoàng Long (Lớp 12A2) ---
    {
      id: "SUB-006",
      examId: "EXAM-2027-01",
      examTitle: "Đề Kiểm Tra Giữa Kì 1 Môn Toán 12 — THPT Lê Thánh Tông",
      studentId: "HS202703",
      studentName: "Lê Hoàng Long",
      submittedAt: "2026-10-22T16:10:00Z",
      durationTakenSeconds: 4100,
      scoreResult: {
        part1: { score: 2.25, maxScore: 3.0, totalQuestions: 12, correctCount: 9 },
        part2: { score: 2.50, maxScore: 4.0, totalQuestions: 4, correctStatements: 11 },
        part3: { score: 1.50, maxScore: 3.0, totalQuestions: 6, correctCount: 3 },
        totalScore: 6.25,
        percentage: 62.5,
        rank: "Trung bình"
      },
      answers: { part1: {}, part2: {}, part3: {} }
    },
    {
      id: "SUB-007",
      examId: "EXAM-2027-02",
      examTitle: "Đề Kiểm Tra Cuối Kì 1 Môn Toán 12 — Khảo Sát Tổng Hợp",
      studentId: "HS202703",
      studentName: "Lê Hoàng Long",
      submittedAt: "2026-10-24T14:40:00Z",
      durationTakenSeconds: 4400,
      scoreResult: {
        part1: { score: 2.50, maxScore: 3.0, totalQuestions: 12, correctCount: 10 },
        part2: { score: 2.50, maxScore: 4.0, totalQuestions: 4, correctStatements: 11 },
        part3: { score: 2.00, maxScore: 3.0, totalQuestions: 6, correctCount: 4 },
        totalScore: 7.00,
        percentage: 70.0,
        rank: "Khá"
      },
      answers: { part1: {}, part2: {}, part3: {} }
    },
    {
      id: "SUB-008",
      examId: "EXAM-2027-03",
      examTitle: "Đề Thi Thử Tốt Nghiệp THPT Quốc Gia Môn Toán — Lần 1",
      studentId: "HS202703",
      studentName: "Lê Hoàng Long",
      submittedAt: "2026-10-26T09:30:00Z",
      durationTakenSeconds: 4600,
      scoreResult: {
        part1: { score: 2.50, maxScore: 3.0, totalQuestions: 12, correctCount: 10 },
        part2: { score: 2.25, maxScore: 4.0, totalQuestions: 4, correctStatements: 10 },
        part3: { score: 2.00, maxScore: 3.0, totalQuestions: 6, correctCount: 4 },
        totalScore: 6.75,
        percentage: 67.5,
        rank: "Khá"
      },
      answers: { part1: {}, part2: {}, part3: {} }
    },

    // --- Học sinh 4: Phạm Quỳnh Anh (Lớp 12A2) ---
    {
      id: "SUB-009",
      examId: "EXAM-2027-01",
      examTitle: "Đề Kiểm Tra Giữa Kì 1 Môn Toán 12 — THPT Lê Thánh Tông",
      studentId: "HS202704",
      studentName: "Phạm Quỳnh Anh",
      submittedAt: "2026-10-22T14:10:00Z",
      durationTakenSeconds: 3900,
      scoreResult: {
        part1: { score: 3.00, maxScore: 3.0, totalQuestions: 12, correctCount: 12 },
        part2: { score: 3.50, maxScore: 4.0, totalQuestions: 4, correctStatements: 15 },
        part3: { score: 3.00, maxScore: 3.0, totalQuestions: 6, correctCount: 6 },
        totalScore: 9.50,
        percentage: 95.0,
        rank: "Xuất sắc"
      },
      answers: { part1: {}, part2: {}, part3: {} }
    },
    {
      id: "SUB-010",
      examId: "EXAM-2027-02",
      examTitle: "Đề Kiểm Tra Cuối Kì 1 Môn Toán 12 — Khảo Sát Tổng Hợp",
      studentId: "HS202704",
      studentName: "Phạm Quỳnh Anh",
      submittedAt: "2026-10-24T09:50:00Z",
      durationTakenSeconds: 4100,
      scoreResult: {
        part1: { score: 3.00, maxScore: 3.0, totalQuestions: 12, correctCount: 12 },
        part2: { score: 3.75, maxScore: 4.0, totalQuestions: 4, correctStatements: 16 },
        part3: { score: 3.00, maxScore: 3.0, totalQuestions: 6, correctCount: 6 },
        totalScore: 9.75,
        percentage: 97.5,
        rank: "Xuất sắc"
      },
      answers: { part1: {}, part2: {}, part3: {} }
    },
    {
      id: "SUB-011",
      examId: "EXAM-2027-03",
      examTitle: "Đề Thi Thử Tốt Nghiệp THPT Quốc Gia Môn Toán — Lần 1",
      studentId: "HS202704",
      studentName: "Phạm Quỳnh Anh",
      submittedAt: "2026-10-26T08:30:00Z",
      durationTakenSeconds: 4300,
      scoreResult: {
        part1: { score: 3.00, maxScore: 3.0, totalQuestions: 12, correctCount: 12 },
        part2: { score: 3.25, maxScore: 4.0, totalQuestions: 4, correctStatements: 14 },
        part3: { score: 3.00, maxScore: 3.0, totalQuestions: 6, correctCount: 6 },
        totalScore: 9.25,
        percentage: 92.5,
        rank: "Xuất sắc"
      },
      answers: { part1: {}, part2: {}, part3: {} }
    }
  ]
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = INITIAL_SEED_DATA;
}
