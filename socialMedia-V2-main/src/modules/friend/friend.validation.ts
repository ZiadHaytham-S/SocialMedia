import { z } from "zod";

const objectId = z.string().regex(/^[a-fA-F0-9]{24}$/, "Invalid id");

export const userIdParam = {
  params: z.strictObject({
    userId: objectId,
  }),
};

export const searchQuery = {
  query: z.strictObject({
    q: z.string().trim().min(2).max(80),
    limit: z.coerce.number().int().min(1).max(50).optional(),
  }),
};
