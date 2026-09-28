import { z } from "zod";
import { generalFieldsValidation } from "../../common/validation";

export const resendConfirmEmail = {
  body: z.strictObject({
    email: generalFieldsValidation.email,
  }),
};
export const confirmEmail = {
  body: resendConfirmEmail.body.safeExtend({
    otp: generalFieldsValidation.otp,
  }),
};


export const login = {
  body: resendConfirmEmail.body.safeExtend({
    password: generalFieldsValidation.password,
  }),
};

const signupDobMax = new Date();
const signupDobMin = new Date();
signupDobMin.setFullYear(signupDobMin.getFullYear() - 100);

export const signup = {
  body: login.body.safeExtend({
      username: generalFieldsValidation.username,
      phone : generalFieldsValidation.phone,
      confirmPassword: generalFieldsValidation.confirmPassword,
      gender: z.coerce.number().int().min(0).max(1),
      DOB: z.coerce
        .date()
        .max(signupDobMax, { message: "Date of birth cannot be in the future" })
        .min(signupDobMin, { message: "Date of birth is invalid" }),
    }).refine(
      (data) => {
        return data.password === data.confirmPassword;
      },
      { error: "Password not match", path: ["ConfirmPassword"] },
    ),
};

export const resetForgotPasswordOtp = {
    body: confirmEmail.body.safeExtend({
        password: generalFieldsValidation.password,
        confirmPassword:generalFieldsValidation.confirmPassword
    }).refine((data)=>{
      return data.password === data.confirmPassword
    } , {path:["confirm-password"] , error:"password not match"})
}