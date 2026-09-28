import { z } from "zod";
import { fileFieldValidation } from "../../common/helper";
import { generalFieldsValidation } from "../../common/validation";

const objectId = (fieldName: string) =>
  z
    .string({ error: `${fieldName} is required` })
    .regex(/^[a-fA-F0-9]{24}$/, {
      message: `${fieldName} must be a valid ObjectId`,
    });

const commentContent = z
  .string({ error: "content must be a string" })
  .trim()
  .min(1, { message: "content cannot be empty" })
  .max(2000, { message: "content must not exceed 2000 characters" });

const reactionType = z.enum(["like", "love", "haha", "wow", "sad", "angry"], {
  error: "type must be one of: like, love, haha, wow, sad, angry",
});

export const createComment = {
  params: z.strictObject({
    postId: objectId("postId"),
  }),
  body: z.strictObject({
    content: commentContent.optional(),
    commentId: objectId("commentId").optional(),
    tags: z
      .string()
      .optional()
      .transform((value) => {
        if (!value?.trim()) {
          return undefined;
        }

        return value
          .split(",")
          .map((id) => id.trim())
          .filter((id) => /^[a-fA-F0-9]{24}$/.test(id));
      }),
  }),
  file: generalFieldsValidation.memoryFile(fileFieldValidation.image).optional(),
};

export const postIdParam = {
  params: z.strictObject({
    postId: objectId("postId"),
  }),
};

export const commentIdParam = {
  params: z.strictObject({
    commentId: objectId("commentId"),
  }),
};

export const updateComment = {
  params: z.strictObject({
    commentId: objectId("commentId"),
  }),
  body: z.strictObject({
    content: commentContent,
  }),
};

export const react = {
  params: z.strictObject({
    commentId: objectId("commentId"),
  }),
  body: z.strictObject({
    type: reactionType,
  }),
};
