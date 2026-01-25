// lib/parallel/redis.ts
import { Redis } from 'ioredis';

const redisConfig = {
    host: '127.0.0.1',
    port: 6379,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
};

// Create SEPARATE Redis connections for queue and worker
// This is important for BullMQ to work correctly with concurrency

export const createRedisConnection = () => new Redis(redisConfig);

// Default connection (for queue)
export const redisConnection = createRedisConnection();

// Handle connection events
redisConnection.on('connect', () => {
    console.log('✅ Redis (Queue) connected successfully');
});

redisConnection.on('error', (error) => {
    console.error('❌ Redis (Queue) connection error:', error);
});

redisConnection.on('close', () => {
    console.log('⚠️ Redis (Queue) connection closed');
});

export default redisConnection;