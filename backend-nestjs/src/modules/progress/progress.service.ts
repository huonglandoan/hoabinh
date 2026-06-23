import { Injectable, BadRequestException } from '@nestjs/common';
import { ExcelBridgeService } from '../excel_brigde/excel-bridge.service';
import { BackupService } from '../backup/backup.service';
import * as fs from 'fs/promises';
import * as path from 'path';
import { Logger } from '@nestjs/common';

@Injectable()
export class ProgressService {
  private readonly rootDataPath: string;

  constructor(
    private readonly excelBridge: ExcelBridgeService,
    private readonly backupService: BackupService,
  ) {
    this.rootDataPath = path.resolve(__dirname, '../../../../data');
    this.logger = new Logger(ProgressService.name);
  }
  private readonly logger: Logger;

  async getProgressInfo(projectId: string) {
    const planPath = path.join(this.rootDataPath, 'master', projectId, 'progress_plan.json');
    const masterJsonPath = path.join(this.rootDataPath, 'master', projectId, 'progress_report.json');
    const quotePath = path.join(this.rootDataPath, 'master', projectId, `baogia_${projectId}.json`);

    let contract_signed = false;
    let signed_version = '';
    let quoteData = null;

    try {
      const quoteContent = await fs.readFile(quotePath, 'utf-8');
      quoteData = JSON.parse(quoteContent);
      contract_signed = !!quoteData.project_info?.contract_signed;
      signed_version = quoteData.project_info?.signed_version || '';
    } catch {}

    let hasPlan = false;
    try {
      await fs.access(planPath);
      hasPlan = true;
    } catch {}

    // If signed and plan does not exist, initialize plan automatically
    if (contract_signed && !hasPlan && quoteData) {
      try {
        const generatedPlan = {
          project_info: quoteData.project_info,
          milestones: [
            { milestone_name: 'Mốc tổng thể', planned_end_date: quoteData.project_info.expected_completion_date }
          ],
          items: quoteData.items.map((item: any) => ({
            item_code: item.item_code,
            item_name: item.item_name,
            unit: item.unit,
            planned_quantity: item.quoted_quantity,
            planned_start_date: quoteData.project_info.start_date,
            planned_end_date: quoteData.project_info.expected_completion_date,
            milestone_name: 'Mốc tổng thể'
          }))
        };
        await fs.mkdir(path.dirname(planPath), { recursive: true });
        await fs.writeFile(planPath, JSON.stringify(generatedPlan, null, 2), 'utf-8');
        hasPlan = true;
      } catch (e) {}
    }

    // Sync new items from master quote to progress plan if it exists
    if (contract_signed && hasPlan && quoteData) {
      try {
        const planContent = await fs.readFile(planPath, 'utf-8');
        const planData = JSON.parse(planContent);
        const planItems = planData.items || [];
        const planCodes = new Set(planItems.map((it: any) => it.item_code));

        let updated = false;
        for (const quoteItem of quoteData.items || []) {
          if (!planCodes.has(quoteItem.item_code)) {
            planItems.push({
              item_code: quoteItem.item_code,
              item_name: quoteItem.item_name,
              unit: quoteItem.unit,
              planned_quantity: quoteItem.quoted_quantity,
              planned_start_date: quoteData.project_info.signed_at ? quoteData.project_info.signed_at.split('T')[0] : quoteData.project_info.start_date,
              planned_end_date: quoteData.project_info.expected_completion_date,
              milestone_name: 'Mốc tổng thể'
            });
            updated = true;
          }
        }

        if (updated) {
          planData.items = planItems;
          await fs.writeFile(planPath, JSON.stringify(planData, null, 2), 'utf-8');
        }
      } catch (e) {
        this.logger.error('Failed to sync new variation items to progress plan', e as any);
      }
    }

    let currentReport = null;
    try {
      const data = await fs.readFile(masterJsonPath, 'utf-8');
      currentReport = JSON.parse(data);
    } catch {}

    // If signed but no progress report exists yet, generate default report dynamically from quote
    if (contract_signed && !currentReport && quoteData) {
      try {
        const items = quoteData.items.map((item: any) => ({
          item_code: item.item_code,
          item_name: item.item_name,
          unit: item.unit,
          milestone_name: 'Mốc tổng thể',
          planned_quantity: item.quoted_quantity,
          actual_quantity: 0,
          variance_quantity: -item.quoted_quantity,
          percent_complete: 0,
          planned_start_date: quoteData.project_info.start_date,
          planned_end_date: quoteData.project_info.expected_completion_date,
          actual_start_date: null,
          actual_end_date: null,
          delay_days: 0,
          flag: 'Xanh',
          site_notes: '',
          is_variation: !!quoteData.project_info.is_variation_quote
        }));

        currentReport = {
          project_info: quoteData.project_info,
          as_of_date: new Date().toISOString().split('T')[0],
          items: items,
          milestones: [
            {
              milestone_name: 'Mốc tổng thể',
              planned_end_date: quoteData.project_info.expected_completion_date,
              percent_complete: 0,
              max_delay_days: 0,
              flag: 'Xanh'
            }
          ],
          project_percent_complete: 0
        };
      } catch (e) {}
    }

    // Ensure any new items in quoteData are reflected in currentReport in memory
    if (contract_signed && currentReport && quoteData) {
      const reportItems = currentReport.items || [];
      const reportCodes = new Set(reportItems.map((it: any) => it.item_code));
      let reportUpdated = false;

      for (const quoteItem of quoteData.items || []) {
        if (!reportCodes.has(quoteItem.item_code)) {
          const startDate = quoteData.project_info.signed_at ? quoteData.project_info.signed_at.split('T')[0] : quoteData.project_info.start_date;
          const expectedCompletionDate = quoteData.project_info.expected_completion_date;
          reportItems.push({
            item_code: quoteItem.item_code,
            item_name: quoteItem.item_name,
            unit: quoteItem.unit,
            milestone_name: 'Mốc tổng thể',
            planned_quantity: quoteItem.quoted_quantity,
            actual_quantity: 0,
            variance_quantity: -quoteItem.quoted_quantity,
            percent_complete: 0,
            planned_start_date: startDate,
            planned_end_date: expectedCompletionDate,
            actual_start_date: null,
            actual_end_date: null,
            delay_days: 0,
            flag: 'Xanh',
            site_notes: '',
            is_variation: !!quoteItem.is_extra
          });
          reportUpdated = true;
        }
      }

      if (reportUpdated) {
        currentReport.items = reportItems;
        try {
          await fs.writeFile(masterJsonPath, JSON.stringify(currentReport, null, 2), 'utf-8');
        } catch (e) {}
      }
    }

    // Scan exports for history
    const exportsDir = path.join(this.rootDataPath, 'exports', projectId, 'progress');
    const history = [];
    
    try {
      const files = await fs.readdir(exportsDir);
      const jsonFiles = files.filter(f => 
        f.endsWith('.json') && (f.startsWith('progress_report_') || f.startsWith('TienDo_'))
      );
      
      for (const file of jsonFiles) {
        const parts = file.replace('.json', '').split('_');
        const dateStr = parts[2];
        const timeStr = parts[3];
        
        let formattedDate = '';
        if (dateStr) {
          formattedDate = `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`;
          if (timeStr) {
            formattedDate += ` ${timeStr.slice(0, 2)}:${timeStr.slice(2, 4)}:${timeStr.slice(4, 6)}`;
          }
        }
        
        const label = file.startsWith('TienDo_')
          ? `Tiến độ ${parts[1] || ''} - ${dateStr ? `${dateStr.slice(6, 8)}/${dateStr.slice(4, 6)}/${dateStr.slice(0, 4)}` : ''}`
          : `Báo cáo ${dateStr ? `${dateStr.slice(6, 8)}/${dateStr.slice(4, 6)}/${dateStr.slice(0, 4)}` : ''}`;

        const relativeBase = `exports/${projectId}/progress/${file.replace('.json', '')}`;
        
        history.push({
          fileName: file,
          label: label,
          createdAt: formattedDate || 'Chưa rõ',
          excelUrl: `/api/files/download?path=${relativeBase}.xlsx`,
          pdfUrl: `/api/files/download?path=${relativeBase}.pdf`,
          csvUrl: `/api/files/download?path=${relativeBase}.csv`,
          jsonUrl: `/api/files/download?path=${relativeBase}.json`,
        });
      }
      history.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    } catch {}

    return {
      currentReport,
      hasPlan,
      history,
      contract_signed,
      signed_version,
    };
  }

