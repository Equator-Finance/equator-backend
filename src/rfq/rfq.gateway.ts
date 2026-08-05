import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  WebSocketServer,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { RfqService, RFQPayload } from './rfq.service';

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
    return { status: 'SUCCESS', rfqId };
  }
}
