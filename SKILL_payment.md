---
name: ho-so-thanh-toan-xay-dung
description: >
  Dùng skill này khi người dùng cần lập hồ sơ thanh toán công trình xây dựng / sửa chữa,
  đặc biệt trong nội bộ doanh nghiệp (P.HC, DPM, hoặc bất kỳ phòng ban nào). Trigger khi
  người dùng đề cập: "hồ sơ thanh toán", "biên bản nghiệm thu", "quyết toán A-B",
  "đề nghị thanh toán", "bảng báo giá", "bảng kê hóa đơn GTGT", "thanh lý hợp đồng xây dựng",
  "lập hồ sơ công trình", "nghiệm thu khối lượng", "bảng kê chi phí sửa chữa".
  Skill tạo ra trọn bộ file Excel/CSV gồm: Bảng báo giá chi tiết → Biên bản nghiệm thu
  khối lượng → Biên bản quyết toán A-B → Đề nghị thanh toán + Bảng kê HĐGTGT.
  Luôn dùng skill này ngay cả khi người dùng chỉ hỏi "lập hồ sơ" mà không nói rõ loại.
---

# Skill: Lập Hồ Sơ Thanh Toán Xây Dựng / Sửa Chữa

## Tổng quan

Skill này tạo trọn bộ hồ sơ thanh toán công trình xây dựng/sửa chữa nội bộ doanh nghiệp
(ví dụ: P.HC DPM) đủ điều kiện gửi bên giao thầu yêu cầu thanh toán theo hợp đồng.

---

## Bộ hồ sơ đầu ra chuẩn

| # | Tài liệu | Sheet trong Excel | Ghi chú |
|---|-----------|-------------------|---------|
| 1 | Bảng báo giá chi tiết (đã phê duyệt) | `BAO_GIA` | Đơn giá × khối lượng dự toán |
| 2 | Biên bản nghiệm thu khối lượng | `NGHIEM_THU` | Khớp đơn giá gốc trong báo giá |
| 3 | Biên bản quyết toán A-B | `QUYET_TOAN_AB` | So sánh dự toán vs thực hiện |
| 4 | Đề nghị thanh toán | `DE_NGHI_TT` | Tổng hợp giá trị yêu cầu TT |
| 5 | Bảng kê hóa đơn GTGT | `BANG_KE_HDGTGT` | Số HD, ngày, giá trị, thuế suất |

Tất cả 5 sheet nằm trong **một file Excel duy nhất** (`Ho_So_Thanh_Toan_[TenCT].xlsx`).
Ngoài ra xuất thêm **CSV** của sheet BANG_KE_HDGTGT để gửi bộ phận kế toán.

---

## Thông tin cần thu thập từ người dùng

Trước khi tạo file, hỏi hoặc tự suy luận các thông tin sau:

```
1. Tên công trình / hạng mục sửa chữa
2. Đơn vị thực hiện (Bên B / nhà thầu)
3. Đơn vị giao thầu (Bên A)
4. Số hợp đồng, ngày ký hợp đồng
5. Danh mục công việc + đơn giá (nếu có bảng báo giá sẵn)
6. Khối lượng thực hiện (nếu đã nghiệm thu)
7. Thông tin hóa đơn GTGT (số HD, ngày, giá trị, thuế suất)
8. Người lập / người duyệt
```

Nếu người dùng chưa cung cấp → **tự tạo dữ liệu mẫu thực tế** (xem phần Dữ liệu mẫu bên dưới).

---

## Dữ liệu mẫu thực tế – P.HC DPM

Khi không có dữ liệu cụ thể, dùng bộ dữ liệu mẫu sau (đặc thù sửa chữa văn phòng/kho):

### Thông tin chung
- **Tên công trình**: Sửa chữa, cải tạo văn phòng làm việc P.HC – Tầng 3, Tòa nhà DPM
- **Bên A (Giao thầu)**: Công ty CP Phân bón Dầu khí Cà Mau (PVCFC / DPM)
- **Bên B (Nhận thầu)**: Công ty TNHH Xây dựng & Dịch vụ [Tên nhà thầu]
- **Số HĐ**: 12/2025/HĐ-XD, ngày 05/03/2025
- **Thời gian thực hiện**: 05/03/2025 – 30/04/2025

