# Session Management

<cite>
**Referenced Files in This Document**   
- [auth.ts](file://auth.ts) - *Updated with role support in JWT and session callbacks*
- [components/admin/UserProfile.tsx](file://components\admin\UserProfile.tsx) - *Added logout confirmation dialog for admin users*
- [components/admin/Header.tsx](file://components\admin/Header.tsx) - *Integrates AdminUserProfile with session data*
- [lib/actions/auth.ts](file://lib\actions/auth.ts) - *Contains server-side authentication logic with rate limiting*
- [app/(root)/layout.tsx](file://app\(root)\layout.tsx) - *Root layout with session protection and activity tracking*
- [app/admin/layout.tsx](file://app\admin\layout.tsx) - *Admin layout with role-based access control*
- [app/api/clear-session/route.ts](file://app\api\clear-session\route.ts) - *API endpoint for clearing session*
- [components/UserProfile.tsx](file://components\UserProfile.tsx) - *Standard user profile component with logout functionality*
- [lib/utils.ts](file://lib\utils.ts) - *Utility function for generating user initials*
</cite>

## Update Summary
**Changes Made**   
- Added documentation for admin logout implementation with confirmation dialog
- Updated session data structure to include role information
- Enhanced client-side access patterns to reflect admin-specific components
- Added new section on logout implementation and user experience
- Updated diagram sources and section references to reflect code changes
- Added references to new admin-specific components and their integration

## Table of Contents
1. [Introduction](#introduction)
2. [Project Structure](#project-structure)
3. [Core Components](#core-components)
4. [Architecture Overview](#architecture-overview)
5. [Detailed Component Analysis](#detailed-component-analysis)
6. [Session Data Structure](#session-data-structure)
7. [Expiration Handling](#expiration-handling)
8. [Client-Side Access Patterns](#client-side-access-patterns)
9. [Logout Implementation](#logout-implementation)
10. [Dependency Analysis](#dependency-analysis)
11. [Performance Considerations](#performance-considerations)
12. [Troubleshooting Guide](#troubleshooting-guide)
13. [Conclusion](#conclusion)

## Introduction
This document provides a comprehensive overview of the session management system in the University LMS application. The system is built on NextAuth with JWT strategy for secure authentication and session handling. It covers the JWT implementation, token lifecycle, callback functions, security considerations, and integration with the Next.js application. The documentation also details the session data structure, expiration handling (implicit through JWT), and client-side access patterns used throughout the application. Recent updates include the implementation of a confirmation dialog for admin logout functionality and enhanced role-based access control.

## Project Structure
The session management system is primarily implemented through a combination of configuration files, API routes, and application components. The core authentication logic resides in the `auth.ts` file at the root level, while related functionality is distributed across the application structure.

``mermaid
graph TB
subgraph "Authentication Core"
auth[auth.ts]
middleware[middleware.ts]
end
subgraph "API Endpoints"
api_auth[api/auth/[...nextauth]/route.ts]
api_imagekit[api/auth/imagekit/auth/[...nextauth]/route.ts]
end
subgraph "Application Routes"
sign_in[app/(auth)/sign-in/page.tsx]
sign_up[app/(auth)/sign-up/page.tsx]
root_layout[app/(root)/layout.tsx]
admin_layout[app/admin/layout.tsx]
end
subgraph "Supporting Components"
actions[lib/actions/auth.ts]
schema[database/schema.ts]
admin_profile[components/admin/UserProfile.tsx]
standard_profile[components/UserProfile.tsx]
end
auth --> middleware
auth --> api_auth
api_auth --> api_imagekit
auth --> actions
actions --> sign_in
actions --> sign_up
auth --> root_layout
auth --> admin_layout
root_layout --> Header
admin_layout --> AdminHeader
admin_layout --> AdminSidebar
admin_profile --> AdminHeader
standard_profile --> Header
```

**Diagram sources**
- [auth.ts](file://auth.ts)
- [middleware.ts](file://middleware.ts)
- [app/api/auth/imagekit/auth/[...nextauth]/route.ts](file://app\api\auth\imagekit\auth\[...nextauth]\route.ts)
- [app/(auth)/sign-in/page.tsx](file://app\(auth)\sign-in\page.tsx)
- [app/(root)/layout.tsx](file://app\(root)\layout.tsx)
- [app/admin/layout.tsx](file://app\admin\layout.tsx)
- [lib/actions/auth.ts](file://lib\actions\auth.ts)
- [components/admin/UserProfile.tsx](file://components\admin\UserProfile.tsx)
- [components/UserProfile.tsx](file://components\UserProfile.tsx)

## Core Components
The session management system consists of several core components that work together to provide secure authentication and session handling:

- **NextAuth Configuration**: Centralized in `auth.ts`, defining the JWT strategy and callbacks
- **Credentials Provider**: Handles email/password authentication against the database
- **JWT Callbacks**: Manage token creation and session population, now including role information
- **Session Access**: Client-side access through the `auth()` function
- **Route Protection**: Implemented via middleware and layout-level checks
- **Logout Functionality**: Enhanced with confirmation dialogs in user profile components

The system uses a JWT-based session strategy where tokens are signed and contain user information, eliminating the need for server-side session storage. Recent updates have added role-based access control and improved logout user experience.

**Section sources**
- [auth.ts](file://auth.ts)
- [lib/actions/auth.ts](file://lib\actions\auth.ts)
- [components/admin/UserProfile.tsx](file://components\admin\UserProfile.tsx)

## Architecture Overview
The session management architecture follows a JWT-based approach where authentication state is maintained through cryptographically signed tokens. When a user authenticates, a JWT is created containing user information and signed with a secret key. This token is then used for subsequent requests to verify the user's identity.

``mermaid
sequenceDiagram
participant Client as "Client Application"
participant Auth as "Auth System"
participant DB as "Database"
participant Session as "Session Management"
Client->>Auth : Submit credentials (email/password)
Auth->>DB : Query user by email
DB-->>Auth : Return user record
Auth->>Auth : Verify password hash
Auth->>Auth : Create JWT token
Auth->>Session : Execute jwt callback
Session->>Session : Add user ID, name, and role to token
Session->>Session : Execute session callback
Session->>Session : Populate session with token data
Session-->>Client : Return session with JWT
Client->>Client : Store JWT (in cookie)
loop Subsequent Requests
Client->>Auth : Include JWT in request
Auth->>Auth : Verify JWT signature
Auth->>Auth : Extract user data from JWT
Auth-->>Client : Grant access with user context
end
```

**Diagram sources**
- [auth.ts](file://auth.ts)
- [lib/actions/auth.ts](file://lib\actions\auth.ts)

## Detailed Component Analysis

### JWT Strategy Implementation
The application implements a JWT-based session strategy, which means session data is stored within a signed JSON Web Token rather than server-side storage. This approach provides scalability and stateless authentication.

``mermaid
classDiagram
class NextAuthConfig {
+session : object
+providers : array
+callbacks : object
+pages : object
}
class SessionStrategy {
+strategy : "jwt"
}
class CredentialsProvider {
+authorize(credentials) : User | null
}
class Callbacks {
+jwt({ token, user }) : JWT
+session({ session, token }) : Session
}
NextAuthConfig --> SessionStrategy : "uses"
NextAuthConfig --> CredentialsProvider : "includes"
NextAuthConfig --> Callbacks : "defines"
Callbacks --> SessionStrategy : "extends"
```

**Diagram sources**
- [auth.ts](file://auth.ts)

#### JWT Token Lifecycle
The JWT token lifecycle in this application follows a standard flow from creation to validation:

1. **Token Creation**: After successful credential verification, a JWT is created
2. **Token Signing**: The token is signed using a secret key for integrity
3. **Token Storage**: The signed token is stored in an HTTP-only cookie
4. **Token Validation**: On subsequent requests, the token signature is verified
5. **Token Expiration**: Tokens expire based on the default NextAuth configuration

The system does not explicitly set expiration times in the configuration, relying on NextAuth's default behavior. The JWT contains user information that persists for the duration of the session. The updated implementation now includes the user's role in the token, enabling role-based access control.

**Section sources**
- [auth.ts](file://auth.ts)

### Callback Implementations
The session management system implements two critical callbacks that handle the transformation between JWT tokens and session objects.

#### JWT Callback
The `jwt` callback is executed when a JWT is created or updated. It receives the token and user objects and returns the modified token.

```typescript
async jwt({ token, user }) {
  if (user) {
    token.id = user.id;
    token.name = user.name;
    token.role = user.role;
  }
  return token;
}
```

This callback adds the user's ID, name, and role to the JWT token when a user first signs in. On subsequent calls, the user parameter is not present, so the token is simply returned as-is.

#### Session Callback
The `session` callback is executed when a session is created or updated. It receives the session and token objects and returns the modified session.

```typescript
async session({ session, token }) {
  if (session.user) {
    session.user.id = token.id as string;
    session.user.name = token.name as string;
    session.user.role = token.role as string;
  }
  return session;
}
```

This callback populates the session object with user data extracted from the JWT token, making it available to the application.

``mermaid
flowchart TD
Start([jwt callback]) --> CheckUser{"User exists?"}
CheckUser --> |Yes| AddUserData["Add id, name, and role to token"]
AddUserData --> ReturnToken["Return modified token"]
CheckUser --> |No| ReturnToken
Start2([session callback]) --> CheckSession{"Session has user?"}
CheckSession --> |Yes| PopulateSession["Populate session with token data"]
PopulateSession --> ReturnSession["Return modified session"]
CheckSession --> |No| ReturnSession
ReturnToken --> End1([Complete])
ReturnSession --> End2([Complete])
```

**Diagram sources**
- [auth.ts](file://auth.ts)

**Section sources**
- [auth.ts](file://auth.ts)

### Security Considerations
The session management system incorporates several security measures to protect user authentication:

- **Password Hashing**: User passwords are hashed using bcryptjs before storage
- **JWT Signing**: Tokens are cryptographically signed to prevent tampering
- **Rate Limiting**: Authentication attempts are rate-limited to prevent brute force attacks
- **HTTP-only Cookies**: JWT tokens are stored in HTTP-only cookies to prevent XSS attacks
- **Secure Credential Handling**: Credentials are validated and sanitized before use
- **Role-Based Access Control**: Admin routes verify user role in database

The system uses bcryptjs to hash passwords with a salt factor of 10, providing strong protection against password cracking. Rate limiting is implemented using Upstash Ratelimit, limiting authentication attempts to 5 per minute per IP address. The admin layout includes an additional database check to verify the user's role, preventing privilege escalation if the JWT is compromised.

``mermaid
graph TD
A[Authentication Request] --> B{Rate Limit Check}
B --> |Within Limit| C[Verify Credentials]
B --> |Exceeded Limit| D[Reject Request]
C --> E{Valid Credentials?}
E --> |Yes| F[Create Signed JWT with Role]
E --> |No| G[Return Error]
F --> H[Store in HTTP-only Cookie]
H --> I[Grant Access]
I --> J{Admin Route?}
J --> |Yes| K[Verify Role in Database]
K --> |Valid| L[Allow Access]
K --> |Invalid| M[Redirect to Home]
```

**Diagram sources**
- [lib/actions/auth.ts](file://lib\actions\auth.ts)
- [auth.ts](file://auth.ts)
- [app/admin/layout.tsx](file://app\admin\layout.tsx)

**Section sources**
- [lib/actions/auth.ts](file://lib\actions\auth.ts)
- [auth.ts](file://auth.ts)
- [app/admin/layout.tsx](file://app\admin\layout.tsx)

### Integration with NextAuth
The application integrates with NextAuth through several entry points that expose authentication functionality to different parts of the system.

#### API Route Integration
The authentication API endpoints are configured to handle authentication requests:

```typescript
import { handlers } from "@/auth";
export const { GET, POST } = handlers;
```

This pattern is used in both the main authentication route and the ImageKit authentication route, providing a consistent interface for authentication handlers.

#### Middleware Integration
The application uses NextAuth's middleware for route protection:

```typescript
export { auth as middleware } from "@/auth";
```

This configuration protects all routes by default, requiring authentication for access. The middleware automatically handles JWT verification and session management.

#### Client-Side Integration
The `auth()` function is used throughout the application to access the current session:

```typescript
const session = await auth();
if (!session) redirect("/sign-in");
```

This pattern is used in layout components to protect authenticated routes and provide session data to the UI.

``mermaid
graph TB
subgraph "Integration Points"
API[API Routes]
Middleware[Middleware]
Client[Client Components]
end
subgraph "NextAuth Core"
Config[auth.ts Configuration]
end
API --> Config
Middleware --> Config
Client --> Config
Config --> JWT[JWT Token]
JWT --> Client
JWT --> Middleware
style Config fill:#4CAF50,stroke:#388E3C
style API fill:#2196F3,stroke:#1976D2
style Middleware fill:#2196F3,stroke:#1976D2
style Client fill:#2196F3,stroke:#1976D2
```

**Diagram sources**
- [auth.ts](file://auth.ts)
- [middleware.ts](file://middleware.ts)
- [app/api/auth/imagekit/auth/[...nextauth]/route.ts](file://app\api\auth\imagekit\auth\[...nextauth]\route.ts)
- [app/(root)/layout.tsx](file://app\(root)\layout.tsx)

## Session Data Structure
The session data structure in this application consists of both the JWT token and the session object that is made available to the application.

### JWT Token Structure
The JWT token contains the following claims:

- **id**: User ID as a string
- **name**: User's full name
- **role**: User's role (ADMIN or USER)
- **email**: User's email address (from base User object)
- Standard JWT claims (iss, sub, aud, exp, iat, etc.)

The token is signed using the secret configured in the environment variables, ensuring its integrity.

### Session Object Structure
The session object available to the application contains:

```typescript
{
  user: {
    id: string,
    email: string,
    name: string,
    role: string
  },
  expires: string // ISO date string
}
```

This structure is populated by the session callback using data from the JWT token.

``mermaid
erDiagram
JWT_TOKEN {
string id PK
string name
string role
string email
timestamp iat
timestamp exp
}
SESSION {
object user
timestamp expires
}
USER_DATA {
string id PK
string email UK
string name
string role
}
JWT_TOKEN ||--o{ SESSION : "populates"
JWT_TOKEN }|--|| USER_DATA : "contains"
SESSION }|--|| USER_DATA : "exposes"
```

**Diagram sources**
- [auth.ts](file://auth.ts)
- [database/schema.ts](file://database\schema.ts)

**Section sources**
- [auth.ts](file://auth.ts)
- [database/schema.ts](file://database\schema.ts)

## Expiration Handling
The application relies on NextAuth's default session expiration behavior without explicit configuration of expiration times. The JWT-based strategy means that session expiration is handled through the token's built-in expiration claim (exp).

When a JWT is created, NextAuth automatically sets an expiration time based on its default configuration. The exact duration is not specified in the code, meaning it uses the framework's default values. Typically, NextAuth sets a 30-day expiration for JWT sessions, but this can vary based on the version and deployment environment.

The system does not implement refresh tokens or sliding sessions. When a token expires, the user must re-authenticate by signing in again. The middleware and layout components handle expired sessions by redirecting to the sign-in page.

``mermaid
sequenceDiagram
participant Client
participant Server
participant JWT
Client->>Server : Request with expired JWT
Server->>JWT : Verify token signature and expiration
JWT-->>Server : Return "expired" status
Server->>Client : Redirect to /sign-in
Client->>Client : Clear expired session
```

**Diagram sources**
- [auth.ts](file://auth.ts)
- [middleware.ts](file://middleware.ts)
- [app/(root)/layout.tsx](file://app\(root)\layout.tsx)

## Client-Side Access Patterns
The application uses consistent patterns for accessing session data on the client side.

### Layout-Level Protection
Authenticated routes use layout components to protect access and provide session data:

```typescript
const layout = async({ children }: { children: ReactNode }) => {
    const session = await auth();
    if (!session) redirect("/sign-in");
    return (
        <main>
            <Header session={session}/>
            <div>{children}</div>
        </main>
    );
};
```

This pattern ensures that only authenticated users can access protected routes and makes the session available to child components.

### Component-Level Access
Individual components can access the session data through the `auth()` function:

```typescript
const Header = ({ session }: { session: Session }) => {
    return (
        <header>
            <AvatarFallback>
                {getInitials(session?.user?.name || "IN")}
            </AvatarFallback>
        </header>
    );
};
```

The session data is passed as a prop from parent components that have already retrieved it.

### Server Actions
Server actions can also access the current session:

```typescript
"use server";
import { signOut } from "@/auth";

const Page = () => {
    return (
        <form action={async () => {
            "use server";
            await signOut();
        }}>
            <Button>Logout</Button>
        </form>
    );
};
```

This pattern allows server-side functions to access authentication state and perform authentication-related operations.

``mermaid
flowchart TD
A[Route Request] --> B{Is Authenticated?}
B --> |Yes| C[Retrieve Session via auth()]
B --> |No| D[Redirect to Sign-in]
C --> E[Pass Session to Components]
E --> F[Display User-Specific Content]
F --> G[Handle User Actions]
G --> H{Requires Auth?}
H --> |Yes| I[Use auth() in Server Action]
H --> |No| J[Proceed with Action]
```

**Diagram sources**
- [app/(root)/layout.tsx](file://app\(root)\layout.tsx)
- [components/Header.tsx](file://components\Header.tsx)
- [app/(root)/my-profile/page.tsx](file://app\(root)\my-profile\page.tsx)

**Section sources**
- [app/(root)/layout.tsx](file://app\(root)\layout.tsx)
- [components/Header.tsx](file://components\Header.tsx)
- [app/(root)/my-profile/page.tsx](file://app\(root)\my-profile\page.tsx)

## Logout Implementation
The application implements a consistent logout pattern across both standard and admin user interfaces, with enhanced user experience features.

### Confirmation Dialog
Both user profile components implement a confirmation dialog to prevent accidental logout:

```typescript
const handleLogout = async () => {
    await signOut({ callbackUrl: "/sign-in" });
};

<AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
    <AlertDialogContent>
        <AlertDialogHeader>
            <AlertDialogTitle>
                Are you sure you want to logout?
            </AlertDialogTitle>
            <AlertDialogDescription>
                This will end your current session and you'll need to sign
                in again to access your account.
            </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
            <AlertDialogCancel>No, Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleLogout}>
                Yes, Logout
            </AlertDialogAction>
        </AlertDialogFooter>
    </AlertDialogContent>
</AlertDialog>
```

The admin version uses a specific message indicating access to the admin panel.

### SignOut Implementation
The logout functionality uses NextAuth's signOut function with a callback URL:

```typescript
import { signOut } from "next-auth/react";

await signOut({ callbackUrl: "/sign-in" });
```

This clears the authentication session and redirects the user to the sign-in page.

### API Endpoint
The application also provides an API endpoint for clearing sessions:

```typescript
import { signOut } from "@/auth";

export async function POST() {
    await signOut({ redirect: false });
    return NextResponse.json({ success: true });
}
```

This endpoint can be used by server-side processes to programmatically clear sessions.

``mermaid
flowchart TD
A[User Clicks Sign Out] --> B{Show Confirmation Dialog?}
B --> |Yes| C[Display AlertDialog]
C --> D{User Confirms?}
D --> |Yes| E[Call signOut() with callbackUrl]
D --> |No| F[Cancel Logout]
B --> |No| E
E --> G[Clear JWT Cookie]
G --> H[Redirect to /sign-in]
H --> I[User Must Re-authenticate]
```

**Diagram sources**
- [components/admin/UserProfile.tsx](file://components\admin\UserProfile.tsx)
- [components/UserProfile.tsx](file://components\UserProfile.tsx)
- [app/api/clear-session/route.ts](file://app\api\clear-session\route.ts)

**Section sources**
- [components/admin/UserProfile.tsx](file://components\admin\UserProfile.tsx)
- [components/UserProfile.tsx](file://components\UserProfile.tsx)
- [app/api/clear-session/route.ts](file://app\api\clear-session\route.ts)

## Dependency Analysis
The session management system depends on several external packages and internal modules to function correctly.

``mermaid
graph TD
NextAuth[NextAuth] --> bcrypt[built-in bcrypt]
NextAuth --> jose[jose]
NextAuth --> oauth4webapi[oauth4webapi]
NextAuth --> drizzle[Drizzle ORM]
NextAuth --> redis[Upstash Redis]
app[Application] --> NextAuth
app --> ratelimit[Upstash Ratelimit]
app --> drizzle
app --> redis
style NextAuth fill:#9C27B0,stroke:#7B1FA2
style bcrypt fill:#607D8B,stroke:#455A64
style jose fill:#607D8B,stroke:#455A64
style oauth4webapi fill:#607D8B,stroke:#455A64
style drizzle fill:#607D8B,stroke:#455A64
style redis fill:#607D8B,stroke:#455A64
style ratelimit fill:#607D8B,stroke:#455A64
style app fill:#03A9F4,stroke:#0288D1
```

**Diagram sources**
- [package-lock.json](file://package-lock.json)
- [auth.ts](file://auth.ts)
- [lib/actions/auth.ts](file://lib\actions\auth.ts)

**Section sources**
- [package-lock.json](file://package-lock.json)
- [auth.ts](file://auth.ts)
- [lib/actions/auth.ts](file://lib\actions\auth.ts)

## Performance Considerations
The JWT-based session strategy provides several performance benefits:

- **Stateless Authentication**: No database queries needed to validate sessions
- **Scalability**: Can handle increased load without session storage bottlenecks
- **Reduced Latency**: Session data is contained within the token, eliminating round trips to session storage

However, there are some considerations:

- **Token Size**: JWT tokens contain user data, making them larger than session IDs
- **Memory Usage**: Tokens are stored in cookies and memory on both client and server
- **Validation Overhead**: Each request requires JWT signature verification

The rate limiting implementation using Upstash Redis adds minimal overhead while providing protection against brute force attacks.

## Troubleshooting Guide
Common issues and their solutions:

### Authentication Fails with Valid Credentials
**Possible Causes:**
- Incorrect password hashing
- Database connection issues
- Email case sensitivity

**Solutions:**
- Verify the bcrypt hash comparison is working correctly
- Check database connectivity and query results
- Ensure email comparison is case-insensitive

### Session Not Persisting
**Possible Causes:**
- Cookie settings (HTTP-only, Secure flags)
- Domain mismatch between application and cookie
- Browser privacy settings blocking cookies

**Solutions:**
- Verify cookie configuration in NextAuth
- Ensure consistent domain usage
- Test in different browsers

### Rate Limiting Too Aggressive
**Possible Causes:**
- IP detection issues in proxy environments
- Shared IP addresses (corporate networks, universities)

**Solutions:**
- Adjust rate limiting window and count
- Consider alternative rate limiting strategies for shared environments

### Admin Access Denied
**Possible Causes:**
- User role not properly set in database
- JWT token not updated with latest role information
- Browser caching old session data

**Solutions:**
- Verify user role in database
- Use the clear-session API endpoint to force session refresh
- Clear browser cache and re-authenticate

**Section sources**
- [lib/actions/auth.ts](file://lib\actions\auth.ts)
- [auth.ts](file://auth.ts)
- [lib/ratelimit.ts](file://lib\ratelimit.ts)
- [app/admin/layout.tsx](file://app\admin\layout.tsx)

## Conclusion
The session management system in the University LMS application provides a robust, secure authentication solution using NextAuth with JWT strategy. The implementation effectively handles user authentication, session persistence, and access control through a combination of server-side logic and client-side patterns. Key strengths include the stateless JWT approach, comprehensive security measures, and consistent integration patterns throughout the application. Recent updates have enhanced the system with role-based access control and improved user experience through confirmation dialogs for logout functionality. The current implementation provides a solid foundation for secure authentication, though it could be further enhanced by explicitly configuring session expiration times and implementing refresh tokens for improved user experience.