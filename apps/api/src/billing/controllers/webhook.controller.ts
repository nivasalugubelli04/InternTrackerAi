import { Controller, Post, Req, Headers, BadRequestException, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Request } from 'express';
import { WebhookService } from '../services/webhook.service';

@ApiTags('Billing')
@Controller('billing/webhooks')
export class WebhookController {
  constructor(private readonly webhookService: WebhookService) {}

  @Post('razorpay')
  @HttpCode(200) // Webhooks expect 200 OK
  @ApiOperation({ summary: 'Razorpay webhook endpoint' })
  async handleRazorpayWebhook(
    @Req() req: Request,
    @Headers('x-razorpay-signature') signature: string,
  ) {
    if (!signature) {
      throw new BadRequestException('Missing signature');
    }

    const rawBody = (req as any).rawBody || JSON.stringify(req.body);
    
    // We pass to the service for validation and idempotency handling
    await this.webhookService.processWebhook({
      provider: 'RAZORPAY',
      eventId: req.headers['x-razorpay-event-id'] as string || req.body?.id || `webhook_${Date.now()}`,
      eventType: req.body?.event,
      payload: req.body,
      rawBody: rawBody,
      signature: signature,
    });

    return { status: 'ok' };
  }
}
