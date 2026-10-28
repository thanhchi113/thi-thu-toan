# Cổng Thi & Luyện Đề Toán THPT Quốc Gia 2027 (Cấu Trúc 3 Phần GDPT 2018)

Hệ thống web tĩnh (Static Web App) tối ưu cho cả **Máy tính (Desktop)** và **Điện thoại (Mobile)**, chạy với **chi phí 0 đồng** vĩnh viễn, hỗ trợ tải lên file PDF và mã nguồn TeX (LaTeX).

---

## 🌟 Tính Năng Nổi Bật

### 1. Dành Cho Giáo Viên (Admin)
- **Đăng nhập quản trị**: Toàn quyền quản lý học sinh, đề thi, bài tập và xem kết quả.
- **Cấp tài khoản cho học sinh**: Tạo Mã học sinh (ví dụ `HS202701`, `HS202702`...) đi kèm tên, lớp và mật khẩu. Có thể khóa hoặc kích hoạt tài khoản bất kỳ lúc nào.
- **Quản lý đề thi (TeX / PDF)**:
  - Tích hợp bộ phân tích **TeX Parser** trực tiếp ngay trên trình duyệt, tự động bóc tách cấu trúc 3 phần chuẩn Bộ GD&ĐT 2027.
  - Cho phép gắn link file PDF đề thi gốc hoặc đề biên dịch từ TeX.
  - Đóng / mở quyền truy cập đề thi cho từng học sinh hoặc toàn lớp.
- **Quản lý file bài tập & tài liệu**: Gắn link file PDF bài tập rèn luyện và chỉ định danh sách học sinh được phép truy cập.
- **Theo dõi kết quả & xuất điểm**: Bảng điểm toàn bộ học sinh chi tiết 3 phần, xuất ra file CSV/Excel tiện lợi.

### 2. Dành Cho Học Sinh (Student)
- **Đăng nhập định danh**: Đăng nhập bằng **Mã học sinh** và Mật khẩu do giáo viên cấp.
- **Tra cứu kết quả & Lịch sử thi**: Xem điểm số từng phần (Phần I: /3.0đ, Phần II: /4.0đ, Phần III: /3.0đ, Tổng điểm /10.0đ), xem lại chi tiết bài làm kèm lời giải chi tiết từng câu.
- **Tải file bài tập**: Xem trực tiếp file PDF bài tập hoặc tải về máy nếu được giáo viên cấp quyền.
- **Làm bài kiểm tra đa nền tảng**:
  - **Trên Máy tính (Desktop)**: Chế độ **Split-Screen** (Nửa trái xem file PDF đề gốc, nửa phải phiếu tô trắc nghiệm 3 phần).
  - **Trên Điện thoại (Mobile)**: Chế độ **Web Quiz** mượt mà, hỗ trợ bàn phím số toán học nhanh cho Phần III.
  - Chuyển đổi linh hoạt giữa 2 chế độ bằng 1 nút bấm.
  - Đồng hồ đếm ngược lùi giờ thi với cảnh báo khi sắp hết giờ.

---

## 🔑 Tài Khoản Thử Nghiệm Sẵn Có (Seed Tester)

| Vai trò | Tài khoản / Mã HS | Mật khẩu | Ghi chú kiểm thử |
| :--- | :--- | :--- | :--- |
| **Giáo viên (Admin)** | `admin` | `123` | Quản lý học sinh, xuất bản đề TeX/PDF, xem kết quả cả lớp |
| **Học sinh 1** | `HS202701` *(Nguyễn Văn An)* | `123` | **Đã hoàn thành bài thi (8.5đ)** $\rightarrow$ Dùng để thử tính năng tra cứu điểm |
| **Học sinh 2** | `HS202702` *(Trần Thị Mai)* | `123` | **Chưa thi** $\rightarrow$ Dùng để bấm "Vào làm bài" thử nghiệm trên Desktop/Mobile |
| **Học sinh 3** | `HS202703` *(Lê Hoàng Long)* | `123` | Học sinh lớp 12A2 |

*(Trên màn hình Đăng nhập có sẵn 3 nút "Chọn nhanh tài khoản kiểm thử" để bạn bấm thử chỉ với 1 click!)*

---

## 📐 Cấu Trúc Barem Chấm Điểm 3 Phần (Bộ GD&ĐT 2025–2027)

1. **Phần I (Trắc nghiệm nhiều lựa chọn):** 12 câu. Mỗi câu đúng $+0{,}25$ điểm (tối đa $3{,}0$ điểm).
2. **Phần II (Trắc nghiệm Đúng/Sai):** 4 câu. Mỗi câu gồm 4 ý $a, b, c, d$. Chấm điểm lũy tiến:
   - Đúng 1 ý: $+0{,}1$ điểm.
   - Đúng 2 ý: $+0{,}25$ điểm.
   - Đúng 3 ý: $+0{,}5$ điểm.
   - Đúng 4 ý: $+1{,}0$ điểm (tối đa $4{,}0$ điểm/4 câu).
3. **Phần III (Trắc nghiệm Trả lời ngắn):** 6 câu. Học sinh điền kết quả vào ô số. Mỗi câu đúng $+0{,}5$ điểm (tối đa $3{,}0$ điểm). Hệ thống tự động so khớp số thập phân, phân số hoặc sai số hợp lệ.

---

## 🚀 Hướng Dẫn Chạy & Triển Khai Lên GitHub Pages

### Cách 1: Chạy trực tiếp trên máy tính (Local)
Chỉ cần chạy lệnh sau trong thư mục dự án:
```bash
python -m http.server 8000
```
Sau đó mở trình duyệt truy cập: `http://localhost:8000`.

### Cách 2: Triển khai lên GitHub Pages (0 đồng vĩnh viễn)
1. Tạo 1 repository mới trên GitHub (ví dụ: `toan-thpt-2027`).
2. Đẩy toàn bộ mã nguồn này lên nhánh `main`:
   ```bash
   git init
   git add .
   git commit -m "Khoi tao cong luyen thi toan 2027"
   git branch -M main
   git remote add origin https://github.com/tai-khoan-cua-ban/toan-thpt-2027.git
   git push -u origin main
   ```
3. Vào repository trên GitHub: **Settings** $\to$ **Pages** $\to$ Tại mục **Build and deployment / Source**, chọn **GitHub Actions**.
4. GitHub Actions sẽ tự động kích hoạt file `.github/workflows/deploy.yml` và xuất bản trang web của bạn tại địa chỉ:  
   `https://tai-khoan-cua-ban.github.io/toan-thpt-2027/`
