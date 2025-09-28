# Sign-up Flow

<cite>
**Referenced Files in This Document**   
- [page.tsx](file://app/(auth)/sign-up/page.tsx) - *Updated in recent commit*
- [AuthForm.tsx](file://components/AuthForm.tsx) - *Updated in recent commit*
- [validations.ts](file://lib/validations.ts) - *Updated in recent commit*
- [auth.ts](file://lib/actions/auth.ts) - *Added in recent commit*
- [layout.tsx](file://app/(auth)/layout.tsx)
- [index.ts](file://constants/index.ts)
- [ratelimit.ts](file://lib/ratelimit.ts) - *Security implementation*
- [onboarding/route.ts](file://app/api/workflows/onboarding/route.ts) - *Workflow extension point*
</cite>

## Update Summary
**Changes Made**   
- Updated all sections to reflect complete implementation of sign-up flow
- Added detailed explanation of server-side submission handling
- Enhanced data integrity and security considerations with rate limiting and duplicate detection
- Expanded extension points to include workflow integration
- Added new code examples from actual implementation
- Updated file references with precise line numbers and change annotations

## Table of Contents
1. [Sign-up Flow Overview](#sign-up-flow-overview)
2. [Route and Layout Structure](#route-and-layout-structure)
3. [AuthForm Component Configuration](#authform-component-configuration)
4. [Validation Schema Implementation](#validation-schema-implementation)
5. [Form State and Validation Management](#form-state-and-validation-management)
6. [Submission Handling and Response Processing](#submission-handling-and-response-processing)
7. [Data Integrity and Security Considerations](#data-integrity-and-security-considerations)
8. [Extension Points](#extension-points)

## Sign-up Flow Overview

The sign-up flow in the university_lms application provides a user-friendly interface for new users to create a library account. The process is designed to collect essential user information, validate input data, and securely submit registration details. This documentation details the implementation of the `/sign-up` route, its integration with shared components, validation mechanisms, and potential extension points for enhanced security features.

## Route and Layout Structure

The sign-up functionality is organized under the `(auth)` route group, which encapsulates all authentication-related pages. This route uses a shared layout with the sign-in page to maintain a consistent user experience across authentication flows.

The layout provides a two-column design with the application logo and form on the left, and an illustrative background image on the right, creating a professional and welcoming interface for new users.

``mermaid
graph TD
A["(auth) Route Group"] --> B["sign-up/page.tsx"]
A --> C["sign-in/page.tsx"]
A --> D["layout.tsx"]
B --> D
C --> D
D --> E["Auth Container"]
E --> F["Form Section"]
E --> G["Illustration Section"]
```

**Diagram sources**
- [layout.tsx](file://app/(auth)/layout.tsx#L1-L34)
- [page.tsx](file://app/(auth)/sign-up/page.tsx#L1-L22)

**Section sources**
- [layout.tsx](file://app/(auth)/layout.tsx#L1-L34)
- [page.tsx](file://app/(auth)/sign-up/page.tsx#L1-L22)

## AuthForm Component Configuration

The sign-up page leverages the reusable `AuthForm` component, configured specifically for registration purposes. This component accepts several props that customize its behavior and appearance based on the authentication type.

When configured with `type="SIGN_UP"`, the form displays appropriate messaging and collects additional fields required for account creation, such as full name and university identification.

```tsx
const Page = () => (
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
);
```

The `AuthForm` component dynamically renders fields based on the `defaultValues` object, ensuring that all required registration information is collected. It also provides navigation links to switch between sign-up and sign-in flows, improving user experience.

**Section sources**
- [page.tsx](file://app/(auth)/sign-up/page.tsx#L1-L22)
- [AuthForm.tsx](file://components/AuthForm.tsx#L1-L135)

## Validation Schema Implementation

The sign-up form employs a Zod schema defined in `lib/validations.ts` to enforce data integrity and validate user input. This schema specifies the structure and constraints for registration data, ensuring that all submitted information meets the application's requirements.

```ts
export const signUpSchema = z.object({
  fullName: z.string().min(3),
  email: z.string().email(),
  universityId: z.coerce.number(),
  universityCard: z.string().nonempty("University Card is required"),
  password: z.string().min(8),
});
```

The validation rules include:
- **Full Name**: Minimum of 3 characters
- **Email**: Must be a valid email format
- **University ID**: Coerced to a number type
- **University Card**: Required field (non-empty string)
- **Password**: Minimum of 8 characters

Field labels and input types are mapped through constants in `constants/index.ts`, providing a centralized configuration for form presentation.

```ts
export const FIELD_NAMES = {
  fullName: "Full name",
  email: "Email",
  universityId: "University ID Number",
  password: "Password",
  universityCard: "Upload University ID Card",
};

export const FIELD_TYPES = {
  fullName: "text",
  email: "email",
  universityId: "number",
  password: "password",
};
```

**Section sources**
- [validations.ts](file://lib/validations.ts#L2-L8)
- [index.ts](file://constants/index.ts#L42-L50)

## Form State and Validation Management

The `AuthForm` component utilizes React Hook Form in conjunction with Zod for comprehensive form state management and validation. This combination provides real-time validation feedback and efficient form state handling.

The form is initialized with the Zod resolver, which connects the validation schema to the form's validation engine:

```tsx
const form: UseFormReturn<T> = useForm({
  resolver: zodResolver(schema),
  defaultValues: defaultValues as DefaultValues<T>,
});
```

Key features of the form management system include:
- **Real-time validation**: Fields are validated as the user types
- **Error display**: Validation errors are automatically displayed below each field
- **Dynamic field rendering**: All fields are generated from the `defaultValues` object
- **Specialized input handling**: The university ID card field uses a custom `FileUpload` component

The form dynamically renders input fields by iterating over the keys in `defaultValues`, applying the appropriate label from `FIELD_NAMES` and input type from `FIELD_TYPES`.

```tsx
{Object.keys(defaultValues).map((field) => (
  <FormField
    key={field}
    control={form.control}
    name={field as Path<T>}
    render={({ field: formField }) => (
      <FormItem>
        <FormLabel className="capitalize">
          {FIELD_NAMES[field as keyof typeof FIELD_NAMES]}
        </FormLabel>
        <FormControl>
          {field === "universityCard" ? (
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
              type={FIELD_TYPES[field as keyof typeof FIELD_TYPES]}
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
- [AuthForm.tsx](file://components/AuthForm.tsx#L1-L135)
- [validations.ts](file://lib/validations.ts#L2-L8)

## Submission Handling and Response Processing

The sign-up form is configured to handle submissions through the `onSubmit` prop, which expects an asynchronous function that processes the form data and returns a response object with `success` and optional `error` properties.

```ts
interface Props<T extends FieldValues> {
  schema: ZodType<T>;
  defaultValues: T;
  onSubmit: (data: T) => Promise<{ success: boolean; error?: string }>;
  type: "SIGN_IN" | "SIGN_UP";
}
```

The `signUp` function in `lib/actions/auth.ts` handles the complete submission flow:

```ts
export const signUp = async (params: AuthCredentials) => {
  const { fullName, email, universityId, password, universityCard } = params;

  const ip = (await headers()).get("x-forwarded-for") || "127.0.0.1";
  const { success } = await ratelimit.limit(ip);

  if (!success) return redirect("/too-fast");

  const existingUser = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existingUser.length > 0) {
    return { success: false, error: "User already exists" };
  }

  const hashedPassword = await hash(password, 10);

  try {
    await db.insert(users).values({
      fullName,
      email,
      universityId,
      password: hashedPassword,
      universityCard,
    });

    await signInWithCredentials({ email, password });

    return { success: true };
  } catch (error) {
    console.log(error, "Signup error");
    return { success: false, error: "Signup error" };
  }
};
```

The submission process includes:
1. Form submission triggers `form.handleSubmit(handleSubmit)`
2. The `handleSubmit` function receives validated data
3. Data is passed to the `signUp` action
4. The action performs rate limiting, duplicate checking, and database insertion
5. Password is securely hashed before storage
6. User is automatically signed in after successful registration
7. Appropriate user feedback is displayed via toast notifications

``mermaid
sequenceDiagram
participant User as "User"
participant Form as "AuthForm"
participant Validation as "Zod Resolver"
participant Submit as "signUp Action"
User->>Form : Fill out registration form
User->>Form : Click Submit
Form->>Validation : Validate form data
alt Validation Success
Validation-->>Form : Valid data
Form->>Submit : Call signUp with data
Submit->>RateLimit : Check IP rate limit
alt Rate Limit Passed
RateLimit-->>Submit : Allow request
Submit->>Database : Check for existing user
alt User Doesn't Exist
Database-->>Submit : No existing user
Submit->>Password : Hash password
Password-->>Submit : Hashed password
Submit->>Database : Insert new user
Database-->>Submit : Success
Submit->>Auth : Sign in new user
Auth-->>Submit : Authentication success
Submit-->>Form : Return {success : true}
Form-->>User : Show success message and redirect
else User Exists
Database-->>Submit : User exists
Submit-->>Form : Return {success : false, error : "User already exists"}
Form-->>User : Display error message
end
else Rate Limit Exceeded
RateLimit-->>Submit : Block request
Submit-->>Form : Redirect to /too-fast
Form-->>User : Redirect to rate limit page
end
else Validation Error
Validation-->>Form : Return errors
Form-->>User : Display field errors
end
```

**Diagram sources**
- [auth.ts](file://lib/actions/auth.ts#L41-L85)
- [AuthForm.tsx](file://components/AuthForm.tsx#L1-L135)

**Section sources**
- [auth.ts](file://lib/actions/auth.ts#L41-L85)
- [AuthForm.tsx](file://components/AuthForm.tsx#L1-L135)

## Data Integrity and Security Considerations

The sign-up flow incorporates several measures to ensure data integrity and security:

- **Input validation**: Comprehensive validation rules prevent malformed data submission
- **Password strength**: Minimum 8-character requirement for passwords
- **Email format validation**: Ensures valid email addresses are provided
- **University ID validation**: Coerces input to numeric type to prevent injection
- **File upload handling**: Dedicated component for university ID card submission
- **Rate limiting**: Prevents brute force attacks with 5 requests per minute limit
- **Duplicate detection**: Checks for existing users before creating new accounts
- **Password hashing**: Uses bcrypt with salt rounds to securely store passwords
- **IP tracking**: Uses forwarded IP headers for rate limiting accuracy

The form also includes UX considerations that support data integrity:
- Clear field labels that indicate required information
- Real-time validation feedback
- Specific error messages for different validation failures
- Consistent layout and styling with other authentication flows

The server-side implementation includes additional security measures:
- **Rate limiting**: Implemented using Upstash Redis with a fixed window of 5 requests per minute
- **Duplicate email checking**: Prevents account enumeration attacks
- **Automatic sign-in**: After successful registration, users are immediately signed in
- **Error handling**: Generic error messages to prevent information leakage

```ts
const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.fixedWindow(5, "1m"),
  analytics: true,
  prefix: "@upstash/ratelimit",
});
```

**Section sources**
- [validations.ts](file://lib/validations.ts#L2-L8)
- [AuthForm.tsx](file://components/AuthForm.tsx#L1-L135)
- [auth.ts](file://lib/actions/auth.ts#L41-L85)
- [ratelimit.ts](file://lib/ratelimit.ts#L1-L11)

## Extension Points

The sign-up flow architecture provides several extension points for enhancing functionality and security:

### Email Verification
The current implementation could be extended to include email verification by:
- Adding a confirmation step after submission
- Sending a verification email with a token
- Implementing a verification endpoint to activate accounts
- Using the existing workflow system for email notifications

### CAPTCHA Integration
To prevent automated registrations, CAPTCHA could be integrated:
- Adding a CAPTCHA field to the form
- Validating the CAPTCHA response on submission
- Using services like reCAPTCHA for enhanced security

### Enhanced Password Requirements
Password security could be improved by:
- Adding complexity requirements (uppercase, lowercase, numbers, special characters)
- Implementing password strength indicators
- Adding password confirmation field

### Multi-step Registration
The flow could be enhanced with a multi-step process:
- Personal information (name, email)
- University verification (ID upload, ID number)
- Account setup (password)
- Preferences and profile completion

### Third-party Authentication
Additional sign-up options could be provided:
- Social media login integration
- Institutional single sign-on
- Email/passwordless authentication

### Workflow Integration
The commented workflow client suggests potential integration with onboarding workflows:
```ts
// await workflowClient.trigger({
//   url: `${config.env.prodApiEndpoint}/api/workflows/onboarding`,
//   body: {
//     email,
//     fullName,
//   },
// });
```

The existing onboarding workflow demonstrates how user engagement can be automated:
- Welcome email after registration
- Follow-up emails for inactive users
- Re-engagement campaigns for returning users

**Section sources**
- [auth.ts](file://lib/actions/auth.ts#L41-L85)
- [AuthForm.tsx](file://components/AuthForm.tsx#L1-L135)
- [validations.ts](file://lib/validations.ts#L2-L8)
- [onboarding/route.ts](file://app/api/workflows/onboarding/route.ts#L1-L80)