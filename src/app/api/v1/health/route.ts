import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRedisClient } from "@/lib/parallel/redis";

export async function GET() {
  const healthChecks = {
    status: "healthy",
    timestamp: new Date().toISOString(),
    checks: {
      database: "pending",
      redis: "pending",
      memory: "ok",
    },
  };

  try {
    // Check Database
    try {
      await prisma.$queryRaw`SELECT 1`;
      healthChecks.checks.database = "ok";
    } catch (error) {
      healthChecks.checks.database = "failed";
      console.error("DB health check failed:", error);
    }

    // Check Redis
    try {
      const redis = await getRedisClient();
      await redis.ping();
      healthChecks.checks.redis = "ok";
    } catch (error) {
      healthChecks.checks.redis = "failed";
      console.error("Redis health check failed:", error);
    }

    // Check memory
    const memUsage = process.memoryUsage();
    const memPercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
    if (memPercent > 90) {
      healthChecks.checks.memory = "warning";
    }

    // Determine overall status
    const isHealthy =
      healthChecks.checks.database === "ok" &&
      healthChecks.checks.redis === "ok";

    return NextResponse.json(healthChecks, {
      status: isHealthy ? 200 : 503,
    });
  } catch (error) {
    console.error("Health check error:", error);
    return NextResponse.json(
      {
        status: "unhealthy",
        error: "Internal error",
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}

// Disable caching for health checks
export const revalidate = 0;