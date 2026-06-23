---
name: "track-construction-progress"
description: "Theo dõi tiến độ thi công công trình: nhập cập nhật tiến độ thực tế hàng ngày/hàng tuần (SL hoàn thành, ngày bắt đầu/kết thúc thực tế, ghi chú hiện trường), so sánh với kế hoạch (mốc, ngày dự kiến, SL kế hoạch) để tính chênh lệch, gắn cờ cảnh báo xanh/vàng/đỏ theo số ngày trễ, và liệt kê hạng mục trễ tiến độ để họp điều phối. Xuất dashboard Excel (conditional formatting theo cờ cảnh báo), báo cáo PDF, và file CSV dữ liệu tiến độ để dùng cho phân tích tổng hợp lợi nhuận (vượt định mức do trễ tiến độ). Luôn dùng skill này khi người dùng nhắc tới 'theo dõi tiến độ', 'nhật ký hiện trường', 'cập nhật tiến độ', 'cột mốc', 'milestone', 'trễ tiến độ', 'dashboard tiến độ', 'SPI', 'Earned Value', hoặc yêu cầu so sánh tiến độ thực tế với kế hoạch thi công, kể cả khi họ chỉ nói 'làm báo cáo tiến độ' mà không nêu rõ định dạng xuất."
---

# Skill: track-construction-progress

## Mô tả

Skill này theo dõi tiến độ thi công bằng cách nhận **nhật ký hiện trường** (do Cán bộ kỹ thuật/PM cập nhật hàng ngày/hàng tuần) và **kế hoạch tiến độ** (các mốc, ngày dự kiến, SL kế hoạch), sau đó:
- So sánh thực tế vs kế hoạch để tính chênh lệch SL và số ngày trễ.
- Gắn cờ cảnh báo (Xanh/Vàng/Đỏ) cho từng hạng mục **dựa trên số ngày trễ so với kế hoạch**.
- Tổng hợp trạng thái theo từng mốc (milestone) và % hoàn thành toàn dự án.
- Liệt kê danh sách hạng mục/mốc bị trễ để chuẩn bị họp điều phối.
- (Tùy chọn) Quy đổi SL thực tế ra giá trị tiền (Earned Value đơn giản = SL thực tế × đơn giá gốc) nếu có dữ liệu đơn giá từ **Skill 1 — manage-detailed-quotes**.

Đầu ra chuẩn gồm **3 file**:
1. **Dashboard Excel (.xlsx)** — sheet tổng quan (% hoàn thành, trạng thái mốc, danh sách trễ) + sheet chi tiết hạng mục có conditional formatting theo cờ cảnh báo.
2. **Báo cáo PDF (.pdf)** — khổ ngang A4, trang tổng quan + trang chi tiết, dùng để in/họp.
3. **File CSV** — dữ liệu tiến độ (SL thực tế, SL kế hoạch, chênh lệch, giá trị EV...) làm input cho **Skill 4 — tổng hợp lợi nhuận**.

## Tham số đầu vào

### `site_log` (bắt buộc, dict)
Nhật ký hiện trường — tiến độ thực tế, do Cán bộ kỹ thuật/PM cập nhật:
```json
{
    "items": [
        {
            "item_code": "Mã hạng mục (khớp với plan.items)",
            "actual_quantity": "SL thực tế đã hoàn thành",
            "actual_start_date": "YYYY-MM-DD hoặc null nếu chưa bắt đầu",
            "actual_end_date": "YYYY-MM-DD hoặc null nếu chưa hoàn thành",
            "site_notes": "Ghi chú hiện trường tự do",
            "delay_reason": "Một trong: Thời tiết | Chờ vật tư | Máy móc | Thay đổi thiết kế | Khác (chỉ cần nếu đang trễ)"
        }
    ]
}
```

