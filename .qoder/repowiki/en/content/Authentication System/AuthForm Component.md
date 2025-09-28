# AuthForm Component

<cite>
**Referenced Files in This Document**   
- [components/AuthForm.tsx](file://components/AuthForm.tsx) - *Initial implementation of the reusable authentication form*
- [lib/validations.ts](file://lib/validations.ts) - *Zod validation schemas for sign-in and sign-up flows*
- [components/ui/form.tsx](file://components/ui/form.tsx) - *Radix UI-based form primitives for accessibility and structure*
- [components/ui/input.tsx](file://components/ui/input.tsx) - *Stylized input component used in form fields*
- [components/ui/button.tsx](file://components/ui/button.tsx) - *Button component for form submission*
- [app/(auth)/sign-in/page.tsx](file://app/(auth)/sign-in/page.tsx) - *Usage of AuthForm in sign-in workflow*
- [app/(auth)/sign-up/page.tsx](file://app/(auth)/sign-up/page.tsx) - *Usage of AuthForm in sign-up workflow*
- [lib/actions/auth.ts](file://lib/actions/auth.ts) - *Server actions handling authentication logic*
- [constants/index.ts](file://constants/index.ts) - *Field labels and types mappings for dynamic rendering*
- [components/FileUpload.tsx](file://components/FileUpload.tsx) - *Custom file upload component for university ID card*
- [types.d.ts](file://types.d.ts) - *Type definitions including AuthCredentials interface*
</cite>

## Table of Contents
1. [Introduction](#introduction)
2. [Project Structure](#project-structure)
3. [Core Components](#core-components)
4. [Architecture Overview](#architecture-overview)
5. [Detailed Component Analysis](#detailed-component-analysis)
6. [Dependency Analysis](#dependency-analysis)
7. [Performance Considerations](#performance-considerations)
8. [Troubleshooting Guide](#troubleshooting-guide)
9. [Conclusion](#conclusion)

## Introduction
The **AuthForm** component is a reusable and dynamic authentication form used across the university LMS application for both sign-in and sign-up workflows. It leverages **React Hook Form** for efficient form state management and **Zod** for robust schema validation. The component dynamically renders fields based on the provided schema and adjusts its UI and behavior depending on whether it's in "SIGN_IN" or "SIGN_UP" mode. This document provides a comprehensive analysis of its implementation, integration with validation schemas, usage in parent pages, and extensibility for future authentication features.

**Section sources**
- [components/AuthForm.tsx](file://components/AuthForm.tsx)

## Project Structure
The project follows a Next.js App Router structure with clear separation of concerns:
- **app/(auth)**: Contains authentication routes (`sign-in`, `sign-up`) and shared layout
- **components/**: Houses reusable UI components, including `AuthForm.tsx`
- **components/ui**: Contains Radix UI-based primitive components (`form.tsx`, `input.tsx`, `button.tsx`)
- **lib/**: Stores utilities and validation schemas (`validations.ts`)
- **app/layout.tsx**: Root layout for the application

This modular structure enables reusable components like `AuthForm` to be shared across different pages while maintaining consistency in design and behavior.

``mermaid
graph TB
subgraph "Authentication Pages"
SignIn[sign-in/page.tsx]
SignUp[sign-up/page.tsx]
end
subgraph "Core Components"
AuthForm[AuthForm.tsx]
Form[ui/form.tsx]
Input[ui/input.tsx]
Button[ui/button.tsx]
end
subgraph "Validation & Logic"
Validations[lib/validations.ts]
end
SignIn --> AuthForm
SignUp --> AuthForm
AuthForm --> Form
AuthForm --> Input
AuthForm --> Button
AuthForm --> Validations
```

**Diagram sources**
- [components/AuthForm.tsx](file://components/AuthForm.tsx)
- [app/(auth)/sign-in/page.tsx](file://app/(auth)/sign-in/page.tsx)
- [app/(auth)/sign-up/page.tsx](file://app/(auth)/sign-up/page.tsx)
- [lib/validations.ts](file://lib/validations.ts)

## Core Components
The **AuthForm** component is central to the authentication flow. It accepts four key props:
- **schema**: A Zod schema defining field validation rules
- **defaultValues**: Initial values for form fields
- **onSubmit**: Async handler for form submission
- **type**: Mode indicator ("SIGN_IN" or "SIGN_UP")

It uses `useForm` from React Hook Form with `zodResolver` to enable real-time validation. The form dynamically maps over `defaultValues` keys to render input fields, supporting special handling for file uploads like university ID cards.

Additionally, the component conditionally displays different headings, descriptions, and CTA text based on the authentication mode, enhancing user experience.

**Section sources**
- [components/AuthForm.tsx](file://components/AuthForm.tsx)

## Architecture Overview
The authentication architecture is built around reusable, composable components and declarative validation. The `AuthForm` acts as a container that abstracts form logic and rendering, delegating styling and accessibility to Radix UI primitives.

Data flows from parent pages (sign-in, sign-up) down to `AuthForm` via props. On submission, the form invokes the provided `onSubmit` callback, which typically calls backend authentication actions.

``mermaid
sequenceDiagram
participant Page as "Sign-In/Sign-Up Page"
participant AuthForm as "AuthForm Component"
participant HookForm as "React Hook Form"
participant Zod as "Zod Validator"
participant API as "Authentication API"
Page->>AuthForm : Pass schema, defaultValues, onSubmit, type
AuthForm->>HookForm : Initialize useForm with zodResolver(schema)
User->>AuthForm : Fills form fields
AuthForm->>Zod : Validate on submit
alt Validation Success
AuthForm->>Page : Call onSubmit(data)
Page->>API : Perform sign-in/sign-up
API-->>Page : Return result
Page-->>User : Redirect or show success
else Validation Error
AuthForm->>User : Display field errors via FormMessage
end
```

**Diagram sources**
- [components/AuthForm.tsx](file://components/AuthForm.tsx)
- [lib/validations.ts](file://lib/validations.ts)
- [app/(auth)/sign-in/page.tsx](file://app/(auth)/sign-in/page.tsx)

## Detailed Component Analysis

### AuthForm Implementation
The `AuthForm` component is a generic React component parameterized by `T extends FieldValues`, allowing type-safe handling of different form structures.

#### Key Features:
- **Dynamic Field Rendering**: Uses `Object.keys(defaultValues)` to iterate and generate form fields.
- **Conditional UI**: Displays different messages and titles for sign-in vs. sign-up.
- **File Upload Support**: Special rendering for `universityCard` field using a `FileUpload` component.
- **Accessibility**: Integrates with Radix UI’s form primitives for proper labeling, error messaging, and ARIA attributes.

#### Code Snippet: Dynamic Field Mapping
```tsx
{Object.keys(defaultValues).map((field) => (
  <FormField
    key={field}
    control={form.control}
    name={field as Path<T>}
    render={({ field: formField }) => (
      <FormItem>
        <FormLabel className="capitalize">
          {FIELD_NAMES[field.name as keyof typeof FIELD_NAMES]}
        </FormLabel>
        <FormControl>
          {field.name === "universityCard" ? (
            <FileUpload
              type="image"
              accept="image/*"
              placeholder="Upload your ID"
              folder="ids"
              variant="dark"
              onFileChange={formField.onChange}
            />
          ) : (
            <Input
              required
              type={FIELD_TYPES[field.name as keyof typeof FIELD_TYPES]}
              {...formField}
              className="form-input"
            />
          )}
        </FormControl>
        <FormMessage />
      </FormItem>
    )}
  />
))}
```

**Section sources**
- [components/AuthForm.tsx](file://components/AuthForm.tsx)
- [constants/index.ts](file://constants/index.ts)
- [components/FileUpload.tsx](file://components/FileUpload.tsx)

### Validation Schema Integration
The `AuthForm` integrates with two Zod schemas defined in `lib/validations.ts`:

#### Sign-Up Schema
```ts
export const signUpSchema = z.object({
  fullName: z.string().min(3),
  email: z.string().email(),
  universityId: z.coerce.number(),
  universityCard: z.string().nonempty("University Card is required"),
  password: z.string().min(8),
});
```

#### Sign-In Schema
```ts
export const signInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});
```

These schemas are passed directly to `AuthForm` via the `schema` prop and used by `zodResolver` to validate input in real time.

``mermaid
classDiagram
class AuthForm {
+schema : ZodType<T>
+defaultValues : T
+onSubmit : (data : T) => Promise
+type : "SIGN_IN" | "SIGN_UP"
-form : UseFormReturn<T>
-handleSubmit : SubmitHandler<T>
}
class ZodSchema {
+email : string (email)
+password : string (min 8)
+fullName : string (min 3)
+universityId : number
+universityCard : string (required)
}
AuthForm --> ZodSchema : "uses for validation"
AuthForm --> ReactHookForm : "integrates with"
AuthForm --> RadixUI : "uses primitives"
note right of AuthForm
Generic component that adapts to
different schemas and field sets.
Supports both sign-in and sign-up.
end note
```

**Diagram sources**
- [components/AuthForm.tsx](file://components/AuthForm.tsx)
- [lib/validations.ts](file://lib/validations.ts)

### Parent Page Usage
The `AuthForm` is instantiated in both sign-in and sign-up pages with mode-specific configurations.

#### Sign-In Page Usage
```tsx
<AuthForm
  type="SIGN_IN"
  schema={signInSchema}
  defaultValues={{ email: "", password: "" }}
  onSubmit={signInWithCredentials}
/>
```

#### Sign-Up Page Usage
```tsx
<AuthForm
  type="SIGN_UP"
  schema={signUpSchema}
  defaultValues={{
    email: "",
    password: "",
    fullName: "",
    universityId: 0,
    universityCard: "",
  }}
  onSubmit={signUp}
/>
```

This pattern enables consistent UI/UX while allowing different data requirements and backend actions.

**Section sources**
- [app/(auth)/sign-in/page.tsx](file://app/(auth)/sign-in/page.tsx)
- [app/(auth)/sign-up/page.tsx](file://app/(auth)/sign-up/page.tsx)
- [lib/actions/auth.ts](file://lib/actions/auth.ts)

### Form Submission and API Integration
The `onSubmit` handler passed to `AuthForm` abstracts the API call to authentication endpoints. Both `signInWithCredentials` and `signUp` functions are server actions that handle authentication logic, including rate limiting, database operations, and session management.

#### Rate Limiting
Both authentication actions implement rate limiting using the client's IP address to prevent abuse:
```ts
const ip = (await headers()).get("x-forwarded-for") || "127.0.0.1";
const { success } = await ratelimit.limit(ip);
if (!success) return redirect("/too-fast");
```

#### Sign-Up Specific Logic
The `signUp` action includes additional business logic:
- Checks for existing users by email
- Hashes passwords using bcrypt
- Inserts new user into the database
- Automatically signs in the user after successful registration

**Section sources**
- [lib/actions/auth.ts](file://lib/actions/auth.ts)
- [types.d.ts](file://types.d.ts)

## Dependency Analysis
The `AuthForm` depends on several key libraries and components:

``mermaid
graph TD
AuthForm --> ReactHookForm
AuthForm --> Zod
AuthForm --> RadixUI
AuthForm --> NextJS
ReactHookForm --> zodResolver
RadixUI --> FormPrimitives
FormPrimitives --> FormLabel
FormPrimitives --> FormControl
FormPrimitives --> FormMessage
AuthForm --> FileUpload[FileUpload Component]
AuthForm --> Input
AuthForm --> Button
style AuthForm fill:#f9f,stroke:#333
style ReactHookForm fill:#bbf,stroke:#333
style Zod fill:#f96,stroke:#333
```

**Diagram sources**
- [components/AuthForm.tsx](file://components/AuthForm.tsx)
- [components/ui/form.tsx](file://components/ui/form.tsx)
- [components/ui/input.tsx](file://components/ui/input.tsx)
- [components/ui/button.tsx](file://components/ui/button.tsx)

## Performance Considerations
- **Efficient Re-renders**: React Hook Form minimizes re-renders by managing form state outside React’s state system.
- **Lazy Validation**: Validation occurs only on submit or specified events, reducing unnecessary computation.
- **Tree-shaking**: UI components are modular, enabling unused primitives to be excluded from the bundle.
- **Client-side Only**: The `"use client"` directive ensures the component runs only on the client, avoiding hydration mismatches.

No major performance bottlenecks are present. However, file upload handling should be optimized with preview thumbnails and size validation to prevent large payloads.

## Troubleshooting Guide
Common issues and solutions when using `AuthForm`:

| Issue | Cause | Solution |
|------|-------|----------|
| **Validation not working** | Incorrect schema or missing `zodResolver` | Ensure schema is passed correctly and resolver is configured |
| **Form not submitting** | `onSubmit` handler not defined or async error | Pass a valid async function to `onSubmit` |
| **Type errors on `defaultValues`** | Mismatch between schema and default values | Ensure `defaultValues` keys match schema exactly |
| **File upload not triggering change** | `onFileChange` not wired to `field.onChange` | Verify `FileUpload` properly calls the provided handler |
| **Accessibility warnings** | Missing labels or ARIA attributes | Use Radix UI’s `FormLabel`, `FormControl`, and `FormMessage` |

**Section sources**
- [components/AuthForm.tsx](file://components/AuthForm.tsx)
- [components/ui/form.tsx](file://components/ui/form.tsx)

## Conclusion
The `AuthForm` component exemplifies a well-designed, reusable UI pattern in modern React applications. By combining **React Hook Form**, **Zod**, and **Radix UI**, it achieves type safety, accessibility, and flexibility. Its ability to dynamically adapt to different authentication modes makes it a powerful abstraction that reduces code duplication and enhances maintainability. Future enhancements could include support for social logins, two-factor authentication, and password recovery flows—all achievable through prop-based configuration and schema extension.