### Danh mục công việc mẫu (BAO_GIA)

| STT | Hạng mục công việc | ĐVT | KL dự toán | Đơn giá (VNĐ) |
|-----|-------------------|-----|------------|---------------|
| 1 | Sơn lại tường trong nhà (2 lớp lót + 2 lớp phủ) | m² | 320 | 65,000 |
| 2 | Thay trần thạch cao vuông 60×60 (bao gồm khung xương) | m² | 150 | 280,000 |
| 3 | Lát sàn gạch ceramic 60×60 | m² | 85 | 320,000 |
| 4 | Thay cửa nhựa lõi thép – cửa đi 90×210 | cái | 4 | 3,800,000 |
| 5 | Sửa chữa hệ thống điện chiếu sáng (thay bóng, máng đèn LED) | bộ | 24 | 450,000 |
| 6 | Lắp đặt ổ cắm điện đa năng âm tường | cái | 30 | 125,000 |
| 7 | Thay kính cửa sổ cường lực 8mm | m² | 18 | 750,000 |
| 8 | Sơn chống thấm mái bằng Sika | m² | 95 | 180,000 |
| 9 | Vệ sinh, cọ rửa, dọn dẹp sau thi công | m² | 605 | 15,000 |
| 10 | Chi phí vận chuyển, bốc dỡ vật liệu | ls | 1 | 5,500,000 |

### Hóa đơn GTGT mẫu

| Số HĐ | Ngày HĐ | Nội dung | Trước thuế (VNĐ) | Thuế suất | Tiền thuế | Tổng cộng |
|-------|---------|---------|-----------------|-----------|-----------|-----------|
| 0000123 | 10/04/2025 | Vật tư xây dựng (sơn, gạch, kính) | 45,250,000 | 10% | 4,525,000 | 49,775,000 |
| 0000145 | 15/04/2025 | Thiết bị điện (đèn LED, ổ cắm) | 18,750,000 | 10% | 1,875,000 | 20,625,000 |
| 0000167 | 28/04/2025 | Nhân công thi công (phần sơn, ốp lát) | 32,000,000 | 10% | 3,200,000 | 35,200,000 |
| 0000189 | 30/04/2025 | Cửa nhựa lõi thép + lắp đặt | 16,500,000 | 10% | 1,650,000 | 18,150,000 |

---

## Quy tắc tạo Excel

### Định dạng chung
- Font: **Arial 10** cho nội dung, **Arial 11 Bold** cho tiêu đề
- Màu header: xanh đậm (`#1F4E79`) chữ trắng
- Border: tất cả các ô có dữ liệu đều có border mỏng
- Số tiền: format `#,##0` (không hiện decimals)
- Cột STT: width 5, Cột Hạng mục: width 45, Cột số tiền: width 18

### Sheet BAO_GIA
```
Dòng 1:  [Logo/Tên công ty Bên B]           [Số HĐ, Ngày HĐ]
Dòng 2:  BẢNG BÁO GIÁ CHI TIẾT
Dòng 3:  Công trình: [Tên]
Dòng 4:  Bên A: [...]    Bên B: [...]
Dòng 6+: Bảng dữ liệu: STT | Hạng mục | ĐVT | KL | Đơn giá | Thành tiền
         Dòng cuối: TỔNG CỘNG (=SUM)
         + Dòng chi phí quản lý (5%): =TỔNG*5%
         + Dòng VAT (10%): =(TỔNG+QLCP)*10%
         + TỔNG GIÁ TRỊ HỢP ĐỒNG
Ký tên:  Đại diện Bên B | Đại diện Bên A (PHÒNG KỸ THUẬT / KẾ TOÁN)
```