### `plan` (bắt buộc, dict)
Kế hoạch tiến độ — mốc và SL/ngày kế hoạch cho từng hạng mục:
```json
{
    "project_info": {"project_name": "Tên công trình"},
    "milestones": [
        {"milestone_name": "Mốc 1 - Hoàn thành phá dỡ", "planned_end_date": "YYYY-MM-DD"}
    ],
    "items": [
        {
            "item_code": "Mã hạng mục",
            "item_name": "Tên hạng mục",
            "unit": "Đơn vị tính",
            "planned_quantity": "SL kế hoạch",
            "planned_start_date": "YYYY-MM-DD",
            "planned_end_date": "YYYY-MM-DD",
            "milestone_name": "Tên mốc mà hạng mục này thuộc về"
        }
    ]
}
```

### `unit_prices` (tùy chọn, dict)
Đơn giá gốc theo `item_code`, lấy từ output của **Skill 1 (manage-detailed-quotes)** để quy đổi SL thực tế thành giá trị tiền (Earned Value đơn giản):
```json
{"HM-001": 2850000, "HM-002": 26500000}
```
Nếu không cung cấp, skill vẫn hoạt động đầy đủ nhưng bỏ qua phần giá trị tiền (EV), chỉ báo % hoàn thành và ngày trễ.

### `today` (tùy chọn, str "YYYY-MM-DD")
Ngày tham chiếu để tính trễ cho hạng mục **chưa hoàn thành** (so `today` với `planned_end_date`). Mặc định là ngày hệ thống hiện tại.

### `thresholds` (tùy chọn, dict)
Ngưỡng số ngày trễ để phân loại cảnh báo, mặc định:
```json
{"yellow_days": 3, "red_days": 7}
```
Quy tắc: trễ 0 ngày → **Xanh**; trễ 1 ngày đến `yellow_days` → **Vàng**; trễ hơn `yellow_days` → **Đỏ**. (Mốc `red_days` được giữ trong cấu hình để các phiên bản nâng cấp sau có thể tách thêm mức cảnh báo, nhưng logic 2 mức Vàng/Đỏ hiện tại chỉ dùng `yellow_days` làm ranh giới.)

## Quy trình thực hiện

### Bước 1 — Thu thập dữ liệu
- Nếu người dùng chưa cung cấp dữ liệu thực tế, hỏi rõ: dùng dữ liệu mẫu minh họa hay dữ liệu thực tế (nhật ký hiện trường + kế hoạch tiến độ).
- Nếu người dùng muốn tính giá trị EV, hỏi xem có file đơn giá gốc từ Skill 1 không (hoặc dùng trực tiếp output JSON của `manage-detailed-quotes` — trích `item_code` → `original_unit_price`).

### Bước 2 — Xử lý logic (dùng `scripts/process_progress.py`)
```bash
python scripts/process_progress.py site_log.json plan.json [unit_prices.json] [today=YYYY-MM-DD]
```
Script thực hiện:
- Ghép `site_log` với `plan` theo `item_code`; cảnh báo nếu có mã không khớp (có log nhưng không có kế hoạch, hoặc có kế hoạch nhưng chưa cập nhật thực tế).
- Tính `variance_quantity` = SL thực tế − SL kế hoạch.
- Tính số ngày trễ: nếu hạng mục đã xong, so `actual_end_date` với `planned_end_date`; nếu chưa xong, so `today` với `planned_end_date`.
- Gắn cờ Xanh/Vàng/Đỏ theo `thresholds`.
- Tính `percent_complete` = SL thực tế / SL kế hoạch.
- Tổng hợp trạng thái theo từng mốc (lấy cờ xấu nhất trong các hạng mục thuộc mốc).
- Nếu có `unit_prices`: tính `planned_value`, `earned_value` cho từng hạng mục và tỉ lệ tổng EV/PV toàn dự án (chỉ số tiến độ giá trị đơn giản, không phải SPI chuẩn EVM vì không dùng AC).
- Trả về danh sách `delayed_items` (chỉ gồm hạng mục Vàng/Đỏ), sắp xếp theo số ngày trễ giảm dần.

Script in ra JSON gồm `output_file_path`, `project_percent_complete`, `delayed_items_count`, và `warnings` — **luôn đọc và báo lại cho người dùng nếu có cảnh báo**.

