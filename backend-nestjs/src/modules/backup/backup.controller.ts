import { Controller, Get, Param, Post, Body, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { BackupService } from './backup.service';

@Controller('backup')
export class BackupController {
  private readonly logger = new Logger(BackupController.name);
  constructor(private readonly backupService: BackupService) {}

  @Get(':projectId/:type')
  async list(@Param('projectId') projectId: string, @Param('type') type: string) {
    try {
      return await this.backupService.listBackups(projectId, type);
    } catch (e) {
      this.logger.error('Failed to list backups', e as any);
      throw new HttpException('Failed to list backups', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('restore')
  async restore(@Body() body: { projectId: string; type: string; fileName: string }) {
    const { projectId, type, fileName } = body;
    try {
      return await this.backupService.restoreBackup(projectId, type, fileName);
    } catch (e) {
      this.logger.error('Restore failed', e as any);
      throw new HttpException('Restore failed', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('prune')
  async prune(@Body() body: { projectId: string; type: string; keep?: number }) {
    const { projectId, type, keep } = body;
    try {
      return await this.backupService.pruneBackups(projectId, type, keep || 10);
    } catch (e) {
      this.logger.error('Prune failed', e as any);
      throw new HttpException('Prune failed', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
