# Rate Limiting

<cite>
**Referenced Files in This Document**   
- [lib/ratelimit.ts](file://lib/ratelimit.ts#L1-L11)
- [database/redis.ts](file://database/redis.ts#L1-L8)
- [lib/config.ts](file://lib/config.ts#L1-L21)
- [lib/actions/auth.ts](file://lib/actions/auth.ts#L1-L85)
- [app/too-fast/page.tsx](file://app/too-fast/page.tsx#L1-L17)
</cite>

## Table of Contents
1. [Introduction](#introduction)
2. [Rate Limiting Configuration](#rate-limiting-configuration)
3. [Redis Integration](#redis-integration)
4. [Application in Authentication Flow](#application-in-authentication-flow)
5. [User Experience on Rate Limit Exceeded](#user-experience-on-rate-limit-exceeded)
6. [Technical Architecture](#technical-architecture)
7. [Error Handling and Security Benefits](#error-handling-and-security-benefits)

## Introduction
The Rate Limiting system in the University LMS application is designed to prevent abuse of critical endpoints, particularly authentication flows such as sign-in and sign-up. It enforces a strict limit of 5 requests per minute per client IP address using a fixed-window algorithm. This mechanism protects the system from brute-force attacks, credential stuffing, and denial-of-service attempts while maintaining a fair usage policy for legitimate users.

The implementation leverages Upstash Redis for distributed rate tracking and is seamlessly integrated into server-side actions via Next.js. When limits are exceeded, users are redirected to a dedicated error page with a friendly message.

## Rate Limiting Configuration
The rate limiting logic is centralized in `lib/ratelimit.ts` and configured with the following parameters:

```typescript
import { Ratelimit } from "@upstash/ratelimit";
import redis from "@/database/redis";

const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.fixedWindow(5, "1m"),
  analytics: true,
  prefix: "@upstash/ratelimit",
});

export default ratelimit;
```

**Configuration Details:**
- **Algorithm**: Fixed Window (5 requests per 1 minute)
- **Identifier**: Client IP address (extracted from `x-forwarded-for` header)
- **Analytics**: Enabled for monitoring and debugging
- **Storage Prefix**: `@upstash/ratelimit` (namespaced in Redis)

This configuration ensures that no single IP can make more than five authenticated requests within any 60-second window.

**Section sources**
- [lib/ratelimit.ts](file://lib/ratelimit.ts#L1-L11)

## Redis Integration
The rate limiting system relies on Upstash Redis as a persistent, low-latency storage backend for tracking request counts across distributed instances.

### Redis Client Setup
The Redis connection is initialized in `database/redis.ts` using environment variables:

```typescript
import { Redis } from "@upstash/redis";
import config from "@/lib/config";

const redis = new Redis({
  url: config.env.upstash.redisUrl,
  token: config.env.upstash.redisToken,
});

export default redis;
```

### Environment Configuration
Connection details are securely loaded from environment variables via `lib/config.ts`:

```typescript
const config = {
  env: {
    upstash: {
      redisUrl: process.env.UPSTASH_REDIS_REST_URL!,
      redisToken: process.env.UPSTASH_REDIS_REST_TOKEN!,
      qstashUrl: process.env.QSTASH_URL!,
      qstashToken: process.env.QSTASH_TOKEN!,
    },
    // ... other config
  },
};
```

This architecture enables horizontal scaling and consistent rate tracking across serverless functions and multiple deployment regions.

**Section sources**
- [database/redis.ts](file://database/redis.ts#L1-L8)
- [lib/config.ts](file://lib/config.ts#L1-L21)

## Application in Authentication Flow
Rate limiting is applied to both sign-in and sign-up actions in `lib/actions/auth.ts`. The system extracts the client IP and checks limits before proceeding.

### Sign-In Flow with Rate Limiting
```typescript
export const signInWithCredentials = async (
  params: Pick<AuthCredentials, "email" | "password">,
) => {
  const ip = (await headers()).get("x-forwarded-for") || "127.0.0.1";
  const { success } = await ratelimit.limit(ip);

  if (!success) return redirect("/too-fast");

  // Proceed with authentication
  try {
    const result = await signIn("credentials", { email, password, redirect: false });
    // ... handle result
  } catch (error) {
    return { success: false, error: "Signin error" };
  }
};
```

### Sign-Up Flow with Rate Limiting
Identical rate limiting is applied to user registration:

```typescript
export const signUp = async (params: AuthCredentials) => {
  const ip = (await headers()).get("x-forwarded-for") || "127.0.0.1";
  const { success } = await ratelimit.limit(ip);

  if (!success) return redirect("/too-fast");
  
  // Proceed with user creation
  // ...
};
```

Both flows use the same rate limit instance, ensuring unified protection across authentication endpoints.

``mermaid
sequenceDiagram
participant Client
participant AuthAction
participant RateLimit
participant Redis
participant NextAuth
Client->>AuthAction : Submit Sign-In/Up
AuthAction->>AuthAction : Extract IP from headers
AuthAction->>RateLimit : limit(ip)
RateLimit->>Redis : INCR & EXPIRE key
Redis-->>RateLimit : Current count
RateLimit-->>AuthAction : {success : boolean}
alt Rate Limit Exceeded
AuthAction->>Client : Redirect to /too-fast
else Within Limit
AuthAction->>NextAuth : Proceed with authentication
NextAuth-->>Client : Authentication result
end
```

**Diagram sources**
- [lib/actions/auth.ts](file://lib/actions/auth.ts#L20-L50)
- [lib/ratelimit.ts](file://lib/ratelimit.ts#L1-L11)

**Section sources**
- [lib/actions/auth.ts](file://lib/actions/auth.ts#L1-L85)

## User Experience on Rate Limit Exceeded
When a user exceeds the rate limit, they are redirected to a dedicated error page at `/too-fast`, which provides a clear, user-friendly message.

### Too-Fast Page Implementation
```tsx
const Page = () => {
  return (
    <main className="root-container flex min-h-screen flex-col items-center justify-center">
      <h1 className="font-bebas-neue text-5xl font-bold text-light-100">
        Whoa, Slow Down There, Speedy!
      </h1>
      <p className="mt-3 max-w-xl text-center text-light-400">
        Looks like you&apos;ve been a little too eager. We&apos;ve put a
        temporary pause on your excitement. 🚦 Chill for a bit, and try again
        shortly
      </p>
    </main>
  );
};
```

The page uses a playful tone with emojis and clear instructions, reducing user frustration while enforcing security policies.

``mermaid
flowchart TD
A[User Request] --> B{Within 5/min?}
B --> |Yes| C[Process Request]
B --> |No| D[Redirect to /too-fast]
D --> E[Display Friendly Error]
E --> F[Wait for Window Reset]
F --> B
```

**Diagram sources**
- [app/too-fast/page.tsx](file://app/too-fast/page.tsx#L1-L17)

**Section sources**
- [app/too-fast/page.tsx](file://app/too-fast/page.tsx#L1-L17)

## Technical Architecture
The rate limiting system follows a layered architecture with clear separation of concerns:

``mermaid
graph TB
subgraph "Application Layer"
A[Auth Actions] --> B[Ratelimit Service]
end
subgraph "Infrastructure Layer"
B --> C[Upstash Redis]
D[Environment Config] --> B
end
subgraph "Presentation Layer"
E[Too-Fast Page] --> F[User]
end
A --> |Redirect on fail| E
B --> |Rate check| C
D --> |Connection config| C
style A fill:#f9f,stroke:#333
style B fill:#bbf,stroke:#333
style C fill:#f96,stroke:#333
style E fill:#6f9,stroke:#333
```

**Key Components:**
- **Ratelimit Service**: Centralized rate limiting logic
- **Redis Backend**: Distributed, persistent counter storage
- **IP-Based Identification**: Client identification via `x-forwarded-for`
- **Fixed Window Algorithm**: Simple, predictable rate enforcement
- **Graceful Degradation**: User-friendly error page instead of hard blocks

**Diagram sources**
- [lib/ratelimit.ts](file://lib/ratelimit.ts#L1-L11)
- [database/redis.ts](file://database/redis.ts#L1-L8)
- [lib/actions/auth.ts](file://lib/actions/auth.ts#L1-L85)

## Error Handling and Security Benefits
The rate limiting implementation provides robust error handling and significant security advantages:

### Error Handling Strategy
- **Silent Failure Prevention**: Rate limit checks occur before authentication attempts
- **Clear User Feedback**: Friendly error page with actionable guidance
- **No Information Leakage**: Error message does not reveal system internals
- **Automatic Recovery**: Limits reset after 1-minute window without manual intervention

### Security Benefits
- **Brute Force Protection**: Prevents password guessing attacks
- **Credential Stuffing Mitigation**: Limits automated login attempts
- **DoS Resistance**: Reduces impact of request flooding
- **Account Lockout Avoidance**: Uses temporary throttling instead of permanent locks
- **Distributed Tracking**: Consistent enforcement across serverless instances

The system strikes a balance between security and usability by allowing reasonable usage patterns while blocking abusive behavior.

**Section sources**
- [lib/actions/auth.ts](file://lib/actions/auth.ts#L21-L47)
- [app/too-fast/page.tsx](file://app/too-fast/page.tsx#L1-L17)