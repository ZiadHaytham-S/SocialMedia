import { publicApiRequest } from "../client";

export type RegisterInput = {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  phone?: string;
  gender: number;
  DOB: Date;
};

export function registerUser(input: RegisterInput) {
  return publicApiRequest<unknown>("/auth/signup", {
    method: "POST",
    body: JSON.stringify({
      username: input.username,
      email: input.email,
      password: input.password,
      confirmPassword: input.confirmPassword,
      phone: input.phone || undefined,
      gender: input.gender,
      DOB: input.DOB.toISOString(),
    }),
  });
}

export function resendConfirmEmail(email: string) {
  return publicApiRequest<unknown>("/auth/resend-confirm-email", {
    method: "PATCH",
    body: JSON.stringify({ email }),
  });
}

export function confirmEmail(input: { email: string; otp: string }) {
  return publicApiRequest<unknown>("/auth/confirm-email", {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function requestForgotPasswordCode(email: string) {
  return publicApiRequest<unknown>("/auth/request-forgot-password-code", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export function verifyForgotPasswordCode(input: { email: string; otp: string }) {
  return publicApiRequest<unknown>("/auth/verify-forgot-password-code", {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function resetForgotPasswordCode(input: {
  email: string;
  otp: string;
  password: string;
  confirmPassword: string;
}) {
  return publicApiRequest<unknown>("/auth/reset-forgot-password-code", {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}
