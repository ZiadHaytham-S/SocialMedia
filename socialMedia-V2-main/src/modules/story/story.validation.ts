import { z } from "zod";
import { fileFieldValidation } from "../../common/helper";
import { generalFieldsValidation } from "../../common/validation";

const objectId = z.string().regex(/^[a-fA-F0-9]{24}$/, "Invalid id");
const storyMedia = [...fileFieldValidation.image, ...fileFieldValidation.video];

export const createStory = {
  body: z.strictObject({
    content: z.string().trim().min(1).max(1000).optional(),
  }),
  file: generalFieldsValidation.memoryFile(storyMedia).optional(),
};

export const storyIdParam = {
  params: z.strictObject({
    storyId: objectId,
  }),
};

export const react = {
  params: z.strictObject({
    storyId: objectId,
  }),
  body: z.strictObject({
    type: z.enum(["like", "love", "haha", "wow", "sad", "angry"], {
      message: "type must be one of: like, love, haha, wow, sad, angry",
    }),
  }),
};

export const profileStories = {
  params: z.strictObject({
    userId: objectId,
  }),
};
