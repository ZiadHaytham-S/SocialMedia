import { z } from "zod";
import { confirmEmail, login, resendConfirmEmail, signup } from "./auth.validation";

export type SignupDto = z.infer<typeof signup.body>;
export type LoginDto = z.infer<typeof login.body>;
export type ConfirmEmailDto = z.infer<typeof confirmEmail.body>;
export type ResendConfirmEmailDto = z.infer<typeof resendConfirmEmail.body>;
