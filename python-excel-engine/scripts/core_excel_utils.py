import os
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

# Design Tokens (Arial, 1F4E79 theme)
FONT_NAME = "Arial"
COLOR_HEADER_BG = "1F4E79"
COLOR_HEADER_TEXT = "FFFFFF"
COLOR_TOTAL_BG = "BDD7EE"
COLOR_ZEBRA_BG = "EBF3FB"

# Borders
BORDER_THIN_GRAY = Border(
    left=Side(style='thin', color='D3D3D3'),
    right=Side(style='thin', color='D3D3D3'),
    top=Side(style='thin', color='D3D3D3'),
    bottom=Side(style='thin', color='D3D3D3')
)

# Number Formats
FMT_CURRENCY = "#,##0"
FMT_PERCENT = "0.0%"
FMT_DATE = "DD/MM/YYYY"
FMT_NUMBER = "#,##0.00"

def get_font(size=10, bold=False, italic=False, color="000000"):
    return Font(name=FONT_NAME, size=size, bold=bold, italic=italic, color=color)

def apply_header_style(cell, text_align="center"):
    cell.font = get_font(size=11, bold=True, color=COLOR_HEADER_TEXT)
    cell.fill = PatternFill(start_color=COLOR_HEADER_BG, end_color=COLOR_HEADER_BG, fill_type="solid")
    cell.alignment = Alignment(horizontal=text_align, vertical="center", wrap_text=True)
    cell.border = BORDER_THIN_GRAY

def apply_data_style(cell, align="left", bold=False, num_format=None, bg_color=None):
    cell.font = get_font(size=10, bold=bold)
    cell.alignment = Alignment(horizontal=align, vertical="center", wrap_text=True)
    cell.border = BORDER_THIN_GRAY
    
    if bg_color:
        cell.fill = PatternFill(start_color=bg_color, end_color=bg_color, fill_type="solid")
    else:
        cell.fill = PatternFill(fill_type=None)
        
    if num_format:
        cell.number_format = num_format

def apply_total_style(cell, align="right", num_format=None):
    cell.font = get_font(size=10, bold=True)
    cell.alignment = Alignment(horizontal=align, vertical="center")
    cell.fill = PatternFill(start_color=COLOR_TOTAL_BG, end_color=COLOR_TOTAL_BG, fill_type="solid")
    cell.border = BORDER_THIN_GRAY
    if num_format:
        cell.number_format = num_format

def apply_zebra_striping(ws, start_row, end_row, start_col, end_col):
    for row in range(start_row, end_row + 1):
        if row % 2 == 0:
            fill = PatternFill(start_color=COLOR_ZEBRA_BG, end_color=COLOR_ZEBRA_BG, fill_type="solid")
            for col in range(start_col, end_col + 1):
                ws.cell(row=row, column=col).fill = fill

def autofit_column_widths(ws, padding=3, min_width=10, max_width=50, manual_widths=None):
    """
    Auto-adjust column widths based on content.
    manual_widths can be a dict, e.g., {'A': 5, 'B': 45} to force specific widths.
    """
    manual_widths = manual_widths or {}
    for col in ws.columns:
        col_letter = get_column_letter(col[0].column)
        if col_letter in manual_widths:
            ws.column_dimensions[col_letter].width = manual_widths[col_letter]
            continue
            
        max_len = 0
        for cell in col:
            # Skip cells that are merged and not the top-left coordinate to avoid skewing width
            val = str(cell.value or '')
            if cell.coordinate in ws.merged_cells:
                continue
            if len(val) > max_len:
                max_len = len(val)
        
        calculated_width = max(max_len + padding, min_width)
        ws.column_dimensions[col_letter].width = min(calculated_width, max_width)

def recalculate_formulas(file_path):
    pass
