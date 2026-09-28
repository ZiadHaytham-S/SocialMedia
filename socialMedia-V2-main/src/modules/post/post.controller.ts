import { type Request, type Response, Router } from "express";
import { fileFieldValidation, r2FileUpload } from "../../common/helper";
import { successHandling } from "../../common/response";
import { authentication, validation } from "../../middleware";
import postService from "./post.service";
import * as validators from "./post.validation";

const router = Router();

router.get("/feed", authentication(), async (req: Request, res: Response) => {
  const result = await postService.newsFeed(req.user);
  return successHandling({ res, data: { result } });
});

router.get("/dashboard", authentication(), async (req: Request, res: Response) => {
  const result = await postService.dashboard(req.user);
  return successHandling({ res, data: { result } });
});

router.get(
  "/profile/:userId",
  authentication(),
  validation(validators.profilePosts),
  async (req: Request, res: Response) => {
    const result = await postService.profilePosts(req.params.userId as string, req.user);
    return successHandling({ res, data: { result } });
  },
);

router.post(
  "/",
  authentication(),
  r2FileUpload({ validation: fileFieldValidation.image }).single("attachment"),
  validation(validators.createPost),
  async (req: Request, res: Response) => {
    const result = await postService.createPost({
      data: req.body,
      file: req.file,
      user: req.user,
    });
    return successHandling({ res, status: 201, data: { result } });
  },
);

router.post(
  "/:postId/share",
  authentication(),
  validation(validators.sharePost),
  async (req: Request, res: Response) => {
    const result = await postService.sharePost({
      postId: req.params.postId as string,
      data: req.body,
      user: req.user,
    });
    return successHandling({ res, status: 201, data: { result } });
  },
);

router.get(
  "/:postId",
  authentication(),
  validation(validators.postIdParam),
  async (req: Request, res: Response) => {
    const result = await postService.getPost(req.params.postId as string, req.user);
    return successHandling({ res, data: { result } });
  },
);

router.patch(
  "/:postId",
  authentication(),
  r2FileUpload({ validation: fileFieldValidation.image }).single("attachment"),
  validation(validators.updatePost),
  async (req: Request, res: Response) => {
    const result = await postService.updatePost({
      postId: req.params.postId as string,
      data: req.body,
      file: req.file,
      user: req.user,
    });
    return successHandling({ res, data: { result } });
  },
);

router.delete(
  "/:postId",
  authentication(),
  validation(validators.postIdParam),
  async (req: Request, res: Response) => {
    const result = await postService.deletePost({
      postId: req.params.postId as string,
      user: req.user,
    });
    return successHandling({ res, data: { result } });
  },
);

router.patch(
  "/:postId/react",
  authentication(),
  validation(validators.react),
  async (req: Request, res: Response) => {
    const result = await postService.reactPost({
      postId: req.params.postId as string,
      type: req.body.type,
      user: req.user,
    });
    return successHandling({ res, data: { result } });
  },
);

router.delete(
  "/:postId/react",
  authentication(),
  validation(validators.postIdParam),
  async (req: Request, res: Response) => {
    const result = await postService.removePostReaction({
      postId: req.params.postId as string,
      user: req.user,
    });
    return successHandling({ res, data: { result } });
  },
);

export default router;
