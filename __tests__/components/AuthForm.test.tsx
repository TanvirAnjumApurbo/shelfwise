import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect } from "@jest/globals";
import AuthForm from "@/components/AuthForm";
import { z } from "zod";

describe("AuthForm password toggle", () => {
  const schema = z.object({
    email: z.string().email(),
    password: z.string().min(1),
  });

  const defaultValues = {
    email: "",
    password: "",
  };

  it("reveals and rehides the password when the toggle is used", async () => {
    const onSubmit = jest.fn().mockResolvedValue({ success: true });
    const user = userEvent.setup();

    render(
      <AuthForm
        type="SIGN_IN"
        schema={schema}
        defaultValues={defaultValues}
        onSubmit={onSubmit}
      />
    );

    const passwordInput = screen.getByLabelText(/^password$/i);
    const toggleButton = screen.getByRole("button", { name: /show password/i });

    expect(passwordInput).toHaveAttribute("type", "password");

    await user.click(toggleButton);
    expect(passwordInput).toHaveAttribute("type", "text");
    expect(toggleButton).toHaveAccessibleName(/hide password/i);

    await user.click(toggleButton);
    expect(passwordInput).toHaveAttribute("type", "password");
    expect(toggleButton).toHaveAccessibleName(/show password/i);
  });
});
