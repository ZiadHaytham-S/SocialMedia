import { z } from "zod";
import { generalFieldsValidation } from "../../common/validation";
import { fileFieldValidation } from "../../common/helper";

const objectId = z.string().regex(/^[a-fA-F0-9]{24}$/, "Invalid id");

export const userIdParam = {
  params: z.strictObject({
    userId: objectId,
  }),
};

export const updateProfile = {
  params: z.strictObject({
    userId: objectId,
  }),
  body: z.strictObject({
    username: generalFieldsValidation.username.optional(),
    phone: generalFieldsValidation.phone,
    gender: z.coerce.number().min(0).max(1).optional(),
    DOB: z.coerce.date().optional(),
  }),
};


export const updatePassword = {
  body: z
    .object({
      oldPassword: generalFieldsValidation.password,

      password: generalFieldsValidation.password,

      confirmPassword: generalFieldsValidation.confirmPassword,
    })
    .refine((data) => data.password !== data.oldPassword, {
      message: "New password must be different from old password",
      path: ["password"],
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: "Passwords do not match",
      path: ["confirmPassword"],
    }),
};


export const profileImage = {
  file: generalFieldsValidation.memoryFile(fileFieldValidation.image),
};

export const profileCoverImage = {
  files: z
    .array(generalFieldsValidation.memoryFile(fileFieldValidation.image))
    .min(1)
    .max(5),
};


export const updateUserRole = {
  params: z.strictObject({
    userId: objectId,
  }),
  body: z.strictObject({
    role: z.coerce.number().int().min(0).max(1),
  }),
};

export const profileAttachments = {
  files: z.object({
    profileImage: z
      .array(generalFieldsValidation.memoryFile(fileFieldValidation.image))
      .length(1),

    profileCoverImage: z
      .array(generalFieldsValidation.memoryFile(fileFieldValidation.image))
      .min(1)
      .max(5),
  }),
};
