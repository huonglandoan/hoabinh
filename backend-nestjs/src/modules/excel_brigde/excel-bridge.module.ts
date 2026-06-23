import { Module, Global } from '@nestjs/common';
import { ExcelBridgeService } from './excel-bridge.service';

@Global()
@Module({
  providers: [ExcelBridgeService],
  exports: [ExcelBridgeService],
})
export class ExcelBridgeModule {}
