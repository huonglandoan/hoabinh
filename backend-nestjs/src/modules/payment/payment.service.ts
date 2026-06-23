import { Injectable, BadRequestException } from '@nestjs/common';
import { ExcelBridgeService } from '../excel_brigde/excel-bridge.service';
import * as fs from 'fs/promises';
import * as path from 'path';

@Injectable()
export class PaymentService {
  private readonly rootDataPath: string;

  constructor(private readonly excelBridge: ExcelBridgeService) {
    this.rootDataPath = path.resolve(__dirname, '../../../../data');
  }

  async getPaymentsInfo(projectId: string) {
    const masterJsonPath = path.join(this.rootDataPath, 'master', projectId, `baogia_${projectId}.json`);
    let hasQuote = false;
    let quoteItems = [];
    
    try {
      const data = await fs.readFile(masterJsonPath, 'utf-8');
      const quoteData = JSON.parse(data);
      quoteItems = quoteData.items || [];
      hasQuote = true;
    } catch {}

    const exportsDir = path.join(this.rootDataPath, 'exports', projectId, 'payments');
    const history = [];
    
    try {
      const files = await fs.readdir(exportsDir);
      // Group related files by timestamp
      const fileGroups: Record<string, any> = {};
      
      for (const file of files) {
        // Filenames:
        // Ho_So_Thanh_Toan_slug_YYYYMMDD_HHMMSS.xlsx
        // Ho_So_Thanh_Toan_slug_YYYYMMDD_HHMMSS.pdf
        // Bang_Ke_HDGTGT_slug_YYYYMMDD_HHMMSS.csv
        const extension = path.extname(file);
        const nameWithoutExt = path.basename(file, extension);
        
        let timestamp = '';
        let isInvoiceCsv = false;
        
        if (nameWithoutExt.startsWith('Ho_So_Thanh_Toan_')) {
          const parts = nameWithoutExt.split('_');
          // timestamp is the last 2 parts joined, e.g. 20260622_210006
          timestamp = `${parts[parts.length - 2]}_${parts[parts.length - 1]}`;
        } else if (nameWithoutExt.startsWith('Bang_Ke_HDGTGT_')) {
          const parts = nameWithoutExt.split('_');
          timestamp = `${parts[parts.length - 2]}_${parts[parts.length - 1]}`;
          isInvoiceCsv = true;
        } else {
          continue;
        }
        
        if (!fileGroups[timestamp]) {
          fileGroups[timestamp] = { timestamp, excel: '', pdf: '', csv: '' };
        }
        
        if (extension === '.xlsx') {
          fileGroups[timestamp].excel = file;
        } else if (extension === '.pdf') {
          fileGroups[timestamp].pdf = file;
        } else if (extension === '.csv' && isInvoiceCsv) {
          fileGroups[timestamp].csv = file;
        }
      }
      
      for (const ts in fileGroups) {
        const group = fileGroups[ts];
        const datePart = ts.split('_')[0];
        const timePart = ts.split('_')[1];
        
        let formattedDate = '';
        if (datePart && timePart) {
          formattedDate = `${datePart.slice(0, 4)}-${datePart.slice(4, 6)}-${datePart.slice(6, 8)} ${timePart.slice(0, 2)}:${timePart.slice(2, 4)}:${timePart.slice(4, 6)}`;
        }
        
        const relativeBase = `exports/${projectId}/payments/Ho_So_Thanh_Toan_${projectId}_${ts}`;
        const relativeCsv = `exports/${projectId}/payments/Bang_Ke_HDGTGT_${projectId}_${ts}`;
        
        history.push({
          timestamp: ts,
          createdAt: formattedDate,
          excelUrl: group.excel ? `/api/files/download?path=${relativeBase}.xlsx` : null,
          pdfUrl: group.pdf ? `/api/files/download?path=${relativeBase}.pdf` : null,
          csvUrl: group.csv ? `/api/files/download?path=${relativeCsv}.csv` : null,
        });
      }
      
      history.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    } catch {}

    return {
      hasQuote,
      quoteItems,
      history,
    };
  }

  async generatePayment(
    projectId: string,
    billingInfo: any,
    invoices: any[],
    items: any[],
  ) {
    const projectDir = path.join(this.rootDataPath, 'master', projectId);
    await fs.mkdir(projectDir, { recursive: true });
    
    // Validate / merge items with detailed quote if needed
    let finalItems = items;
    if (!items || items.length === 0) {
      const quotePath = path.join(projectDir, `baogia_${projectId}.json`);
      try {
        const quoteContent = await fs.readFile(quotePath, 'utf-8');
        const quoteData = JSON.parse(quoteContent);
        
        finalItems = (quoteData.items || []).map((item: any) => ({
          item_code: item.item_code,
          item_name: item.item_name,
          unit: item.unit,
          contract_quantity: item.quoted_quantity,
          actual_quantity: item.quoted_quantity, // default to 100% completed
          unit_price: item.original_unit_price,
        }));
      } catch {
        throw new BadRequestException('Không tìm thấy bảng báo giá gốc. Vui lòng cung cấp danh mục hạng mục nghiệm thu.');
      }
    }
    
    const payload = {
      billing_info: billingInfo,
      items: finalItems,
      invoices: invoices || [],
    };
    
    const payloadPath = path.join(projectDir, 'temp_payment_payload.json');
    await fs.writeFile(payloadPath, JSON.stringify(payload, null, 2), 'utf-8');
    
    const args = [
      payloadPath,
      projectId,
    ];

    // Execute Python script
    const result = await this.excelBridge.runScript('invoice_processor.py', args);
    
    // Clean up temp file
    try {
      await fs.unlink(payloadPath);
    } catch {}

    return result;
  }
}