### Bước 3 — Xuất Dashboard Excel (dùng `scripts/export_excel_dashboard.py`)
- **Trước khi chạy, đọc kỹ skill `xlsx`** (`/mnt/skills/public/xlsx/SKILL.md`).
- Gọi `build_dashboard(progress, out_path)`:
  - Sheet "Dashboard": % hoàn thành toàn dự án, chỉ số EV/PV (nếu có), bảng trạng thái mốc, danh sách hạng mục trễ.
  - Sheet "Chi tiết hạng mục": kế hoạch vs thực tế đầy đủ, **conditional formatting thật** (không chỉ tô màu tĩnh) trên cột Cờ cảnh báo và cột Chênh lệch SL âm, để khi người dùng sửa dữ liệu trực tiếp trong Excel, màu vẫn tự cập nhật.
- Nếu sheet "Chi tiết hạng mục" có công thức (% hoàn thành, chênh lệch SL), **bắt buộc recalc**:
  ```bash
  python /mnt/skills/public/xlsx/scripts/recalc.py output.xlsx
  ```
  Kiểm tra `total_errors == 0` trước khi giao file.

### Bước 4 — Xuất báo cáo PDF (dùng `scripts/export_pdf_report.py`)
- **Trước khi chạy, đọc kỹ skill `pdf`** (`/mnt/skills/public/pdf/SKILL.md`).
- Gọi `build_pdf(progress, out_path)`: trang 1 tổng quan + danh sách trễ, trang 2 bảng chi tiết toàn bộ hạng mục.
- **Render thử ra ảnh để kiểm tra trực quan** trước khi giao file (đặc biệt dấu tiếng Việt và bảng nhiều cột không bị vỡ).

### Bước 5 — Xuất CSV cho Skill 4 (dùng `scripts/export_csv.py`)
```bash
python scripts/export_csv.py progress_report.json progress_for_profit_analysis.csv
```
Cột chính: `actual_quantity`, `planned_quantity`, `variance_quantity`, `earned_value` (giá trị EV) cùng các cột bổ trợ (mã/tên hạng mục, mốc, ngày, cờ cảnh báo, lý do chậm) — đủ để Skill 4 phân tích "vượt định mức vật tư, nhân công kéo dài do trễ tiến độ".

### Bước 6 — Lưu kết quả và trả về
- Copy cả 3 file (`.xlsx`, `.pdf`, `.csv`) vào `/mnt/user-data/outputs/`.
- Gọi `present_files` để hiển thị cho người dùng.
- Báo cáo ngắn gọn: % hoàn thành toàn dự án, số hạng mục bị trễ (kèm mức cảnh báo), và `warnings` từ Bước 2 (mã không khớp giữa log và kế hoạch).

## Cấu trúc dữ liệu nội bộ (sau khi xử lý)

```json
{
    "project_info": {"project_name": "..."},
    "as_of_date": "2026-06-22",
    "items": [
        {
            "item_code": "HM-001", "item_name": "...", "unit": "m3",
            "milestone_name": "Mốc 2 - Hoàn thành phần thô",
            "planned_quantity": 320, "actual_quantity": 280, "variance_quantity": -40,
            "percent_complete": 87.5,
            "planned_start_date": "2026-03-01", "planned_end_date": "2026-03-20",
            "actual_start_date": "2026-03-02", "actual_end_date": null,
            "delay_days": 5, "flag": "Đỏ",
            "site_notes": "Chờ vật tư cốt thép về công trình",
            "delay_reason": "Chờ vật tư",
            "unit_price": 2850000, "planned_value": 912000000, "earned_value": 798000000
        }
    ],
    "milestones": [
        {"milestone_name": "Mốc 2 - Hoàn thành phần thô", "planned_end_date": "2026-03-20",
         "percent_complete": 87.5, "flag": "Đỏ", "max_delay_days": 5, "item_count": 1}
    ],
    "delayed_items": [
        {"item_code": "HM-001", "item_name": "...", "milestone_name": "...",
         "delay_days": 5, "flag": "Đỏ", "delay_reason": "Chờ vật tư"}
    ],
    "project_percent_complete": 87.5,
    "total_planned_value": 912000000,
    "total_earned_value": 798000000,
    "spi_like": 0.87,
    "thresholds": {"yellow_days": 3, "red_days": 7},
    "warnings": [],
    "generated_at": "2026-06-22 08:30:00"
}
```

