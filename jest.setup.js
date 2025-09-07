import "@testing-library/jest-dom";

// Mock Next.js router
jest.mock("next/router", () => ({
  useRouter() {
    return {
      route: "/",
      pathname: "/",
      query: "",
      asPath: "",
      push: jest.fn(),
      pop: jest.fn(),
      reload: jest.fn(),
      back: jest.fn(),
      prefetch: jest.fn(),
      beforePopState: jest.fn(),
      events: {
        on: jest.fn(),
        off: jest.fn(),
        emit: jest.fn(),
      },
      isFallback: false,
    };
  },
}));

// Mock Next.js navigation (App Router)
jest.mock("next/navigation", () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
    };
  },
  useSearchParams() {
    return new URLSearchParams();
  },
  usePathname() {
    return "/";
  },
}));

// Mock environment variables for testing
process.env.NODE_ENV = "test";
process.env.NEXTAUTH_SECRET = "test-secret";
process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
process.env.UPSTASH_REDIS_REST_URL = "http://localhost:6379";
process.env.UPSTASH_REDIS_REST_TOKEN = "test-token";
process.env.UPSTASH_QSTASH_URL = "http://localhost:8080";
process.env.UPSTASH_QSTASH_TOKEN = "test-qstash-token";
process.env.RESEND_API_KEY = "test-resend-key";

// Mock Upstash Redis
jest.mock("@upstash/redis", () => ({
  Redis: jest.fn(() => ({
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    incr: jest.fn(),
    hincrby: jest.fn(),
    hget: jest.fn(),
    hset: jest.fn(),
    lpush: jest.fn(),
    lrange: jest.fn(),
    expire: jest.fn(),
    exists: jest.fn(),
    flushall: jest.fn(),
  })),
}));

// Mock Upstash QStash
jest.mock("@upstash/workflow", () => ({
  serve: jest.fn(),
  Client: jest.fn(() => ({
    scheduleJSON: jest.fn(),
    publish: jest.fn(),
    cancel: jest.fn(),
  })),
}));

// Mock database connection
jest.mock("@/database/drizzle", () => ({
  db: {
    select: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    transaction: jest.fn(),
  },
}));

// Mock NextAuth
jest.mock("next-auth", () => ({
  getServerSession: jest.fn(),
}));

// Global test timeout
jest.setTimeout(30000);
