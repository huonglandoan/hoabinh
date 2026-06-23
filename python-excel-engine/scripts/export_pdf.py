import os
import sys
import json
from datetime import datetime
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib import colors
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, KeepTogether
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

# Register Arial with Vietnamese Unicode support on macOS
try:
    font_dir = "/System/Library/Fonts/Supplemental"
    pdfmetrics.registerFont(TTFont('Arial', os.path.join(font_dir, 'Arial.ttf')))
    pdfmetrics.registerFont(TTFont('Arial-Bold', os.path.join(font_dir, 'Arial Bold.ttf')))
    pdfmetrics.registerFont(TTFont('Arial-Italic', os.path.join(font_dir, 'Arial Italic.ttf')))
    pdfmetrics.registerFont(TTFont('Arial-BoldItalic', os.path.join(font_dir, 'Arial Bold Italic.ttf')))
    FONT = 'Arial'
except Exception as e:
    print(f"Warning: Could not register system Arial font: {e}. Falling back to Helvetica.", file=sys.stderr)
    FONT = 'Helvetica'

def format_currency(val):
    try:
        return f"{int(val):,}".replace(",", ".")
    except (ValueError, TypeError):
        return str(val)

def format_date_vietnam(date_str):
    if not date_str:
        return 'Chưa cập nhật'
    for fmt in ("%Y-%m-%d", "%d/%m/%Y"):
        try:
            dt = datetime.strptime(date_str.strip(), fmt)
            return dt.strftime("%d/%m/%Y")
        except ValueError:
            continue
    return date_str

def format_datetime_vietnam(dt_str):
    if not dt_str:
        return 'Chưa cập nhật'
    for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%dT%H:%M:%S.%fZ", "%Y-%m-%dT%H:%M:%S"):
        try:
            dt = datetime.strptime(dt_str.strip(), fmt)
            return dt.strftime("%H:%M:%S - %d/%m/%Y")
        except ValueError:
            continue
    return dt_str