### Sheet NGHIEM_THU
```
Tiêu đề: BIÊN BẢN NGHIỆM THU KHỐI LƯỢNG
Nội dung: Căn cứ HĐ số... ngày...
Thành phần: Đại diện Bên A, Đại diện Bên B (tên, chức vụ)
Bảng: STT | Hạng mục | ĐVT | KL theo HĐ | KL thực hiện | Đơn giá | Thành tiền | Ghi chú
Công thức: Thành tiền = KL thực hiện × Đơn giá (VLOOKUP hoặc nhập trực tiếp)
Kết luận: "Hai bên thống nhất nghiệm thu..."
Ký tên 4 bên: Người lập, Kỹ thuật Bên B, Kỹ thuật Bên A, Đại diện Bên A
```

### Sheet QUYET_TOAN_AB
```
Tiêu đề: BIÊN BẢN QUYẾT TOÁN (A-B)
Bảng so sánh:
  STT | Hạng mục | KL HĐ | Đơn giá HĐ | GT HĐ | KL Thực hiện | GT Thực hiện | Chênh lệch
Tổng hợp:
  - Giá trị hợp đồng ban đầu
  - Giá trị thực hiện theo nghiệm thu
  - Chênh lệch (tăng/giảm)
  - Thuế GTGT (10%)
  - TỔNG THANH TOÁN
```

### Sheet DE_NGHI_TT
```
Tiêu đề: ĐỀ NGHỊ THANH TOÁN
Kính gửi: [Bên A]
Căn cứ: HĐ số... ngày...
Nội dung thanh toán:
  - Giá trị công trình theo quyết toán
  - Thuế GTGT
  - Tổng tiền thanh toán (bằng số và bằng chữ)
Hình thức: Chuyển khoản
Tài khoản thụ hưởng: [STK Bên B]
Ký tên: Giám đốc Bên B, xác nhận Bên A
```

### Sheet BANG_KE_HDGTGT
```
Cột: STT | Số hóa đơn | Ngày hóa đơn | Tên người bán | MST người bán |
     Nội dung hàng hóa/dịch vụ | Loại chi phí |
     Giá trị trước thuế | Thuế suất | Tiền thuế | Tổng tiền thanh toán
Dòng tổng: =SUM cho các cột số
Loại chi phí chuẩn: Vật tư | Nhân công | Máy thi công | Quản lý
```

---

## Format chuẩn từ template (tích hợp 3 file mẫu)

Các template dưới đây định nghĩa **nội dung và thứ tự trường** cho từng sheet Excel tương ứng.
Khi tạo file, map các `{{placeholder}}` sang ô Excel thực tế.

### Template: ĐỀ NGHỊ THANH TOÁN → Sheet DE_NGHI_TT

```
Tiêu đề:  ĐỀ NGHỊ THANH TOÁN
[Row 1]   Ngày:           {{date}}              → ô D3  (format dd/mm/yyyy)
[Row 2]   Kính gửi:       {{client_name}}       → ô D4
[Row 3]   Dự án:          {{project_name}}      → ô D5

Bảng thanh toán (từ Row 8):
  Dòng 1: Giá trị KL hoàn thành theo HĐ:       {{contract_value}}
  Dòng 2: Giá trị KL công việc phát sinh:       {{additional_value}}
  Dòng 3: Giảm trừ tiền tạm ứng:               {{advance_deduction}}   (số âm)
  Dòng 4: TỔNG GIÁ TRỊ ĐỀ NGHỊ THANH TOÁN:    {{total_payment}}       (=SUM 3 dòng trên)

Ghi chú cuối: "Kèm theo bảng kê hóa đơn GTGT."
Ký tên:  Người lập | Kế toán trưởng | Giám đốc Bên B | Xác nhận Bên A
```

