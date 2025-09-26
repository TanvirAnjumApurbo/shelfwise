"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  passwordResetCompleteSchema,
  passwordResetRequestSchema,
  passwordResetVerifySchema,
} from "@/lib/validations";
import {
  requestPasswordReset,
  resetPassword,
  verifyPasswordResetCode,
} from "@/lib/actions/auth";

const steps = ["Request", "Verify", "Reset"] as const;
type Step = (typeof steps)[number];

const requestSchema = passwordResetRequestSchema;
const verifySchema = passwordResetVerifySchema;
const completeSchema = passwordResetCompleteSchema;

type RequestFormValues = z.infer<typeof requestSchema>;
type VerifyFormValues = z.infer<typeof verifySchema>;
type CompleteFormValues = z.infer<typeof completeSchema>;

const INITIAL_MESSAGE =
  "Enter the email associated with your ShelfWise account and we'll send you a verification code.";

const formatEmail = (email: string) => email.trim().toLowerCase();

const ForgotPasswordFlow = () => {
  const router = useRouter();
  const [step, setStep] = useState<Step>("Request");
  const [email, setEmail] = useState("");
  const [statusMessage, setStatusMessage] = useState(INITIAL_MESSAGE);
  const [resetToken, setResetToken] = useState("");
  const [requesting, setRequesting] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const requestForm = useForm<RequestFormValues>({
    resolver: zodResolver(requestSchema),
    defaultValues: { email: "" },
  });

  const verifyForm = useForm<VerifyFormValues>({
    resolver: zodResolver(verifySchema),
    defaultValues: { code: "" },
  });

  const completeForm = useForm<CompleteFormValues>({
    resolver: zodResolver(completeSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  useEffect(() => {
    if (!resendCooldown) return;

    const timer = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }

        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleRequestSubmit = async (values: RequestFormValues) => {
    setRequesting(true);
    const normalizedEmail = formatEmail(values.email);

    try {
      const result = await requestPasswordReset({ email: normalizedEmail });

      if (!result.success) {
        toast.error(result.error || "Unable to send verification code.");
        return;
      }

      setEmail(normalizedEmail);
      setStatusMessage(
        result.message ||
          "If an account exists for this email, we'll send a verification code shortly."
      );
      toast.success(
        "If we find a matching account, a reset code is on the way."
      );
      setStep("Verify");
      verifyForm.reset();
      setResendCooldown(60);
    } finally {
      setRequesting(false);
    }
  };

  const handleVerifySubmit = async (values: VerifyFormValues) => {
    if (!email) {
      toast.error("Please start by entering your email.");
      setStep("Request");
      return;
    }

    setVerifying(true);

    try {
      const result = await verifyPasswordResetCode({
        email,
        code: values.code,
      });

      if (!result.success || !result.resetToken) {
        toast.error(result.error || "Unable to verify the code.");
        return;
      }

      toast.success("Verification successful. Create a new password.");
      setResetToken(result.resetToken);
      setStep("Reset");
      setStatusMessage(
        "Create a new password. Pick something memorable and unique."
      );
      completeForm.reset();
    } finally {
      setVerifying(false);
    }
  };

  const handleCompleteSubmit = async (values: CompleteFormValues) => {
    if (!email || !resetToken) {
      toast.error("Your session expired. Please request a new code.");
      setStep("Request");
      setStatusMessage(INITIAL_MESSAGE);
      requestForm.reset();
      return;
    }

    setCompleting(true);

    try {
      const result = await resetPassword({
        email,
        password: values.password,
        confirmPassword: values.confirmPassword,
        resetToken,
      });

      if (!result.success) {
        toast.error(result.error || "Unable to update your password.");
        return;
      }

      toast.success("Password updated! Signing you in...");
      router.push(result.redirectTo || "/");
    } finally {
      setCompleting(false);
    }
  };

  const handleResend = async () => {
    if (!email || requesting || resendCooldown > 0) return;

    setRequesting(true);

    try {
      const result = await requestPasswordReset({ email });

      if (!result.success) {
        toast.error(result.error || "Unable to resend the code right now.");
        return;
      }

      toast.success("We just sent you a fresh verification code.");
      setResendCooldown(60);
    } finally {
      setRequesting(false);
    }
  };

  const stepIndex = useMemo(() => steps.indexOf(step), [step]);

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex flex-wrap items-center justify-center gap-3 text-sm font-medium text-light-100 sm:justify-start">
        {steps.map((label, index) => {
          const isActive = index === stepIndex;
          const isCompleted = index < stepIndex;

          return (
            <div key={label} className="flex items-center gap-2">
              <div
                className={`size-8 rounded-full border flex items-center justify-center text-sm transition-colors ${
                  isCompleted
                    ? "border-emerald-400 bg-emerald-500 text-white"
                    : isActive
                    ? "border-primary bg-primary text-white"
                    : "border-border bg-transparent text-muted-foreground"
                }`}
              >
                {index + 1}
              </div>
              <span
                className={`${
                  isActive || isCompleted
                    ? "text-white"
                    : "text-muted-foreground"
                }`}
              >
                {label}
              </span>
              {index < steps.length - 1 && (
                <div className="hidden h-px w-10 bg-border sm:block" />
              )}
            </div>
          );
        })}
      </div>

      <div className="rounded-3xl bg-[#161b26] p-6 shadow-2xl shadow-black/30">
        <h1 className="text-2xl font-semibold text-white mb-2">
          Reset your password
        </h1>
        <p className="text-light-100 mb-6 leading-relaxed">{statusMessage}</p>

        {step === "Request" && (
          <Form {...requestForm}>
            <form
              onSubmit={requestForm.handleSubmit(handleRequestSubmit)}
              className="space-y-5"
            >
              <FormField
                control={requestForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email address</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="you@example.edu"
                        autoComplete="email"
                        className="form-input"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="form-btn" disabled={requesting}>
                {requesting ? "Sending code..." : "Send verification code"}
              </Button>
            </form>
          </Form>
        )}

        {step === "Verify" && (
          <Form {...verifyForm}>
            <form
              onSubmit={verifyForm.handleSubmit(handleVerifySubmit)}
              className="space-y-5"
            >
              <FormField
                control={verifyForm.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Verification code</FormLabel>
                    <FormDescription>
                      Enter the 6-digit code we sent to {email}.
                    </FormDescription>
                    <FormControl>
                      <Input
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        className="form-input tracking-[0.6em] text-center text-lg"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full text-sm text-primary hover:text-primary sm:w-auto"
                  onClick={handleResend}
                  disabled={requesting || resendCooldown > 0}
                >
                  {resendCooldown > 0
                    ? `Resend available in ${resendCooldown}s`
                    : "Resend code"}
                </Button>
                <Button
                  type="submit"
                  className="form-btn sm:!w-auto"
                  disabled={verifying}
                >
                  {verifying ? "Verifying..." : "Verify code"}
                </Button>
              </div>
            </form>
          </Form>
        )}

        {step === "Reset" && (
          <Form {...completeForm}>
            <form
              onSubmit={completeForm.handleSubmit(handleCompleteSubmit)}
              className="space-y-5"
            >
              <FormField
                control={completeForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Enter a new password"
                        autoComplete="new-password"
                        className="form-input"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={completeForm.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Re-enter your new password"
                        autoComplete="new-password"
                        className="form-input"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="form-btn" disabled={completing}>
                {completing ? "Updating password..." : "Reset password"}
              </Button>
            </form>
          </Form>
        )}
      </div>

      <p className="text-center text-base font-medium text-light-100">
        Remembered your password?{" "}
        <Button
          type="button"
          variant="link"
          className="p-0 text-primary"
          onClick={() => router.push("/sign-in")}
        >
          Back to sign in
        </Button>
      </p>
    </div>
  );
};

export default ForgotPasswordFlow;
