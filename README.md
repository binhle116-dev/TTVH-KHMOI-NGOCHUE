# SLA Operations Dashboard (TTVH - KH Má»›i Ngá»c Huáº¿)

## 1) Má»¥c tiÃªu dá»± Ã¡n
Dashboard phá»¥c vá»¥ TTVH theo dÃµi cháº¥t lÆ°á»£ng váº­n hÃ nh toÃ n trÃ¬nh vÃ  cÃ´ng tÃ¡c CSKH, táº­p trung vÃ o:
- Sáº£n lÆ°á»£ng phÃ¡t.
- Tá»‰ lá»‡ phÃ¡t thÃ nh cÃ´ng (PTC).
- Tá»‰ lá»‡ SLA J+3.
- NhÃ³m tá»“n phÃ¡t/chÆ°a cÃ³ thÃ´ng tin phÃ¡t.
- Hiá»‡u quáº£ xá»­ lÃ½ CSKH theo ngÃ y, theo Ä‘Æ¡n vá»‹, theo nguyÃªn nhÃ¢n.

á»¨ng dá»¥ng Ä‘Æ°á»£c xÃ¢y báº±ng React + Vite, cháº¡y ná»™i bá»™ LAN vÃ  há»— trá»£ xuáº¥t Excel/PDF.

## 2) Nguá»“n dá»¯ liá»‡u

### 2.1 Dá»¯ liá»‡u SLA tá»« Excel
- File nghiá»‡p vá»¥ chÃ­nh: `C020016132 - PHáº M THá»Š NGá»ŒC HUáº¾_FN.xlsx`.
- Sheet quan trá»ng:
  - `Chi tiet`: chi tiáº¿t bÆ°u gá»­i theo mÃ£ BG, tá»‰nh, hÆ°á»›ng, tráº¡ng thÃ¡i phÃ¡t láº§n 1/láº§n 2.
  - `Nguon`: nguá»“n Ä‘á»‘i soÃ¡t tráº¡ng thÃ¡i vÃ  vá»‹ trÃ­ phÃ¡t.

Dá»¯ liá»‡u máº«u máº·c Ä‘á»‹nh trong repo:
- [src/data/seedRows.json](src/data/seedRows.json)

### 2.2 Dá»¯ liá»‡u CSKH tá»« Google Sheet
- á»¨ng dá»¥ng Ä‘á»c CSV tá»« Google Sheet qua URL cáº¥u hÃ¬nh trong [src/App.jsx](src/App.jsx): `CSKH_CSV_URL`.

### 2.3 Danh sÃ¡ch thiáº¿u lao Ä‘á»™ng phÃ¡t
- DÃ¹ng Ä‘á»ƒ phÃ¢n loáº¡i nguyÃªn nhÃ¢n nhÃ³m chÆ°a cÃ³ thÃ´ng tin phÃ¡t.
- Dá»¯ liá»‡u trong:
  - [src/data/laborShortage.json](src/data/laborShortage.json)

## 3) Quy táº¯c tÃ­nh chÃ­nh

### 3.1 Tráº¡ng thÃ¡i chuáº©n
Khai bÃ¡o háº±ng sá»‘ trong [src/App.jsx](src/App.jsx):
- `SUCCESS`: ÄÃ£ phÃ¡t thÃ nh cÃ´ng
- `FAIL`: ChÆ°a phÃ¡t Ä‘Æ°á»£c
- `NO_INFO`: ChÆ°a cÃ³ TT phÃ¡t
- `RETURNED`: PhÃ¡t hoÃ n thÃ nh cÃ´ng

### 3.2 PTC
- `PTC` trong KPI vÃ  báº£ng tá»•ng quan lÃ  **PTC thuáº§n** (`SUCCESS`).
- `PHTC` hiá»ƒn thá»‹ tÃ¡ch riÃªng.
- KhÃ´ng cá»™ng `PHTC` vÃ o `PTC`.

### 3.3 SLA J+3
- TÃ­nh theo chÃªnh lá»‡ch tá»« ngÃ y cháº¥p nháº­n Ä‘áº¿n ngÃ y cÃ³ thÃ´ng tin phÃ¡t láº§n Ä‘áº§u.
- Äáº¡t SLA náº¿u:
  - CÃ³ ngÃ y phÃ¡t láº§n Ä‘áº§u vÃ  `<= 3 ngÃ y`, hoáº·c
  - ChÆ°a cÃ³ ngÃ y phÃ¡t láº§n Ä‘áº§u nhÆ°ng váº«n cÃ²n trong cá»­a sá»• theo dÃµi J+3.