Mapping placeholder → nguồn dữ liệu:
| Placeholder          | Lấy từ                                      |
|----------------------|---------------------------------------------|
| `{{date}}`           | Ngày lập hồ sơ (user nhập hoặc today())     |
| `{{client_name}}`    | Bên A                                       |
| `{{project_name}}`   | Tên công trình                              |
| `{{contract_value}}` | Tổng thành tiền sheet NGHIEM_THU (trước VAT + VAT) |
| `{{additional_value}}`| Giá trị phát sinh (0 nếu không có)        |
| `{{advance_deduction}}`| Tiền tạm ứng đã nhận (nhập âm)           |
| `{{total_payment}}`  | =contract_value + additional_value − advance_deduction |

---

### Template: BIÊN BẢN NGHIỆM THU → Sheet NGHIEM_THU

```
Tiêu đề:  BIÊN BẢN NGHIỆM THU KHỐI LƯỢNG
[Row 1]   Ngày:           {{date}}
[Row 2]   Dự án:          {{project_name}}

Bảng nghiệm thu (từ Row 7):
  Cột A: STT
  Cột B: Hạng mục công việc     → {{item_name}}
  Cột C: ĐVT                    → {{unit}}
  Cột D: KL theo HĐ
  Cột E: KL thực hiện           → {{actual_quantity}}
  Cột F: Đơn giá (VNĐ)
  Cột G: Thành tiền             → =E*F

Kết luận:
  "Hai bên thống nhất nghiệm thu khối lượng công việc đạt yêu cầu kỹ thuật,
   đủ điều kiện thanh toán theo hợp đồng."

Ký tên 4 vị trí:
  Người lập | Đại diện tư vấn (nếu có) → {{optional_consultant}}
  Đại diện Bên B (nhận thầu)           → {{contractor_rep}}
  Đại diện Bên A (giao thầu)           → luôn có
```

Quy tắc điền {{actual_quantity}}:
- Nếu KL thực hiện = KL hợp đồng → copy từ cột D
- Nếu khác → user cung cấp, ghi chú chênh lệch ở cột Ghi chú

---

### Template: BẢNG KÊ HÓA ĐƠN GTGT → Sheet BANG_KE_HDGTGT

```
Tiêu đề:  BẢNG KÊ HÓA ĐƠN GIÁ TRỊ GIA TĂNG

Header hàng (Row 5):
  STT | Số hóa đơn | Ngày | Tên nhà cung cấp | Loại chi phí |
  Giá trước thuế | Thuế suất | Tiền thuế | Tổng tiền

Dữ liệu:  {{invoice_list}}
  → Mỗi phần tử trong invoice_list tương ứng 1 dòng Excel:
    [stt, so_hd, ngay_hd, ten_ncc, loai_chi_phi,
     gia_truoc_thue, thue_suat, tien_thue, tong_tien]

  Công thức tự động:
    Tiền thuế   = Giá trước thuế × Thuế suất   (=F*G)
    Tổng tiền   = Giá trước thuế + Tiền thuế   (=F+H)

Dòng tổng cuối:  {{total_vat_value}}
  → =SUM(F:F), =SUM(H:H), =SUM(I:I) cho 3 cột tương ứng
  → Format bold, fill màu xanh nhạt (#BDD7EE)
```

Mapping `{{invoice_list}}` → Python list of dicts:
```python
invoice_list = [
    {
        "so_hd": "0000123",
        "ngay": "10/04/2025",
        "ten_ncc": "Cty TNHH Vật tư XD ABC",
        "loai": "Vật tư",
        "truoc_thue": 45250000,
        "thue_suat": 0.10,
    },
    # ... thêm các hóa đơn khác
]
```

`{{total_vat_value}}` = tổng cột Tổng tiền = sum(truoc_thue * (1 + thue_suat))

---

## Quy trình thực hiện

```
1. Thu thập thông tin (hỏi user hoặc dùng dữ liệu mẫu)
2. Tạo file Excel với openpyxl:
   a. Sheet BAO_GIA – nhập KL, đơn giá, công thức thành tiền
   b. Sheet NGHIEM_THU – copy cấu trúc BAO_GIA, thêm cột KL thực tế
   c. Sheet QUYET_TOAN_AB – reference sang NGHIEM_THU
   d. Sheet DE_NGHI_TT – tổng hợp từ QUYET_TOAN_AB
   e. Sheet BANG_KE_HDGTGT – nhập danh sách HĐ
3. Chạy scripts/recalc.py để tính lại công thức
4. Xuất CSV riêng cho BANG_KE_HDGTGT
5. Xuất PDF (xem chi tiết bên dưới)
6. Đặt tất cả file vào /mnt/user-data/outputs/
7. Gọi present_files với cả Excel + PDF
```

