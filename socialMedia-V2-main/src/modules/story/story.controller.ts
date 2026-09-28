import { type Request, type Response, Router } from "express";
import { fileFieldValidation, r2FileUpload } from "../../common/helper";
import { successHandling } from "../../common/response";
import { authentication, validation } from "../../middleware";
import storyService from "./story.service";
import * as validators from "./story.validation";

const router = Router();
const storyMedia = [...fileFieldValidation.image, ...fileFieldValidation.video];

router.get("/feed", authentication(), async (req: Request, res: Response) => {
  const result = await storyService.feed(req.user);
  return successHandling({ res, data: { result } });
});

router.get("/dashboard", authentication(), async (req: Request, res: Response) => {
  const result = await storyService.dashboard(req.user);
  return successHandling({ res, data: { result } });
});

router.get(
  "/profile/:userId",
  authentication(),
  validation(validators.profileStories),
  async (req: Request, res: Response) => {
    const result = await storyService.profileStories(req.params.userId as string, req.user);
    return successHandling({ res, data: { result } });
  },
);

router.post(
  "/",
  authentication(),
  r2FileUpload({ validation: storyMedia, maxSize: 20 }).single("attachment"),
  validation(validators.createStory),
  async (req: Request, res: Response) => {
    const result = await storyService.createStory({
      data: req.body,
      file: req.file,
      user: req.user,
    });
    return successHandling({ res, status: 201, data: { result } });
  },
);

router.get(
  "/:storyId",
  authentication(),
  validation(validators.storyIdParam),
  async (req: Request, res: Response) => {
    const result = await storyService.getStory(req.params.storyId as string, req.user);
    return successHandling({ res, data: { result } });
  },
);

router.post(
  "/:storyId/view",
  authentication(),
  validation(validators.storyIdParam),
  async (req: Request, res: Response) => {
    const result = await storyService.viewStory(req.params.storyId as string, req.user);
    return successHandling({ res, data: { result } });
  },
);

router.patch(
  "/:storyId/react",
  authentication(),
  validation(validators.react),
  async (req: Request, res: Response) => {
    const result = await storyService.reactOnStory(req.params.storyId as string, req.user, req.body.type);
    return successHandling({ res, data: { result } });
  },
);

router.delete(
  "/:storyId/react",
  authentication(),
  validation(validators.storyIdParam),
  async (req: Request, res: Response) => {
    const result = await storyService.deleteStoryReaction(req.params.storyId as string, req.user);
    return successHandling({ res, data: { result } });
  },
);

router.delete(
  "/:storyId",
  authentication(),
  validation(validators.storyIdParam),
  async (req: Request, res: Response) => {
    const result = await storyService.deleteStory({
      storyId: req.params.storyId as string,
      user: req.user,
    });
    return successHandling({ res, data: { result } });
  },
);

export default router;
