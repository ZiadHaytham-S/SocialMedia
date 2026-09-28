import { z } from "zod";
import { DevicePlatformEnum } from "../../common/enums/notification.enum";

const objectId = z.string().regex(/^[a-fA-F0-9]{24}$/, "Invalid id");

export const registerDeviceToken = {
  body: z.strictObject({
    token: z.string().trim().min(20).max(4096),
    platform: z.enum([DevicePlatformEnum.WEB, DevicePlatformEnum.ANDROID, DevicePlatformEnum.IOS]).optional(),
    deviceId: z.string().trim().max(128).optional(),
  }),
};

export const unregisterDeviceToken = {
  body: z.strictObject({
    token: z.string().trim().min(20).max(4096),
  }),
};

export const notificationIdParam = {
  params: z.strictObject({
    notificationId: objectId,
  }),
};

export const listNotificationsQuery = {
  query: z.strictObject({
    limit: z.coerce.number().int().min(1).max(50).optional(),
    unreadOnly: z
      .enum(["true", "false"])
      .optional()
      .transform((value) => value === "true"),
  }),
};
