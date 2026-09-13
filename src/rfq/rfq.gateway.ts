import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  WebSocketServer,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { RfqService, RFQPayload, QuotePayload } from './rfq.service';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: 'rfq',
})
export class RfqGateway {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(RfqGateway.name);

  constructor(private readonly rfqService: RfqService) {}

  @SubscribeMessage('submit_rfq')
  async handleSubmitRfq(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: RFQPayload,
  ) {
    try {
      const newRfq = await this.rfqService.createRfq(payload);

      // Broadcast new RFQ to all connected market makers
      this.server.emit('rfq_broadcast', newRfq);
      return { status: 'SUCCESS', rfq: newRfq };
    } catch (error) {
      this.logger.error('Failed to create RFQ', error instanceof Error ? error.stack : error);
      return { status: 'ERROR', message: (error as Error).message };
    }
  }

  @SubscribeMessage('submit_quote')
  async handleSubmitQuote(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: QuotePayload,
  ) {
    try {
      const result = await this.rfqService.submitQuote(payload);

      // Broadcast update to all clients
      this.server.emit('quote_broadcast', result);
      return { status: 'SUCCESS', result };
    } catch (error) {
      this.logger.error('Failed to submit quote', error instanceof Error ? error.stack : error);
      return { status: 'ERROR', message: (error as Error).message };
    }
  }

  @SubscribeMessage('accept_quote')
  async handleAcceptQuote(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { rfqId: string; quoteId: string },
  ) {
    try {
      const result = await this.rfqService.acceptQuote(payload.rfqId, payload.quoteId);

      // Broadcast accepted contract match
      this.server.emit('contract_matched', result);
      return { status: 'SUCCESS', result };
    } catch (error) {
      this.logger.error('Failed to accept quote', error instanceof Error ? error.stack : error);
      return { status: 'ERROR', message: (error as Error).message };
    }
  }

  @SubscribeMessage('get_open_rfqs')
  async handleGetOpenRfqs() {
    return this.rfqService.getOpenRfqs();
  }

  /**
   * Relays the on-chain contract ID once the Importer submits `create_forward`,
   * so the matched OTC Desk knows which contract to fund with `fund_desk_margin`.
   */
  @SubscribeMessage('escrow_created')
  handleEscrowCreated(
    @MessageBody()
    payload: { rfqId: string; quoteId: string; contractId: string; txHash: string },
  ) {
    this.server.emit('escrow_created', payload);
    return { status: 'SUCCESS' };
  }
}
