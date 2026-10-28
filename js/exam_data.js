// Đề thi chuẩn THPT Quốc Gia môn Toán 2027 (Cấu trúc 3 phần theo GDPT 2018)
// Sử dụng trực tiếp file đề thi thực tế: de-toan-12-le-thanh-tong.pdf

const SAMPLE_EXAM_2027 = {
  id: "EXAM-2027-01",
  title: "Đề Kiểm Tra Giữa Kỳ 1 Môn Toán 12 — Trường THPT Lê Thánh Tông TP.HCM",
  description: "Cấu trúc 3 phần chuẩn Bộ GD&ĐT: Phần I (12 câu ABCD), Phần II (4 câu Đúng/Sai), Phần III (6 câu Trả lời ngắn).",
  time_minutes: 90,
  is_active: true,
  allowed_all: true,
  allowed_students: ["HS202701", "HS202702", "HS202703"],
  pdf_url: "de-toan-12-le-thanh-tong.pdf", // File PDF thực tế của giáo viên, hiển thị trực tiếp 100% không bị tải về
  solution_pdf_url: "dethi_toan_thpt_2027_ma101.pdf", // File PDF đáp án & lời giải chi tiết đối chiếu
  allow_view_answers: true, // Cho phép học sinh xem đáp án và file PDF lời giải (Giáo viên có thể bật/tắt)
  raw_tex: `% ĐỀ KIỂM TRA GIỮA KỲ 1 MÔN TOÁN 12 - TRƯỜNG THPT LÊ THÁNH TÔNG TP.HCM
\\begin{ex}
Cho hàm số $y = -2x^3 - x + 2026$. Hàm số đã cho nghịch biến trên khoảng nào dưới đây?
\\choice
{$(-\\infty; 0)$}
{$(0; +\\infty)$}
{\\True $\\mathbb{R}$}
{$(-1; 1)$}
\\loigiai{Ta có $y' = -6x^2 - 1 < 0, \\forall x \\in \\mathbb{R}$. Vậy hàm số nghịch biến trên $\\mathbb{R}$. Chọn C.}
\\end{ex}
`,
  part1: [
    {
      id: 1,
      content: "Cho hàm số $y = -2x^3 - x + 2026$. Hàm số đã cho nghịch biến trên khoảng nào dưới đây?",
      choices: [
        "A. $(-\\infty; 0)$",
        "B. $(0; +\\infty)$",
        "C. $\\mathbb{R}$",
        "D. $(-1; 1)$"
      ],
      correct_answer: "C",
      solution: "Ta có $y' = -6x^2 - 1 < 0, \\forall x \\in \\mathbb{R}$. Vậy hàm số nghịch biến trên $\\mathbb{R}$.",
      explanation: "Ta có $y' = -6x^2 - 1 < 0, \\forall x \\in \\mathbb{R}$. Vậy hàm số nghịch biến trên $\\mathbb{R}$."
    },
    {
      id: 2,
      content: "Đường thẳng đi qua hai điểm cực trị của đồ thị hàm số $y = x + \\dfrac{1}{x+1}$ có phương trình là:",
      choices: [
        "A. $y = x + 1$",
        "B. $y = -2x + 1$",
        "C. $y = 2x - 1$",
        "D. $y = 2x + 1$"
      ],
      correct_answer: "D",
      solution: "Ta có $y' = 1 - \\dfrac{1}{(x+1)^2}$. Tại các điểm cực trị: $y'=0 \\Rightarrow (x+1)^2=1 \\Rightarrow \\dfrac{1}{x+1} = x+1$. Do đó cả hai điểm cực trị đều thuộc đường thẳng $y = (x+1) + x = 2x+1$.",
      explanation: "Ta có $y' = 1 - \\dfrac{1}{(x+1)^2}$. Tại các điểm cực trị: $y'=0 \\Rightarrow (x+1)^2=1 \\Rightarrow \\dfrac{1}{x+1} = x+1$. Do đó cả hai điểm cực trị đều thuộc đường thẳng $y = (x+1) + x = 2x+1$."
    },
    {
      id: 3,
      content: "Cho hình hộp chữ nhật $ABCD.A'B'C'D'$. Vectơ $\\vec{u} = \\vec{DC} + \\vec{C'A'} + \\vec{AD} - \\vec{DD'}$ bằng vectơ nào sau đây?",
      choices: [
        "A. $\\vec{0}$",
        "B. $\\vec{AC}$",
        "C. $\\vec{BD'}$",
        "D. $\\vec{AA'}$"
      ],
      correct_answer: "A",
      solution: "Vì $\\vec{BB'} = \\vec{DD'}$ nên $\\vec{u} = (\\vec{DC} + \\vec{AD}) + \\vec{C'A'} - \\vec{DD'} = \\vec{AC} + \\vec{C'A'} = \\vec{0}$.",
      explanation: "Vì $\\vec{BB'} = \\vec{DD'}$ nên $\\vec{u} = (\\vec{DC} + \\vec{AD}) + \\vec{C'A'} - \\vec{DD'} = \\vec{AC} + \\vec{C'A'} = \\vec{0}$."
    },
    {
      id: 4,
      content: "Đường tiệm cận xiên của đồ thị hàm số $y = \\dfrac{x^2 - x - 1}{x - 2}$ có phương trình là:",
      choices: [
        "A. $y = x - 1$",
        "B. $y = x + 2$",
        "C. $y = x + 1$",
        "D. $y = 2x + 1$"
      ],
      correct_answer: "C",
      solution: "Ta có $y = \\dfrac{x^2 - x - 1}{x - 2} = x + 1 + \\dfrac{1}{x-2}$. Khi $x \\to \\pm\\infty$, ta có $\\lim_{x \\to \\pm\\infty} [y - (x+1)] = 0$. Vậy đường tiệm cận xiên là $y = x + 1$.",
      explanation: "Ta có $y = \\dfrac{x^2 - x - 1}{x - 2} = x + 1 + \\dfrac{1}{x-2}$. Khi $x \\to \\pm\\infty$, ta có $\\lim_{x \\to \\pm\\infty} [y - (x+1)] = 0$. Vậy đường tiệm cận xiên là $y = x + 1$."
    },
    {
      id: 5,
      content: "Đường tiệm cận ngang khi $x \\to -\\infty$ của đồ thị hàm số $y = \\dfrac{\\sqrt{x^2+1}}{x-2}$ có phương trình là:",
      choices: [
        "A. $y = 1$",
        "B. $y = 0$",
        "C. $y = -1$",
        "D. $y = 2$"
      ],
      correct_answer: "C",
      solution: "Khi $x \\to -\\infty$, ta có $\\sqrt{x^2+1} = -x\\sqrt{1 + \\dfrac{1}{x^2}}$, do đó $\\lim_{x \\to -\\infty} y = \\lim_{x \\to -\\infty} \\dfrac{-x}{x} = -1$. Vậy $y = -1$ là đường tiệm cận ngang.",
      explanation: "Khi $x \\to -\\infty$, ta có $\\sqrt{x^2+1} = -x\\sqrt{1 + \\dfrac{1}{x^2}}$, do đó $\\lim_{x \\to -\\infty} y = \\lim_{x \\to -\\infty} \\dfrac{-x}{x} = -1$. Vậy $y = -1$ là đường tiệm cận ngang."
    },
    {
      id: 6,
      content: "Cho hàm số $y = f(x)$ có đạo hàm $f'(x) = 6x^2 - 10x$. Hàm số đã cho đồng biến trên khoảng nào dưới đây?",
      choices: [
        "A. $(0; 2)$",
        "B. $(2; +\\infty)$",
        "C. $(0; 5/3)$",
        "D. $(-\\infty; 2)$"
      ],
      correct_answer: "B",
      solution: "Ta có $f'(x) = 2x(3x-5) > 0 \\Leftrightarrow x \\in (-\\infty; 0) \\cup \\left(\\dfrac{5}{3}; +\\infty\\right)$. Vì khoảng $(2; +\\infty) \\subset \\left(\\dfrac{5}{3}; +\\infty\\right)$ nên hàm số đồng biến trên khoảng $(2; +\\infty)$.",
      explanation: "Ta có $f'(x) = 2x(3x-5) > 0 \\Leftrightarrow x \\in (-\\infty; 0) \\cup \\left(\\dfrac{5}{3}; +\\infty\\right)$. Vì khoảng $(2; +\\infty) \\subset \\left(\\dfrac{5}{3}; +\\infty\\right)$ nên hàm số đồng biến trên khoảng $(2; +\\infty)$."
    },
    {
      id: 7,
      content: "Cho hàm số $y = f(x)$ liên tục trên $\\mathbb{R}$ và có đồ thị như hình vẽ bên dưới:\\newline \\begin{tikzpicture} plot Oxy cực đại (-2; 2) và cực tiểu (0; -2) \\draw[->] (-3,0) -- (4,0) node[below]{$x$}; \\draw[->] (0,-3) -- (0,3) node[left]{$y$}; \\draw plot[domain=-2.5:2.5] (\\x, {0.5*\\x^3 - 1.5*\\x}); \\end{tikzpicture}\\newline Từ đồ thị hàm số, giá trị lớn nhất của hàm số trên khoảng $(-\\infty; 0)$ đạt tại $x = -2$ với giá trị là:",
      choices: [
        "A. $2$",
        "B. $-2$",
        "C. $0$",
        "D. $4$"
      ],
      correct_answer: "A",
      solution: "Từ đồ thị hàm số, trên khoảng $(-\\infty; 0)$, điểm cao nhất của đồ thị là điểm cực đại $(-2; 2)$. Do đó giá trị lớn nhất của hàm số trên $(-\\infty; 0)$ đạt tại $x = -2$ với $M = f(-2) = 2$.",
      explanation: "Từ đồ thị hàm số, trên khoảng $(-\\infty; 0)$, điểm cao nhất của đồ thị là điểm cực đại $(-2; 2)$. Do đó giá trị lớn nhất của hàm số trên $(-\\infty; 0)$ đạt tại $x = -2$ với $M = f(-2) = 2$."
    },
    {
      id: 8,
      content: "Cho hình chóp $S.ABC$ có hai tam giác $SAB$ và $ABC$ cân lần lượt tại $S$ và $C$ như hình vẽ bên dưới:\\newline \\begin{tikzpicture} hình chóp S.ABC đáy tam giác \\draw (0,0) coordinate (A) -- (4,0) coordinate (B) -- (2,-1) coordinate (C) -- cycle; \\draw (2,3) coordinate (S) -- (A) (S) -- (B) (S) -- (C); \\end{tikzpicture}\\newline Góc giữa hai đường thẳng $SC$ và $BA$ bằng:",
      choices: [
        "A. $30^\\circ$",
        "B. $45^\\circ$",
        "C. $60^\\circ$",
        "D. $90^\\circ$"
      ],
      correct_answer: "D",
      solution: "Gọi $M$ là trung điểm cạnh $AB$. Vì $\\triangle SAB$ cân tại $S$ và $\\triangle CAB$ cân tại $C$ nên $AB \\perp SM$ và $AB \\perp CM$. Suy ra $AB \\perp (SMC) \\Rightarrow AB \\perp SC$. Vậy góc giữa hai đường thẳng bằng $90^\\circ$.",
      explanation: "Gọi $M$ là trung điểm cạnh $AB$. Vì $\\triangle SAB$ cân tại $S$ và $\\triangle CAB$ cân tại $C$ nên $AB \\perp SM$ và $AB \\perp CM$. Suy ra $AB \\perp (SMC) \\Rightarrow AB \\perp SC$. Vậy góc giữa hai đường thẳng bằng $90^\\circ$."
    },
    {
      id: 9,
      content: "Khoảng biến thiên của mẫu số liệu ghép nhóm có giá trị đầu là $2{,}5$ và giá trị cuối là $5{,}0$ là:",
      choices: [
        "A. $1{,}5$",
        "B. $2{,}0$",
        "C. $3{,}0$",
        "D. $2{,}5$"
      ],
      correct_answer: "D",
      solution: "Khoảng biến thiên $R = 5{,}0 - 2{,}5 = 2{,}5$.",
      explanation: "Khoảng biến thiên $R = 5{,}0 - 2{,}5 = 2{,}5$."
    },
    {
      id: 10,
      content: "Cho hình lăng trụ tam giác đều $ABC.A'B'C'$ có tất cả các cạnh bằng nhau. Góc giữa hai đường thẳng $A'B'$ và $BC'$ xấp xỉ bằng:",
      choices: [
        "A. $45^\\circ$",
        "B. $60^\\circ$",
        "C. $75^\\circ$",
        "D. $111^\\circ$"
      ],
      correct_answer: "D",
      solution: "Góc giữa hai đường thẳng xấp xỉ $110{,}7^\\circ$, làm tròn thành $111^\\circ$.",
      explanation: "Góc giữa hai đường thẳng xấp xỉ $110{,}7^\\circ$, làm tròn thành $111^\\circ$."
    },
    {
      id: 11,
      content: "Trong không gian $Oxyz$, cho $A(1; -1; 4)$, $B(2; 0; 5)$. Điểm $M(a; b; c) \\in (Oxy)$ thẳng hàng với $A, B$. Khi đó $a + b + c$ bằng:",
      choices: [
        "A. $8$",
        "B. $-8$",
        "C. $0$",
        "D. $-4$"
      ],
      correct_answer: "B",
      solution: "Ta có $\\vec{AB} = (1; 1; 1)$. Phương trình tham số đường thẳng $AB$: $M(1+t; -1+t; 4+t)$. Vì $M \\in (Oxy) \\Rightarrow 4+t = 0 \\Rightarrow t = -4 \\Rightarrow M(-3; -5; 0)$. Do đó $a+b+c = -3 - 5 + 0 = -8$.",
      explanation: "Ta có $\\vec{AB} = (1; 1; 1)$. Phương trình tham số đường thẳng $AB$: $M(1+t; -1+t; 4+t)$. Vì $M \\in (Oxy) \\Rightarrow 4+t = 0 \\Rightarrow t = -4 \\Rightarrow M(-3; -5; 0)$. Do đó $a+b+c = -3 - 5 + 0 = -8$."
    },
    {
      id: 12,
      content: "Giá trị nhỏ nhất của hàm số $f(x) = x^3 - 30x$ trên đoạn $[2; 19]$ đạt tại $x_0 = \\sqrt{10}$ với giá trị $m$. Khi đó $T = m \\cdot x_0$ bằng:",
      choices: [
        "A. $-200$",
        "B. $200$",
        "C. $-100$",
        "D. $0$"
      ],
      correct_answer: "A",
      solution: "Ta có $f'(x) = 3x^2 - 30 = 3(x^2 - 10)$. Trên đoạn $[2; 19]$, hàm số đạt cực tiểu và giá trị nhỏ nhất tại $x_0 = \\sqrt{10}$, với $m = f(\\sqrt{10}) = -20\\sqrt{10}$. Khi đó $T = m \\cdot x_0 = (-20\\sqrt{10}) \\cdot \\sqrt{10} = -200$.",
      explanation: "Ta có $f'(x) = 3x^2 - 30 = 3(x^2 - 10)$. Trên đoạn $[2; 19]$, hàm số đạt cực tiểu và giá trị nhỏ nhất tại $x_0 = \\sqrt{10}$, với $m = f(\\sqrt{10}) = -20\\sqrt{10}$. Khi đó $T = m \\cdot x_0 = (-20\\sqrt{10}) \\cdot \\sqrt{10} = -200$."
    }
  ],

  part2: [
    {
      id: 1,
      content: "Cho hàm số bậc ba $y = f(x) = 2x^3 - 6x - 1$. Xét tính đúng/sai của các khẳng định sau:",
      statements: [
        { sub_id: "a", text: "Hàm số đạt cực đại tại điểm $x = 1$.", correct: false },
        { sub_id: "b", text: "Hàm số đồng biến trên khoảng $(-5; +\\infty)$.", correct: false },
        { sub_id: "c", text: "Đồ thị hàm số cắt trục tung tại điểm có tung độ bằng $-1$.", correct: true },
        { sub_id: "d", text: "Giá trị của hàm số tại hai điểm $x = -1$ và $x = 2$ bằng nhau và bằng $3$.", correct: true }
      ],
      items: [
        { key: "a", text: "Hàm số đạt cực đại tại điểm $x = 1$.", correct: false },
        { key: "b", text: "Hàm số đồng biến trên khoảng $(-5; +\\infty)$.", correct: false },
        { key: "c", text: "Đồ thị hàm số cắt trục tung tại điểm có tung độ bằng $-1$.", correct: true },
        { key: "d", text: "Giá trị của hàm số tại hai điểm $x = -1$ và $x = 2$ bằng nhau và bằng $3$.", correct: true }
      ],
      solution: "Ta có $f'(x) = 6x^2 - 6 = 0 \\Leftrightarrow x = \\pm 1$.\\newline Bảng biến thiên:\\newline \\begin{tikzpicture} bảng biến thiên tkztab \\tkzTabInit{$x$/1, $f'(x)$/1, $f(x)$/2}{$-\\infty$, $-1$, $1$, $+\\infty$} \\end{tikzpicture}\\newline a) Sai: Hàm số đạt cực đại tại điểm $x = -1$ (cực tiểu tại $x = 1$).\\newline b) Sai: Hàm số nghịch biến trên khoảng $(-1; 1)$.\\newline c) Đúng: Đồ thị hàm số cắt trục tung tại $(0; -1)$ vì $f(0) = -1$.\\newline d) Đúng: $f(-1) = 3$ và $f(2) = 16 - 12 - 1 = 3$.",
      explanation: "Ta có $f'(x) = 6x^2 - 6 = 0 \\Leftrightarrow x = \\pm 1$.\\newline Bảng biến thiên:\\newline \\begin{tikzpicture} bảng biến thiên tkztab \\tkzTabInit{$x$/1, $f'(x)$/1, $f(x)$/2}{$-\\infty$, $-1$, $1$, $+\\infty$} \\end{tikzpicture}\\newline a) Sai: Hàm số đạt cực đại tại điểm $x = -1$ (cực tiểu tại $x = 1$).\\newline b) Sai: Hàm số nghịch biến trên khoảng $(-1; 1)$.\\newline c) Đúng: Đồ thị hàm số cắt trục tung tại $(0; -1)$ vì $f(0) = -1$.\\newline d) Đúng: $f(-1) = 3$ và $f(2) = 16 - 12 - 1 = 3$."
    },
    {
      id: 2,
      content: "Khảo sát cân nặng của 40 học sinh lớp 12 được cho dưới dạng mẫu số liệu ghép nhóm. Xét tính đúng/sai của các mệnh đề sau:",
      statements: [
        { sub_id: "a", text: "Số trung bình của mẫu số liệu ghép nhóm là $\\bar{x} = 53{,}875$.", correct: true },
        { sub_id: "b", text: "Độ lệch chuẩn của mẫu số liệu ghép nhóm bằng $51{,}23$.", correct: false },
        { sub_id: "c", text: "Tứ phân vị thứ nhất của mẫu số liệu ghép nhóm xấp xỉ bằng $47{,}7$.", correct: true },
        { sub_id: "d", text: "Khoảng tứ phân vị của mẫu số liệu ghép nhóm $\\Delta Q \\approx 12{,}3$.", correct: true }
      ],
      items: [
        { key: "a", text: "Số trung bình của mẫu số liệu ghép nhóm là $\\bar{x} = 53{,}875$.", correct: true },
        { key: "b", text: "Độ lệch chuẩn của mẫu số liệu ghép nhóm bằng $51{,}23$.", correct: false },
        { key: "c", text: "Tứ phân vị thứ nhất của mẫu số liệu ghép nhóm xấp xỉ bằng $47{,}7$.", correct: true },
        { key: "d", text: "Khoảng tứ phân vị của mẫu số liệu ghép nhóm $\\Delta Q \\approx 12{,}3$.", correct: true }
      ],
      solution: "a) Đúng: Số trung bình của mẫu số liệu là $\\bar{x} = 53{,}875$.\nb) Sai: $51{,}23$ là phương sai $s^2$, độ lệch chuẩn là $s = \\sqrt{51{,}23} \\approx 7{,}16$.\nc) Đúng: Tứ phân vị thứ nhất $Q_1 \\approx 47{,}7$.\nd) Đúng: Tứ phân vị thứ ba $Q_3 = 60 \\Rightarrow \\Delta Q = 60 - 47{,}7 = 12{,}3$.",
      explanation: "a) Đúng: Số trung bình của mẫu số liệu là $\\bar{x} = 53{,}875$.\nb) Sai: $51{,}23$ là phương sai $s^2$, độ lệch chuẩn là $s = \\sqrt{51{,}23} \\approx 7{,}16$.\nc) Đúng: Tứ phân vị thứ nhất $Q_1 \\approx 47{,}7$.\nd) Đúng: Tứ phân vị thứ ba $Q_3 = 60 \\Rightarrow \\Delta Q = 60 - 47{,}7 = 12{,}3$."
    },
    {
      id: 3,
      content: "Một công ty du lịch chạy tuyến xe buýt với doanh thu tính theo số lượng khách $x$ ($0 < x \\le 45$) là $F(x) = x\\left(300 - \\dfrac{5}{2}x\\right)^2$ (nghìn đồng). Xét tính đúng/sai:",
      statements: [
        { sub_id: "a", text: "Công thức doanh thu là $F(x) = 300x - 5x^2$.", correct: false },
        { sub_id: "b", text: "Khi chở 40 hành khách thì doanh thu vượt mức 1,5 triệu đồng.", correct: true },
        { sub_id: "c", text: "Doanh thu của chuyến xe đạt lớn nhất khi chở tối đa 45 hành khách.", correct: false },
        { sub_id: "d", text: "Doanh thu lớn nhất mà chuyến xe có thể đạt được là 1,6 triệu đồng.", correct: true }
      ],
      items: [
        { key: "a", text: "Công thức doanh thu là $F(x) = 300x - 5x^2$.", correct: false },
        { key: "b", text: "Khi chở 40 hành khách thì doanh thu vượt mức 1,5 triệu đồng.", correct: true },
        { key: "c", text: "Doanh thu của chuyến xe đạt lớn nhất khi chở tối đa 45 hành khách.", correct: false },
        { key: "d", text: "Doanh thu lớn nhất mà chuyến xe có thể đạt được là 1,6 triệu đồng.", correct: true }
      ],
      solution: "a) Sai: Công thức chính xác là $F(x) = x(300 - 2{,}5x)^2$.\nb) Đúng: $F(40) = 40(100)^2 = 1.600.000\\text{ đ} > 1.500.000\\text{ đ}$.\nc) Sai: Đạo hàm $F'(x) = 0 \\Leftrightarrow x = 40$, doanh thu lớn nhất khi chở 40 hành khách.\nd) Đúng: Doanh thu lớn nhất đạt $1{,}6$ triệu đồng.",
      explanation: "a) Sai: Công thức chính xác là $F(x) = x(300 - 2{,}5x)^2$.\nb) Đúng: $F(40) = 40(100)^2 = 1.600.000\\text{ đ} > 1.500.000\\text{ đ}$.\nc) Sai: Đạo hàm $F'(x) = 0 \\Leftrightarrow x = 40$, doanh thu lớn nhất khi chở 40 hành khách.\nd) Đúng: Doanh thu lớn nhất đạt $1{,}6$ triệu đồng."
    },
    {
      id: 4,
      content: "Trong không gian $Oxyz$, mô hình trụ tháp và dây cáp với $A(0; -343; 75)$ và $D(0; 0; 227)$. Xét tính đúng/sai:",
      statements: [
        { sub_id: "a", text: "Tọa độ điểm $A(0; -343; 75)$ và đỉnh tháp $D(0; 0; 227)$.", correct: true },
        { sub_id: "b", text: "Góc giữa hai vectơ $\\vec{DA}$ và $\\vec{AO}$ bằng $36{,}2^\\circ$.", correct: false },
        { sub_id: "c", text: "Giao điểm của đường thẳng chứa dây cáp $AD$ với mặt phẳng mặt nước là $(0; -77861; 0)$.", correct: false },
        { sub_id: "d", text: "Chiều cao của điểm $N$ trên dây cáp thẳng đứng phía trên điểm $M$ là $75\\text{ m}$.", correct: false }
      ],
      items: [
        { key: "a", text: "Tọa độ điểm $A(0; -343; 75)$ và đỉnh tháp $D(0; 0; 227)$.", correct: true },
        { key: "b", text: "Góc giữa hai vectơ $\\vec{DA}$ và $\\vec{AO}$ bằng $36{,}2^\\circ$.", correct: false },
        { key: "c", text: "Giao điểm của đường thẳng chứa dây cáp $AD$ với mặt phẳng mặt nước là $(0; -77861; 0)$.", correct: false },
        { key: "d", text: "Chiều cao của điểm $N$ trên dây cáp thẳng đứng phía trên điểm $M$ là $75\\text{ m}$.", correct: false }
      ],
      solution: "a) Đúng: Tọa độ $A(0; -343; 75)$ và $D(0; 0; 227)$.\nb) Sai: Góc giữa 2 vectơ xấp xỉ $143{,}8^\\circ$.\nc) Sai: Giao điểm có tọa độ $\\left(0; -\\dfrac{77861}{152}; 0\\right)$.\nd) Sai: Chiều cao xấp xỉ $50{,}08\\text{ m}$.",
      explanation: "a) Đúng: Tọa độ $A(0; -343; 75)$ và $D(0; 0; 227)$.\nb) Sai: Góc giữa 2 vectơ xấp xỉ $143{,}8^\\circ$.\nc) Sai: Giao điểm có tọa độ $\\left(0; -\\dfrac{77861}{152}; 0\\right)$.\nd) Sai: Chiều cao xấp xỉ $50{,}08\\text{ m}$."
    }
  ],

  part3: [
    {
      id: 1,
      content: "Tìm độ lệch chuẩn của mẫu số liệu ghép nhóm về khối lượng sản phẩm (đơn vị: kg, làm tròn đến hàng phần trăm).",
      correct_answer: "0.03",
      solution: "Giá trị trung bình $\\bar{x} = 1$. Phương sai $s^2 = 0{,}000945$. Độ lệch chuẩn $s = \\sqrt{0{,}000945} \\approx 0{,}03$.",
      explanation: "Giá trị trung bình $\\bar{x} = 1$. Phương sai $s^2 = 0{,}000945$. Độ lệch chuẩn $s = \\sqrt{0{,}000945} \\approx 0{,}03$."
    },
    {
      id: 2,
      content: "Chi phí sản xuất trung bình cho mỗi sản phẩm của một xưởng là $\\bar{C}(x) = 150 + \\dfrac{900}{x}$ (nghìn đồng). Khi sản xuất số lượng sản phẩm rất lớn ($x \\to +\\infty$), chi phí trung bình tiến tới giá trị $t$ (nghìn đồng). Tìm $t$.",
      correct_answer: "150",
      solution: "Ta có $\\lim_{x \\to +\\infty} \\bar{C}(x) = \\lim_{x \\to +\\infty} \\left(150 + \\dfrac{900}{x}\\right) = 150$. Vậy $t = 150$.",
      explanation: "Ta có $\\lim_{x \\to +\\infty} \\bar{C}(x) = \\lim_{x \\to +\\infty} \\left(150 + \\dfrac{900}{x}\\right) = 150$. Vậy $t = 150$."
    },
    {
      id: 3,
      content: "Tốc độ bơm nước vào bể chứa được mô hình hóa bởi hàm số $v(t) = \\dfrac{t(90-t)^2}{100}$ (lít/phút) với $0 \\le t \\le 90$. Tốc độ bơm lớn nhất đạt được là bao nhiêu lít/phút?",
      correct_answer: "1080",
      solution: "Đạo hàm $v'(t) = \\dfrac{(90-t)(90-3t)}{100} = 0 \\Leftrightarrow t = 30$ hoặc $t = 90$ (với điểm cực trị trên $(0; 90)$ là $t = 60$ theo hàm tương đương). Giá trị lớn nhất đạt $v(60) = 1080\\text{ lít/phút}$.",
      explanation: "Đạo hàm $v'(t) = \\dfrac{(90-t)(90-3t)}{100} = 0 \\Leftrightarrow t = 30$ hoặc $t = 90$ (với điểm cực trị trên $(0; 90)$ là $t = 60$ theo hàm tương đương). Giá trị lớn nhất đạt $v(60) = 1080\\text{ lít/phút}$."
    },
    {
      id: 4,
      content: "Người ta muốn làm một bể cá hình hộp chữ nhật không nắp (như hình vẽ bên dưới) có thể tích $V = 0{,}5\\text{ m}^3$ với đáy là hình vuông cạnh $x$, chiều cao $h$ mét.\\newline \\begin{tikzpicture} hình hộp chữ nhật bể cá 3D đáy vuông cạnh x \\draw (0,0) rectangle (2,1); \\end{tikzpicture}\\newline Tìm diện tích kính nhỏ nhất để làm bể cá (làm tròn đến hàng đơn vị theo đơn vị $\\text{m}^2$).",
      correct_answer: "3",
      solution: "Thể tích của bể cá: $V = x^2 h = 0{,}5 \\Rightarrow h = \\dfrac{0{,}5}{x^2}$.\\newline Diện tích kính cần dùng (gồm 1 đáy hình vuông và 4 mặt bên):\\newline $S(x) = x^2 + 4xh = x^2 + 4x \\cdot \\dfrac{0{,}5}{x^2} = x^2 + \\dfrac{2}{x}$ với $x > 0$.\\newline Đạo hàm: $S'(x) = 2x - \\dfrac{2}{x^2} = 0 \\Leftrightarrow 2x^3 = 2 \\Leftrightarrow x = 1\\text{ m}$.\\newline Khi $x = 1$, ta có $S(1) = 1^2 + \\dfrac{2}{1} = 3\\text{ m}^2$.\\newline Bảng biến thiên cho thấy $S(x)$ đạt giá trị nhỏ nhất bằng $3\\text{ m}^2$ tại $x = 1\\text{ m}$.",
      explanation: "Thể tích của bể cá: $V = x^2 h = 0{,}5 \\Rightarrow h = \\dfrac{0{,}5}{x^2}$.\\newline Diện tích kính cần dùng (gồm 1 đáy hình vuông và 4 mặt bên):\\newline $S(x) = x^2 + 4xh = x^2 + 4x \\cdot \\dfrac{0{,}5}{x^2} = x^2 + \\dfrac{2}{x}$ với $x > 0$.\\newline Đạo hàm: $S'(x) = 2x - \\dfrac{2}{x^2} = 0 \\Leftrightarrow 2x^3 = 2 \\Leftrightarrow x = 1\\text{ m}$.\\newline Khi $x = 1$, ta có $S(1) = 1^2 + \\dfrac{2}{1} = 3\\text{ m}^2$.\\newline Bảng biến thiên cho thấy $S(x)$ đạt giá trị nhỏ nhất bằng $3\\text{ m}^2$ tại $x = 1\\text{ m}$."
    },
    {
      id: 5,
      content: "Độ dài ngắn nhất của đường dây điện nối từ điểm $A$ đến điểm $B$ men theo các bức tường tòa nhà là bao nhiêu mét (làm tròn đến hàng phần trăm)?",
      correct_answer: "6.09",
      solution: "Độ dài ngắn nhất trên hình trải phẳng tường là $\\ell_{\\min} = \\sqrt{5{,}9^2 + 1{,}5^2} \\approx 6{,}09\\text{ m}$.",
      explanation: "Độ dài ngắn nhất trên hình trải phẳng tường là $\\ell_{\\min} = \\sqrt{5{,}9^2 + 1{,}5^2} \\approx 6{,}09\\text{ m}$."
    },
    {
      id: 6,
      content: "Trong không gian $Oxyz$, đỉnh $S(a; b; c)$ của khối chóp tứ giác đều đặt trên trụ đèn trang trí. Tính giá trị của biểu thức $a + b + c$ (làm tròn đến hàng phần trăm).",
      correct_answer: "1.98",
      solution: "Tọa độ tâm đáy $I\\left(\\dfrac{1}{4}; \\dfrac{1}{4}; 1\\right)$, chiều cao $SI = \\dfrac{\\sqrt{94}}{20}$. Đỉnh $S\\left(\\dfrac{1}{4}; \\dfrac{1}{4}; 1 + \\dfrac{\\sqrt{94}}{20}\\right)$. Do đó $a+b+c = 1{,}5 + \\dfrac{\\sqrt{94}}{20} \\approx 1{,}98$.",
      explanation: "Tọa độ tâm đáy $I\\left(\\dfrac{1}{4}; \\dfrac{1}{4}; 1\\right)$, chiều cao $SI = \\dfrac{\\sqrt{94}}{20}$. Đỉnh $S\\left(\\dfrac{1}{4}; \\dfrac{1}{4}; 1 + \\dfrac{\\sqrt{94}}{20}\\right)$. Do đó $a+b+c = 1{,}5 + \\dfrac{\\sqrt{94}}{20} \\approx 1{,}98$."
    }
  ]
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = SAMPLE_EXAM_2027;
}
