import { Module } from '@nestjs/common';
import { ExcelBridgeModule } from './excel_brigde/excel-bridge.module';
import { ProjectModule } from './project/project.module';
import { QuoteModule } from './quote/quote.module';
import { ProgressModule } from './progress/progress.module';
import { PaymentModule } from './payment/payment.module';
import { ProfitAnalysisModule } from './profit_analysis/profit-analysis.module';
import { FilesModule } from './files/files.module';

@Module({
  imports: [
    ExcelBridgeModule,
    ProjectModule,
    QuoteModule,
    ProgressModule,
    PaymentModule,
    ProfitAnalysisModule,
    FilesModule,
  ],
})
export class AppModule {}
