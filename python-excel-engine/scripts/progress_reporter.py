import os
import sys
import json
import csv
from datetime import datetime
import openpyxl
from openpyxl.formatting.rule import CellIsRule
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib import colors
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

# Import styling tokens
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from core_excel_utils import (
    apply_header_style,
    apply_data_style,
    apply_total_style,
    autofit_column_widths,
    FMT_CURRENCY,
    FMT_DATE,
    FMT_PERCENT,
    COLOR_ZEBRA_BG
)

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

def process_progress(site_log_path, plan_path, unit_prices_path=None, today_str=None, yellow_days=3, red_days=7, project_id=None):
    # Load plan
    with open(plan_path, 'r', encoding='utf-8') as f:
        plan_data = json.load(f)
        
    # Load site log
    with open(site_log_path, 'r', encoding='utf-8') as f:
        site_log = json.load(f)
        
    # Load unit prices
    unit_prices = {}
    if unit_prices_path and os.path.exists(unit_prices_path):
        with open(unit_prices_path, 'r', encoding='utf-8') as f:
            unit_prices = json.load(f)
            
    # Set reference date
    if not today_str:
        today = datetime.now()
    else:
        try:
            today = datetime.strptime(today_str, "%Y-%m-%d")
        except ValueError:
            today = datetime.now()
            
    warnings = []
    project_info = plan_data.get("project_info", {})
    plan_items = plan_data.get("items", [])
    milestones = plan_data.get("milestones", [])
    log_items = site_log.get("items", [])
    
    # Map site log items by item_code
    log_map = {item.get("item_code"): item for item in log_items if item.get("item_code")}
    
    # Match items
    processed_items = []
    milestone_items_map = {}
    
    for p_item in plan_items:
        code = p_item.get("item_code")
        if not code:
            warnings.append(f"Kế hoạch có hạng mục thiếu mã code: {p_item.get('item_name')}")
            continue
            
        log = log_map.get(code, {})
        actual_qty = float(log.get("actual_quantity") or 0)
        planned_qty = float(p_item.get("planned_quantity") or 0)
        variance_qty = actual_qty - planned_qty
        
        # Percent complete
        pct_complete = 0.0
        if planned_qty > 0:
            pct_complete = actual_qty / planned_qty
            
        # Planned / Actual Dates
        planned_start = p_item.get("planned_start_date")
        planned_end = p_item.get("planned_end_date")
        actual_start = log.get("actual_start_date")
        actual_end = log.get("actual_end_date")
        
        # Calculate delay days
        delay_days = 0
        if actual_end:
            # Item is completed, compare completion date with plan
            try:
                a_end = datetime.strptime(actual_end, "%Y-%m-%d")
                p_end = datetime.strptime(planned_end, "%Y-%m-%d")
                delay_days = (a_end - p_end).days
            except ValueError:
                pass
        else:
            # Item is active / not completed, compare reference today date with plan if today is past plan
            if planned_end:
                try:
                    p_end = datetime.strptime(planned_end, "%Y-%m-%d")
                    if today > p_end:
                        delay_days = (today - p_end).days
                except ValueError:
                    pass
                    
        # Delay days cannot be negative for warning purposes
        delay_days = max(delay_days, 0)
        
        # Flagging
        flag = "Xanh"
        if delay_days > yellow_days:
            flag = "Đỏ"
        elif delay_days > 0:
            flag = "Vàng"
            
        # Pricing & Earned Value
        price = float(unit_prices.get(code) or 0)
        planned_value = planned_qty * price
        earned_value = actual_qty * price
        
        item_data = {
            "item_code": code,
            "item_name": p_item.get("item_name", ""),
            "unit": p_item.get("unit", ""),
            "milestone_name": p_item.get("milestone_name", ""),
            "planned_quantity": planned_qty,
            "actual_quantity": actual_qty,
            "variance_quantity": variance_qty,
            "percent_complete": pct_complete * 100,
            "planned_start_date": planned_start,
            "planned_end_date": planned_end,
            "actual_start_date": actual_start,
            "actual_end_date": actual_end,
            "delay_days": delay_days,
            "flag": flag,
            "site_notes": log.get("site_notes", ""),
            "delay_reason": log.get("delay_reason", "") if flag != "Xanh" else "",
            "unit_price": price,
            "planned_value": planned_value,
            "earned_value": earned_value
        }
        
        processed_items.append(item_data)
        
        # Group by milestone
        m_name = item_data["milestone_name"] or "Không phân nhóm"
        if m_name not in milestone_items_map:
            milestone_items_map[m_name] = []
        milestone_items_map[m_name].append(item_data)
        
    # Check if there are log codes not in plan
    plan_codes = {item.get("item_code") for item in plan_items}
    for log_code in log_map:
        if log_code not in plan_codes:
            warnings.append(f"Mã hiện trường {log_code} không khớp với bất kỳ hạng mục nào trong kế hoạch.")
            
    # Process Milestones summaries
    processed_milestones = []
    for m in milestones:
        m_name = m.get("milestone_name")
        m_items = milestone_items_map.get(m_name, [])
        
        m_planned_qty = sum(item["planned_quantity"] for item in m_items)
        m_actual_qty = sum(item["actual_quantity"] for item in m_items)
        m_pct = 0.0
        if m_planned_qty > 0:
            m_pct = (m_actual_qty / m_planned_qty) * 100
            
        m_pv = sum(item["planned_value"] for item in m_items)
        m_ev = sum(item["earned_value"] for item in m_items)
        
        # Worst flag propagation
        m_flag = "Xanh"
        max_delay = 0
        for item in m_items:
            max_delay = max(max_delay, item["delay_days"])
            if item["flag"] == "Đỏ":
                m_flag = "Đỏ"
            elif item["flag"] == "Vàng" and m_flag != "Đỏ":
                m_flag = "Vàng"
                
        processed_milestones.append({
            "milestone_name": m_name,
            "planned_end_date": m.get("planned_end_date"),
            "percent_complete": m_pct,
            "flag": m_flag,
            "max_delay_days": max_delay,
            "item_count": len(m_items),
            "planned_value": m_pv,
            "earned_value": m_ev
        })
        
    # Delayed items list (Yellow & Red) sorted by delay_days desc
    delayed_items = [item for item in processed_items if item["flag"] in ("Vàng", "Đỏ")]
    delayed_items.sort(key=lambda x: x["delay_days"], reverse=True)
    
    # Project Aggregations
    total_planned = sum(item["planned_quantity"] for item in processed_items)
    total_actual = sum(item["actual_quantity"] for item in processed_items)
    
    # Quantities completion rate
    project_pct_complete = 0.0
    if total_planned > 0:
        project_pct_complete = (total_actual / total_planned) * 100
        
    # Value Aggregations
    total_planned_value = sum(item["planned_value"] for item in processed_items)
    total_earned_value = sum(item["earned_value"] for item in processed_items)
    
    # SPI simple metric
    spi_like = 0.0
    if total_planned_value > 0:
        spi_like = total_earned_value / total_planned_value
        
    report = {
        "project_info": project_info,
        "as_of_date": today.strftime("%Y-%m-%d"),
        "items": processed_items,
        "milestones": processed_milestones,
        "delayed_items": [{
            "item_code": x["item_code"],
            "item_name": x["item_name"],
            "milestone_name": x["milestone_name"],
            "delay_days": x["delay_days"],
            "flag": x["flag"],
            "delay_reason": x["delay_reason"]
        } for x in delayed_items],
        "project_percent_complete": project_pct_complete,
        "total_planned_value": total_planned_value,
        "total_earned_value": total_earned_value,
        "spi_like": spi_like,
        "thresholds": {"yellow_days": yellow_days, "red_days": red_days},
        "warnings": warnings,
        "generated_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    }
    
    project_id = project_id or project_info.get("project_name", "temp_project").replace(" ", "_")
    
    # Setup directories (absolute paths)
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(os.path.dirname(script_dir))
    data_dir = os.path.join(project_root, "data")
    
    master_dir = os.path.join(data_dir, "master", project_id)
    exports_dir = os.path.join(data_dir, "exports", project_id, "progress")
    os.makedirs(master_dir, exist_ok=True)
    os.makedirs(exports_dir, exist_ok=True)
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    
    # Save exports JSON
    export_json_path = os.path.join(exports_dir, f"TienDo_{project_id}_{timestamp}.json")
    with open(export_json_path, 'w', encoding='utf-8') as f:
        json.dump(report, f, ensure_ascii=False, indent=4)
        
    # Save master JSON
    master_json_path = os.path.join(master_dir, "progress_report.json")
    with open(master_json_path, 'w', encoding='utf-8') as f:
        json.dump(report, f, ensure_ascii=False, indent=4)
        
    result = {
        "output_file_path": export_json_path,
        "master_file_path": master_json_path,
        "project_percent_complete": project_pct_complete,
        "delayed_items_count": len(delayed_items),
        "warnings": warnings,
        "project_id": project_id
    }
    return result

def build_excel_dashboard(progress_data, out_path):
    wb = openpyxl.Workbook()
    
    # 1. Sheet "Dashboard"
    ws1 = wb.active
    ws1.title = "Dashboard"
    ws1.views.sheetView[0].showGridLines = True
    
    proj = progress_data.get("project_info", {})
    as_of = progress_data.get("as_of_date", "")
    pct = progress_data.get("project_percent_complete", 0)
    ev = progress_data.get("total_earned_value", 0)
    pv = progress_data.get("total_planned_value", 0)
    spi = progress_data.get("spi_like", 0)
    
    # Title
    ws1['A1'] = "DASHBOARD TIẾN ĐỘ THI CÔNG"
    ws1['A1'].font = Font(name="Arial", size=16, bold=True, color="1F4E79")
    
    ws1['A3'] = "Dự án:"
    ws1['B3'] = proj.get("project_name", "")
    ws1['A4'] = "Thời điểm:"
    ws1['B4'] = as_of
    ws1['A5'] = "% Hoàn thành dự án:"
    ws1['B5'] = f"{pct:.1f}%"
    
    for r in range(3, 6):
        ws1[f'A{r}'].font = Font(name="Arial", size=10, bold=True)
        ws1[f'B{r}'].font = Font(name="Arial", size=10)
        
    if pv > 0:
        ws1['D3'] = "Tổng PV (Kế hoạch):"
        ws1['E3'] = ev
        ws1['E3'].number_format = FMT_CURRENCY
        ws1['D4'] = "Tổng EV (Thực tế đạt):"
        ws1['E4'] = ev
        ws1['E4'].number_format = FMT_CURRENCY
        ws1['D5'] = "Chỉ số Tiến độ (EV/PV):"
        ws1['E5'] = f"{spi:.2f}"
        
        for r in range(3, 6):
            ws1[f'D{r}'].font = Font(name="Arial", size=10, bold=True)
            ws1[f'E{r}'].font = Font(name="Arial", size=10)
            
    # Milestones Summary Table at Row 8
    ws1['A8'] = "TRẠNG THÁI CÁC MỐC TIẾN ĐỘ"
    ws1['A8'].font = Font(name="Arial", size=11, bold=True, color="1F4E79")
    
    headers_ms = ["Tên mốc tiến độ", "Hạn hoàn thành", "% Xong", "Cảnh báo", "Trễ max (ngày)", "Số HM"]
    for col_idx, text in enumerate(headers_ms, 1):
        cell = ws1.cell(row=9, column=col_idx)
        cell.value = text
        apply_header_style(cell)
        
    r_idx = 10
    for ms in progress_data.get("milestones", []):
        ws1.cell(row=r_idx, column=1, value=ms["milestone_name"])
        ws1.cell(row=r_idx, column=2, value=ms["planned_end_date"])
        ws1.cell(row=r_idx, column=3, value=ms["percent_complete"] / 100.0)
        ws1.cell(row=r_idx, column=4, value=ms["flag"])
        ws1.cell(row=r_idx, column=5, value=ms["max_delay_days"])
        ws1.cell(row=r_idx, column=6, value=ms["item_count"])
        
        # Styles
        for c in range(1, 7):
            cell = ws1.cell(row=r_idx, column=c)
            apply_data_style(cell)
            if c in (2, 4):
                cell.alignment = Alignment(horizontal="center", vertical="center")
            elif c == 3:
                cell.number_format = FMT_PERCENT
                cell.alignment = Alignment(horizontal="right", vertical="center")
            elif c in (5, 6):
                cell.alignment = Alignment(horizontal="right", vertical="center")
                
        # Fill colors for flag
        flag_cell = ws1.cell(row=r_idx, column=4)
        if ms["flag"] == "Đỏ":
            flag_cell.fill = PatternFill(start_color="FFC7CE", end_color="FFC7CE", fill_type="solid")
            flag_cell.font = Font(name="Arial", size=10, color="9C0006", bold=True)
        elif ms["flag"] == "Vàng":
            flag_cell.fill = PatternFill(start_color="FFEB9C", end_color="FFEB9C", fill_type="solid")
            flag_cell.font = Font(name="Arial", size=10, color="9C6500", bold=True)
        else:
            flag_cell.fill = PatternFill(start_color="C6EFCE", end_color="C6EFCE", fill_type="solid")
            flag_cell.font = Font(name="Arial", size=10, color="006100", bold=True)
            
        r_idx += 1
        
    # Delayed Items Table at r_idx + 2
    r_idx += 2
    ws1.cell(row=r_idx, column=1, value="DANH SÁCH CÁC HẠNG MỤC BỊ CHẬM TIẾN ĐỘ").font = Font(name="Arial", size=11, bold=True, color="1F4E79")
    
    r_idx += 1
    headers_del = ["Mã hạng mục", "Tên hạng mục", "Mốc tiến độ", "Số ngày trễ", "Cảnh báo", "Lý do chậm trễ"]
    for col_idx, text in enumerate(headers_del, 1):
        cell = ws1.cell(row=r_idx, column=col_idx)
        cell.value = text
        apply_header_style(cell)
        
    r_idx += 1
    delayed_items = progress_data.get("delayed_items", [])
    if not delayed_items:
        ws1.cell(row=r_idx, column=1, value="Không có hạng mục nào trễ tiến độ.")
        ws1.merge_cells(start_row=r_idx, start_column=1, end_row=r_idx, end_column=6)
        ws1.cell(row=r_idx, column=1).font = Font(name="Arial", size=10, italic=True)
        ws1.cell(row=r_idx, column=1).alignment = Alignment(horizontal="center")
    else:
        for item in delayed_items:
            ws1.cell(row=r_idx, column=1, value=item["item_code"])
            ws1.cell(row=r_idx, column=2, value=item["item_name"])
            ws1.cell(row=r_idx, column=3, value=item["milestone_name"])
            ws1.cell(row=r_idx, column=4, value=item["delay_days"])
            ws1.cell(row=r_idx, column=5, value=item["flag"])
            ws1.cell(row=r_idx, column=6, value=item["delay_reason"])
            
            for c in range(1, 7):
                cell = ws1.cell(row=r_idx, column=c)
                apply_data_style(cell)
                if c in (1, 5):
                    cell.alignment = Alignment(horizontal="center", vertical="center")
                elif c == 4:
                    cell.alignment = Alignment(horizontal="right", vertical="center")
                    
            flag_cell = ws1.cell(row=r_idx, column=5)
            if item["flag"] == "Đỏ":
                flag_cell.fill = PatternFill(start_color="FFC7CE", end_color="FFC7CE", fill_type="solid")
                flag_cell.font = Font(name="Arial", size=10, color="9C0006", bold=True)
            else:
                flag_cell.fill = PatternFill(start_color="FFEB9C", end_color="FFEB9C", fill_type="solid")
                flag_cell.font = Font(name="Arial", size=10, color="9C6500", bold=True)
                
            r_idx += 1
            
    autofit_column_widths(ws1, padding=3)
    
    # 2. Sheet "Chi tiet hang muc"
    ws2 = wb.create_sheet(title="Chi_Tiet_Hang_Muc")
    ws2.views.sheetView[0].showGridLines = True
    
    ws2['A1'] = "CHI TIẾT TIẾN ĐỘ THI CÔNG HẠNG MỤC"
    ws2['A1'].font = Font(name="Arial", size=14, bold=True, color="1F4E79")
    
    headers_det = [
        "STT", "Mã HM", "Hạng mục công việc", "ĐVT", "Mốc tiến độ",
        "SL Kế hoạch", "SL Thực tế", "Chênh lệch SL", "% Đạt",
        "Kế hoạch Bắt đầu", "Kế hoạch Kết thúc", "Thực tế Bắt đầu", "Thực tế Kết thúc",
        "Số ngày trễ", "Cờ cảnh báo", "Ghi chú hiện trường", "Nguyên nhân trễ"
    ]
    
    for col_idx, text in enumerate(headers_det, 1):
        cell = ws2.cell(row=3, column=col_idx)
        cell.value = text
        apply_header_style(cell)
        
    r_idx = 4
    for idx, item in enumerate(progress_data.get("items", []), 1):
        ws2.cell(row=r_idx, column=1, value=idx)
        ws2.cell(row=r_idx, column=2, value=item["item_code"])
        ws2.cell(row=r_idx, column=3, value=item["item_name"])
        ws2.cell(row=r_idx, column=4, value=item["unit"])
        ws2.cell(row=r_idx, column=5, value=item["milestone_name"])
        ws2.cell(row=r_idx, column=6, value=item["planned_quantity"])
        ws2.cell(row=r_idx, column=7, value=item["actual_quantity"])
        
        # Excel formulas:
        # Chênh lệch = G (Actual) - F (Planned)
        ws2.cell(row=r_idx, column=8, value=f"=G{r_idx}-F{r_idx}")
        # % Đạt = G (Actual) / F (Planned)
        ws2.cell(row=r_idx, column=9, value=f"=IF(F{r_idx}>0, G{r_idx}/F{r_idx}, 0)")
        
        ws2.cell(row=r_idx, column=10, value=item["planned_start_date"])
        ws2.cell(row=r_idx, column=11, value=item["planned_end_date"])
        ws2.cell(row=r_idx, column=12, value=item["actual_start_date"])
        ws2.cell(row=r_idx, column=13, value=item["actual_end_date"])
        ws2.cell(row=r_idx, column=14, value=item["delay_days"])
        ws2.cell(row=r_idx, column=15, value=item["flag"])
        ws2.cell(row=r_idx, column=16, value=item["site_notes"])
        ws2.cell(row=r_idx, column=17, value=item["delay_reason"])
        
        # Zebra check
        bg_zebra = COLOR_ZEBRA_BG if idx % 2 == 0 else None
        
        for c in range(1, 18):
            cell = ws2.cell(row=r_idx, column=c)
            apply_data_style(cell, bg_color=bg_zebra)
            
            # Formats
            if c in (1, 2, 4, 10, 11, 12, 13, 15):
                cell.alignment = Alignment(horizontal="center", vertical="center")
            elif c in (6, 7, 8, 14):
                cell.alignment = Alignment(horizontal="right", vertical="center")
                cell.number_format = FMT_CURRENCY
            elif c == 9:
                cell.alignment = Alignment(horizontal="right", vertical="center")
                cell.number_format = FMT_PERCENT
                
        r_idx += 1
        
    # Total Row
    total_row = r_idx
    ws2.merge_cells(f"A{total_row}:E{total_row}")
    ws2.cell(row=total_row, column=1, value="TỔNG CỘNG").alignment = Alignment(horizontal="right", vertical="center")
    apply_total_style(ws2.cell(row=total_row, column=1))
    
    for c in range(2, 6):
        apply_total_style(ws2.cell(row=total_row, column=c))
        
    # Sum formulas
    # Total planned
    ws2.cell(row=total_row, column=6, value=f"=SUM(F4:F{total_row-1})").number_format = FMT_CURRENCY
    apply_total_style(ws2.cell(row=total_row, column=6))
    # Total actual
    ws2.cell(row=total_row, column=7, value=f"=SUM(G4:G{total_row-1})").number_format = FMT_CURRENCY
    apply_total_style(ws2.cell(row=total_row, column=7))
    # Total variance
    ws2.cell(row=total_row, column=8, value=f"=G{total_row}-F{total_row}").number_format = FMT_CURRENCY
    apply_total_style(ws2.cell(row=total_row, column=8))
    # Overall percent complete
    ws2.cell(row=total_row, column=9, value=f"=IF(F{total_row}>0, G{total_row}/F{total_row}, 0)").number_format = FMT_PERCENT
    apply_total_style(ws2.cell(row=total_row, column=9))
    
    for c in range(10, 18):
        apply_total_style(ws2.cell(row=total_row, column=c))
        
    # DYNAMIC CONDITIONAL FORMATTING
    # Red fill when Flag is "Đỏ"
    red_fill = PatternFill(start_color='FFC7CE', end_color='FFC7CE', fill_type='solid')
    red_font = Font(name="Arial", size=10, color="9C0006", bold=True)
    
    yellow_fill = PatternFill(start_color='FFEB9C', end_color='FFEB9C', fill_type='solid')
    yellow_font = Font(name="Arial", size=10, color="9C6500", bold=True)
    
    green_fill = PatternFill(start_color='C6EFCE', end_color='C6EFCE', fill_type='solid')
    green_font = Font(name="Arial", size=10, color="006100", bold=True)
    
    ws2.conditional_formatting.add(
        f'O4:O{total_row-1}',
        CellIsRule(operator='equal', formula=['"Đỏ"'], stopIfTrue=True, fill=red_fill, font=red_font)
    )
    ws2.conditional_formatting.add(
        f'O4:O{total_row-1}',
        CellIsRule(operator='equal', formula=['"Vàng"'], stopIfTrue=True, fill=yellow_fill, font=yellow_font)
    )
    ws2.conditional_formatting.add(
        f'O4:O{total_row-1}',
        CellIsRule(operator='equal', formula=['"Xanh"'], stopIfTrue=True, fill=green_fill, font=green_font)
    )
    
    # Conditional format for negative variance (Col H) -> light red fill
    ws2.conditional_formatting.add(
        f'H4:H{total_row-1}',
        CellIsRule(operator='lessThan', formula=['0'], stopIfTrue=True, fill=red_fill, font=red_font)
    )
    
    # Columns manual widths forDetails sheet
    det_widths = {
        'A': 5, 'B': 10, 'C': 35, 'D': 8, 'E': 20, 'F': 12, 'G': 12, 'H': 15, 'I': 10,
        'J': 15, 'K': 15, 'L': 15, 'M': 15, 'N': 12, 'O': 15, 'P': 25, 'Q': 25
    }
    autofit_column_widths(ws2, padding=3, manual_widths=det_widths)
    
    wb.save(out_path)

def build_pdf_report(progress_data, out_path):
    doc = SimpleDocTemplate(
        out_path,
        pagesize=landscape(A4),
        rightMargin=12*mm,
        leftMargin=12*mm,
        topMargin=15*mm,
        bottomMargin=15*mm
    )
    
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName=f"{FONT}-Bold" if FONT == 'Arial' else 'Helvetica-Bold',
        fontSize=18,
        textColor=colors.HexColor('#1F4E79'),
        spaceAfter=10
    )
    section_style = ParagraphStyle(
        'SectionTitle',
        parent=styles['Heading2'],
        fontName=f"{FONT}-Bold" if FONT == 'Arial' else 'Helvetica-Bold',
        fontSize=12,
        textColor=colors.HexColor('#1F4E79'),
        spaceBefore=10,
        spaceAfter=5
    )
    info_style = ParagraphStyle(
        'ProjectInfo',
        parent=styles['Normal'],
        fontName=FONT,
        fontSize=9,
        leading=13,
        textColor=colors.HexColor('#333333')
    )
    cell_style = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontName=FONT,
        fontSize=8,
        leading=9
    )
    cell_center_style = ParagraphStyle(
        'TableCellCenter',
        parent=cell_style,
        alignment=1
    )
    cell_right_style = ParagraphStyle(
        'TableCellRight',
        parent=cell_style,
        alignment=2
    )
    cell_header_style = ParagraphStyle(
        'TableHeader',
        parent=cell_style,
        fontName=f"{FONT}-Bold" if FONT == 'Arial' else 'Helvetica-Bold',
        textColor=colors.white,
        alignment=1
    )
    cell_total_style = ParagraphStyle(
        'TableTotal',
        parent=cell_style,
        fontName=f"{FONT}-Bold" if FONT == 'Arial' else 'Helvetica-Bold',
        alignment=2
    )

    story = []
    
    # Page 1: Overview & Milestones
    story.append(Paragraph("BÁO CÁO TIẾN ĐỘ THI CÔNG", title_style))
    
    proj = progress_data.get("project_info", {})
    as_of = progress_data.get("as_of_date", "")
    pct = progress_data.get("project_percent_complete", 0)
    
    info_text = f"""
    <b>Dự án:</b> {proj.get('project_name', '')}<br/>
    <b>Báo cáo ngày:</b> {as_of}<br/>
    <b>% Hoàn thành toàn dự án:</b> {pct:.1f}%<br/>
    """
    story.append(Paragraph(info_text, info_style))
    story.append(Spacer(1, 10))
    
    story.append(Paragraph("Trạng thái các mốc tiến độ (Milestones)", section_style))
    
    ms_headers = [
        Paragraph("Tên mốc tiến độ", cell_header_style),
        Paragraph("Hạn hoàn thành", cell_header_style),
        Paragraph("% Đạt", cell_header_style),
        Paragraph("Cảnh báo", cell_header_style),
        Paragraph("Trễ max (ngày)", cell_header_style),
        Paragraph("Số hạng mục", cell_header_style)
    ]
    
    ms_data = [ms_headers]
    ms_styles = [
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#1F4E79')),
        ('ALIGN', (0,0), (-1,0), 'CENTER'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#D3D3D3')),
    ]
    
    r_idx = 1
    color_approved = colors.HexColor('#D4EDDA')
    color_pending = colors.HexColor('#FFF3CD')
    color_rejected = colors.HexColor('#F8D7DA')
    color_zebra = colors.HexColor('#EBF3FB')
    
    for ms in progress_data.get("milestones", []):
        bg = color_zebra if r_idx % 2 == 0 else colors.white
        flag = ms["flag"]
        
        row = [
            Paragraph(ms["milestone_name"], cell_style),
            Paragraph(ms["planned_end_date"] or "", cell_center_style),
            Paragraph(f"{ms['percent_complete']:.1f}%", cell_right_style),
            Paragraph(flag, cell_center_style),
            Paragraph(str(ms["max_delay_days"]), cell_right_style),
            Paragraph(str(ms["item_count"]), cell_right_style),
        ]
        ms_data.append(row)
        
        # Color row details except flag
        for c in (0, 1, 2, 4, 5):
            ms_styles.append(('BACKGROUND', (c, r_idx), (c, r_idx), bg))
            
        # Color flag block
        flag_bg = color_approved
        if flag == "Đỏ":
            flag_bg = color_rejected
        elif flag == "Vàng":
            flag_bg = color_pending
            
        ms_styles.append(('BACKGROUND', (3, r_idx), (3, r_idx), flag_bg))
        r_idx += 1
        
    ms_table = Table(ms_data, colWidths=[90*mm, 35*mm, 25*mm, 30*mm, 30*mm, 30*mm])
    ms_table.setStyle(TableStyle(ms_styles))
    story.append(ms_table)
    
    story.append(Spacer(1, 15))
    
    # Delayed list
    story.append(Paragraph("Danh sách các hạng mục chậm tiến độ", section_style))
    
    del_headers = [
        Paragraph("Mã HM", cell_header_style),
        Paragraph("Tên hạng mục công việc", cell_header_style),
        Paragraph("Mốc tiến độ", cell_header_style),
        Paragraph("Số ngày trễ", cell_header_style),
        Paragraph("Nguyên nhân chậm trễ", cell_header_style)
    ]
    del_data = [del_headers]
    del_styles = [
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#1F4E79')),
        ('ALIGN', (0,0), (-1,0), 'CENTER'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#D3D3D3')),
    ]
    
    delayed = progress_data.get("delayed_items", [])
    if not delayed:
        del_data.append([Paragraph("Không có hạng mục nào trễ tiến độ.", cell_center_style)] + [Paragraph("", cell_style)]*4)
        del_styles.append(('SPAN', (0,1), (4,1)))
    else:
        d_idx = 1
        for item in delayed:
            bg = color_zebra if d_idx % 2 == 0 else colors.white
            del_data.append([
                Paragraph(item["item_code"], cell_center_style),
                Paragraph(item["item_name"], cell_style),
                Paragraph(item["milestone_name"], cell_style),
                Paragraph(f"{item['delay_days']} ngày ({item['flag']})", cell_center_style),
                Paragraph(item["delay_reason"] or "Chưa cập nhật lý do", cell_style)
            ])
            
            # Colors
            row_color = color_rejected if item["flag"] == "Đỏ" else color_pending
            for c in range(5):
                del_styles.append(('BACKGROUND', (c, d_idx), (c, d_idx), bg))
            del_styles.append(('BACKGROUND', (3, d_idx), (3, d_idx), row_color))
            d_idx += 1
            
    del_table = Table(del_data, colWidths=[20*mm, 80*mm, 50*mm, 40*mm, 80*mm])
    del_table.setStyle(TableStyle(del_styles))
    story.append(del_table)
    
    # Page 2: Detailed items table
    story.append(PageBreak())
    story.append(Paragraph("BẢNG TIẾN ĐỘ CHI TIẾT HẠNG MỤC CÔNG TRÌNH", title_style))
    
    det_headers = [
        Paragraph("STT", cell_header_style),
        Paragraph("Mã HM", cell_header_style),
        Paragraph("Hạng mục công việc", cell_header_style),
        Paragraph("ĐVT", cell_header_style),
        Paragraph("Kế hoạch", cell_header_style),
        Paragraph("Thực tế", cell_header_style),
        Paragraph("Lệch", cell_header_style),
        Paragraph("% Đạt", cell_header_style),
        Paragraph("Hạn kế hoạch", cell_header_style),
        Paragraph("Thực tế xong", cell_header_style),
        Paragraph("Trễ", cell_header_style),
        Paragraph("Cờ", cell_header_style),
        Paragraph("Ghi chú hiện trường", cell_header_style)
    ]
    det_data = [det_headers]
    det_styles = [
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#1F4E79')),
        ('ALIGN', (0,0), (-1,0), 'CENTER'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#D3D3D3')),
    ]
    
    idx = 1
    for item in progress_data.get("items", []):
        bg = color_zebra if idx % 2 == 0 else colors.white
        flag = item["flag"]
        
        row = [
            Paragraph(str(idx), cell_center_style),
            Paragraph(item["item_code"], cell_center_style),
            Paragraph(item["item_name"], cell_style),
            Paragraph(item["unit"], cell_center_style),
            Paragraph(format_currency(item["planned_quantity"]), cell_right_style),
            Paragraph(format_currency(item["actual_quantity"]), cell_right_style),
            Paragraph(format_currency(item["variance_quantity"]), cell_right_style),
            Paragraph(f"{item['percent_complete']:.1f}%", cell_right_style),
            Paragraph(item["planned_end_date"] or "", cell_center_style),
            Paragraph(item["actual_end_date"] or "", cell_center_style),
            Paragraph(str(item["delay_days"]), cell_right_style),
            Paragraph(flag, cell_center_style),
            Paragraph(item["site_notes"] or "", cell_style),
        ]
        det_data.append(row)
        
        # Grid styles
        for c in range(13):
            if c != 11:
                det_styles.append(('BACKGROUND', (c, idx), (c, idx), bg))
                
        # Var qty highlight if negative
        if item["variance_quantity"] < 0:
            det_styles.append(('BACKGROUND', (6, idx), (6, idx), color_rejected))
            
        # Flag color
        f_color = color_approved
        if flag == "Đỏ":
            f_color = color_rejected
        elif flag == "Vàng":
            f_color = color_pending
            
        det_styles.append(('BACKGROUND', (11, idx), (11, idx), f_color))
        idx += 1
        
    # Total row
    t_row = idx
    total_cells = [Paragraph("<b>TỔNG CỘNG</b>", cell_total_style)] + [Paragraph("", cell_style)] * 3
    total_planned_qty = sum(x["planned_quantity"] for x in progress_data.get("items", []))
    total_actual_qty = sum(x["actual_quantity"] for x in progress_data.get("items", []))
    total_variance_qty = total_actual_qty - total_planned_qty
    total_pct = (total_actual_qty / total_planned_qty * 100) if total_planned_qty > 0 else 0
    
    total_cells.append(Paragraph(f"<b>{format_currency(total_planned_qty)}</b>", cell_total_style))
    total_cells.append(Paragraph(f"<b>{format_currency(total_actual_qty)}</b>", cell_total_style))
    total_cells.append(Paragraph(f"<b>{format_currency(total_variance_qty)}</b>", cell_total_style))
    total_cells.append(Paragraph(f"<b>{total_pct:.1f}%</b>", cell_total_style))
    total_cells.extend([Paragraph("", cell_style)] * 5)
    
    det_data.append(total_cells)
    det_styles.extend([
        ('SPAN', (0, t_row), (3, t_row)),
        ('BACKGROUND', (0, t_row), (-1, t_row), colors.HexColor('#BDD7EE')),
        ('SPAN', (8, t_row), (12, t_row))
    ])
    
    # 270mm total width
    widths = [
        8*mm,   # STT
        15*mm,  # Mã HM
        55*mm,  # Hạng mục
        10*mm,  # ĐVT
        17*mm,  # SL Kế hoạch
        17*mm,  # SL Thực tế
        15*mm,  # Lệch
        15*mm,  # % Đạt
        22*mm,  # Hạn kế hoạch
        22*mm,  # Thực tế xong
        10*mm,  # Trễ
        14*mm,  # Cờ
        50*mm   # Ghi chú
    ]
    # Sum: 8+15+55+10+17+17+15+15+22+22+10+14+50 = 270mm exactly.
    
    det_table = Table(det_data, colWidths=widths, repeatRows=1)
    det_table.setStyle(TableStyle(det_styles))
    story.append(det_table)
    
    def add_footer(canvas, doc):
        canvas.saveState()
        canvas.setFont(f"{FONT}-Italic" if FONT == 'Arial' else 'Helvetica-Oblique', 8)
        canvas.drawString(12*mm, 8*mm, f"Báo cáo Tiến độ Thi công | Hệ thống Quản lý T3")
        page_num = canvas.getPageNumber()
        canvas.drawRightString(297*mm - 12*mm, 8*mm, f"Trang {page_num}")
        canvas.restoreState()
        
    doc.build(story, onFirstPage=add_footer, onLaterPages=add_footer)

def build_csv_export(progress_data, out_path):
    with open(out_path, 'w', encoding='utf-8-sig', newline='') as f:
        writer = csv.writer(f)
        # Header
        writer.writerow([
            "item_code", "item_name", "unit", "milestone_name",
            "planned_quantity", "actual_quantity", "variance_quantity", "percent_complete",
            "planned_start_date", "planned_end_date", "actual_start_date", "actual_end_date",
            "delay_days", "flag", "delay_reason", "unit_price", "planned_value", "earned_value"
        ])
        
        for item in progress_data.get("items", []):
            writer.writerow([
                item.get("item_code", ""),
                item.get("item_name", ""),
                item.get("unit", ""),
                item.get("milestone_name", ""),
                item.get("planned_quantity", 0),
                item.get("actual_quantity", 0),
                item.get("variance_quantity", 0),
                item.get("percent_complete", 0),
                item.get("planned_start_date", ""),
                item.get("planned_end_date", ""),
                item.get("actual_start_date", ""),
                item.get("actual_end_date", ""),
                item.get("delay_days", 0),
                item.get("flag", "Xanh"),
                item.get("delay_reason", ""),
                item.get("unit_price", 0),
                item.get("planned_value", 0),
                item.get("earned_value", 0)
            ])

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python progress_reporter.py <site_log_path> <plan_path> [unit_prices_path] [today_date] [project_id]")
        sys.exit(1)
        
    s_log = sys.argv[1]
    plan = sys.argv[2]
    prices = sys.argv[3] if len(sys.argv) > 3 and sys.argv[3] != "None" else None
    t_date = sys.argv[4] if len(sys.argv) > 4 and sys.argv[4] != "None" else None
    proj_id = sys.argv[5] if len(sys.argv) > 5 else None
    
    res = process_progress(s_log, plan, prices, t_date, project_id=proj_id)
    
    # Run exports automatically
    try:
        json_path = res["output_file_path"]
        with open(json_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
            
        # 1. Excel
        excel_path = json_path.replace(".json", ".xlsx")
        build_excel_dashboard(data, excel_path)
        
        # Copy excel to master
        script_dir = os.path.dirname(os.path.abspath(__file__))
        project_root = os.path.dirname(os.path.dirname(script_dir))
        master_excel_path = os.path.join(project_root, "data", "master", res['project_id'], "progress_dashboard.xlsx")
        import shutil
        shutil.copy2(excel_path, master_excel_path)
        
        # 2. PDF
        pdf_path = json_path.replace(".json", ".pdf")
        build_pdf_report(data, pdf_path)
        
        # Copy pdf to master
        master_pdf_path = os.path.join(project_root, "data", "master", res['project_id'], "progress_report.pdf")
        shutil.copy2(pdf_path, master_pdf_path)
        
        # 3. CSV
        csv_path = json_path.replace(".json", ".csv")
        build_csv_export(data, csv_path)
        
        # Copy csv to master
        master_csv_path = os.path.join(project_root, "data", "master", res['project_id'], "progress_data.csv")
        shutil.copy2(csv_path, master_csv_path)
        
        res["excel_export_path"] = excel_path
        res["pdf_export_path"] = pdf_path
        res["csv_export_path"] = csv_path
        res["master_excel_path"] = master_excel_path
        res["master_pdf_path"] = master_pdf_path
        res["master_csv_path"] = master_csv_path
        
    except Exception as e:
        import traceback
        res["export_error"] = f"Failed to export files: {str(e)}"
        res["traceback"] = traceback.format_exc()
        
    print(json.dumps(res, ensure_ascii=False))