  async savePlan(projectId: string, planData: any) {
    const projectDir = path.join(this.rootDataPath, 'master', projectId);
    await fs.mkdir(projectDir, { recursive: true });
    const planPath = path.join(projectDir, 'progress_plan.json');
    await fs.writeFile(planPath, JSON.stringify(planData, null, 2), 'utf-8');
    return { success: true };
  }

  async updateProgress(projectId: string, siteLog: any, todayStr?: string) {
    const projectDir = path.join(this.rootDataPath, 'master', projectId);
    const planPath = path.join(projectDir, 'progress_plan.json');
    
    // Check plan exists
    try {
      await fs.access(planPath);
    } catch {
      // Fallback: If no plan exists, we can try to generate a basic plan from baogia_projectId.json
      const quotePath = path.join(projectDir, `baogia_${projectId}.json`);
      try {
        const quoteContent = await fs.readFile(quotePath, 'utf-8');
        const quoteData = JSON.parse(quoteContent);
        
        const generatedPlan = {
          project_info: quoteData.project_info,
          milestones: [
            { milestone_name: "Mốc tổng thể", planned_end_date: quoteData.project_info.expected_completion_date }
          ],
          items: quoteData.items.map((item: any) => ({
            item_code: item.item_code,
            item_name: item.item_name,
            unit: item.unit,
            planned_quantity: item.quoted_quantity,
            planned_start_date: quoteData.project_info.start_date,
            planned_end_date: quoteData.project_info.expected_completion_date,
            milestone_name: "Mốc tổng thể"
          }))
        };
        await fs.writeFile(planPath, JSON.stringify(generatedPlan, null, 2), 'utf-8');
      } catch {
        throw new BadRequestException('Vui lòng khởi tạo Kế hoạch tiến độ (Plan) trước khi cập nhật nhật ký.');
      }
    }
    
    // Write site log input
    const logInputPath = path.join(projectDir, 'temp_site_log_input.json');
    await fs.writeFile(logInputPath, JSON.stringify(siteLog, null, 2), 'utf-8');
    
    // Check if unit prices are available in detailed_quote.json
    const quotePath = path.join(projectDir, `baogia_${projectId}.json`);
    let pricesInputPath = 'None';
    
    try {
      const quoteContent = await fs.readFile(quotePath, 'utf-8');
      const quoteData = JSON.parse(quoteContent);
      
      const unitPrices: Record<string, number> = {};
      for (const item of (quoteData.items || []) as any[]) {
        if (item.item_code) {
          unitPrices[item.item_code] = item.original_unit_price || 0;
        }
      }
      
      pricesInputPath = path.join(projectDir, 'temp_unit_prices.json');
      await fs.writeFile(pricesInputPath, JSON.stringify(unitPrices, null, 2), 'utf-8');
    } catch {}

    const args = [
      logInputPath,
      planPath,
      pricesInputPath,
      todayStr || 'None',
      projectId,
    ];

    // Backup existing master progress files before generating new ones
    try {
      const masterDir = path.join(this.rootDataPath, 'master', projectId);
      const candidates = [
        path.join(masterDir, 'progress_report.json'),
        path.join(masterDir, 'progress_report.pdf'),
        path.join(masterDir, 'progress_dashboard.xlsx'),
        path.join(masterDir, 'progress_data.csv'),
      ];
      await this.backupService.backupFiles(projectId, 'progress', candidates, 'updateProgress');
    } catch (e) {
      this.logger.error('Backup before updateProgress failed', e as any);
    }

    // Execute Python script
    const result = await this.excelBridge.runScript('progress_reporter.py', args);
    
    // Clean up temp files
    try {
      await fs.unlink(logInputPath);
      if (pricesInputPath !== 'None') {
        await fs.unlink(pricesInputPath);
      }
    } catch {}

    return result;
  }
}
