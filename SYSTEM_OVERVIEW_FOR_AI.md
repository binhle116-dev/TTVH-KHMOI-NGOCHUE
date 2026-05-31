# SYSTEM OVERVIEW FOR AI

## 1) Repo info

- Repo full name: `binhle116-dev/TTVH-KHMOI-NGOCHUE`
- Branch: `main`
- Commit HEAD: `50991324a9830928fc210a4697bb13b85ff0cb14`
- Link commit HEAD: https://github.com/binhle116-dev/TTVH-KHMOI-NGOCHUE/commit/50991324a9830928fc210a4697bb13b85ff0cb14

## 2) File quan trọng (blob theo HEAD)

- README.md: https://github.com/binhle116-dev/TTVH-KHMOI-NGOCHUE/blob/50991324a9830928fc210a4697bb13b85ff0cb14/README.md
- CHANGELOG_INTERNAL.md: https://github.com/binhle116-dev/TTVH-KHMOI-NGOCHUE/blob/50991324a9830928fc210a4697bb13b85ff0cb14/CHANGELOG_INTERNAL.md
- package.json: https://github.com/binhle116-dev/TTVH-KHMOI-NGOCHUE/blob/50991324a9830928fc210a4697bb13b85ff0cb14/package.json
- index.html: https://github.com/binhle116-dev/TTVH-KHMOI-NGOCHUE/blob/50991324a9830928fc210a4697bb13b85ff0cb14/index.html
- src/App.jsx: https://github.com/binhle116-dev/TTVH-KHMOI-NGOCHUE/blob/50991324a9830928fc210a4697bb13b85ff0cb14/src/App.jsx
- src/App.css: https://github.com/binhle116-dev/TTVH-KHMOI-NGOCHUE/blob/50991324a9830928fc210a4697bb13b85ff0cb14/src/App.css
- src/index.css: https://github.com/binhle116-dev/TTVH-KHMOI-NGOCHUE/blob/50991324a9830928fc210a4697bb13b85ff0cb14/src/index.css
- src/main.jsx: https://github.com/binhle116-dev/TTVH-KHMOI-NGOCHUE/blob/50991324a9830928fc210a4697bb13b85ff0cb14/src/main.jsx
- src/data/seedRows.json: https://github.com/binhle116-dev/TTVH-KHMOI-NGOCHUE/blob/50991324a9830928fc210a4697bb13b85ff0cb14/src/data/seedRows.json
- src/data/laborShortage.json: https://github.com/binhle116-dev/TTVH-KHMOI-NGOCHUE/blob/50991324a9830928fc210a4697bb13b85ff0cb14/src/data/laborShortage.json

## 3) Mô tả nghiệp vụ

- Mục tiêu dashboard:
  - Theo dõi chất lượng vận hành SLA J+3 cho bưu gửi.
  - Theo dõi chất lượng phát (PTC, lỗi phát, chưa có thông tin phát).
  - Theo dõi rủi ro tồn phát, hẹn giao chưa đi đúng ngày.
  - Theo dõi hiệu quả CSKH theo ngày từ Google Sheet.

- Nguồn Excel SLA:
  - File SLA đầu vào do nghiệp vụ nạp thủ công qua nút `Nạp Excel`.
  - Dữ liệu sau nạp được persist vào localStorage để không mất khi refresh.

- Sheet `Chi tiet`:
  - Là nguồn chính để parse danh sách bưu gửi, trạng thái, hướng, ngày nhận, ngày phát lần đầu, v.v.

- Sheet `Nguon`:
  - Dùng đối chiếu trạng thái cuối và BC phát dự kiến để xác định nhóm tồn BC phát quá J+3 chưa có thông tin phát.

- Nguồn CSKH Google Sheet:
  - URL CSV hard-code qua hằng `CSKH_CSV_URL`.
  - Tải tự động khi mở dashboard (`loadSupportSheet`), parse thành danh sách yêu cầu CSKH.

- Danh sách `laborShortage`:
  - File JSON nội bộ để xác định nguyên nhân “thiếu lao động phát/bưu tá”.
  - So khớp theo tỉnh hoặc đơn vị phát để phân loại nguyên nhân rủi ro.

- KPI hiện có:
  - Tổng sản lượng.
  - Tỷ lệ SLA J+3.
  - PTC.
  - Lỗi phát.
  - Chưa có thông tin phát.
  - Các panel phân tích theo ngày/hướng/tỉnh/rủi ro/CSKH.

