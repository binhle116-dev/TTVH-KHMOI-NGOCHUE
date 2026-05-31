# Change Log Internal

## 2026-05-31 16:20 +07:00

- Them sidebar menu ben trai (`SLA`, `CSKH`) trong layout dashboard.
- Tach hien thi module SLA va module CSKH theo menu chon.
- Dieu chinh xuat PDF theo module dang chon:
  - `SLA_dashboard_YYYY-MM-DD.pdf`
  - `CSKH_dashboard_YYYY-MM-DD.pdf`
- Giu nguyen logic nghiep vu hien co (SLA/PTC/PHTC/risk/CSKH/localStorage/Google Sheet/Excel).

## 2026-05-28 08:37 +07:00

- Khoi tao Git repository tai workspace voi nhanh `main`.
- Cap nhat logic module `DANH GIA TON PHAT & CHUA CO THONG TIN PHAT`:
  - Chi tinh ton khi buu gui qua J+3.
  - Chi tinh ton khi buu gui da den BCVH du kien va chua co bat ky thong tin phat.
- Sua loi hien thi tieng Viet (mojibake) trong `src/App.jsx` de giao dien doc dung.
- Giu nguyen bo cuc va phong cach giao dien hien tai, khong doi font.

## 2026-05-28 14:53 +07:00

- Dong bo dinh nghia `PTC thuan` giua KPI va bang chi tiet.
- Sua trong `src/App.jsx`:
  - `data.ptc` lay tu `totals.ptc` (khong cong `PHTC`).
  - Chi giu `completed = ptc + phtc` cho bieu do cau truc trang thai.
  - Dong tong `PTC` tai bang Tong quan hien thi truc tiep `data.ptc`.
  - Doan nhan xet van hanh dung `data.ptc` thay vi `data.ptc - data.phtc`.

## 2026-05-28 15:08 +07:00

- Nang cap nut `Xuat PDF (Kho ngang)` de xuat tung module thanh tung file PDF rieng.
- Them thu vien `jspdf` va `html2canvas` (cap nhat `package.json`, `package-lock.json`).
- Gan `data-export-module` cho cac module can xuat:
  - `kpi_tong_quan`
  - `nhan_xet_van_hanh`
  - `danh_gia_ton_phat_chua_ttp`
  - `danh_gia_cskh`
  - `bien_dong_sla_chi_tiet`
  - `hieu_suat_sla_theo_huong`
  - `cau_truc_trang_thai`
  - `top_5_tinh_qua_sla`
- Bo sung ham `exportModulesToPdf()`:
  - Kho giay A4 ngang (`297x210 mm`), can le va scale de vua 1 trang.
  - Moi module xuat ra 1 file rieng, ten file co so thu tu + ten module + ngay.

## 2026-05-28 15:11 +07:00

- Dieu chinh chuc nang xuat PDF theo yeu cau moi:
  - Gop tat ca module vao 1 file PDF duy nhat.
  - Moi module duoc dat tren 1 trang rieng, kho A4 ngang.
  - Giu can le va auto-scale de vua noi dung trong 1 trang/module.

## 2026-05-28 15:15 +07:00

- Dieu chinh lai phan trang PDF theo nhom module:
  - Trang 1: module 1 + 2 + 3
  - Trang 2: module 4
  - Trang 3: module 5
  - Trang 4: module 6 + 7 + 8
- Cach xuat: render tung nhom module vao canvas tong, sau do scale va canh giua tren A4 ngang.

## 2026-05-29 17:41 +07:00

- Module `DANH GIA CONG TAC CSKH / HO TRO KHL`:
  - Thay nut xuat file `BG chua match tinh phat` bang `xuat buu gui chua co thong tin phat`.
  - Thay logic du lieu xuat:
    - Truoc day: `supportRows` khong match `shipmentRows`.
    - Hien tai: chi xuat cac dong co phan loai `noInfo` theo `classifySupportOutcome(...)`.
  - Ten file moi: `danh_sach_bg_chua_co_thong_tin_phat_cskh.xlsx`.

## 2026-05-30 09:00 +07:00

- Bo sung co che giu so lieu sau khi refresh trang:
  - Luu `rows` vao `localStorage` voi key `sla_dashboard_rows_v1`.
  - Luu `fileName` vao `localStorage` voi key `sla_dashboard_filename_v1`.
  - Khoi tao state tu du lieu da luu thay vi tra ve `seedRows`.
- Dieu chinh nut xuat file tai module `DANH GIA TON PHAT & CHUA CO THONG TIN PHAT`:
  - Doi label nut thanh `Bưu gửi chưa phát được`.

## 2026-05-30 09:28 +07:00

- Sửa encoding tiếng Việt trong `README.md` về UTF-8 chuẩn.
- Sửa encoding tiếng Việt trong `src/App.jsx` về UTF-8 chuẩn.
- Giữ nguyên link README dạng tương đối trong repo.
- Đổi tên package từ `new-project-3` thành `ttvh-sla-cskh-dashboard`.

## 2026-05-31 12:55 +07:00

- Rà soát lại `src/App.jsx`: không còn chuỗi mojibake tiếng Việt.
- Rà soát lại `README.md`: không còn link local Windows, giữ link tương đối.
- Xác nhận `package.json` giữ `name = ttvh-sla-cskh-dashboard`.
- Chạy kiểm tra:
  - `npm run lint`: pass
  - `npm run build`: pass
