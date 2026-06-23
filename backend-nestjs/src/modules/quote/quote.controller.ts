import { Controller, Get, Post, Param, Body } from '@nestjs/common';
import { QuoteService } from './quote.service';

@Controller('projects/:projectId/quotes')
export class QuoteController {
  constructor(private readonly quoteService: QuoteService) {}

  @Get()
  async getQuotesInfo(@Param('projectId') projectId: string) {
    return this.quoteService.getQuotesInfo(projectId);
  }

  @Post('process')
  async processQuote(
    @Param('projectId') projectId: string,
    @Body() body: { quoteData: any; purchaseOrders: any[] },
  ) {
    return this.quoteService.processQuote(projectId, body.quoteData, body.purchaseOrders);
  }

  @Post('sign')
  async signQuote(
    @Param('projectId') projectId: string,
    @Body() body: { version: string; fileName: string },
  ) {
    return this.quoteService.signQuote(projectId, body.version, body.fileName);
  }
}
