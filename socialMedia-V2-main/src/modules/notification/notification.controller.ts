import { type Request, type Response, Router } from "express";
import { authentication, validation } from "../../middleware";
import { successHandling } from "../../common/response";
import { DevicePlatformEnum } from "../../common/enums/notification.enum";
import notificationService from "./notification.service";
import * as validators from "./notification.validation";

const router = Router();

router.post(
  "/device-token",
  authentication(),
  validation(validators.registerDeviceToken),
  async (req: Request, res: Response) => {
    const { token, platform, deviceId } = req.body as {
      token: string;
      platform?: DevicePlatformEnum;
      deviceId?: string;
    };

    const result = await notificationService.registerDeviceToken(req.user._id, {
      token,
      ...(platform ? { platform } : {}),
      ...(deviceId ? { deviceId } : {}),
    });

    return successHandling({ res, status: 201, data: { result } });
  },
);

router.delete(
  "/device-token",
  authentication(),
  validation(validators.unregisterDeviceToken),
  async (req: Request, res: Response) => {
    const { token } = req.body as { token: string };
    const result = await notificationService.unregisterDeviceToken(req.user._id, token);
    return successHandling({ res, data: { result } });
  },
);

router.get("/", authentication(), validation(validators.listNotificationsQuery), async (req, res) => {
  const { limit, unreadOnly } = req.query as { limit?: string; unreadOnly?: boolean };
  const listOptions: { limit?: number; unreadOnly?: boolean } = {};

  if (limit) {
    listOptions.limit = Number(limit);
  }

  if (unreadOnly) {
    listOptions.unreadOnly = true;
  }

  const result = await notificationService.listNotifications(req.user._id, listOptions);

  return successHandling({ res, data: { result } });
});

router.get("/unread-count", authentication(), async (req, res) => {
  const result = await notificationService.getUnreadCount(req.user._id);
  return successHandling({ res, data: { result } });
});

router.patch("/read-all", authentication(), async (req, res) => {
  const result = await notificationService.markAllAsRead(req.user._id);
  return successHandling({ res, data: { result } });
});

router.patch(
  "/:notificationId/read",
  authentication(),
  validation(validators.notificationIdParam),
  async (req, res) => {
    const result = await notificationService.markAsRead(
      req.user._id,
      req.params.notificationId as string,
    );

    return successHandling({ res, data: { result } });
  },
);

export default router;