File JSON này (`progress_report_YYYYMMDD_HHMMSS.json`) là input chuẩn cho `export_excel_dashboard.py`, `export_pdf_report.py`, và `export_csv.py`.

## Quy tắc quan trọng

- **Cờ cảnh báo dựa trên số ngày trễ**, không dựa trên % hoàn thành đơn thuần — một hạng mục có thể hoàn thành 95% nhưng nếu đã quá hạn kế hoạch thì vẫn bị gắn cờ Vàng/Đỏ theo số ngày trễ thực tế.
- **Hạng mục chưa hoàn thành** (`actual_end_date = null`) vẫn được tính trễ nếu `today` đã vượt qua `planned_end_date` — không chờ đến khi hoàn thành mới cảnh báo.
- **`spi_like` (EV/PV) không phải SPI chuẩn EVM** vì không dùng AC (chi phí thực tế) — luôn ghi rõ với người dùng đây là chỉ số đơn giản, không phải Schedule Performance Index đầy đủ theo Earned Value Management.
- Dùng **conditional formatting thật trong Excel** (không chỉ tô màu tĩnh bằng Python) cho các cột cờ cảnh báo, để dashboard tự cập nhật khi người dùng sửa số liệu.
- Nếu `item_code` xuất hiện trong nhật ký hiện trường nhưng không có trong kế hoạch (hoặc ngược lại), **báo cho người dùng**, không âm thầm bỏ qua.
- Nếu người dùng không cung cấp dữ liệu thực tế, hỏi rõ trước khi tạo file: dùng dữ liệu mẫu minh họa hay chờ dữ liệu thật.
- Khi không có `unit_prices`, vẫn xuất đầy đủ 3 file nhưng các cột/giá trị liên quan đến tiền (EV, PV, spi_like) để trống — không tự bịa đơn giá.

## Liên kết với các skill khác

- **Input từ Skill 1 (`manage-detailed-quotes`)**: trích `item_code` → `original_unit_price` từ file JSON báo giá đã xử lý để làm `unit_prices` cho skill này.
- **Output cho Skill 4 (tổng hợp lợi nhuận)**: file CSV ở Bước 5 — Skill 4 dùng cột `variance_quantity` và `earned_value` để phân tích chi phí vượt định mức do trễ tiến độ.

## Kết quả mong đợi (Expected Output)

Một dict chứa:
- `output_file_path` (str): đường dẫn tới file JSON báo cáo tiến độ đã xử lý.
- `project_percent_complete` (float): % hoàn thành toàn dự án.
- `delayed_items_count` (int): số hạng mục bị gắn cờ trễ tiến độ.
- File `.xlsx`, `.pdf`, `.csv` tương ứng đã được tạo trong `/mnt/user-data/outputs/`.

## Tài nguyên đi kèm (scripts/)

| File | Vai trò |
|---|---|
| `scripts/process_progress.py` | Xử lý logic chính: so sánh thực tế vs kế hoạch, tính chênh lệch/% hoàn thành, gắn cờ cảnh báo theo ngày trễ, tính EV đơn giản, tổng hợp theo mốc. |
| `scripts/export_excel_dashboard.py` | Xuất dashboard `.xlsx` với conditional formatting thật theo cờ cảnh báo. |
| `scripts/export_pdf_report.py` | Xuất báo cáo `.pdf` khổ ngang A4 (tổng quan + chi tiết). |
| `scripts/export_csv.py` | Xuất `.csv` dữ liệu tiến độ cho Skill 4. |

Xem thêm `references/data_flow.md` để biết sơ đồ luồng dữ liệu đầy đủ và ví dụ chạy CLI end-to-end.
