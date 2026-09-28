import { z } from "zod";
import type { PostAvailability } from "@/types/social";

const postAvailabilitySchema = z.enum(["PUBLIC", "PRIVATE", "ONLY"] satisfies [PostAvailability, PostAvailability, PostAvailability]);

const tagIdsSchema = z.array(z.string().regex(/^[a-fA-F0-9]{24}$/i)).optional();

export const emailSchema = z.string().regex(/[^@ \t\r\n]+@[^@ \t\r\n]+\.[^@ \t\r\n]+/, {
  message: "validation.emailInvalid",
});

export const passwordSchema = z.string().regex(/^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])(?=.*?[#?!@$ %^&*-]).{8,}$/, {
  message: "validation.passwordRules",
});

export const phoneSchema = z
  .string()
  .regex(/^(?:\+20|0)?1[0125]\d{8}$/, { message: "validation.phoneInvalid" })
  .optional()
  .or(z.literal(""));

export const otpSchema = z.string().regex(/^\d{6}$/, {
  message: "validation.otpInvalid",
});

export const usernameSchema = z
  .string()
  .min(3, { message: "validation.usernameMin" })
  .max(25, { message: "validation.usernameMax" });

export const confirmPasswordSchema = z.string().min(1, {
  message: "validation.confirmRequired",
});

export const loginSchema = z.strictObject({
  email: emailSchema,
  password: passwordSchema,
});

const registerDobMax = new Date();
const registerDobMin = new Date();
registerDobMin.setFullYear(registerDobMin.getFullYear() - 100);
const registerMinAgeDate = new Date();
registerMinAgeDate.setFullYear(registerMinAgeDate.getFullYear() - 13);

export const genderSchema = z
  .enum(["0", "1"], { message: "validation.genderRequired" })
  .transform((value) => Number(value));

export const dobSchema = z.coerce
  .date({ message: "validation.dobRequired" })
  .max(registerDobMax, { message: "validation.dobFuture" })
  .min(registerDobMin, { message: "validation.dobInvalid" })
  .refine((value) => value <= registerMinAgeDate, {
    message: "validation.dobMinAge",
  });

export const registerSchema = loginSchema
  .safeExtend({
    username: usernameSchema,
    phone: phoneSchema,
    confirmPassword: confirmPasswordSchema,
    gender: genderSchema,
    DOB: dobSchema,
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "validation.passwordMismatch",
    path: ["confirmPassword"],
  });

export const emailOnlySchema = z.strictObject({
  email: emailSchema,
});

export const confirmEmailSchema = emailOnlySchema.safeExtend({
  otp: otpSchema,
});

export const resetPasswordSchema = confirmEmailSchema
  .safeExtend({
    password: passwordSchema,
    confirmPassword: confirmPasswordSchema,
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "validation.passwordMismatch",
    path: ["confirmPassword"],
  });

export const postContentSchema = z
  .string()
  .trim()
  .min(1, { message: "validation.contentEmpty" })
  .max(5000, { message: "validation.contentMax5000" });

const optionalPostContentSchema = z
  .string()
  .trim()
  .max(5000, { message: "validation.contentMax5000" })
  .optional();

export const commentContentSchema = z
  .string({ error: "validation.contentEmpty" })
  .trim()
  .min(1, { message: "validation.contentEmpty" })
  .max(2000, { message: "validation.contentMax2000" });

export const reactionTypeSchema = z.enum(["like", "love", "haha", "wow", "sad", "angry"]);

export const storyContentSchema = z
  .string()
  .trim()
  .max(1000, { message: "validation.contentMax1000" })
  .optional();

const browserFileSchema =
  typeof File === "undefined"
    ? z.custom<File>((value) => value === undefined || value instanceof Blob).optional()
    : z.instanceof(File).optional();

export const objectIdSchema = z.string().regex(/^[a-fA-F0-9]{24}$/, {
  message: "validation.contentEmpty",
});

const postMutationSchema = z.strictObject({
  content: optionalPostContentSchema,
  allowComments: z.boolean().optional(),
  availability: postAvailabilitySchema.optional(),
  tagIds: tagIdsSchema,
  attachment: browserFileSchema,
});

export const createPostSchema = postMutationSchema.refine((data) => Boolean(data.content?.trim()) || Boolean(data.attachment), {
  message: "validation.postRequired",
  path: ["content"],
});

export const sharePostSchema = z.strictObject({
  content: z.string().trim().max(5000, { message: "validation.contentMax5000" }).optional(),
  allowComments: z.boolean().optional(),
  availability: postAvailabilitySchema.optional(),
});

export const updatePostSchema = postMutationSchema.refine(
  (data) =>
    Boolean(data.content?.trim()) ||
    typeof data.allowComments === "boolean" ||
    Boolean(data.availability) ||
    Boolean(data.tagIds?.length) ||
    Boolean(data.attachment),
  {
    message: "validation.postUpdateRequired",
    path: ["content"],
  },
);

export const createCommentSchema = z
  .strictObject({
    content: z.string().trim().max(2000, { message: "validation.contentMax2000" }).optional(),
    attachment: browserFileSchema,
    commentId: z
      .string()
      .regex(/^[a-f\d]{24}$/i, { message: "validation.invalidId" })
      .optional(),
    tagIds: tagIdsSchema,
  })
  .refine((data) => Boolean(data.content?.trim()) || Boolean(data.attachment), {
    message: "validation.commentRequired",
    path: ["content"],
  });

export const updateCommentSchema = z.strictObject({
  content: commentContentSchema,
});

export const updateProfileSchema = z.strictObject({
  username: usernameSchema.optional(),
  phone: phoneSchema,
  gender: z.coerce.number().min(0).max(1).optional(),
  DOB: z.coerce.date().optional(),
});

export const updatePasswordSchema = z
  .strictObject({
    oldPassword: passwordSchema,
    password: passwordSchema,
    confirmPassword: confirmPasswordSchema,
  })
  .refine((data) => data.password !== data.oldPassword, {
    message: "validation.passwordDifferent",
    path: ["password"],
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "validation.passwordMismatch",
    path: ["confirmPassword"],
  });

export const storyCreateSchema = z
  .strictObject({
    content: storyContentSchema,
    attachment: browserFileSchema,
  })
  .refine((data) => Boolean(data.content?.trim()) || Boolean(data.attachment), {
    message: "validation.storyRequired",
    path: ["content"],
  })
  .refine((data) => !(data.content?.trim() && data.attachment), {
    message: "validation.storyOneTypeOnly",
    path: ["content"],
  });

export type FieldErrors<T extends string> = Partial<Record<T, string>>;

export function zodFieldErrors<T extends string>(error: z.ZodError): FieldErrors<T> {
  return error.issues.reduce<FieldErrors<T>>((errors, issue) => {
    const key = issue.path[0];

    if (typeof key === "string" && !errors[key as T]) {
      errors[key as T] = issue.message;
    }

    return errors;
  }, {});
}

export function getFormString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}
