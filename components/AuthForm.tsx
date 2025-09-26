"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  DefaultValues,
  FieldValues,
  Path,
  SubmitHandler,
  useForm,
  UseFormReturn,
} from "react-hook-form";
import { ZodType } from "zod";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { FIELD_NAMES, FIELD_TYPES } from "@/constants";
import FileUpload from "@/components/FileUpload";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";

interface Props<T extends FieldValues> {
  schema: ZodType<T>;
  defaultValues: T;
  onSubmit: (data: T) => Promise<{ success: boolean; error?: string }>;
  type: "SIGN_IN" | "SIGN_UP";
}

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
  const [visibleFields, setVisibleFields] = useState<Record<string, boolean>>(
    {}
  );

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

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold text-white">
        {isSignIn ? "Welcome back to ShelfWise" : "Create your library account"}
      </h1>
      <p className="text-light-100">
        {isSignIn
          ? "Access the vast collection of resources, and stay updated"
          : "Please complete all fields and upload a valid university ID to gain access to the library"}
      </p>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(handleSubmit)}
          className="space-y-6 w-full"
        >
          {Object.keys(defaultValues).map((fieldKey) => (
            <FormField
              key={fieldKey}
              control={form.control}
              name={fieldKey as Path<T>}
              render={({ field }) => {
                const fieldType =
                  FIELD_TYPES[field.name as keyof typeof FIELD_TYPES] ?? "text";
                const displayLabel =
                  FIELD_NAMES[field.name as keyof typeof FIELD_NAMES] ??
                  field.name;
                const isPasswordField = fieldType === "password";
                const isVisible = visibleFields[field.name] ?? false;

                if (field.name === "universityCard") {
                  return (
                    <FormItem>
                      <FormLabel className="capitalize">
                        {displayLabel}
                      </FormLabel>
                      <FormControl>
                        <FileUpload
                          type="image"
                          accept="image/*"
                          placeholder="Upload your ID"
                          folder="ids"
                          variant="dark"
                          onFileChange={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  );
                }

                return (
                  <FormItem>
                    <FormLabel className="capitalize">{displayLabel}</FormLabel>
                    {isPasswordField ? (
                      <div className="relative">
                        <FormControl>
                          <Input
                            required
                            type={isVisible ? "text" : "password"}
                            {...field}
                            className="form-input pr-12"
                          />
                        </FormControl>
                        <button
                          type="button"
                          onClick={() =>
                            setVisibleFields((prev) => ({
                              ...prev,
                              [field.name]: !prev[field.name],
                            }))
                          }
                          aria-label={`${
                            isVisible ? "Hide" : "Show"
                          } ${displayLabel.toLowerCase()}`}
                          title={`${isVisible ? "Hide" : "Show"} password`}
                          className="absolute inset-y-0 right-3 flex items-center text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                        >
                          {isVisible ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    ) : (
                      <FormControl>
                        <Input
                          required
                          type={fieldType}
                          {...field}
                          className="form-input"
                        />
                      </FormControl>
                    )}
                    <FormMessage />
                  </FormItem>
                );
              }}
            />
          ))}
          {isSignIn && (
            <div className="flex justify-end">
              <Link
                href="/forgot-password"
                className="text-sm font-semibold text-primary hover:underline"
              >
                Forgot your password?
              </Link>
            </div>
          )}
          <Button type="submit" className="form-btn">
            {isSignIn ? "Sign In" : "Sign Up"}
          </Button>
        </form>
      </Form>
      <p className="text-center text-base font-medium">
        {isSignIn ? "New to BookWise? " : "Already have an account? "}

        <Link
          href={isSignIn ? "/sign-up" : "/sign-in"}
          className="font-bold text-primary"
        >
          {isSignIn ? "Create an account" : "Sign in"}
        </Link>
      </p>
    </div>
  );
};

export default AuthForm;
