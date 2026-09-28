import { z } from "zod";
import { AvailabilityEnum } from "../../common/enums";
import { fileFieldValidation } from "../../common/helper";
import { formBoolean, generalFieldsValidation } from "../../common/validation";

const objectId = z.string().regex(/^[a-fA-F0-9]{24}$/, "Invalid id");

const tagsField = z
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
  });

export const createPost = {
  body: z.strictObject({
    content: z.string().trim().min(1).max(5000).optional(),
    allowComments: formBoolean(),
    availability: z.nativeEnum(AvailabilityEnum).optional(),
    tags: tagsField,
  }),
  file: generalFieldsValidation.memoryFile(fileFieldValidation.image).optional(),
};

export const updatePost = {
  params: z.strictObject({
    postId: objectId,
  }),
  body: z.strictObject({
    content: z.string().trim().min(1).max(5000).optional(),
    allowComments: formBoolean(),
    availability: z.nativeEnum(AvailabilityEnum).optional(),
    tags: tagsField,
  }),
  file: generalFieldsValidation.memoryFile(fileFieldValidation.image).optional(),
};

export const postIdParam = {
  params: z.strictObject({
    postId: objectId,
  }),
};

export const profilePosts = {
  params: z.strictObject({
    userId: objectId,
  }),
};

export const sharePost = {
  params: z.strictObject({
    postId: objectId,
  }),
  body: z.strictObject({
    content: z.string().trim().max(5000).optional(),
    allowComments: formBoolean(),
    availability: z.nativeEnum(AvailabilityEnum).optional(),
  }),
};

export const react = {
  params: z.strictObject({
    postId: objectId,
  }),
  body: z.strictObject({
    type: z.enum(["like", "love", "haha", "wow", "sad", "angry"], {
      message: "type must be one of: like, love, haha, wow, sad, angry",
    }),
  }),
};
