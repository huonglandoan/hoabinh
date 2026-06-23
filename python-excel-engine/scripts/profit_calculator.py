import os
import sys
import json
import csv
from datetime import datetime
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak, KeepTogether
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from core_excel_utils import (
    apply_header_style,
    apply_data_style,
    apply_total_style,
    autofit_column_widths,
    FMT_CURRENCY,
    FMT_PERCENT,
    COLOR_ZEBRA_BG,
    COLOR_TOTAL_BG
)
from core_excel_utils import vn_slug

# PDF Font registration
try:
    font_dir = "/System/Library/Fonts/Supplemental"
    pdfmetrics.registerFont(TTFont('Arial', os.path.join(font_dir, 'Arial.ttf')))
    pdfmetrics.registerFont(TTFont('Arial-Bold', os.path.join(font_dir, 'Arial Bold.ttf')))
    pdfmetrics.registerFont(TTFont('Arial-Italic', os.path.join(font_dir, 'Arial Italic.ttf')))
    FONT = 'Arial'
except Exception:
    FONT = 'Helvetica'

def format_currency(val):
    try:
        return f"{int(val):,}".replace(",", ".")
    except (ValueError, TypeError):
        return str(val)

def analyze_profit(project_id):
    # Absolute paths
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(os.path.dirname(script_dir))
    data_dir = os.path.join(project_root, "data")
    
    master_dir = os.path.join(data_dir, "master", project_id)
    exports_dir = os.path.join(data_dir, "exports", project_id, "profit")
    os.makedirs(master_dir, exist_ok=True)
    os.makedirs(exports_dir, exist_ok=True)
    
    quote_json_path = os.path.join(master_dir, f"baogia_{project_id}.json")
    progress_json_path = os.path.join(master_dir, "progress_report.json")
    invoices_csv_path = os.path.join(master_dir, "invoices_data.csv")
    
    warnings = []
    
    # 1. Load Revenue from Quote or Progress
    revenue = 0.0
    budget_revenue = 0.0
    project_name = project_id.replace("_", " ")
    
    if os.path.exists(quote_json_path):
        try:
            with open(quote_json_path, 'r', encoding='utf-8') as f:
                quote_data = json.load(f)
                budget_revenue = float(quote_data.get("total_contract_value") or 0)
                project_name = quote_data.get("project_info", {}).get("project_name", project_name)
        except Exception as e:
            warnings.append(f"Lỗi đọc file báo giá master: {e}")
            
    # Actual revenue is what has been earned based on progress (EV)
    if os.path.exists(progress_json_path):
        try:
            with open(progress_json_path, 'r', encoding='utf-8') as f:
                progress_data = json.load(f)
                revenue = float(progress_data.get("total_earned_value") or 0)
                if revenue == 0:
                    # Fallback to total contract value if EV is 0 or not computed
                    revenue = budget_revenue
        except Exception as e:
            warnings.append(f"Lỗi đọc file tiến độ master: {e}")
            revenue = budget_revenue
    else:
        revenue = budget_revenue
        
    if revenue == 0:
        warnings.append("Cảnh báo: Doanh thu thực tế bằng 0 hoặc chưa có dữ liệu báo giá/nghiệm thu.")
        
    # 2. Load Invoices & Classify Expenses
    expenses_by_type = {
        "Vật tư": 0.0,
        "Nhân công": 0.0,
        "Vận chuyển": 0.0,
        "Máy thi công": 0.0,
        "Quản lý": 0.0,
        "Khác": 0.0
    }
    
    total_expenses = 0.0
    invoices_list = []
    
    if os.path.exists(invoices_csv_path):
        try:
            with open(invoices_csv_path, 'r', encoding='utf-8-sig') as f:
                reader = csv.DictReader(f)
                for row in reader:
                    inv_val = float(row.get("gia_tri_truoc_thue") or 0)
                    exp_type = row.get("loai_chi_phi", "Khác").strip()
                    
                    # Normalize category names
                    if "vật tư" in exp_type.lower() or "vat tu" in exp_type.lower():
                        exp_type = "Vật tư"
                    elif "nhân công" in exp_type.lower() or "nhan cong" in exp_type.lower():
                        exp_type = "Nhân công"
                    elif "vận chuyển" in exp_type.lower() or "van chuyen" in exp_type.lower() or "bốc dỡ" in exp_type.lower():
                        exp_type = "Vận chuyển"
                    elif "máy" in exp_type.lower() or "thi công" in exp_type.lower() or "thi cong" in exp_type.lower():
                        exp_type = "Máy thi công"
                    elif "quản lý" in exp_type.lower() or "quan ly" in exp_type.lower() or "vận hành" in exp_type.lower():
                        exp_type = "Quản lý"
                    else:
                        exp_type = "Khác"
                        
                    expenses_by_type[exp_type] += inv_val
                    total_expenses += inv_val
                    invoices_list.append({
                        "so_hd": row.get("so_hoa_don"),
                        "ngay": row.get("ngay_hoa_don"),
                        "ncc": row.get("ten_nha_cung_cap"),
                        "loai": exp_type,
                        "gia_tri": inv_val
                    })
        except Exception as e:
            warnings.append(f"Lỗi đọc file hóa đơn: {e}")
            
    # 3. Profit calculations
    # Direct costs = Material + Labor + Transport + Equipment
    direct_costs = sum(expenses_by_type[k] for k in ["Vật tư", "Nhân công", "Vận chuyển", "Máy thi công"])
    indirect_costs = expenses_by_type["Quản lý"] + expenses_by_type["Khác"]
    
    gross_profit = revenue - direct_costs
    gross_margin = (gross_profit / revenue * 100) if revenue > 0 else 0.0
    
    net_profit = gross_profit - indirect_costs
    net_margin = (net_profit / revenue * 100) if revenue > 0 else 0.0
    
    profit_flag = "Xanh"
    if net_margin < 15.0:
        profit_flag = "Đỏ"
        warnings.append(f"Cảnh báo: Tỷ lệ lợi nhuận ròng ({net_margin:.1f}%) dưới mức kỳ vọng 15%!")
        
    # 4. Overrun & Delay correlation
    delayed_items = []
    overrun_reasons = []
    if os.path.exists(progress_json_path):
        try:
            with open(progress_json_path, 'r', encoding='utf-8') as f:
                progress_data = json.load(f)
                for item in progress_data.get("items", []):
                    if item.get("delay_days", 0) > 0:
                        delayed_items.append({
                            "code": item.get("item_code"),
                            "name": item.get("item_name"),
                            "delay_days": item.get("delay_days"),
                            "reason": item.get("delay_reason") or item.get("site_notes")
                        })
        except Exception:
            pass
            
    # Formulate explanations for overruns based on delays
    if net_margin < 15.0 and len(delayed_items) > 0:
        for d_item in delayed_items[:3]: # top 3 delays
            reason = d_item['reason'] or 'không rõ nguyên nhân'
            overrun_reasons.append(
                f"Hạng mục '{d_item['name']}' trễ {d_item['delay_days']} ngày do: '{reason}'. "
                f"Sự chậm trễ này làm tăng chi phí nhân công trực tiếp và chi phí quản lý vận hành."
            )
            
    if not overrun_reasons and net_margin < 15.0:
        overrun_reasons.append("Chi phí vật tư hoặc các nhà thầu phụ vượt quá dự phòng dự án ban đầu. Cần rà soát các hợp đồng cung ứng.")
        
    profit_report = {
        "project_id": project_id,
        "project_name": project_name,
        "budget_revenue": budget_revenue,
        "actual_revenue": revenue,
        "expenses": expenses_by_type,
        "total_expenses": total_expenses,
        "gross_profit": gross_profit,
        "gross_margin": gross_margin,
        "net_profit": net_profit,
        "net_margin": net_margin,
        "profit_flag": profit_flag,
        "delayed_items": delayed_items,
        "overrun_reasons": overrun_reasons,
        "warnings": warnings,
        "invoices_count": len(invoices_list),
        "generated_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    }
    
    # Save files
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    project_slug = vn_slug(project_name)

    # Save exports JSON
    export_json_path = os.path.join(exports_dir, f"profit_report_{project_slug}_{timestamp}.json")
    with open(export_json_path, 'w', encoding='utf-8') as f:
        json.dump(profit_report, f, ensure_ascii=False, indent=4)
        
    # Save master JSON
    master_json_path = os.path.join(master_dir, "profit_report.json")
    with open(master_json_path, 'w', encoding='utf-8') as f:
        json.dump(profit_report, f, ensure_ascii=False, indent=4)
        
    # Build Excel and PDF
    excel_path = os.path.join(exports_dir, f"profit_report_{project_slug}_{timestamp}.xlsx")
    build_excel_profit(profit_report, excel_path)
    
    pdf_path = os.path.join(exports_dir, f"profit_report_{project_slug}_{timestamp}.pdf")
    build_pdf_profit(profit_report, pdf_path)
    
    # Copy to master (with backups)
    import shutil
    master_excel_path = os.path.join(master_dir, "profit_report.xlsx")
    master_pdf_path = os.path.join(master_dir, "profit_report.pdf")
    try:
        backups_dir = os.path.join(project_root, 'data', 'backups', project_id, 'profit')
        os.makedirs(backups_dir, exist_ok=True)
        if os.path.exists(master_excel_path):
            shutil.copy2(master_excel_path, os.path.join(backups_dir, os.path.basename(master_excel_path) + f".backup.{datetime.now().strftime('%Y%m%d_%H%M%S')}"))
        if os.path.exists(master_pdf_path):
            shutil.copy2(master_pdf_path, os.path.join(backups_dir, os.path.basename(master_pdf_path) + f".backup.{datetime.now().strftime('%Y%m%d_%H%M%S')}"))
    except Exception:
        pass
    shutil.copy2(excel_path, master_excel_path)
    shutil.copy2(pdf_path, master_pdf_path)
    
    return {
        "output_json_path": export_json_path,
        "master_json_path": master_json_path,
        "output_excel_path": excel_path,
        "output_pdf_path": pdf_path,
        "master_excel_path": master_excel_path,
        "master_pdf_path": master_pdf_path,
        "net_margin": net_margin,
        "profit_flag": profit_flag,
        "warnings": warnings
    }

def build_excel_profit(report, out_path):
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Phan_Tich_Loi_Nhuan"
    ws.views.sheetView[0].showGridLines = True
    
    # Title
    ws['A1'] = "BÁO CÁO PHÂN TÍCH LỢI NHUẬN DỰ ÁN"
    ws['A1'].font = Font(name="Arial", size=14, bold=True, color="1F4E79")
    ws['A1'].alignment = Alignment(horizontal="center")
    ws.merge_cells("A1:D1")
    
    ws['A3'] = "Dự án:"
    ws['B3'] = report["project_name"]
    ws['A4'] = "Thời điểm lập:"
    ws['B4'] = report["generated_at"]
    ws['A5'] = "Trạng thái tài chính:"
    ws['B5'] = "An toàn" if report["profit_flag"] == "Xanh" else "Cảnh báo Lợi nhuận thấp"
    
    for r in range(3, 6):
        ws[f'A{r}'].font = Font(name="Arial", size=10, bold=True)
        ws[f'B{r}'].font = Font(name="Arial", size=10)
        
    # Set warning font color
    if report["profit_flag"] == "Đỏ":
        ws['B5'].font = Font(name="Arial", size=10, color="9C0006", bold=True)
        ws['B5'].fill = PatternFill(start_color="FFC7CE", end_color="FFC7CE", fill_type="solid")
        
    # Table headers at Row 8
    headers = ["Chỉ tiêu tài chính", "Giá trị dự toán (VNĐ)", "Thực tế thực hiện (VNĐ)", "Tỷ lệ (%)"]
    for col_idx, text in enumerate(headers, 1):
        cell = ws.cell(row=8, column=col_idx, value=text)
        apply_header_style(cell)
        
    # Row details
    metrics = [
        ("1. DOANH THU DỰ ÁN", report["budget_revenue"], report["actual_revenue"], "=C9/B9"), # Row 9
        ("2. CHI PHÍ TRỰC TIẾP", "", sum(report["expenses"][k] for k in ["Vật tư", "Nhân công", "Vận chuyển", "Máy thi công"]), "=C10/C9"), # Row 10
        ("   - Chi phí Vật tư", "", report["expenses"]["Vật tư"], "=C11/C9"),
        ("   - Chi phí Nhân công", "", report["expenses"]["Nhân công"], "=C12/C9"),
        ("   - Chi phí Vận chuyển", "", report["expenses"]["Vận chuyển"], "=C13/C9"),
        ("   - Chi phí Máy thi công", "", report["expenses"]["Máy thi công"], "=C14/C9"),
        ("3. LỢI NHUẬN GỘP", "", "=C9-C10", "=C15/C9"), # Row 15
        ("4. CHI PHÍ GIÁN TIẾP", "", sum(report["expenses"][k] for k in ["Quản lý", "Khác"]), "=C16/C9"), # Row 16
        ("   - Chi phí Quản lý", "", report["expenses"]["Quản lý"], "=C17/C9"),
        ("   - Chi phí Khác", "", report["expenses"]["Khác"], "=C18/C9"),
        ("5. LỢI NHUẬN RÒNG", "", "=C15-C16", "=C19/C9") # Row 19
    ]
    
    r_idx = 9
    for name, bud, act, pct in metrics:
        ws.cell(row=r_idx, column=1, value=name)
        ws.cell(row=r_idx, column=2, value=bud)
        ws.cell(row=r_idx, column=3, value=act)
        ws.cell(row=r_idx, column=4, value=pct)
        
        is_bold = name.startswith("1") or name.startswith("2") or name.startswith("3") or name.startswith("4") or name.startswith("5")
        
        bg = None
        if name.startswith("3") or name.startswith("5"):
            bg = COLOR_TOTAL_BG
            
        for c in range(1, 5):
            cell = ws.cell(row=r_idx, column=c)
            apply_data_style(cell, bold=is_bold, bg_color=bg)
            if c in (2, 3):
                cell.number_format = FMT_CURRENCY
                cell.alignment = Alignment(horizontal="right")
            elif c == 4:
                cell.number_format = FMT_PERCENT
                cell.alignment = Alignment(horizontal="right")
                
        r_idx += 1
        
    # Overrun analysis explanation
    r_idx += 2
    ws.cell(row=r_idx, column=1, value="PHÂN TÍCH NGUYÊN NHÂN VƯỢT NGÂN SÁCH/TRỄ TIẾN ĐỘ").font = Font(name="Arial", size=11, bold=True, color="1F4E79")
    r_idx += 1
    
    if report["overrun_reasons"]:
        for reason in report["overrun_reasons"]:
            ws.cell(row=r_idx, column=1, value=f"- {reason}")
            ws.merge_cells(start_row=r_idx, start_column=1, end_row=r_idx, end_column=4)
            ws.cell(row=r_idx, column=1).font = Font(name="Arial", size=10, italic=True)
            ws.row_dimensions[r_idx].height = 25
            r_idx += 1
    else:
        ws.cell(row=r_idx, column=1, value="Lợi nhuận dự án đạt mức kỳ vọng. Không phát hiện vượt chi phí đáng kể do chậm trễ.")
        ws.merge_cells(start_row=r_idx, start_column=1, end_row=r_idx, end_column=4)
        ws.cell(row=r_idx, column=1).font = Font(name="Arial", size=10, italic=True)
        
    autofit_column_widths(ws, padding=3, manual_widths={'A': 30, 'B': 22, 'C': 22, 'D': 12})
    wb.save(out_path)

def build_pdf_profit(report, out_path):
    doc = SimpleDocTemplate(
        out_path,
        pagesize=A4,
        rightMargin=15*mm,
        leftMargin=15*mm,
        topMargin=15*mm,
        bottomMargin=15*mm
    )
    
    styles = getSampleStyleSheet()
    
    title_style = ParagraphStyle(
        'DocTitle', parent=styles['Heading1'],
        fontName=f"{FONT}-Bold" if FONT == 'Arial' else 'Helvetica-Bold',
        fontSize=16, textColor=colors.HexColor('#1F4E79'),
        alignment=1, spaceAfter=15
    )
    
    section_style = ParagraphStyle(
        'DocSection', parent=styles['Heading2'],
        fontName=f"{FONT}-Bold" if FONT == 'Arial' else 'Helvetica-Bold',
        fontSize=11, textColor=colors.HexColor('#1F4E79'),
        spaceBefore=12, spaceAfter=6
    )
    
    info_style = ParagraphStyle(
        'InfoText', parent=styles['Normal'],
        fontName=FONT, fontSize=9, leading=13,
        textColor=colors.HexColor('#333333')
    )
    
    cell_style = ParagraphStyle(
        'CellText', parent=styles['Normal'],
        fontName=FONT, fontSize=9, leading=11
    )
    cell_bold = ParagraphStyle('CellTextBold', parent=cell_style, fontName=f"{FONT}-Bold" if FONT == 'Arial' else 'Helvetica-Bold')
    cell_center = ParagraphStyle('CellTextCenter', parent=cell_style, alignment=1)
    cell_right = ParagraphStyle('CellTextRight', parent=cell_style, alignment=2)
    cell_right_bold = ParagraphStyle('CellTextRightBold', parent=cell_right, fontName=f"{FONT}-Bold" if FONT == 'Arial' else 'Helvetica-Bold')
    cell_header = ParagraphStyle('CellTextHeader', parent=cell_style, fontName=f"{FONT}-Bold" if FONT == 'Arial' else 'Helvetica-Bold', textColor=colors.white, alignment=1)

    story = []
    
    story.append(Paragraph("BÁO CÁO TỔNG HỢP LỢI NHUẬN DỰ ÁN", title_style))
    
    info_text = f"""
    <b>Dự án:</b> {report['project_name']}<br/>
    <b>Ngày lập báo cáo:</b> {report['generated_at']}<br/>
    <b>Trạng thái:</b> <font color="{'green' if report['profit_flag'] == 'Xanh' else 'red'}"><b>{'AN TOÀN' if report['profit_flag'] == 'Xanh' else 'CẢNH BÁO LỢI NHUẬN THẤP'}</b></font>
    """
    story.append(Paragraph(info_text, info_style))
    story.append(Spacer(1, 10))
    
    # Financial breakdown Table
    story.append(Paragraph("Bảng phân tích kết quả tài chính", section_style))
    
    table_headers = [
        Paragraph("Chỉ tiêu tài chính", cell_header),
        Paragraph("Dự toán (VNĐ)", cell_header),
        Paragraph("Thực tế (VNĐ)", cell_header),
        Paragraph("Tỷ lệ (%)", cell_header)
    ]
    
    direct_exp = sum(report["expenses"][k] for k in ["Vật tư", "Nhân công", "Vận chuyển", "Máy thi công"])
    indirect_exp = sum(report["expenses"][k] for k in ["Quản lý", "Khác"])
    
    table_rows = [
        table_headers,
        # 1. Revenue
        [Paragraph("1. DOANH THU DỰ ÁN", cell_bold), Paragraph(format_currency(report["budget_revenue"]), cell_right), Paragraph(format_currency(report["actual_revenue"]), cell_right), Paragraph("100.0%", cell_right)],
        # 2. Direct cost
        [Paragraph("2. CHI PHÍ TRỰC TIẾP", cell_bold), Paragraph("", cell_right), Paragraph(format_currency(direct_exp), cell_right), Paragraph(f"{(direct_exp/report['actual_revenue']*100):.1f}%" if report['actual_revenue']>0 else "0%", cell_right)],
        [Paragraph("   - Chi phí Vật tư", cell_style), Paragraph("", cell_right), Paragraph(format_currency(report["expenses"]["Vật tư"]), cell_right), Paragraph(f"{(report['expenses']['Vật tư']/report['actual_revenue']*100):.1f}%" if report['actual_revenue']>0 else "0%", cell_right)],
        [Paragraph("   - Chi phí Nhân công", cell_style), Paragraph("", cell_right), Paragraph(format_currency(report["expenses"]["Nhân công"]), cell_right), Paragraph(f"{(report['expenses']['Nhân công']/report['actual_revenue']*100):.1f}%" if report['actual_revenue']>0 else "0%", cell_right)],
        [Paragraph("   - Chi phí Vận chuyển", cell_style), Paragraph("", cell_right), Paragraph(format_currency(report["expenses"]["Vận chuyển"]), cell_right), Paragraph(f"{(report['expenses']['Vận chuyển']/report['actual_revenue']*100):.1f}%" if report['actual_revenue']>0 else "0%", cell_right)],
        [Paragraph("   - Chi phí Máy thi công", cell_style), Paragraph("", cell_right), Paragraph(format_currency(report["expenses"]["Máy thi công"]), cell_right), Paragraph(f"{(report['expenses']['Máy thi công']/report['actual_revenue']*100):.1f}%" if report['actual_revenue']>0 else "0%", cell_right)],
        # 3. Gross profit
        [Paragraph("3. LỢI NHUẬN GỘP", cell_bold), Paragraph("", cell_right), Paragraph(format_currency(report["gross_profit"]), cell_right_bold), Paragraph(f"{report['gross_margin']:.1f}%", cell_right_bold)],
        # 4. Indirect cost
        [Paragraph("4. CHI PHÍ GIÁN TIẾP", cell_bold), Paragraph("", cell_right), Paragraph(format_currency(indirect_exp), cell_right), Paragraph(f"{(indirect_exp/report['actual_revenue']*100):.1f}%" if report['actual_revenue']>0 else "0%", cell_right)],
        [Paragraph("   - Chi phí Quản lý", cell_style), Paragraph("", cell_right), Paragraph(format_currency(report["expenses"]["Quản lý"]), cell_right), Paragraph(f"{(report['expenses']['Quản lý']/report['actual_revenue']*100):.1f}%" if report['actual_revenue']>0 else "0%", cell_right)],
        [Paragraph("   - Chi phí Khác", cell_style), Paragraph("", cell_right), Paragraph(format_currency(report["expenses"]["Khác"]), cell_right), Paragraph(f"{(report['expenses']['Khác']/report['actual_revenue']*100):.1f}%" if report['actual_revenue']>0 else "0%", cell_right)],
        # 5. Net profit
        [Paragraph("5. LỢI NHUẬN RÒNG", cell_bold), Paragraph("", cell_right), Paragraph(format_currency(report["net_profit"]), cell_right_bold), Paragraph(f"{report['net_margin']:.1f}%", cell_right_bold)]
    ]
    
    table_styles = [
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#1F4E79')),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#D3D3D3')),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('BACKGROUND', (0, 7), (-1, 7), colors.HexColor('#BDD7EE')),
        ('BACKGROUND', (0, 11), (-1, 11), colors.HexColor('#BDD7EE')),
    ]
    
    profit_table = Table(table_rows, colWidths=[70*mm, 35*mm, 45*mm, 30*mm])
    profit_table.setStyle(TableStyle(table_styles))
    story.append(profit_table)
    
    story.append(Spacer(1, 15))
    
    # 5. Overrun explanations
    story.append(Paragraph("Phân tích nguyên nhân biến động chi phí và trễ tiến độ", section_style))
    
    if report["overrun_reasons"]:
        reason_box_styles = [
            ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#F8D7DA') if report['profit_flag'] == 'Đỏ' else colors.HexColor('#E2E3E5')),
            ('PADDING', (0,0), (-1,-1), 8),
            ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor('#F5C6CB') if report['profit_flag'] == 'Đỏ' else colors.HexColor('#D6D8DB')),
        ]
        reason_paragraphs = []
        for reason in report["overrun_reasons"]:
            reason_paragraphs.append(Paragraph(f"• {reason}", info_style))
            
        reason_table = Table([[reason_paragraphs]], colWidths=[180*mm])
        reason_table.setStyle(TableStyle(reason_box_styles))
        story.append(reason_table)
    else:
        story.append(Paragraph("Lợi nhuận dự án đạt mức kỳ vọng ban đầu. Không có cảnh báo vượt ngân sách hay trễ tiến độ ảnh hưởng trọng yếu đến kết quả tài chính.", info_style))
        
    # Signatures
    story.append(Spacer(1, 20))
    sig_data = [
        [
            Paragraph("<b>Người phân tích</b><br/><i>(Ký, ghi rõ họ tên)</i>", cell_center),
            Paragraph("<b>Phê duyệt (Ban Giám Đốc)</b><br/><i>(Ký, đóng dấu)</i>", cell_center)
        ]
    ]
    sig_table = Table(sig_data, colWidths=[90*mm, 90*mm])
    sig_table.setStyle(TableStyle([
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ]))
    story.append(sig_table)
    
    def add_page_decorations(canvas, doc):
        canvas.saveState()
        canvas.setFont(f"{FONT}-Italic" if FONT == 'Arial' else 'Helvetica-Oblique', 8)
        canvas.drawString(15*mm, 8*mm, f"Báo cáo phân tích lợi nhuận | {report['project_name']}")
        page_num = canvas.getPageNumber()
        canvas.drawRightString(210*mm - 15*mm, 8*mm, f"Trang {page_num}")
        canvas.restoreState()
        
    doc.build(story, onFirstPage=add_page_decorations, onLaterPages=add_page_decorations)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python profit_calculator.py <project_id>")
        sys.exit(1)
        
    proj_id = sys.argv[1]
    res = analyze_profit(proj_id)
    print(json.dumps(res, ensure_ascii=False))
