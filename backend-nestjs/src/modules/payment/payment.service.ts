import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ExcelBridgeService } from '../excel_brigde/excel-bridge.service';
import { BackupService } from '../backup/backup.service';
import * as fs from 'fs/promises';
import * as path from 'path';

@Injectable()
export class PaymentService {
  private readonly rootDataPath: string;

  constructor(
    private readonly excelBridge: ExcelBridgeService,
    private readonly backupService: BackupService,
  ) {
    this.rootDataPath = path.resolve(__dirname, '../../../../data');
  }
  private readonly logger = new Logger(PaymentService.name);

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
        
        // Use the actual discovered filenames (group.excel / group.pdf / group.csv)
        // because the Python exporter may use project name slug instead of the numeric projectId
        const excelPath = group.excel ? `exports/${projectId}/payments/${group.excel}` : null;
        const pdfPath = group.pdf ? `exports/${projectId}/payments/${group.pdf}` : null;
        const csvPath = group.csv ? `exports/${projectId}/payments/${group.csv}` : null;

        history.push({
          timestamp: ts,
          createdAt: formattedDate,
          excelUrl: excelPath ? `/api/files/download?path=${excelPath}` : null,
          pdfUrl: pdfPath ? `/api/files/download?path=${pdfPath}` : null,
          csvUrl: csvPath ? `/api/files/download?path=${csvPath}` : null,
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

    // Backup existing master payment files before generating new ones
    try {
      const masterDir = path.join(this.rootDataPath, 'master', projectId);
      const candidates = [
        path.join(masterDir, 'payment_profile.xlsx'),
        path.join(masterDir, 'payment_profile.pdf'),
        path.join(masterDir, 'invoices_data.csv'),
      ];
      await this.backupService.backupFiles(projectId, 'payments', candidates, 'generatePayment');
    } catch (e) {
      this.logger?.warn && this.logger.warn('Backup before generatePayment failed');
    }

    // Execute Python script
    const result = await this.excelBridge.runScript('invoice_processor.py', args);
    
    // Clean up temp file
    try {
      await fs.unlink(payloadPath);
    } catch {}

    return result;
  }
}
