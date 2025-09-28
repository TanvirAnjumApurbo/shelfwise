# Authentication System

<cite>
**Referenced Files in This Document**   
- [app/(auth)/sign-in/page.tsx](file://app/(auth)/sign-in/page.tsx) - *Updated in recent commit*
- [app/(auth)/sign-up/page.tsx](file://app/(auth)/sign-up/page.tsx) - *Updated in recent commit*
- [app/(auth)/layout.tsx](file://app/(auth)/layout.tsx) - *Updated in recent commit*
- [components/AuthForm.tsx](file://components/AuthForm.tsx) - *Updated in recent commit*
- [lib/validations.ts](file://lib/validations.ts) - *Updated in recent commit*
- [lib/actions/auth.ts](file://lib/actions/auth.ts) - *Updated in recent commit*
- [types.d.ts](file://types.d.ts) - *Updated in recent commit*
- [components/FileUpload.tsx](file://components/FileUpload.tsx) - *Updated in recent commit*
- [lib/workflow.ts](file://lib/workflow.ts) - *Updated in recent commit*
- [app/api/workflows/onboarding/route.ts](file://app/api/workflows/onboarding/route.ts) - *Updated in recent commit*
- [lib/ratelimit.ts](file://lib/ratelimit.ts) - *Updated in recent commit*
</cite>

## Update Summary
**Changes Made**   
- Updated Onboarding Workflow Integration section to reflect active implementation of QStash workflows
- Enhanced Security Considerations with details on rate limiting configuration
- Added new section on Workflow Client Configuration
- Updated diagram sources to reflect actual implementation files
- Corrected outdated information about commented-out workflow triggers
- Added source references for rate limiting implementation

## Table of Contents
1. [Authentication System Overview](#authentication-system-overview)
2. [Route Structure and Layout](#route-structure-and-layout)
3. [Shared AuthForm Component](#shared-authform-component)
4. [Form Validation with Zod](#form-validation-with-zod)
5. [Type Safety with AuthCredentials](#type-safety-with-authcredentials)
6. [Form State and Submission Flow](#form-state-and-submission-flow)
7. [Security Considerations](#security-considerations)
8. [Extension Points for Real Authentication](#extension-points-for-real-authentication)
9. [Onboarding Workflow Integration](#onboarding-workflow-integration)
10. [Workflow Client Configuration](#workflow-client-configuration)

## Authentication System Overview

The university_lms application implements a comprehensive authentication system using the Next.js App Router with server-side actions for secure credential handling. The sign-in and sign-up flows are organized under a route group named **(auth)**, which provides logical grouping while maintaining clean URL structure. This architecture enables consistent layout rendering and shared logic across authentication pages.

The system leverages React Hook Form for client-side state management and integrates with Zod for runtime validation through `zodResolver`. The current system features fully implemented server actions in `lib/actions/auth.ts` that handle credential validation, user registration, and session management. The authentication flow includes rate limiting, password hashing, and integration with external services for file storage and email workflows.

**Section sources**
- [app/(auth)/sign-in/page.tsx](file://app/(auth)/sign-in/page.tsx#L1-L20)
- [app/(auth)/sign-up/page.tsx](file://app/(auth)/sign-up/page.tsx#L1-L23)
- [components/AuthForm.tsx](file://components/AuthForm.tsx#L1-L135)
- [lib/actions/auth.ts](file://lib/actions/auth.ts#L1-L85)

## Route Structure and Layout

The authentication routes are organized using Next.js route groups, which allow grouping routes without affecting the URL structure. The **(auth)** directory contains both sign-in and sign-up pages, each implemented as a standalone page component that renders the shared `AuthForm` component with specific configurations.

A shared layout at `app/(auth)/layout.tsx` provides a consistent UI structure for all authentication pages, featuring a logo, application title, and a split layout with an illustration on one side and the authentication form on the other. The layout also includes server-side authentication check that redirects authenticated users to the main application, preventing access to authentication pages when already logged in.

``mermaid
graph TD
A["(auth)"] --> B["sign-in/page.tsx"]
A --> C["sign-up/page.tsx"]
A --> D["layout.tsx"]
B --> E["AuthForm (type='SIGN_IN')"]
C --> F["AuthForm (type='SIGN_UP')"]
D --> G["Auth Layout with Auth Check"]
E --> H["signInSchema"]
F --> I["signUpSchema"]
E --> J["signInWithCredentials"]
F --> K["signUp"]
```

**Diagram sources**
- [app/(auth)/sign-in/page.tsx](file://app/(auth)/sign-in/page.tsx#L1-L20)
- [app/(auth)/sign-up/page.tsx](file://app/(auth)/sign-up/page.tsx#L1-L23)
- [app/(auth)/layout.tsx](file://app/(auth)/layout.tsx#L1-L36)

**Section sources**
- [app/(auth)/layout.tsx](file://app/(auth)/layout.tsx#L1-L36)

## Shared AuthForm Component

The `AuthForm` component serves as a reusable container for both sign-in and sign-up flows, demonstrating a clean separation of concerns and promoting code reuse. It accepts several props to configure its behavior:

:props
- **type**: Determines whether the form is in sign-in or sign-up mode
- **schema**: Zod validation schema specific to the current flow
- **defaultValues**: Initial form values
- **onSubmit**: Async function to handle form submission

The component uses conditional rendering based on the `type` prop to display appropriate headings, descriptions, and form content. It dynamically renders form fields by iterating over the `defaultValues` keys, with special handling for the `universityCard` field which uses the `FileUpload` component for ID verification.

```tsx
const AuthForm = <T extends FieldValues>({
  type,
  schema,
  defaultValues,
  onSubmit,
}: Props<T>) => {
  const isSignIn = type === "SIGN_IN";
  const router = useRouter();
  const form = useForm({
    resolver: zodResolver(schema as any),
    defaultValues: defaultValues as DefaultValues<T>,
  });

  const handleSubmit: SubmitHandler<T> = async (data) => {
    const result = await onSubmit(data);

    if (result.success) {
      toast.success(
        isSignIn
          ? "You have successfully signed in."
          : "You have successfully signed up."
      );

      router.push("/");
    } else {
      toast.error(result.error ?? "An error occurred.");
    }
  };
  // ... form rendering logic
};
```

**Section sources**
- [components/AuthForm.tsx](file://components/AuthForm.tsx#L1-L135)

## Form Validation with Zod

The authentication system implements robust input validation using Zod schemas defined in `lib/validations.ts`. These schemas ensure data correctness before submission and provide clear error messages to users.

The `signInSchema` requires:
- **email**: Must be a valid email format
- **password**: Minimum 8 characters

The `signUpSchema` extends these requirements with additional fields:
- **fullName**: Minimum 3 characters
- **universityId**: Coerced to a number
- **universityCard**: Required non-empty string
- **email** and **password**: Same requirements as sign-in

```ts
export const signUpSchema = z.object({
  fullName: z.string().min(3),
  email: z.string().email(),
  universityId: z.coerce.number(),
  universityCard: z.string().nonempty("University Card is required"),
  password: z.string().min(8),
});

export const signInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});
```

These schemas are passed to the `AuthForm` component and integrated with React Hook Form via `zodResolver`, enabling automatic validation against the defined rules. The validation occurs both on blur and before form submission, preventing invalid data from being processed.

**Section sources**
- [lib/validations.ts](file://lib/validations.ts#L1-L14)

## Type Safety with AuthCredentials

The `AuthCredentials` interface defined in `types.d.ts` provides type safety for authentication operations across the application. This interface ensures consistent data structure and enables TypeScript's compile-time checking to prevent errors.

:AuthCredentials
- **fullName**: string
- **email**: string
- **password**: string
- **universityId**: number
- **universityCard**: string

This interface aligns with the `signUpSchema` and is used as the parameter type for the `signUp` action. By defining this shared type, the application ensures that authentication data maintains a consistent structure whether being validated, submitted, or processed. This approach reduces bugs related to property name mismatches and type inconsistencies.

```ts
interface AuthCredentials {
  fullName: string;
  email: string;
  password: string;
  universityId: number;
  universityCard: string;
}
```

**Section sources**
- [types.d.ts](file://types.d.ts#L16-L22)

## Form State and Submission Flow

The authentication flow manages form state using React Hook Form, which provides an efficient way to handle form data, validation, and submission. The `useForm` hook initializes the form with the provided schema and default values, creating a form context that child components can access.

The `handleSubmit` function in `AuthForm` now contains the actual implementation that calls the `onSubmit` prop (which is either `signInWithCredentials` or `signUp`) and handles the response. On successful authentication, the user is redirected to the home page with a success toast notification. On failure, an error toast displays the specific error message.

``mermaid
sequenceDiagram
participant User
participant AuthForm
participant Validation
participant AuthAction
User->>AuthForm : Fill form and submit
AuthForm->>Validation : Validate data with Zod schema
alt Valid data
Validation-->>AuthForm : Validation successful
AuthForm->>AuthAction : Call authentication function
AuthAction-->>AuthForm : Return success/error
AuthForm->>User : Show success toast and redirect
else Invalid data
Validation-->>AuthForm : Return validation errors
AuthForm->>User : Display error messages
end
```

**Diagram sources**
- [components/AuthForm.tsx](file://components/AuthForm.tsx#L1-L135)
- [lib/validations.ts](file://lib/validations.ts#L1-L14)

**Section sources**
- [components/AuthForm.tsx](file://components/AuthForm.tsx#L1-L135)

## Security Considerations

The authentication implementation includes several critical security measures:

- **Rate Limiting**: Implemented using the `ratelimit` utility to prevent brute force attacks. Requests are limited based on client IP address, redirecting to `/too-fast` when limits are exceeded. The rate limiter uses a fixed window of 5 requests per minute.
- **Password Hashing**: Passwords are hashed using bcryptjs with a salt round of 10 before storage in the database.
- **Server-Side Validation**: All authentication operations occur on the server using `"use server"` directives, preventing client-side manipulation.
- **Input Validation**: Zod schemas enforce data type and format requirements on both client and server sides.
- **File Upload Security**: The `FileUpload` component includes size validation (20MB limit for images) and uses ImageKit with secure authentication tokens.
- **Session Management**: Authentication is handled through NextAuth, with secure session creation and management.

```ts
// Rate limiting implementation
const ip = (await headers()).get("x-forwarded-for") || "127.0.0.1";
const { success } = await ratelimit.limit(ip);
if (!success) return redirect("/too-fast");
```

**Section sources**
- [lib/actions/auth.ts](file://lib/actions/auth.ts#L1-L85)
- [components/FileUpload.tsx](file://components/FileUpload.tsx#L1-L213)
- [middleware.ts](file://middleware.ts)
- [lib/ratelimit.ts](file://lib/ratelimit.ts#L1-L11)

## Extension Points for Real Authentication

The current implementation provides several clear extension points for integrating with real authentication services:

1. **Authentication Actions**: The `signInWithCredentials` and `signUp` functions are fully implemented and can be extended to support additional authentication methods like OAuth or magic links.

2. **Form Field Expansion**: The `AuthForm` component's dynamic field rendering makes it easy to add new fields by updating the schema and default values.

3. **Error Handling**: The consistent return type `{ success: boolean; error?: string }` enables rich feedback to users for various failure scenarios.

4. **Loading States**: The component can be extended to manage loading states during authentication requests.

5. **Third-party Authentication**: The architecture can be extended to support OAuth providers by adding additional buttons and handlers.

Example implementation for connecting to a real authentication service:

```tsx
// Example implementation for onSubmit
const handleRealSubmit: SubmitHandler<T> = async (data) => {
  try {
    const result = await onSubmit(data);
    if (result.success) {
      // Redirect to dashboard or show success
      router.push('/');
    } else {
      // Display error message
      form.setError('root', { message: result.error });
    }
  } catch (error) {
    form.setError('root', { message: 'An unexpected error occurred' });
  }
};
```

These extension points demonstrate the flexibility of the current architecture, which balances immediate functionality with future scalability.

**Section sources**
- [app/(auth)/sign-in/page.tsx](file://app/(auth)/sign-in/page.tsx#L1-L20)
- [app/(auth)/sign-up/page.tsx](file://app/(auth)/sign-up/page.tsx#L1-L23)
- [components/AuthForm.tsx](file://components/AuthForm.tsx#L1-L135)

## Onboarding Workflow Integration

The authentication system includes an integrated onboarding workflow that is triggered after successful user registration. The workflow is fully implemented and actively used in the production system.

The onboarding workflow, defined in `app/api/workflows/onboarding/route.ts`, uses Upstash Workflows to orchestrate a multi-step user engagement process:

- **Immediate**: Sends a welcome email to the new user
- **After 3 days**: Checks user activity state and sends re-engagement email if user is non-active
- **Ongoing**: Continues to monitor user state monthly and sends appropriate emails

The workflow client is configured in `lib/workflow.ts` and uses QStash for message queuing and Resend for email delivery. This serverless workflow ensures reliable execution even if the initial request times out.

```ts
// Workflow implementation
export const { POST } = serve<InitialData>(async (context) => {
  const { email, fullName } = context.requestPayload;

  // Welcome Email
  await context.run("new-signup", async () => {
    await sendEmail({
      email,
      subject: "Welcome to the platform",
      message: `Welcome ${fullName}!`,
    });
  });

  await context.sleep("wait-for-3-days", 60 * 60 * 24 * 3);
  // ... additional steps
});
```

The workflow is triggered in the `signUp` action through the `workflowClient.trigger` call, which sends a request to the onboarding workflow endpoint with the user's email and full name. This integration provides a robust foundation for user engagement and retention.

**Section sources**
- [lib/actions/auth.ts](file://lib/actions/auth.ts#L70-L72)
- [lib/workflow.ts](file://lib/workflow.ts#L1-L34)
- [app/api/workflows/onboarding/route.ts](file://app/api/workflows/onboarding/route.ts#L1-L80)

## Workflow Client Configuration

The workflow client is configured in `lib/workflow.ts` to enable integration with Upstash Workflows for orchestrating the onboarding process. The configuration includes the base URL and authentication token for the QStash service, which powers the workflow execution.

The workflow client is initialized with the following configuration:

:workflowClient
- **baseUrl**: Retrieved from environment configuration
- **token**: Authentication token for QStash service

Additionally, the module exports a `sendEmail` function that uses QStash to publish email messages through Resend. This function is used by the onboarding workflow to send welcome and re-engagement emails to users.

```ts
export const workflowClient = new WorkflowClient({
  baseUrl: config.env.upstash.qstashUrl,
  token: config.env.upstash.qstashToken,
});
```

The configuration is environment-aware, using values from the application's config system to ensure proper setup in different deployment environments. This approach allows for secure management of credentials and easy configuration across development, staging, and production environments.

**Section sources**
- [lib/workflow.ts](file://lib/workflow.ts#L1-L34)
- [lib/config.ts](file://lib/config.ts)