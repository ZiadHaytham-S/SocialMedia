import { type Request, type Response, Router } from "express";
import { r2FileUpload } from "../../common/helper";
import { successHandling } from "../../common/response";
import { authentication } from "../../middleware";
import messageService from "./message.service";

const router = Router();
const messageMedia = ["image/*", "video/*", "audio/*"];

router.post(
  "/",
  authentication(),
  r2FileUpload({ validation: messageMedia, maxSize: 1024 }).single("attachment"),
  async (req: Request, res: Response) => {
    const result = await messageService.sendMessage(
      req.user,
      String(req.body.recipientId ?? ""),
      String(req.body.content ?? ""),
      req.file,
    );

    return successHandling({ res, status: 201, data: { result } });
  },
);

router.delete(
  "/conversation/:conversationId",
  authentication(),
  async (req: Request, res: Response) => {
    const result = await messageService.deleteConversationForViewer(
      req.user,
      String(req.params.conversationId ?? ""),
    );

    return successHandling({ res, data: { result } });
  },
);

router.patch(
  "/:messageId",
  authentication(),
  async (req: Request, res: Response) => {
    const result = await messageService.editOwnMessage(
      req.user,
      String(req.params.messageId ?? ""),
      String(req.body.content ?? ""),
    );

    return successHandling({ res, data: { result } });
  },
);

router.patch(
  "/:messageId/react",
  authentication(),
  async (req: Request, res: Response) => {
    const result = await messageService.toggleReaction(
      req.user,
      String(req.params.messageId ?? ""),
      String(req.body.type ?? ""),
    );

    return successHandling({ res, data: { result } });
  },
);

router.patch(
  "/:messageId/pin",
  authentication(),
  async (req: Request, res: Response) => {
    const result = await messageService.setMessagePinned(
      req.user,
      String(req.params.messageId ?? ""),
      Boolean(req.body.pinned),
    );

    return successHandling({ res, data: { result } });
  },
);

router.post(
  "/:messageId/forward",
  authentication(),
  async (req: Request, res: Response) => {
    const result = await messageService.forwardMessage(
      req.user,
      String(req.params.messageId ?? ""),
      String(req.body.recipientId ?? ""),
    );

    return successHandling({ res, status: 201, data: { result } });
  },
);

router.delete(
  "/:messageId",
  authentication(),
  async (req: Request, res: Response) => {
    const result = await messageService.deleteOwnMessage(
      req.user,
      String(req.params.messageId ?? ""),
    );

    return successHandling({ res, data: { result } });
  },
);

export default router;
