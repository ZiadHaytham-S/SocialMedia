import { z } from "zod";

/** Parses multipart/form fields where booleans arrive as the strings "true" / "false". */
export const formBoolean = () =>
  z.preprocess((value) => {
    if (value === "true" || value === true) return true;
    if (value === "false" || value === false) return false;
    return value;
  }, z.boolean().optional());

export const generalFieldsValidation = {
  email: z.string().regex(/[^@ \t\r\n]+@[^@ \t\r\n]+\.[^@ \t\r\n]+/, {
    message: "Invalid email format (example: user@example.com)",
  }),

  password: z
    .string()
    .regex(/^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])(?=.*?[#?!@$ %^&*-]).{8,}$/, {
      message:
        "Password must be at least 8 characters and include uppercase, lowercase, number, and special character",
    }),

  phone: z
    .string()
    .regex(/^(?:\+20|0)?1[0125]\d{8}$/)
    .optional(),

  otp: z.string().regex(/^\d{6}$/),

  username: z
    .string()
    .min(3, { message: "Username must be at least 3 characters" })
    .max(25, { message: "Username must not exceed 25 characters" }),

  confirmPassword: z.string({
    error: "Confirm password is required",
  }),

  file: function (validation :string[] = []) {
    return z.strictObject({
    fieldname: z.string({ error: "attachment fieldname is required" }),
    originalname: z.string({ error: "attachment original name is required" }),
    encoding: z.string({ error: "attachment encoding is required" }),
    mimetype: z.string().refine((val) => validation.includes(val), {
      message: `Invalid attachment type. Allowed types: ${validation.join(", ")}`,
    }),
    destination: z.string({ error: "attachment destination is required" }),
    filename: z.string({ error: "attachment filename is required" }),
    path: z.string({ error: "attachment path is required" }),
    size: z.number({ error: "attachment size is required" }),
  });

  },


  memoryFile: function (validation: string[] = []) {
  return z.strictObject({
    fieldname: z.string({ error: "attachment fieldname is required" }),

    originalname: z.string({
      error: "attachment original name is required",
    }),

    encoding: z.string({
      error: "attachment encoding is required",
    }),

    mimetype: z.string().refine(
      (val) => validation.includes(val),
      {
        message: `Invalid attachment type. Allowed types: ${validation.join(", ")}`,
      }
    ),

    size: z.number({
      error: "attachment size is required",
    }),

    buffer: z.any(),
  });
},
  
}
