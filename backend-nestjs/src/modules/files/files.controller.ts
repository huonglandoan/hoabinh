import { Controller, Get, Query, Res, BadRequestException, NotFoundException } from '@nestjs/common';
import * as express from 'express';
import * as path from 'path';
import * as fs from 'fs';

@Controller('files')
export class FilesController {
  @Get('download')
  downloadFile(@Query('path') relPath: string, @Res() res: express.Response) {
    if (!relPath) {
      throw new BadRequestException('Path query parameter is required');
    }

    // Security check to prevent directory traversal
    const normalized = path.normalize(relPath);
    if (normalized.includes('..') || path.isAbsolute(normalized)) {
      throw new BadRequestException('Access denied: Invalid file path');
    }

    // Root data directory is 4 levels up from this build output
    const absPath = path.resolve(__dirname, '../../../../data', normalized);

    if (!fs.existsSync(absPath)) {
      throw new NotFoundException('Requested file does not exist');
    }

    res.download(absPath);
  }
}
