---
name: "manage-detailed-quotes"
description: "Quản lý báo giá chi tiết cho công trình/dự án: nhập thông tin dự án, hạng mục, trạng thái phê duyệt, và cập nhật phiên bản báo giá khi có thay đổi. Xuất kết quả ra file Excel (.xlsx) có công thức Thành tiền = SL × ĐG và file PDF khổ ngang dùng để in/đính kèm hồ sơ nghiệm thu. Luôn dùng skill này khi người dùng nhắc tới 'báo giá chi tiết', 'bảng báo giá', 'quote', 'hạng mục công trình', 'tổng giá trị hợp đồng', hoặc yêu cầu tạo/cập nhật báo giá có cột Thành tiền, trạng thái phê duyệt (Đã phê duyệt/Chờ duyệt/Từ chối), kể cả khi họ chỉ nói 'làm file báo giá' mà không nêu rõ định dạng xuất."
---

# Skill: manage-detailed-quotes

## Mô tả

Skill này quản lý báo giá chi tiết bằng cách nhận thông tin dự án, danh sách hạng mục, trạng thái phê duyệt, xử lý chúng, và tạo ra một bảng báo giá chi tiết hoàn chỉnh. Skill cũng xử lý việc cập nhật khi có phiên bản báo giá mới (revision).

Đầu ra chuẩn gồm **2 file**:
1. **File Excel (.xlsx)** — dùng công thức Excel thật cho cột Thành tiền và Tổng giá trị hợp đồng (không hardcode), có màu trạng thái phê duyệt.
2. **File PDF (.pdf)** — khổ ngang A4, dùng để in hoặc đính kèm hồ sơ nghiệm thu/hợp đồng.

## Tham số đầu vào

### `quote_data` (bắt buộc, dict)
Dữ liệu báo giá ban đầu:
```json
{
    "project_info": {
        "project_name": "Tên công trình",
        "location": "Vị trí",
        "start_date": "YYYY-MM-DD",
        "expected_completion_date": "YYYY-MM-DD",
        "client_name": "Tên khách hàng Bên A",
        "contractor_name": "Tên nhà thầu Bên B"
    },
    "items": [
        {
            "item_code": "Mã hạng mục",
            "item_name": "Tên hạng mục",
            "unit": "Đơn vị tính",
            "quoted_quantity": "Số lượng báo giá (SL)",
            "original_unit_price": "Đơn giá gốc (ĐG)"
        }
    ]
}
```

### `existing_quote_file_path` (tùy chọn, str)
Đường dẫn tới file JSON báo giá đã xử lý trước đó (phiên bản trước). Nếu được cung cấp cùng `quote_data` mới, skill sẽ so sánh theo `item_code`, cập nhật hạng mục đã đổi, thêm hạng mục mới, đánh dấu hạng mục bị loại bỏ, và tăng số phiên bản (v1 → v2 → ...).

## Quy trình thực hiện

Khi được gọi, Claude thực hiện theo thứ tự sau:

### Bước 1 — Thu thập dữ liệu
- Nếu người dùng chưa cung cấp dữ liệu thực tế, hỏi rõ: dùng dữ liệu mẫu minh họa hay dữ liệu thực tế của họ.
- Nếu có `existing_quote_file_path`, đọc file JSON cũ trước.

### Bước 2 — Xử lý logic (dùng `scripts/process_quote.py`)
Chạy hàm `process_quote()` (hoặc qua CLI) để:
- Tính `Thành tiền` = `quoted_quantity` × `original_unit_price` cho mỗi hạng mục.
- Gán `approval_status` mặc định = `"Chờ duyệt"` nếu chưa có; giữ nguyên trạng thái cũ khi cập nhật trừ khi được yêu cầu đổi.
- Kiểm tra trùng `item_code` (tự gộp số lượng + cảnh báo) và thiếu dữ liệu bắt buộc (đánh dấu để xem lại).
- Nếu có phiên bản cũ: so sánh, cập nhật, thêm mới, đánh dấu hạng mục bị loại bỏ, tăng version.
- Tính `Tổng giá trị hợp đồng` = tổng tất cả `Thành tiền`.

```bash
python scripts/process_quote.py quote_data.json [] [existing_quote.json]
```