### 3.4 Tá»“n phÃ¡t & chÆ°a cÃ³ thÃ´ng tin phÃ¡t
- Chá»‰ tÃ­nh tá»“n khi Ä‘á»“ng thá»i:
  - BÆ°u gá»­i Ä‘Ã£ Ä‘áº¿n BCVH dá»± kiáº¿n (Ä‘á»‘i chiáº¿u `Nguon!Z` vá»›i `Chi tiet!C/D`),
  - Tráº¡ng thÃ¡i lÃ  chÆ°a cÃ³ thÃ´ng tin phÃ¡t,
  - KhÃ´ng cÃ³ tÃ­n hiá»‡u phÃ¡t láº§n Ä‘áº§u,
  - VÃ  Ä‘Ã£ quÃ¡ J+3.

### 3.5 CSKH
- Tá»•ng há»£p theo ngÃ y há»— trá»£, nhÃ¢n viÃªn, Ä‘Æ¡n vá»‹, nguyÃªn nhÃ¢n.
- Module CSKH hiá»‡n xuáº¥t danh sÃ¡ch:
  - **BÆ°u gá»­i chÆ°a cÃ³ thÃ´ng tin phÃ¡t** (thay cho xuáº¥t â€œchÆ°a match tá»‰nh phÃ¡tâ€).

## 4) TÃ­nh nÄƒng chÃ­nh
- Náº¡p file Excel SLA tá»« giao diá»‡n.
- Dashboard Ä‘a module:
  - KPI tá»•ng quan.
  - Nháº­n xÃ©t váº­n hÃ nh.
  - Tá»“n phÃ¡t & chÆ°a cÃ³ TTP.
  - CSKH/KHL.
  - Báº£ng chi tiáº¿t SLA (tab Tá»•ng quan + Cháº¥t lÆ°á»£ng theo ngÃ y/hÆ°á»›ng).
- Xuáº¥t Excel theo module.
- Xuáº¥t PDF A4 ngang theo nhÃ³m trang.
- Giá»¯ dá»¯ liá»‡u sau refresh báº±ng `localStorage`.

## 5) CÃ¡ch cháº¡y local
Trong thÆ° má»¥c dá»± Ã¡n:

```bash
npm install
npm run dev
```

Máº·c Ä‘á»‹nh Vite cháº¡y local. Náº¿u cáº§n truy cáº­p LAN:

```bash
npm run dev -- --host 0.0.0.0 --port 5175
```

Truy cáº­p:
- MÃ¡y local: `http://127.0.0.1:5175`
- MÃ¡y cÃ¹ng LAN: `http://<ip-noi-bo>:5175`

## 6) Build vÃ  kiá»ƒm tra
```bash
npm run lint
npm run build
```

LÆ°u Ã½: náº¿u lint bÃ¡o lá»—i whitespace/encoding cÅ© trong `App.jsx`, xá»­ lÃ½ chuáº©n hÃ³a file trÆ°á»›c khi merge.

## 7) Xuáº¥t PDF
- NÃºt `Xuáº¥t PDF` táº¡o 1 file PDF duy nháº¥t, A4 ngang.
- PhÃ¢n trang theo nhÃ³m module:
  - Trang 1: module 1 + 2 + 3
  - Trang 2: module 4
  - Trang 3: module 5
  - Trang 4: module 6 + 7 + 8

## 8) Dá»¯ liá»‡u lÆ°u trÃªn trÃ¬nh duyá»‡t
á»¨ng dá»¥ng lÆ°u state náº¡p file vÃ o `localStorage`:
- `sla_dashboard_rows_v1`
- `sla_dashboard_filename_v1`

Má»¥c Ä‘Ã­ch: refresh trang váº«n giá»¯ sá»‘ liá»‡u Ä‘Ã£ náº¡p.

## 9) Cáº¥u trÃºc file quan trá»ng
- [src/App.jsx](src/App.jsx): logic xá»­ lÃ½ dá»¯ liá»‡u, render dashboard, xuáº¥t file.
- [src/App.css](src/App.css): style giao diá»‡n.
- [src/index.css](src/index.css): global style/theme.
- [src/data/seedRows.json](src/data/seedRows.json): dá»¯ liá»‡u SLA máº·c Ä‘á»‹nh.
- [src/data/laborShortage.json](src/data/laborShortage.json): dá»¯ liá»‡u thiáº¿u lao Ä‘á»™ng phÃ¡t.
- [CHANGELOG_INTERNAL.md](CHANGELOG_INTERNAL.md): log thay Ä‘á»•i ná»™i bá»™.

## 10) Quy Æ°á»›c váº­n hÃ nh dá»± Ã¡n
- Giá»¯ nguyÃªn bá»‘ cá»¥c vÃ  font giao diá»‡n, chá»‰ sá»­a Ä‘Ãºng pháº¡m vi yÃªu cáº§u.
- Má»i thay Ä‘á»•i nghiá»‡p vá»¥ cáº­p nháº­t vÃ o `CHANGELOG_INTERNAL.md`.
- Æ¯u tiÃªn workflow GitHub (commit rÃµ ná»™i dung, push nhÃ¡nh `main` hoáº·c theo nhÃ¡nh tÃ­nh nÄƒng).