---

## Xuất PDF

### Thư viện sử dụng
```
pip install reportlab --break-system-packages
```
Dùng **reportlab** để tạo PDF trực tiếp từ dữ liệu (không cần chuyển đổi từ Excel).

### Cấu trúc file PDF đầu ra

Xuất **1 file PDF duy nhất** gồm nhiều trang, theo đúng thứ tự hồ sơ:

```
Ho_So_Thanh_Toan_[TenCT].pdf
├── Trang 1–N   : Bảng báo giá chi tiết (BAO_GIA)
├── Trang N+1–M : Biên bản nghiệm thu khối lượng (NGHIEM_THU)
├── Trang M+1   : Biên bản quyết toán A-B (QUYET_TOAN_AB)
├── Trang M+2   : Đề nghị thanh toán (DE_NGHI_TT)
└── Trang cuối  : Bảng kê hóa đơn GTGT (BANG_KE_HDGTGT)
```

### Quy tắc trình bày PDF

```
Khổ giấy:    A4 đứng (210×297mm), margin 20mm 4 phía
Font:        "Helvetica" (built-in) hoặc nhúng font có hỗ trợ tiếng Việt:
             → pip install reportlab, dùng TTFont với file .ttf (Arial/Times New Roman)
             → Nếu không có .ttf, dùng Helvetica + encode latin-1 fallback

Header mỗi trang:
  - Góc trái:  Tên Bên B (nhà thầu)
  - Góc phải:  Số HĐ | Ngày
  - Đường kẻ ngang phân cách

Footer mỗi trang:
  - Giữa: "Trang X / Y"
  - Góc phải: Tên file | Ngày lập

Màu sắc:
  - Header bảng:  #1F4E79 nền, chữ trắng (giống Excel)
  - Dòng chẵn:    #EBF3FB (xanh nhạt xen kẽ)
  - Dòng lẻ:      trắng
  - Tổng cộng:    #BDD7EE nền, bold

Bảng dữ liệu:
  - Dùng reportlab Table với TableStyle
  - Căn phải: cột số tiền, cột KL
  - Căn trái: cột hạng mục, tên
  - Căn giữa: cột STT, ĐVT, ngày, thuế suất
  - Wrap text cho cột Hạng mục (nội dung dài)

Trang ký tên (DE_NGHI_TT và NGHIEM_THU):
  - Vẽ 4 ô chữ ký bằng HRFlowable + Spacer
  - Label: Người lập | Kế toán trưởng | Đại diện Bên B | Đại diện Bên A
  - Để khoảng trắng 3cm cho chữ ký tay
```

### Code mẫu (reportlab)

