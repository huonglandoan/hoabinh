import { Injectable, Logger } from '@nestjs/common';
import { ExcelBridgeService } from '../excel_brigde/excel-bridge.service';
import { BackupService } from '../backup/backup.service';
import * as fs from 'fs/promises';
import * as path from 'path';

@Injectable()
export class ProfitAnalysisService {
  private readonly rootDataPath: string;
  private readonly logger = new Logger(ProfitAnalysisService.name);

  constructor(
    private readonly excelBridge: ExcelBridgeService,
    private readonly backupService: BackupService,
  ) {
    this.rootDataPath = path.resolve(__dirname, '../../../../data');
  }

  async getProfitAnalysis(projectId: string) {
    const masterJsonPath = path.join(this.rootDataPath, 'master', projectId, 'profit_report.json');
    let reportData = null;

    // Check if master report exists, otherwise run the analyzer dynamically
    try {
      const data = await fs.readFile(masterJsonPath, 'utf-8');
      reportData = JSON.parse(data);
    } catch {
      // Dynamic generation if file does not exist yet
      try {
        const result = await this.excelBridge.runScript('profit_calculator.py', [projectId]);
        const data = await fs.readFile(masterJsonPath, 'utf-8');
        reportData = JSON.parse(data);
      } catch (err) {
        this.logger.error('Failed to run profit analyzer dynamically', err as any);
      }
    }

    // Scan exports for history
    const exportsDir = path.join(this.rootDataPath, 'exports', projectId, 'profit');
    const history = [];

    try {
      const files = await fs.readdir(exportsDir);
      const jsonFiles = files.filter(f => f.endsWith('.json') && f.startsWith('profit_report_'));

      for (const file of jsonFiles) {
        const parts = file.replace('.json', '').split('_');
        const dateStr = parts[2];
        const timeStr = parts[3];

        let formattedDate = '';
        if (dateStr && timeStr) {
          formattedDate = `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)} ${timeStr.slice(0, 2)}:${timeStr.slice(2, 4)}:${timeStr.slice(4, 6)}`;
        }

        const relativeBase = `exports/${projectId}/profit/${file.replace('.json', '')}`;

        history.push({
          fileName: file,
          createdAt: formattedDate,
          excelUrl: `/api/files/download?path=${relativeBase}.xlsx`,
          pdfUrl: `/api/files/download?path=${relativeBase}.pdf`,
          jsonUrl: `/api/files/download?path=${relativeBase}.json`,
        });
      }
      history.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    } catch {}

    return {
      reportData,
      history,
    };
  }

  async runAnalysis(projectId: string) {
    // Backup existing master profit files before running analysis
    try {
      const masterDir = path.join(this.rootDataPath, 'master', projectId);
      const candidates = [
        path.join(masterDir, 'profit_report.json'),
        path.join(masterDir, 'profit_report.pdf'),
        path.join(masterDir, 'profit_report.xlsx'),
      ];
      await this.backupService.backupFiles(projectId, 'profit', candidates, 'runAnalysis');
    } catch (e) {
      this.logger.warn('Backup before runAnalysis failed', e as any);
    }

    const result = await this.excelBridge.runScript('profit_calculator.py', [projectId]);
    return result;
  }
}
