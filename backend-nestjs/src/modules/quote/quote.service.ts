import { Injectable, NotFoundException } from '@nestjs/common';
import { ExcelBridgeService } from '../excel_brigde/excel-bridge.service';
import * as fs from 'fs/promises';
import * as path from 'path';

@Injectable()
export class QuoteService {
  private readonly rootDataPath: string;

  constructor(private readonly excelBridge: ExcelBridgeService) {
    this.rootDataPath = path.resolve(__dirname, '../../../../data');
  }

  async getQuotesInfo(projectId: string) {
    const masterJsonPath = path.join(this.rootDataPath, 'master', projectId, `baogia_${projectId}.json`);
    let currentQuote = null;
    
    try {
      const data = await fs.readFile(masterJsonPath, 'utf-8');
      currentQuote = JSON.parse(data);
    } catch {
      // It's ok if there is no quote yet
    }

    // Scan exports directory for history
    const exportsDir = path.join(this.rootDataPath, 'exports', projectId, 'quotes');
    const history = [];
    
    try {
      const files = await fs.readdir(exportsDir);
      // Filter JSON files, parse versions & timestamps
      const jsonFiles = files.filter(f => f.endsWith('.json') && f.startsWith('baogia_'));
      
      for (const file of jsonFiles) {
        // Filename format: baogia_{projectId}_{version}_{timestamp}.json
        const parts = file.replace('.json', '').split('_');
        const timeStr = parts[parts.length - 1]; // HHMMSS
        const dateStr = parts[parts.length - 2]; // YYYYMMDD
        const version = parts[parts.length - 3]; // v1, v2...
        
        let formattedDate = '';
        if (dateStr && timeStr) {
          formattedDate = `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)} ${timeStr.slice(0, 2)}:${timeStr.slice(2, 4)}:${timeStr.slice(4, 6)}`;
        }
        
        // Relative file URLs for downloading
        const relativeBase = `exports/${projectId}/quotes/${file.replace('.json', '')}`;
        const isVariation = file.startsWith('baogia_phatsinh_');
        
        history.push({
          fileName: file,
          version,
          createdAt: formattedDate,
          isVariation,
          excelUrl: `/api/files/download?path=${relativeBase}.xlsx`,
          pdfUrl: `/api/files/download?path=${relativeBase}.pdf`,
          jsonUrl: `/api/files/download?path=${relativeBase}.json`,
        });
      }
      
      // Sort history descending by version
      history.sort((a, b) => b.version.localeCompare(a.version, undefined, { numeric: true }));
    } catch {
      // Exports dir might not exist yet
    }

    return {
      currentQuote,
      history,
    };
  }

  async processQuote(
    projectId: string,
    quoteData: any,
    purchaseOrders: any[],
  ) {
    const projectDir = path.join(this.rootDataPath, 'master', projectId);
    await fs.mkdir(projectDir, { recursive: true });
    
    const quoteInputPath = path.join(projectDir, 'temp_quote_input.json');
    const poInputPath = path.join(projectDir, 'temp_po_input.json');
    
    // Write inputs
    await fs.writeFile(quoteInputPath, JSON.stringify(quoteData, null, 2), 'utf-8');
    await fs.writeFile(poInputPath, JSON.stringify(purchaseOrders || [], null, 2), 'utf-8');
    
    // Check if there is an existing quote
    const existingQuotePath = path.join(projectDir, `baogia_${projectId}.json`);
    let hasExisting = false;
    try {
      await fs.access(existingQuotePath);
      hasExisting = true;
    } catch {}

    const args = [
      quoteInputPath,
      poInputPath,
      hasExisting ? existingQuotePath : 'None',
      projectId,
    ];

    // Execute Python script
    const result = await this.excelBridge.runScript('process_quote.py', args);
    
    // Clean up temp files
    try {
      await fs.unlink(quoteInputPath);
      await fs.unlink(poInputPath);
    } catch {}

    return result;
  }

  async signQuote(projectId: string, version: string, fileName: string) {
    const exportsDir = path.join(this.rootDataPath, 'exports', projectId, 'quotes');
    const versionJsonPath = path.join(exportsDir, fileName);
    
    // Read the specific version JSON file
    const data = await fs.readFile(versionJsonPath, 'utf-8');
    const quote = JSON.parse(data);
    
    // Update its project_info to set contract_signed: true, signed_version: version
    if (!quote.project_info) {
      quote.project_info = {};
    }
    quote.project_info.contract_signed = true;
    quote.project_info.signed_version = version;
    quote.project_info.signed_at = new Date().toISOString();
    
    // Save it back to the specific version file
    await fs.writeFile(versionJsonPath, JSON.stringify(quote, null, 2), 'utf-8');
    
    // Also overwrite the master copy baogia_{projectId}.json with this signed version!
    const masterDir = path.join(this.rootDataPath, 'master', projectId);
    const masterJsonPath = path.join(masterDir, `baogia_${projectId}.json`);
    await fs.writeFile(masterJsonPath, JSON.stringify(quote, null, 2), 'utf-8');
    
    // Copy the corresponding Excel & PDF files to master!
    const baseName = fileName.replace('.json', '');
    const isVar = !!quote.project_info?.is_variation_quote;
    const prefix = isVar ? 'baogia_phatsinh_' : 'baogia_';
    
    try {
      const srcExcel = path.join(exportsDir, `${baseName}.xlsx`);
      const destExcel = path.join(masterDir, `${prefix}${projectId}.xlsx`);
      await fs.copyFile(srcExcel, destExcel);
    } catch (e) {
      // Excel might not exist
    }
    
    try {
      const srcPdf = path.join(exportsDir, `${baseName}.pdf`);
      const destPdf = path.join(masterDir, `${prefix}${projectId}.pdf`);
      await fs.copyFile(srcPdf, destPdf);
    } catch (e) {
      // PDF might not exist
    }
    
    return { success: true, signed_version: version };
  }
}
