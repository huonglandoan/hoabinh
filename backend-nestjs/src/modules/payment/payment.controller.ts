import { Controller, Get, Post, Param, Body } from '@nestjs/common';
import { PaymentService } from './payment.service';

@Controller('projects/:projectId/payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Get()
  async getPaymentsInfo(@Param('projectId') projectId: string) {
    return this.paymentService.getPaymentsInfo(projectId);
  }

  @Post('generate')
  async generatePayment(
    @Param('projectId') projectId: string,
    @Body() body: { billingInfo: any; invoices: any[]; items: any[] },
  ) {
    return this.paymentService.generatePayment(
      projectId,
      body.billingInfo,
      body.invoices,
      body.items,
    );
  }
}