## 4) Luồng dữ liệu chính trong `src/App.jsx`

1. `constants`:
   - Import từ `src/config/statusConfig` (`SUCCESS`, `FAIL`, `NO_INFO`, `RETURNED`, `CSKH_CSV_URL`, storage keys, colors).

2. `loadPersistedRows`:
   - Đọc `localStorage` (`STORAGE_ROWS_KEY`), fallback sang `seedRows` khi trống/lỗi.

3. `parseDate`:
   - Chuẩn hóa ngày từ Excel serial number, `Date`, hoặc chuỗi `dd/mm/yyyy` / `yyyy-mm-dd`.

4. `normalizeText`:
   - Bỏ dấu và chuẩn hóa text để so khớp nghiệp vụ không phân biệt dấu/chữ hoa-thường.

5. `parseWorkbookRows`:
   - Wrapper gọi parser module `parseWorkbookRowsModule`.
   - Parse dữ liệu từ Excel SLA (`Chi tiet` + đối chiếu `Nguon`).

6. `parseCustomerSupportCsv`:
   - Wrapper gọi parser module `parseCustomerSupportCsvModule`.
   - Parse dữ liệu CSV từ Google Sheet CSKH.

7. `buildCustomerSupportDashboard`:
   - Tính KPI CSKH: tổng yêu cầu, tỷ lệ thành công, chuyển hoàn, nhiều lần hỗ trợ, cơ cấu theo ngày/nhân viên/đơn vị/nguyên nhân.

8. `summarizeRows`:
   - Tính summary cho 1 tập rows: tổng, PTC, PHTC, fail, noInfo, SLA%.

9. `buildDashboard`:
   - Tính toàn bộ dữ liệu hiển thị chính: KPI cards, daily, quality table, charts, top provinces, risk metrics, causes, export rows.

10. `handleFile`:
    - Nhận file từ input.
    - Parse workbook.
    - Validate dữ liệu đầu vào bắt buộc.
    - Set rows + filename + ngày chốt mặc định.

11. `loadSupportSheet`:
    - Fetch CSV từ Google Sheet.
    - Parse và set `supportRows`.
    - Quản lý loading/error state.

12. `export Excel`:
    - `exportExcelMultiSheet`: xuất 1 file nhiều sheet (`Tong quan`, `Bien dong ngay`, `Chat luong huong`, `Chi so rui ro`, `DS rui ro chi tiet`, `BG chua co TTP`, `CSKH theo ngay`).
    - Module rủi ro và module CSKH có nút export riêng cho danh sách chưa có thông tin phát.

13. `export PDF`:
    - `exportModulesToPdf`: chụp từng module bằng `html2canvas`, ghép vào `jsPDF` A4 ngang theo nhóm trang.

## 5) Mapping cột Excel hiện tại

### 5.1 Sheet `Chi tiet` (trong parser SLA)

| Field nội bộ | Index cột đọc | Sheet | Ý nghĩa nghiệp vụ | Rủi ro nếu mẫu đổi |
|---|---:|---|---|---|
| `code` | `0` | Chi tiet | Số hiệu bưu gửi | Sai mã, mất join với CSKH |
| `postCode` | `2` | Chi tiet | Mã BCVH/BC phát | Sai đối chiếu tồn BC phát |
| `deliveryPost` | `3` | Chi tiet | Tên BC phát | Sai phân tích đơn vị/tỉnh |
| `province` | `4` | Chi tiet | Tỉnh phát | Sai top tỉnh/rủi ro |
| `date` (accept date) | `5` | Chi tiet | Ngày chấp nhận | Sai SLA J+3 toàn hệ |
| `direction` | `6` | Chi tiet | Hướng chuyển | Sai chart theo hướng |
| `firstStatus` | `7` | Chi tiet | Trạng thái phát lần đầu | Sai đánh giá chất lượng |
| `firstDeliveryDate` | `8` | Chi tiet | Ngày có TT phát lần đầu | Sai SLA J+3 |
| `lastPosition` | `11` | Chi tiet | Vị trí cuối | Sai mô tả chi tiết rủi ro |
| `reasonText` | `12` | Chi tiet | Lý do/trạng thái text | Sai nhận diện hẹn giao |
| `finalStatus` | `12` fallback `9`/`7` | Chi tiet | Trạng thái cuối | Sai KPI PTC/fail/noInfo |
| `j3Days` | `15` | Chi tiet | Số ngày J+3 tham chiếu | Sai kiểm định SLA phụ |

