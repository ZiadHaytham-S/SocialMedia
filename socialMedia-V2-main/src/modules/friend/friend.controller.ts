import { type Request, type Response, Router } from "express";
import { authentication, validation } from "../../middleware";
import { successHandling } from "../../common/response";
import friendService from "./friend.service";
import * as validators from "./friend.validation";

const router = Router();

router.get("/", authentication(), async (req: Request, res: Response) => {
  const result = await friendService.listFriends(req.user);
  return successHandling({ res, data: { result } });
});

router.get("/counts", authentication(), async (req: Request, res: Response) => {
  const result = await friendService.getCounts(req.user);
  return successHandling({ res, data: { result } });
});

router.get(
  "/search",
  authentication(),
  validation(validators.searchQuery),
  async (req: Request, res: Response) => {
    const { q, limit } = req.query as { q: string; limit?: string };
    const result = await friendService.searchUsers(req.user, q, limit ? Number(limit) : 20);
    return successHandling({ res, data: { result } });
  },
);

router.get("/requests/incoming", authentication(), async (req: Request, res: Response) => {
  const result = await friendService.listIncomingRequests(req.user);
  return successHandling({ res, data: { result } });
});

router.get("/requests/outgoing", authentication(), async (req: Request, res: Response) => {
  const result = await friendService.listOutgoingRequests(req.user);
  return successHandling({ res, data: { result } });
});

router.get("/suggestions", authentication(), async (req: Request, res: Response) => {
  const result = await friendService.suggestions(req.user);
  return successHandling({ res, data: { result } });
});

router.get("/blocked", authentication(), async (req: Request, res: Response) => {
  const result = await friendService.listBlocked(req.user);
  return successHandling({ res, data: { result } });
});

router.get(
  "/mutual/:userId",
  authentication(),
  validation(validators.userIdParam),
  async (req: Request, res: Response) => {
    const result = await friendService.listMutual(req.user, req.params.userId as string);
    return successHandling({ res, data: { result } });
  },
);

router.get(
  "/status/:userId",
  authentication(),
  validation(validators.userIdParam),
  async (req: Request, res: Response) => {
    const result = await friendService.getStatus(req.user, req.params.userId as string);
    return successHandling({ res, data: { result } });
  },
);

router.post(
  "/request/:userId",
  authentication(),
  validation(validators.userIdParam),
  async (req: Request, res: Response) => {
    const result = await friendService.sendRequest(req.user, req.params.userId as string);
    return successHandling({ res, status: 201, data: { result } });
  },
);

router.delete(
  "/request/:userId",
  authentication(),
  validation(validators.userIdParam),
  async (req: Request, res: Response) => {
    const result = await friendService.cancelRequest(req.user, req.params.userId as string);
    return successHandling({ res, data: { result } });
  },
);

router.patch(
  "/request/:userId/accept",
  authentication(),
  validation(validators.userIdParam),
  async (req: Request, res: Response) => {
    const result = await friendService.acceptRequest(req.user, req.params.userId as string);
    return successHandling({ res, data: { result } });
  },
);

router.patch(
  "/request/:userId/decline",
  authentication(),
  validation(validators.userIdParam),
  async (req: Request, res: Response) => {
    const result = await friendService.declineRequest(req.user, req.params.userId as string);
    return successHandling({ res, data: { result } });
  },
);

router.delete(
  "/:userId",
  authentication(),
  validation(validators.userIdParam),
  async (req: Request, res: Response) => {
    const result = await friendService.unfriend(req.user, req.params.userId as string);
    return successHandling({ res, data: { result } });
  },
);

router.post(
  "/block/:userId",
  authentication(),
  validation(validators.userIdParam),
  async (req: Request, res: Response) => {
    const result = await friendService.blockUser(req.user, req.params.userId as string);
    return successHandling({ res, status: 201, data: { result } });
  },
);

router.delete(
  "/block/:userId",
  authentication(),
  validation(validators.userIdParam),
  async (req: Request, res: Response) => {
    const result = await friendService.unblockUser(req.user, req.params.userId as string);
    return successHandling({ res, data: { result } });
  },
);

export default router;
