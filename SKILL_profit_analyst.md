---
name: "profit-analyzer"
description: "Tổng hợp doanh thu, chi phí, tính lợi nhuận, phân tích nguyên nhân vượt ngân sách và xuất báo cáo PDF/Excel."
---

# Skill: Profit Analyzer

## Description
Skill này tổng hợp dữ liệu tài chính từ các đề nghị thanh toán và hóa đơn, tính toán lợi nhuận dự án, tạo báo cáo tài chính (Excel/PDF), đưa ra cảnh báo lợi nhuận thấp và phân tích nguyên nhân chi phí vượt ngân sách dựa trên tiến độ.

## Capabilities

1.  **Tổng hợp Doanh thu:**
    *   Lấy dữ liệu từ skill `payment-document-generator`.
    *   Tính tổng các giá trị đề nghị thanh toán sau bù trừ của dự án.

2.  **Tổng hợp Chi phí:**
    *   Lấy dữ liệu hóa đơn GTGT từ skill `payment-document-generator`.
    *   Phân loại và tính tổng chi phí theo: Vật liệu, Nhân công, Vận chuyển.

3.  **Tính toán Lợi nhuận:**
    *   Lợi nhuận gộp = Doanh thu - Tổng chi phí trực tiếp.
    *   Tỷ lệ lợi nhuận gộp = (Lợi nhuận gộp / Doanh thu) * 100%.
    *   Lợi nhuận ròng = Lợi nhuận gộp - Chi phí gián tiếp (quản lý, vận hành).

4.  **Phân tích Nguyên nhân:**
    *   So sánh chi phí thực tế với ngân sách dự kiến (từ skill `manage-detailed-quotes`).
    *   Liên kết dữ liệu chậm trễ từ skill `project-progress-tracker` để giải thích lý do vượt chi phí nhân công hoặc vật liệu.

5.  **Cảnh báo & Đánh giá:**
    *   Gắn cờ Đỏ nếu tỷ lệ lợi nhuận < 15% (hoặc mức kỳ vọng khác).
    *   Đưa ra nhận xét sơ bộ về sức khỏe tài chính dự án.

6.  **Xuất báo cáo PDF/Excel:**
    *   Tạo file Excel chi tiết bảng tính doanh thu, chi phí, chênh lệch ngân sách.
    *   Tạo file PDF báo cáo tổng hợp dành cho Ban Giám đốc bao gồm biểu đồ tóm tắt (dạng bảng) và phân tích nguyên nhân.

## Workflow

1.  **Nhận yêu cầu:** Người dùng yêu cầu báo cáo cho dự án cụ thể.
2.  **Truy xuất dữ liệu:** Thu thập thông tin từ các Skill 1, 2, 3.
3.  **Tính toán & Phân tích:** Thực hiện các phép tính tài chính và đối chiếu lý do trễ tiến độ.
4.  **Tạo file:** Sinh file PDF và Excel báo cáo.
5.  **Trả kết quả:** Cung cấp đường dẫn tải file trực tiếp trong chat.

## Usage Example

"Tạo báo cáo lợi nhuận cho 'Dự án Cầu B' và xuất file Excel kèm PDF gửi Ban Giám đốc."