### 5.2 Sheet `Nguon` (đối chiếu tồn BC phát)

| Field nội bộ | Index cột đọc | Sheet | Ý nghĩa nghiệp vụ | Rủi ro nếu mẫu đổi |
|---|---:|---|---|---|
| `source.finalStatus` | `24` (Y) | Nguon | Trạng thái cuối nguồn | Sai xác định “chưa có TT phát” |
| `source.post` | `25` (Z) | Nguon | BC phát dự kiến | Sai đối chiếu tồn tại BC phát |

### 5.3 Google Sheet CSKH (CSV)

| Field nội bộ | Index cột đọc | Sheet | Ý nghĩa nghiệp vụ | Rủi ro nếu mẫu đổi |
|---|---:|---|---|---|
| `supportDate` | `1` | CSKH | Ngày phát sinh hỗ trợ | Sai báo cáo CSKH theo ngày |
| `code` | `2` | CSKH | Mã BG hỗ trợ | Mất join SLA/CSKH |
| `requester` | `3` | CSKH | Người yêu cầu | Sai truy vết nghiệp vụ |
| `request` | `4` | CSKH | Nội dung yêu cầu | Sai cơ cấu loại yêu cầu |
| `requestedDeliveryDate` | `5` | CSKH | Ngày CH/phát lại | Sai theo dõi hẹn giao |
| `staff` | `6` | CSKH | Nhân viên xử lý | Sai top nhân viên |
| `unit` | `7` | CSKH | Đơn vị xử lý | Sai đơn vị cần nhắc |
| `content` | `8` | CSKH | Nội dung gửi hỗ trợ | Mất ngữ cảnh xử lý |
| `attempt2 markers` | `13`,`14`,`18` | CSKH | Dấu hiệu hỗ trợ lần 2 | Sai KPI hỗ trợ nhiều lần |
| `attempt3 markers` | `15`,`16`,`19` | CSKH | Dấu hiệu hỗ trợ lần 3 | Sai KPI escalation |
| `finalResult` | ưu tiên `20` fallback `19/18/17` | CSKH | KQ cuối hỗ trợ | Sai tỷ lệ thành công CSKH |
| `cause` | `21` | CSKH | Nguyên nhân | Sai phân tích nguyên nhân |

## 6) Điểm nâng cấp theo mức ưu tiên

- P0 (bắt buộc):
  - Tách hẳn domain nghiệp vụ khỏi `App.jsx` (đang còn dồn lớn).
  - Chuẩn hóa encoding UTF-8 toàn bộ text hiển thị để loại mojibake.
  - Thêm schema validation cho file Excel/CSV (cảnh báo cột thiếu/sai thứ tự rõ ràng).

- P1:
  - Tạo mapping cột theo tên header thay vì index cứng.
  - Thêm test unit cho parser + tính KPI SLA/risk/CSKH.
  - Đồng bộ rule SLA bằng config nghiệp vụ, tránh hard-code.

- P2:
  - Tối ưu hiệu năng build data với dataset lớn (memo hóa, normalize once).
  - Bổ sung tracing/log nghiệp vụ cho export và parse lỗi.
  - Nâng cấp UX filter (multi-select, clear all, trạng thái active filter).

- P3:
  - Chuyển sang kiến trúc state management nhẹ (zustand/reducer) nếu module tăng.
  - Thêm i18n (vi/en) nếu cần đa ngôn ngữ.
  - Thêm role-based settings cho rule xuất báo cáo.

## 7) Đề xuất kiến trúc refactor

```text
src/
  config/
    statusConfig.js
    kpiRules.js
    exportConfig.js
  domain/
    shipment/
      models.js
      calculators.js        # SLA/PTC/risk
    support/
      models.js
      calculators.js        # CSKH metrics
  services/
    parsers/
      excelSlaParser.js
      cskhCsvParser.js
    storage/
      localStore.js
    export/
      excelExporter.js
      pdfExporter.js
    gateway/
      cskhSheetClient.js
  components/
    dashboard/
      KpiCards.jsx
      OverviewTable.jsx
      QualityTable.jsx
      RiskPanel.jsx
      CskhPanel.jsx
  hooks/
    useSlaData.js
    useSupportData.js
    useDashboardFilters.js
  utils/
    date.js
    text.js
    number.js
```

- Nguyên tắc:
  - `App.jsx` chỉ orchestration UI + compose component.
  - Parser/service/domain độc lập, test được.
  - Rule nghiệp vụ đặt trong `config` + `domain`, tránh rải trong JSX.