Script in ra JSON kết quả gồm `output_file_path`, `total_contract_value`, và `warnings` (danh sách cảnh báo trùng/thiếu dữ liệu — **luôn đọc và báo lại cho người dùng nếu có**).

### Bước 3 — Xuất file Excel (dùng `scripts/export_excel.py`)
- **Trước khi chạy, đọc kỹ skill `xlsx`** để tuân thủ chuẩn font, định dạng số, và quy trình recalc công thức.
- Gọi `build_workbook(quote, out_path)` để tạo file `.xlsx` với:
  - Thông tin dự án (tên, địa điểm, khách hàng bên A, nhà thầu bên B, thời gian, phiên bản) ở đầu trang.
  - Bảng hạng mục: Mã, Tên, ĐVT, SL, Đơn giá, **Thành tiền (công thức Excel `=E*F`, không hardcode)**, Trạng thái phê duyệt (tô màu: xanh=Đã phê duyệt, vàng=Chờ duyệt, đỏ=Từ chối).
  - Dòng Tổng giá trị hợp đồng = công thức `SUM` các dòng Thành tiền.
- **Bắt buộc recalculate công thức** sau khi tạo file.

### Bước 4 — Xuất file PDF (dùng `scripts/export_pdf.py`)
- Gọi `build_pdf(quote, out_path)` để tạo file `.pdf` khổ ngang A4 với cùng dữ liệu, layout phù hợp để in.
- Sau khi build, render thử hoặc kiểm tra trực quan file PDF để đảm bảo tiếng Việt hiển thị chính xác.

### Bước 5 — Lưu kết quả và trả về
- Copy cả 2 file (`.xlsx` và `.pdf`) vào thư mục master và exports của dự án.
- Báo cáo ngắn gọn: Tổng giá trị hợp đồng, số hạng mục, và bất kỳ `warnings` nào từ Bước 2.

## Cấu trúc dữ liệu nội bộ (sau khi xử lý)

```json
{
    "project_info": {
        "project_name": "...",
        "location": "...",
        "start_date": "...",
        "expected_completion_date": "...",
        "client_name": "...",
        "contractor_name": "..."
    },
    "items": [
        {
            "item_code": "HM-001",
            "item_name": "...",
            "unit": "m3",
            "quoted_quantity": 320,
            "original_unit_price": 2850000,
            "approval_status": "Đã phê duyệt"
        }
    ],
    "total_contract_value": 5429000000,
    "version": "v1",
    "generated_at": "2026-06-22 08:00:00",
    "warnings": []
}
```

File JSON này (`detailed_quote_version_timestamp.json`) chính là input chuẩn cho `export_excel.py` and `export_pdf.py`, và cũng là `existing_quote_file_path` cho lần cập nhật tiếp theo.

## Quy tắc quan trọng

- **Không hardcode Thành tiền hoặc Tổng giá trị hợp đồng trong Excel** — luôn dùng công thức để bảng tính vẫn động khi người dùng sửa số liệu.
- Khi cập nhật báo giá đã có (`existing_quote_file_path`), không tự đổi `approval_status` của hạng mục cũ trừ khi người dùng yêu cầu rõ.
- Khi phát hiện `item_code` trùng hoặc thiếu trường bắt buộc, **báo cho người dùng**, không tự ý bỏ qua âm thầm.

## Kết quả mong đợi (Expected Output)

Một dict chứa:
- `output_file_path` (str): đường dẫn tới file JSON báo giá đã xử lý.
- `total_contract_value` (float): tổng giá trị hợp đồng.
- File `.xlsx` và `.pdf` tương ứng đã được tạo trong dự án.

## Tài nguyên đi kèm (scripts/)

| File | Vai trò |
|---|---|
| `scripts/process_quote.py` | Xử lý logic chính: tính Thành tiền, gắn trạng thái, kiểm tra trùng/thiếu, versioning, tổng giá trị hợp đồng. |
| `scripts/export_excel.py` | Xuất báo giá đã xử lý ra file `.xlsx` với công thức Excel thật. |
| `scripts/export_pdf.py` | Xuất báo giá đã xử lý ra file `.pdf` khổ ngang A4. |
