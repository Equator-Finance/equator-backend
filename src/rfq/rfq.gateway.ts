import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  WebSocketServer,
  ConnectedSocket,
} from '@nestjs/websockets';
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

  constructor(private readonly rfqService: RfqService) {}

  @SubscribeMessage('submit_rfq')
  handleSubmitRfq(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: RFQPayload,
  ) {
    const rfqId = `rfq_${Date.now()}`;
    const newRfq = this.rfqService.createRfq(rfqId, payload);

    // Broadcast new RFQ to all connected market makers
    this.server.emit('rfq_broadcast', newRfq);
    return { status: 'SUCCESS', rfq: newRfq };
  }

  @SubscribeMessage('submit_quote')
  handleSubmitQuote(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: QuotePayload,
  ) {
    const quoteId = `quote_${Date.now()}`;
    const result = this.rfqService.submitQuote(quoteId, payload);

    // Broadcast update to all clients
    this.server.emit('quote_broadcast', result);
    return { status: 'SUCCESS', result };
  }

  @SubscribeMessage('accept_quote')
  handleAcceptQuote(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { rfqId: string; quoteId: string },
  ) {
    const result = this.rfqService.acceptQuote(payload.rfqId, payload.quoteId);

    // Broadcast accepted contract match
    this.server.emit('contract_matched', result);
    return { status: 'SUCCESS', result };
  }

  @SubscribeMessage('get_open_rfqs')
  handleGetOpenRfqs() {
    return this.rfqService.getOpenRfqs();
  }
}