```python
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Table, TableStyle, Paragraph,
    Spacer, PageBreak, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

# Nhúng font hỗ trợ tiếng Việt (nếu có file .ttf trên server)
try:
    pdfmetrics.registerFont(TTFont('Arial', '/usr/share/fonts/truetype/msttcorefonts/Arial.ttf'))
    FONT = 'Arial'
except:
    FONT = 'Helvetica'   # fallback, tiếng Việt có thể hiện dấu ?

HEADER_COLOR = colors.HexColor('#1F4E79')
ROW_ALT_COLOR = colors.HexColor('#EBF3FB')
TOTAL_COLOR = colors.HexColor('#BDD7EE')

def build_table_style(num_rows, has_total=True):
    style = [
        ('BACKGROUND', (0,0), (-1,0), HEADER_COLOR),
        ('TEXTCOLOR',  (0,0), (-1,0), colors.white),
        ('FONTNAME',   (0,0), (-1,0), FONT),
        ('FONTSIZE',   (0,0), (-1,0), 10),
        ('ALIGN',      (0,0), (-1,0), 'CENTER'),
        ('GRID',       (0,0), (-1,-1), 0.5, colors.grey),
        ('FONTNAME',   (0,1), (-1,-1), FONT),
        ('FONTSIZE',   (0,1), (-1,-1), 9),
    ]
    # Xen kẽ màu dòng
    for i in range(1, num_rows):
        if i % 2 == 0:
            style.append(('BACKGROUND', (0,i), (-1,i), ROW_ALT_COLOR))
    # Dòng tổng cuối
    if has_total:
        style += [
            ('BACKGROUND', (0,-1), (-1,-1), TOTAL_COLOR),
            ('FONTNAME',   (0,-1), (-1,-1), FONT + '-Bold' if FONT != 'Helvetica' else 'Helvetica-Bold'),
        ]
    return TableStyle(style)

def format_vnd(value):
    """Format số tiền: 1234567 → '1,234,567'"""
    return f"{int(value):,}".replace(",", ".")

def add_signature_block(story, roles):
    """Thêm block ký tên cuối trang"""
    story.append(Spacer(1, 20*mm))
    sig_data = [[Paragraph(r, getSampleStyleSheet()['Normal']) for r in roles]]
    sig_table = Table(sig_data, colWidths=[45*mm]*len(roles))
    sig_table.setStyle(TableStyle([
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('FONTNAME', (0,0), (-1,-1), FONT),
    ]))
    story.append(sig_table)
    # Khoảng trắng cho chữ ký tay
    story.append(Spacer(1, 25*mm))
    line_data = [['_'*15]*len(roles)]
    line_table = Table(line_data, colWidths=[45*mm]*len(roles))
    story.append(line_table)
```

### Tên file xuất ra

```
Excel:  Ho_So_Thanh_Toan_[TenCT].xlsx
PDF:    Ho_So_Thanh_Toan_[TenCT].pdf
CSV:    Bang_Ke_HDGTGT_[TenCT].csv
```
`[TenCT]` = tên công trình viết tắt, bỏ dấu, thay khoảng trắng bằng `_`.
Ví dụ: `Ho_So_Thanh_Toan_SC_VP_PHC_Tang3.xlsx`

---

## Kiểm tra trước khi xuất

**Excel:**
- [ ] Tổng tiền NGHIEM_THU = Tổng QUYET_TOAN_AB (trước VAT)
- [ ] Tổng hóa đơn trong BANG_KE_HDGTGT >= Giá trị thanh toán
- [ ] Không có #REF!, #DIV/0!, #VALUE!
- [ ] Đơn giá trong NGHIEM_THU khớp với BAO_GIA
- [ ] Tổng tiền bằng chữ chính xác trong DE_NGHI_TT
- [ ] Định dạng ngày: dd/mm/yyyy
- [ ] Tất cả ô tiền tệ có format #,##0 VND

**PDF:**
- [ ] Tiếng Việt hiển thị đúng dấu (không bị ? hoặc ký tự lạ)
- [ ] Số tiền trong PDF khớp 100% với Excel
- [ ] Đủ 5 phần theo đúng thứ tự trang
- [ ] Block ký tên có khoảng trắng đủ rộng (>= 2.5cm)
- [ ] Header/footer hiển thị đúng số trang (Trang X / Y)
- [ ] Bảng không bị cắt đôi giữa trang (dùng repeatRows=1 cho header)

---

## Lưu ý pháp lý / thực tế

- Biên bản nghiệm thu phải có đủ chữ ký 2 bên (A và B) mới hợp lệ
- Số hóa đơn GTGT phải trùng khớp với hóa đơn thực tế xuất ra
- Không được quyết toán vượt giá trị hợp đồng gốc nếu không có phụ lục
- Hồ sơ thanh toán lần cuối cần kèm theo ảnh chụp công trình hoàn thành
- Lưu trữ hồ sơ gốc có chữ ký tươi theo quy định của DPM (thường 5 năm)
