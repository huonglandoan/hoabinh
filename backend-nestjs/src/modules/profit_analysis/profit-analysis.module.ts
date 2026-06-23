import { Module } from '@nestjs/common';
import { ProfitAnalysisService } from './profit-analysis.service';
import { ProfitAnalysisController } from './profit-analysis.controller';

@Module({
  controllers: [ProfitAnalysisController],
  providers: [ProfitAnalysisService],
  exports: [ProfitAnalysisService],
})
export class ProfitAnalysisModule {}
