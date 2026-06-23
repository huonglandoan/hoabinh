import os
import sys
import json
from datetime import datetime
from core_excel_utils import vn_slug

# Import sibling scripts if needed
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

def process_quote(quote_data_path, po_data_path, existing_quote_path=None, project_id=None):
    # Load quote data
    with open(quote_data_path, 'r', encoding='utf-8') as f:
        quote_data = json.load(f)
        
    # Load purchase orders (Mocked as empty since POs are removed)
    purchase_orders = []
            
    # Load existing quote
    existing_quote = None
    if existing_quote_path and os.path.exists(existing_quote_path):
        try:
            with open(existing_quote_path, 'r', encoding='utf-8') as f:
                existing_quote = json.load(f)
        except Exception as e:
            print(f"Warning: Could not read existing quote file: {e}", file=sys.stderr)
            
    warnings = []
    project_info = quote_data.get("project_info", {})
    new_items = quote_data.get("items", [])
    
    # Validation / Duplicate checks
    seen_codes = set()
    validated_items = []
    for item in new_items:
        code = item.get("item_code")
        if not code:
            warnings.append(f"Hạng mục thiếu mã item_code: {item.get('item_name', 'Không rõ tên')}")
            continue
        if code in seen_codes:
            warnings.append(f"Trùng mã hạng mục item_code: {code}. Tự động bỏ qua dòng trùng lặp.")
            continue
        seen_codes.add(code)
        
        # Ensure numbers are valid
        try:
            item["quoted_quantity"] = float(item.get("quoted_quantity") or 0)
            item["original_unit_price"] = float(item.get("original_unit_price") or 0)
        except ValueError:
            warnings.append(f"Hạng mục {code} có số lượng hoặc đơn giá không hợp lệ.")
            item["quoted_quantity"] = 0
            item["original_unit_price"] = 0
            
        validated_items.append(item)
        
    # Determine version and status mapping from existing quote
    version = "v1"
    
    if existing_quote:
        old_ver = existing_quote.get("version", "v1")
        if old_ver.startswith("v"):
            try:
                version = f"v{int(old_ver[1:]) + 1}"
            except ValueError:
                version = "v2"
        else:
            version = "v2"

    is_variation = project_info.get("is_variation_quote", False)
    final_items = []
    
    # Load all existing non-removed items first to preserve them
    if existing_quote:
        for old_item in existing_quote.get("items", []):
            if old_item.get("approval_status") != "Đã loại bỏ":
                final_items.append(old_item.copy())

    # Map existing items by code for quick lookup
    existing_items_by_code = {item["item_code"]: item for item in final_items}
    
    # Process items, assign status, calculate Thành tiền
    for item in validated_items:
        code = item["item_code"]
        approval_status = "Chờ duyệt"
        
        if is_variation:
            # Under a variation quote, all new/modified inputs are marked as extras
            item["is_extra"] = True
            
            # If the item code already exists in contract, assign a suffix to avoid duplicate keys
            if code in existing_items_by_code:
                item["item_code"] = f"{code}_PS"
                old_item = existing_items_by_code[code]
                if old_item.get("original_unit_price") != item["original_unit_price"]:
                    warnings.append(f"Hạng mục phát sinh {code} có đơn giá khác đơn giá gốc.")
            
            item["approval_status"] = approval_status
            item["po_list"] = []
            item["amount"] = item["quoted_quantity"] * item["original_unit_price"]
            final_items.append(item)
            
        else:
            # Normal contract version (non-variation): updates and overrides standard items
            item["is_extra"] = item.get("is_extra", False)
            if code in existing_items_by_code:
                old_item = existing_items_by_code[code]
                approval_status = old_item.get("approval_status", "Chờ duyệt")
                if (old_item.get("quoted_quantity") != item["quoted_quantity"] or 
                    old_item.get("original_unit_price") != item["original_unit_price"]):
                    warnings.append(f"Hạng mục {code} thay đổi số lượng hoặc đơn giá so với phiên bản cũ.")
            
            item["approval_status"] = approval_status
            item["po_list"] = []
            item["amount"] = item["quoted_quantity"] * item["original_unit_price"]
            
            # Replace the existing item in final_items if it matches by code
            found = False
            for i, old_it in enumerate(final_items):
                if old_it["item_code"] == code:
                    final_items[i] = item
                    found = True
                    break
            if not found:
                final_items.append(item)
                
    # Check if any old items were removed (only for normal contract revisions, not variations)
    if existing_quote and not is_variation:
        seen_codes = {item["item_code"] for item in validated_items}
        for old_item in existing_quote.get("items", []):
            old_code = old_item.get("item_code")
            if old_code not in seen_codes and old_item.get("approval_status") != "Đã loại bỏ":
                warnings.append(f"Hạng mục {old_code} ({old_item.get('item_name')}) đã bị loại bỏ ở phiên bản mới.")
                # Mark as removed and keep for audit trail
                removed_item = old_item.copy()
                removed_item["approval_status"] = "Đã loại bỏ"
                removed_item["quoted_quantity"] = 0
                removed_item["amount"] = 0
                final_items.append(removed_item)

    # Calculate total contract value (sum of amounts of non-removed items)
    subtotal = sum(
        item["amount"] for item in final_items if item.get("approval_status") != "Đã loại bỏ"
    )
    vat_percent = float(project_info.get("vat_percent") or 0)
    vat_amount = subtotal * (vat_percent / 100.0)
    total_contract_value = subtotal + vat_amount

    # Generate processed structure
    processed_quote = {
        "project_info": project_info,
        "items": final_items,
        "subtotal": subtotal,
        "vat_percent": vat_percent,
        "vat_amount": vat_amount,
        "total_contract_value": total_contract_value,
        "version": version,
        "generated_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "warnings": warnings
    }
    
    # Save files
    project_id = project_id or project_info.get("project_name", "temp_project").replace(" ", "_")
    
    # Setup directories (absolute paths)
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(os.path.dirname(script_dir))
    data_dir = os.path.join(project_root, "data")
    
    master_dir = os.path.join(data_dir, "master", project_id)
    exports_dir = os.path.join(data_dir, "exports", project_id, "quotes")
    os.makedirs(master_dir, exist_ok=True)
    os.makedirs(exports_dir, exist_ok=True)
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    
    # Save exports JSON
    is_variation = project_info.get("is_variation_quote", False)
    prefix = "baogia_phatsinh_" if is_variation else "baogia_"
    
    # Build a human-friendly filename using project name slug (Vietnamese -> ascii)
    project_slug = vn_slug(project_info.get('project_name') or project_id)
    export_json_path = os.path.join(exports_dir, f"{prefix}{project_slug}_{version}_{timestamp}.json")
    with open(export_json_path, 'w', encoding='utf-8') as f:
        json.dump(processed_quote, f, ensure_ascii=False, indent=4)
        
    # Save master JSON (for easy loading in backend)
    master_json_path = os.path.join(master_dir, f"baogia_{project_id}.json")
    with open(master_json_path, 'w', encoding='utf-8') as f:
        json.dump(processed_quote, f, ensure_ascii=False, indent=4)
        
    # Return processed info
    result = {
        "output_file_path": export_json_path,
        "master_file_path": master_json_path,
        "total_contract_value": total_contract_value,
        "version": version,
        "warnings": warnings,
        "project_id": project_id
    }
    return result

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python process_quote.py <quote_data_path> <po_data_path> [existing_quote_path] [project_id]")
        sys.exit(1)
        
    q_path = sys.argv[1]
    p_path = sys.argv[2]
    e_path = sys.argv[3] if len(sys.argv) > 3 and sys.argv[3] != "None" else None
    proj_id = sys.argv[4] if len(sys.argv) > 4 else None
    
    res = process_quote(q_path, p_path, e_path, proj_id)
    
    # Run exports automatically
    try:
        from export_excel import build_workbook
        excel_export_dir = os.path.dirname(res["output_file_path"])
        excel_filename = os.path.basename(res["output_file_path"]).replace(".json", ".xlsx")
        excel_path = os.path.join(excel_export_dir, excel_filename)
        
        # Build Excel
        with open(res["output_file_path"], 'r', encoding='utf-8') as f:
            data = json.load(f)
        build_workbook(data, excel_path)

        # Copy to master (with backup)
        script_dir = os.path.dirname(os.path.abspath(__file__))
        project_root = os.path.dirname(os.path.dirname(script_dir))
        is_var = data.get("project_info", {}).get("is_variation_quote", False)
        out_prefix = "baogia_phatsinh_" if is_var else "baogia_"
        master_excel_path = os.path.join(project_root, "data", "master", res['project_id'], f"{out_prefix}{res['project_id']}.xlsx")
        import shutil
        # Backup existing master excel if exists
        try:
            backups_dir = os.path.join(project_root, 'data', 'backups', res['project_id'], 'quotes')
            os.makedirs(backups_dir, exist_ok=True)
            if os.path.exists(master_excel_path):
                shutil.copy2(master_excel_path, os.path.join(backups_dir, os.path.basename(master_excel_path) + f".backup.{datetime.now().strftime('%Y%m%d_%H%M%S')}"))
        except Exception:
            pass
        shutil.copy2(excel_path, master_excel_path)
        res["excel_export_path"] = excel_path
        res["master_excel_path"] = master_excel_path
    except Exception as e:
         res["excel_error"] = f"Failed to export Excel: {str(e)}"
         
    try:
        from export_pdf import build_pdf
        pdf_export_dir = os.path.dirname(res["output_file_path"])
        pdf_filename = os.path.basename(res["output_file_path"]).replace(".json", ".pdf")
        pdf_path = os.path.join(pdf_export_dir, pdf_filename)
        
        # Build PDF
        with open(res["output_file_path"], 'r', encoding='utf-8') as f:
            data = json.load(f)
        build_pdf(data, pdf_path)
        
        # Copy to master (with backup)
        script_dir = os.path.dirname(os.path.abspath(__file__))
        project_root = os.path.dirname(os.path.dirname(script_dir))
        is_var = data.get("project_info", {}).get("is_variation_quote", False)
        out_prefix = "baogia_phatsinh_" if is_var else "baogia_"
        master_pdf_path = os.path.join(project_root, "data", "master", res['project_id'], f"{out_prefix}{res['project_id']}.pdf")
        import shutil
        try:
            backups_dir = os.path.join(project_root, 'data', 'backups', res['project_id'], 'quotes')
            os.makedirs(backups_dir, exist_ok=True)
            if os.path.exists(master_pdf_path):
                shutil.copy2(master_pdf_path, os.path.join(backups_dir, os.path.basename(master_pdf_path) + f".backup.{datetime.now().strftime('%Y%m%d_%H%M%S')}"))
        except Exception:
            pass
        shutil.copy2(pdf_path, master_pdf_path)
        res["pdf_export_path"] = pdf_path
        res["master_pdf_path"] = master_pdf_path
    except Exception as e:
         res["pdf_error"] = f"Failed to export PDF: {str(e)}"
         
    print(json.dumps(res, ensure_ascii=False))
