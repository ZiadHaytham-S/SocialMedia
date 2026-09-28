import { type Request, type Response, Router } from "express";
import {  fileFieldValidation, r2FileUpload } from "../../common/helper";
import { successHandling } from "../../common/response";
import { authentication, validation } from "../../middleware";
import commentService from "./comment.service";
import * as validators from "./comment.validation";

const router = Router();

router.post(
  "/post/:postId",
  authentication(),
  r2FileUpload({ validation: fileFieldValidation.image }).single("attachment"),
  validation(validators.createComment),
  async (req: Request, res: Response) => {
    const result = await commentService.createComment({
      postId: req.params.postId as string,
      data: req.body,
      file: req.file,
      user: req.user,
    });
    return successHandling({ res, status: 201, data: { result } });
  },
);

router.get(
  "/post/:postId",
  authentication(),
  validation(validators.postIdParam),
  async (req: Request, res: Response) => {
    const result = await commentService.listPostComments(req.params.postId as string, req.user);
    return successHandling({ res, data: { result } });
  },
);

router.patch(
  "/:commentId",
  authentication(),
  validation(validators.updateComment),
  async (req: Request, res: Response) => {
    const result = await commentService.updateComment({
      commentId: req.params.commentId as string,
      data: req.body,
      user: req.user,
    });
    return successHandling({ res, data: { result } });
  },
);

router.delete(
  "/:commentId",
  authentication(),
  validation(validators.commentIdParam),
  async (req: Request, res: Response) => {
    const result = await commentService.deleteComment({
      commentId: req.params.commentId as string,
      user: req.user,
    });
    return successHandling({ res, data: { result } });
  },
);

router.patch(
  "/:commentId/react",
  authentication(),
  validation(validators.react),
  async (req: Request, res: Response) => {
    const result = await commentService.reactComment({
      commentId: req.params.commentId as string,
      type: req.body.type,
      user: req.user,
    });
    return successHandling({ res, data: { result } });
  },
);

router.delete(
  "/:commentId/react",
  authentication(),
  validation(validators.commentIdParam),
  async (req: Request, res: Response) => {
    const result = await commentService.removeCommentReaction({
      commentId: req.params.commentId as string,
      user: req.user,
    });
    return successHandling({ res, data: { result } });
  },
);

export default router;
