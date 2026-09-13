import { IoAdapter } from '@nestjs/platform-socket.io';
import { INestApplicationContext, Logger } from '@nestjs/common';
import { ServerOptions } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';

/**
 * Backs the RFQ WebSocket gateway with a Redis Pub/Sub adapter so
 * `server.emit(...)` broadcasts reach every connected client even when
 * multiple `equator-backend` instances are running behind a load balancer.
 */
export class RedisIoAdapter extends IoAdapter {
  private readonly logger = new Logger(RedisIoAdapter.name);
  private adapterConstructor: ReturnType<typeof createAdapter>;

  constructor(
    app: INestApplicationContext,
    private readonly redisUrl: string,
  ) {
    super(app);
  }

  async connectToRedis(): Promise<void> {
    const pubClient = new Redis(this.redisUrl);
    const subClient = pubClient.duplicate();

    pubClient.on('error', (err) => this.logger.error('Redis pub client error', err));
    subClient.on('error', (err) => this.logger.error('Redis sub client error', err));

    this.adapterConstructor = createAdapter(pubClient, subClient);
    this.logger.log(`Connected Socket.IO Redis adapter to ${this.redisUrl}`);
  }

  createIOServer(port: number, options?: ServerOptions) {
    const server = super.createIOServer(port, options);
    server.adapter(this.adapterConstructor);
    return server;
  }
}
