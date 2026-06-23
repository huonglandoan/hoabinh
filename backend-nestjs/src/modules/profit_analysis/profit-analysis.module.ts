import { Module } from '@nestjs/common';
import { ProfitAnalysisService } from './profit-analysis.service';
import { ProfitAnalysisController } from './profit-analysis.controller';
import { BackupModule } from '../backup/backup.module';

@Module({
  imports: [BackupModule],
  controllers: [ProfitAnalysisController],
  providers: [ProfitAnalysisService],
  exports: [ProfitAnalysisService],
})
export class ProfitAnalysisModule {}
