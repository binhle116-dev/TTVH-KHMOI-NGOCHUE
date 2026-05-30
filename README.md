# SLA Operations Dashboard (TTVH - KH Mới Ngọc Huế)

## 1) Mục tiêu dự án
Dashboard phục vụ TTVH theo dõi chất lượng vận hành toàn trình và công tác CSKH, tập trung vào:
- Sản lượng phát.
- Tỉ lệ phát thành công (PTC).
- Tỉ lệ SLA J+3.
- Nhóm tồn phát/chưa có thông tin phát.
- Hiệu quả xử lý CSKH theo ngày, theo đơn vị, theo nguyên nhân.

Ứng dụng được xây bằng React + Vite, chạy nội bộ LAN và hỗ trợ xuất Excel/PDF.

## 2) Nguồn dữ liệu

### 2.1 Dữ liệu SLA từ Excel
- File nghiệp vụ chính: `C020016132 - PHẠM THỊ NGỌC HUẾ_FN.xlsx`.
- Sheet quan trọng:
  - `Chi tiet`: chi tiết bưu gửi theo mã BG, tỉnh, hướng, trạng thái phát lần 1/lần 2.
  - `Nguon`: nguồn đối soát trạng thái và vị trí phát.

Dữ liệu mẫu mặc định trong repo:
- [src/data/seedRows.json](C:\Users\TTVH-LeThanhBinh\Documents\New project 3\src\data\seedRows.json)

### 2.2 Dữ liệu CSKH từ Google Sheet
- Ứng dụng đọc CSV từ Google Sheet qua URL cấu hình trong [src/App.jsx](C:\Users\TTVH-LeThanhBinh\Documents\New project 3\src\App.jsx): `CSKH_CSV_URL`.

### 2.3 Danh sách thiếu lao động phát
- Dùng để phân loại nguyên nhân nhóm chưa có thông tin phát.
- Dữ liệu trong:
  - [src/data/laborShortage.json](C:\Users\TTVH-LeThanhBinh\Documents\New project 3\src\data\laborShortage.json)

## 3) Quy tắc tính chính

## 3.1 Trạng thái chuẩn
Khai báo hằng số trong [src/App.jsx](C:\Users\TTVH-LeThanhBinh\Documents\New project 3\src\App.jsx):
- `SUCCESS`: Đã phát thành công
- `FAIL`: Chưa phát được
- `NO_INFO`: Chưa có TT phát
- `RETURNED`: Phát hoàn thành công

## 3.2 PTC
- `PTC` trong KPI và bảng tổng quan là **PTC thuần** (`SUCCESS`).
- `PHTC` hiển thị tách riêng.
- Không cộng `PHTC` vào `PTC`.

## 3.3 SLA J+3
- Tính theo chênh lệch từ ngày chấp nhận đến ngày có thông tin phát lần đầu.
- Đạt SLA nếu:
  - Có ngày phát lần đầu và `<= 3 ngày`, hoặc
  - Chưa có ngày phát lần đầu nhưng vẫn còn trong cửa sổ theo dõi J+3.

## 3.4 Tồn phát & chưa có thông tin phát
- Chỉ tính tồn khi đồng thời:
  - Bưu gửi đã đến BCVH dự kiến (đối chiếu `Nguon!Z` với `Chi tiet!C/D`),
  - Trạng thái là chưa có thông tin phát,
  - Không có tín hiệu phát lần đầu,
  - Và đã quá J+3.

## 3.5 CSKH
- Tổng hợp theo ngày hỗ trợ, nhân viên, đơn vị, nguyên nhân.
- Module CSKH hiện xuất danh sách:
  - **Bưu gửi chưa có thông tin phát** (thay cho xuất “chưa match tỉnh phát”).

## 4) Tính năng chính
- Nạp file Excel SLA từ giao diện.
- Dashboard đa module:
  - KPI tổng quan.
  - Nhận xét vận hành.
  - Tồn phát & chưa có TTP.
  - CSKH/KHL.
  - Bảng chi tiết SLA (tab Tổng quan + Chất lượng theo ngày/hướng).
- Xuất Excel theo module.
- Xuất PDF A4 ngang theo nhóm trang.
- Giữ dữ liệu sau refresh bằng `localStorage`.

## 5) Cách chạy local
Trong thư mục dự án:

```bash
npm install
npm run dev
```

Mặc định Vite chạy local. Nếu cần truy cập LAN:

```bash
npm run dev -- --host 0.0.0.0 --port 5175
```

Truy cập:
- Máy local: `http://127.0.0.1:5175`
- Máy cùng LAN: `http://<ip-noi-bo>:5175`

## 6) Build và kiểm tra
```bash
npm run lint
npm run build
```

Lưu ý: nếu lint báo lỗi whitespace/encoding cũ trong `App.jsx`, xử lý chuẩn hóa file trước khi merge.

## 7) Xuất PDF
- Nút `Xuất PDF` tạo 1 file PDF duy nhất, A4 ngang.
- Phân trang theo nhóm module:
  - Trang 1: module 1 + 2 + 3
  - Trang 2: module 4
  - Trang 3: module 5
  - Trang 4: module 6 + 7 + 8

## 8) Dữ liệu lưu trên trình duyệt
Ứng dụng lưu state nạp file vào `localStorage`:
- `sla_dashboard_rows_v1`
- `sla_dashboard_filename_v1`

Mục đích: refresh trang vẫn giữ số liệu đã nạp.

## 9) Cấu trúc file quan trọng
- [src/App.jsx](C:\Users\TTVH-LeThanhBinh\Documents\New project 3\src\App.jsx): logic xử lý dữ liệu, render dashboard, xuất file.
- [src/App.css](C:\Users\TTVH-LeThanhBinh\Documents\New project 3\src\App.css): style giao diện.
- [src/index.css](C:\Users\TTVH-LeThanhBinh\Documents\New project 3\src\index.css): global style/theme.
- [src/data/seedRows.json](C:\Users\TTVH-LeThanhBinh\Documents\New project 3\src\data\seedRows.json): dữ liệu SLA mặc định.
- [src/data/laborShortage.json](C:\Users\TTVH-LeThanhBinh\Documents\New project 3\src\data\laborShortage.json): dữ liệu thiếu lao động phát.
- [CHANGELOG_INTERNAL.md](C:\Users\TTVH-LeThanhBinh\Documents\New project 3\CHANGELOG_INTERNAL.md): log thay đổi nội bộ.

## 10) Quy ước vận hành dự án
- Giữ nguyên bố cục và font giao diện, chỉ sửa đúng phạm vi yêu cầu.
- Mọi thay đổi nghiệp vụ cập nhật vào `CHANGELOG_INTERNAL.md`.
- Ưu tiên workflow GitHub (commit rõ nội dung, push nhánh `main` hoặc theo nhánh tính năng).
