import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as fsSync from 'fs';

@Injectable()
export class BackupService {
  private readonly rootDataPath: string;
  private readonly logger = new Logger(BackupService.name);

  constructor() {
    this.rootDataPath = path.resolve(__dirname, '../../../../data');
  }

  async ensureDir(dir: string) {
    await fs.mkdir(dir, { recursive: true });
  }

  // Backup a list of absolute paths (if they exist) into data/backups/{projectId}/{type}/ with timestamp
  async backupFiles(projectId: string, type: string, files: string[], actor = 'system') {
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const backupsDir = path.join(this.rootDataPath, 'backups', projectId, type);
    await this.ensureDir(backupsDir);

    const meta: any = { actor, ts: new Date().toISOString(), files: [] };

    for (const src of files) {
      try {
        // src expected absolute path
        const exists = await fs.stat(src).then(() => true).catch(() => false);
        if (!exists) continue;
        const base = path.basename(src);
        const dest = path.join(backupsDir, `${base}.backup.${ts}`);
        await fs.copyFile(src, dest);
        const st = await fs.stat(dest);
        meta.files.push({ src, dest, size: st.size });
    this.logger.log(`Backed up ${src} -> ${dest}`);
      } catch (e) {
    this.logger.error(`Failed to backup ${src}`, e as any);
      }
    }

    const metaPath = path.join(backupsDir, `backup_meta_${ts}.json`);
    await fs.writeFile(metaPath, JSON.stringify(meta, null, 2), 'utf-8');
  this.logger.log(`Backup metadata written ${metaPath}`);
    return { backupsDir, metaPath };
  }

  // List backups for a project/type
  async listBackups(projectId: string, type: string) {
    const backupsDir = path.join(this.rootDataPath, 'backups', projectId, type);
    try {
      const files = await fs.readdir(backupsDir);
      // return meta and backups
  return files.sort().reverse();
    } catch (e) {
  this.logger.warn(`No backups found for ${projectId}/${type}`);
  return [];
    }
  }

  // Restore a backup file to master location
  async restoreBackup(projectId: string, type: string, backupFileName: string) {
    const backupsDir = path.join(this.rootDataPath, 'backups', projectId, type);
    const backupPath = path.join(backupsDir, backupFileName);
    const exists = fsSync.existsSync(backupPath);
    if (!exists) throw new Error('Backup file not found');

    // Infer target master path from filename pattern: remove '.backup.<ts>' suffix
    const originalName = backupFileName.replace(/\.backup\.[0-9TZ:\-]+$/, '');
    // Try to place into master/{projectId}/ with originalName
    try {
      const masterDir = path.join(this.rootDataPath, 'master', projectId);
      await this.ensureDir(masterDir);
      const dest = path.join(masterDir, originalName);
      await fs.copyFile(backupPath, dest);
      this.logger.log(`Restored backup ${backupPath} -> ${dest}`);
      return { restoredTo: dest };
    } catch (e) {
      this.logger.error('Failed to restore backup', e as any);
      throw new InternalServerErrorException('Failed to restore backup');
    }
  }

  // Prune backups keeping the latest `keep` files (meta excluded)
  async pruneBackups(projectId: string, type: string, keep = 10) {
    const backupsDir = path.join(this.rootDataPath, 'backups', projectId, type);
    try {
      const files = await fs.readdir(backupsDir);
      // Consider only backup files (not meta)
      const backupFiles = files.filter(f => f.includes('.backup.')).sort();
      const toDelete = backupFiles.slice(0, Math.max(0, backupFiles.length - keep));
      for (const f of toDelete) {
        await fs.unlink(path.join(backupsDir, f)).catch(() => {});
      }
  this.logger.log(`Pruned ${toDelete.length} backups for ${projectId}/${type}`);
  return { deleted: toDelete.length };
    } catch (e) {
  this.logger.error('Prune backups failed', e as any);
  return { deleted: 0 };
    }
  }
}