def build_pdf(quote_data, out_path):
    # Setup document in Landscape A4
    doc = SimpleDocTemplate(
        out_path,
        pagesize=landscape(A4),
        rightMargin=12*mm,
        leftMargin=12*mm,
        topMargin=15*mm,
        bottomMargin=15*mm
    )
    
    styles = getSampleStyleSheet()
    
    # Custom styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName=f"{FONT}-Bold" if FONT == 'Arial' else 'Helvetica-Bold',
        fontSize=18,
        textColor=colors.HexColor('#1F4E79'),
        spaceAfter=15
    )
    
    info_style = ParagraphStyle(
        'ProjectInfo',
        parent=styles['Normal'],
        fontName=FONT,
        fontSize=9,
        leading=13,
        textColor=colors.HexColor('#333333')
    )
    
    info_bold_style = ParagraphStyle(
        'ProjectInfoBold',
        parent=info_style,
        fontName=f"{FONT}-Bold" if FONT == 'Arial' else 'Helvetica-Bold'
    )
    
    cell_style = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontName=FONT,
        fontSize=8,
        leading=10,
        alignment=0 # Left
    )
    
    cell_center_style = ParagraphStyle(
        'TableCellCenter',
        parent=cell_style,
        alignment=1 # Center
    )
    
    cell_right_style = ParagraphStyle(
        'TableCellRight',
        parent=cell_style,
        alignment=2 # Right
    )
    
    cell_header_style = ParagraphStyle(
        'TableHeader',
        parent=cell_style,
        fontName=f"{FONT}-Bold" if FONT == 'Arial' else 'Helvetica-Bold',
        textColor=colors.white,
        alignment=1 # Center
    )
    
    cell_total_style = ParagraphStyle(
        'TableTotal',
        parent=cell_style,
        fontName=f"{FONT}-Bold" if FONT == 'Arial' else 'Helvetica-Bold',
        alignment=2 # Right
    )

    story = []
    
    # Document Title
    story.append(Paragraph("BẢNG BÁO GIÁ CHI TIẾT CÔNG TRÌNH", title_style))
    
    # Project info layout (Table for absolute alignment)
    proj = quote_data.get("project_info", {})
    client_name = proj.get('client_name') or proj.get('clientName') or 'Chưa cập nhật'
    contractor_name = proj.get('contractor_name') or proj.get('contractorName') or 'Chưa cập nhật'
    
    # Replace "Cty" with "Công ty" in Bên B contractor name for professionalism
    contractor_name = contractor_name.replace("Cty ", "Công ty ")
    
    start_dt = format_date_vietnam(proj.get('start_date', ''))
    end_dt = format_date_vietnam(proj.get('expected_completion_date', ''))
    gen_time = format_datetime_vietnam(quote_data.get('generated_at', ''))
    
    info_data = [
        [Paragraph("<b>Dự án</b>", info_bold_style), Paragraph("<b>:</b>", info_style), Paragraph(proj.get('project_name', ''), info_style)],
        [Paragraph("<b>Địa điểm</b>", info_bold_style), Paragraph("<b>:</b>", info_style), Paragraph(proj.get('location', ''), info_style)],
        [Paragraph("<b>Khách hàng (Bên A)</b>", info_bold_style), Paragraph("<b>:</b>", info_style), Paragraph(client_name, info_style)],
        [Paragraph("<b>Đơn vị thi công (Bên B)</b>", info_bold_style), Paragraph("<b>:</b>", info_style), Paragraph(contractor_name, info_style)],
        [Paragraph("<b>Thời gian thi công</b>", info_bold_style), Paragraph("<b>:</b>", info_style), Paragraph(f"{start_dt} đến {end_dt}", info_style)],
        [Paragraph("<b>Phiên bản</b>", info_bold_style), Paragraph("<b>:</b>", info_style), Paragraph(f"{quote_data.get('version', 'v1')} (Cập nhật lúc: {gen_time})", info_style)]
    ]
    
    info_table = Table(info_data, colWidths=[45*mm, 5*mm, 223*mm])
    info_table.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('PADDING', (0,0), (-1,-1), 1),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3),
    ]))
    story.append(info_table)
    story.append(Spacer(1, 10))
    
    # Table headers (Removed status column)
    headers = [
        Paragraph("STT", cell_header_style),
        Paragraph("Mã HM", cell_header_style),
        Paragraph("Hạng mục công việc", cell_header_style),
        Paragraph("ĐVT", cell_header_style),
        Paragraph("SL", cell_header_style),
        Paragraph("Đơn giá", cell_header_style),
        Paragraph("Thành tiền", cell_header_style)
    ]
    
    table_data = [headers]
    t_styles = [
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#1F4E79')),
        ('ALIGN', (0,0), (-1,0), 'CENTER'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#D3D3D3')),
    ]
    
    current_row = 1
    stt = 1
    
    # Colors
    color_zebra = colors.HexColor('#EBF3FB')
    
    for item in quote_data.get("items", []):
        bg_color = color_zebra if stt % 2 == 0 else colors.white
        status = item.get("approval_status", "Chờ duyệt")
        if status == "Đã loại bỏ":
            continue # Don't print removed items to client quote PDF!
            
        name_val = item.get("item_name", "")
        if item.get("is_extra"):
            name_val += " (Phát sinh)"
            
        row_cells = [
            Paragraph(str(stt), cell_center_style),
            Paragraph(item.get("item_code", ""), cell_center_style),
            Paragraph(name_val, cell_style),
            Paragraph(item.get("unit", ""), cell_center_style),
            Paragraph(format_currency(item.get("quoted_quantity", 0)), cell_right_style),
            Paragraph(format_currency(item.get("original_unit_price", 0)), cell_right_style),
            Paragraph(format_currency(item.get("amount", 0)), cell_right_style)
        ]
        table_data.append(row_cells)
        
        # Apply backgrounds
        for c in range(7):
            t_styles.append(('BACKGROUND', (c, current_row), (c, current_row), bg_color))
            
        current_row += 1
        stt += 1
        
    # Total row
    subtotal = quote_data.get("subtotal")
    if subtotal is None:
        subtotal = sum(
            item.get("amount", 0) for item in quote_data.get("items", []) if item.get("approval_status") != "Đã loại bỏ"
        )
    
    proj = quote_data.get("project_info", {})
    vat_percent = float(proj.get("vat_percent") or quote_data.get("vat_percent") or 0)
    
    if vat_percent > 0:
        # Cộng tiền hàng
        subtotal_row = current_row
        subtotal_cells = [Paragraph("<b>Cộng tiền hàng (VND)</b>", cell_total_style)] + [Paragraph("", cell_style)] * 5
        subtotal_cells.append(Paragraph(f"<b>{format_currency(subtotal)}</b>", cell_total_style))
        table_data.append(subtotal_cells)
        t_styles.extend([
            ('SPAN', (0, subtotal_row), (5, subtotal_row)),
            ('BACKGROUND', (0, subtotal_row), (-1, subtotal_row), colors.HexColor('#F8FAFC')),
        ])
        current_row += 1
        
        # Thuế VAT
        vat_amount = subtotal * (vat_percent / 100.0)
        vat_row = current_row
        vat_cells = [Paragraph(f"<b>Thuế VAT ({int(vat_percent) if vat_percent.is_integer() else vat_percent}%)</b>", cell_total_style)] + [Paragraph("", cell_style)] * 5
        vat_cells.append(Paragraph(f"<b>{format_currency(vat_amount)}</b>", cell_total_style))
        table_data.append(vat_cells)
        t_styles.extend([
            ('SPAN', (0, vat_row), (5, vat_row)),
            ('BACKGROUND', (0, vat_row), (-1, vat_row), colors.HexColor('#F8FAFC')),
        ])
        current_row += 1
        
    # Tổng giá trị hợp đồng
    total_row = current_row
    total_val = subtotal * (1 + vat_percent / 100.0) if vat_percent > 0 else subtotal
    total_cells = [Paragraph("<b>TỔNG GIÁ TRỊ HỢP ĐỒNG (VND)</b>", cell_total_style)] + [Paragraph("", cell_style)] * 5
    total_cells.append(Paragraph(f"<b>{format_currency(total_val)}</b>", cell_total_style))
    table_data.append(total_cells)
    t_styles.extend([
        ('SPAN', (0, total_row), (5, total_row)),
        ('BACKGROUND', (0, total_row), (-1, total_row), colors.HexColor('#BDD7EE')),
    ])
    
    # Calculate column widths (Landscape A4 width = 297mm, margins = 24mm, available = 273mm)
    col_widths = [
        10*mm,   # STT
        22*mm,  # Mã HM
        125*mm, # Tên hạng mục (stretched by 25mm since Status column is removed)
        15*mm,  # ĐVT
        23*mm,  # SL
        33*mm,  # Đơn giá
        45*mm   # Thành tiền
    ]
    # Total = 10+22+125+15+23+33+45 = 273mm exactly.
    
    table = Table(table_data, colWidths=col_widths, repeatRows=1)
    table.setStyle(TableStyle(t_styles))
    story.append(table)
    
    # Draw signatures block
    story.append(Spacer(1, 15))
    
    sig_data = [
        [
            Paragraph("<b>Đại diện Bên B</b><br/><i>(Ký và ghi rõ họ tên)</i>", cell_center_style),
            Paragraph("<b>Đại diện Bên A</b><br/><i>(Ký và ghi rõ họ tên)</i>", cell_center_style)
        ]
    ]
    sig_table = Table(sig_data, colWidths=[136*mm, 136*mm])
    sig_table.setStyle(TableStyle([
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ]))
    story.append(sig_table)
    
    # Page template setup for footer
    def add_page_number(canvas, doc):
        canvas.saveState()
        canvas.setFont(f"{FONT}-Italic" if FONT == 'Arial' else 'Helvetica-Oblique', 8)
        canvas.drawString(12*mm, 8*mm, f"Báo cáo Báo giá Chi tiết | Hệ thống Quản lý T3")
        page_num = canvas.getPageNumber()
        canvas.drawRightString(297*mm - 12*mm, 8*mm, f"Trang {page_num}")
        canvas.restoreState()
        
    doc.build(story, onFirstPage=add_page_number, onLaterPages=add_page_number)

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python export_pdf.py <quote_json_path> <out_pdf_path>")
        sys.exit(1)
    with open(sys.argv[1], 'r', encoding='utf-8') as f:
        data = json.load(f)
    build_pdf(data, sys.argv[2])
    print(f"PDF exported to {sys.argv[2]}")
