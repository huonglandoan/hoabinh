import { Module } from '@nestjs/common';
import { QuoteService } from './quote.service';
import { QuoteController } from './quote.controller';
import { BackupService } from '../backup/backup.service';

@Module({
  controllers: [QuoteController],
  providers: [QuoteService, BackupService],
  exports: [QuoteService],
})
export class QuoteModule {}
