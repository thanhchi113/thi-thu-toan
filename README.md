# Hệ Thống Khảo Thí & Luyện Đề Toán 6 – 12 (Cấu Trúc 3 Phần GDPT 2018)

Hệ thống web tĩnh (Static Web App) tối ưu cho cả **Máy tính (Desktop)** và **Điện thoại (Mobile)**, chạy với **chi phí 0 đồng** vĩnh viễn, cho phép giáo viên đăng tải trực tiếp file **PDF Đề Thi**, **PDF Đáp Án & Lời Giải** và cấu hình bảng đáp án 3 phần chấm điểm tự động.

---

## 🌟 Tính Năng Nổi Bật

### 1. Dành Cho Giáo Viên (Admin)
- **Đăng nhập quản trị**: Toàn quyền quản lý học sinh, đề thi, tài liệu chuyên đề và xem kết quả.
- **Cấp tài khoản cho học sinh**: Tạo Mã học sinh (ví dụ `HS001`, `HS002`...) đi kèm tên, khối/lớp và mật khẩu. Có thể khóa hoặc kích hoạt tài khoản bất kỳ lúc nào.
- **Quản lý đề thi PDF & Đáp án 3 phần**:
  - Đăng tải trực tiếp **File PDF Đề Thi** và **File PDF Đáp Án & Lời Giải Chi Tiết** từ máy tính (lưu bền vững bằng `IndexedDB`).
  - Thiết lập nhanh **Bảng Đáp Án Chấm Điểm Tự Động 3 Phần** (hỗ trợ dán chuỗi đáp án nhanh `1C 2D 3A...` cho Phần I, bấm chọn `Đ/S` cho Phần II, điền đáp án số cho Phần III, tùy chỉnh linh hoạt số câu mỗi phần).
  - Đóng / mở quyền truy cập đề thi và quyền xem lời giải cho từng học sinh, theo khối lớp hoặc toàn trường.
- **Quản lý file bài tập & tài liệu PDF**: Tải lên file PDF chuyên đề theo Khối 6 – 12 và phân quyền học sinh truy cập.
- **Theo dõi kết quả & xuất điểm**: Bảng điểm toàn bộ học sinh chi tiết 3 phần, xuất ra file CSV/Excel tiện lợi.

### 2. Dành Cho Học Sinh (Student)
- **Đăng nhập định danh**: Đăng nhập bằng **Mã học sinh** và Mật khẩu do giáo viên cấp.
- **Làm bài trực tiếp trên PDF gốc**:
  - Hiển thị trực tiếp file **PDF đề thi gốc** sắc nét 100% (công thức, bảng biến thiên, hình học không gian đúng chuẩn bản in của giáo viên) song song với **Phiếu trả lời trực tuyến 3 phần** và bàn phím số toán học nhanh cho Phần III.
  - Đồng hồ đếm ngược giờ thi và giám sát rời màn hình.
- **Tra cứu kết quả & Đối chiếu PDF lời giải**: Xem điểm chi tiết từng phần ngay sau khi nộp bài, đối chiếu bảng đáp án và xem trực tiếp file **PDF lời giải chi tiết** của giáo viên.
- **Kho tài liệu chuyên đề**: Xem trực tiếp hoặc tải file PDF bài tập theo khối lớp được phân quyền.

---

## 📐 Cấu Trúc Barem Chấm Điểm 3 Phần (Bộ GD&ĐT 2025–2027)

1. **Phần I (Trắc nghiệm nhiều lựa chọn):** Mặc định 12 câu. Mỗi câu đúng $+0{,}25$ điểm.
2. **Phần II (Trắc nghiệm Đúng/Sai):** Mặc định 4 câu. Mỗi câu gồm 4 ý $a, b, c, d$. Chấm điểm lũy tiến:
   - Đúng 1 ý: $+0{,}1$ điểm.
   - Đúng 2 ý: $+0{,}25$ điểm.
   - Đúng 3 ý: $+0{,}5$ điểm.
   - Đúng 4 ý: $+1{,}0$ điểm.
3. **Phần III (Trắc nghiệm Trả lời ngắn):** Mặc định 6 câu. Học sinh điền kết quả vào ô số 4 ký tự. Mỗi câu đúng $+0{,}5$ điểm (hỗ trợ tự động quy đổi số thập phân, dấu phẩy/chấm và phân số).

---

## 🚀 Hướng Dẫn Chạy & Triển Khai

### Cách 1: Chạy trực tiếp trên máy tính (Local)
```bash
python -m http.server 8000
```
Mở trình duyệt truy cập: `http://localhost:8000`.

### Cách 2: Triển khai lên GitHub Pages
Đẩy mã nguồn lên nhánh `main` và bật **GitHub Actions** tại mục **Settings** -> **Pages** để xuất bản tự động qua `.github/workflows/deploy.yml`.
