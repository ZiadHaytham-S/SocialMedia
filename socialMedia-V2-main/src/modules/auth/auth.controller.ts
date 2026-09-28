import {
  type NextFunction,
  type Request,
  type Response,
  Router,
} from "express";
import authService from "./auth.service";
import * as validators from "./auth.validation";
import { validation } from "../../middleware";
import { ILoginResponse } from "./auth.entity";
import { successHandling } from "../../common/response";

const router = Router();

router.post(
  "/login",
  validation(validators.login),
  async(req: Request, res: Response, next: NextFunction): Promise<Response> => {
    const data = await authService.login(req.body , `${req.protocol}://${req.host}`);
    return successHandling<ILoginResponse>({ res, data });
  },
);
router.post(
  "/signup",
  validation(validators.signup),
  async (req: Request, res: Response, next: NextFunction): Promise<Response> => {
    const data = await authService.signup(req.body);

    return successHandling({ res, status: 201, data });
  },
);

router.patch('/confirm-email',
  validation(validators.confirmEmail),
  async(req: Request, res: Response, next: NextFunction):Promise<Response>=>{
 const data = await authService.confirmEmail(req.body, `${req.protocol}://${req.host}`);
  return successHandling({ res, data, message: "Account Verify Successfully" })
})

router.patch('/resend-confirm-email',
  validation(validators.resendConfirmEmail),
  async(req: Request, res: Response, next: NextFunction):Promise<Response>=>{
  await authService.resendConfirmEmail(req.body)
  return successHandling({res , message:"check inbox email please ,, otp is send"})
})


router.post('/signup/gmail', async (req:Request, res:Response, next:NextFunction) => {
    const { status , credentials} = await authService.signupWithGmail(req.body.idToken, `${req.protocol}://${req.host}`)
    return successHandling({ res, status, data: { credentials } })

})

router.post("/request-forgot-password-code", validation(validators.resendConfirmEmail), async (req:Request, res:Response, next:NextFunction) => {
  const {email} = req.body
     await authService.requestForgotPasswordOtp(email);
    return successHandling({ res, message: "otp is send please check your email" })
})

router.patch("/verify-forgot-password-code", validation(validators.confirmEmail), async (req:Request, res:Response, next:NextFunction) => {
  const {email , otp} = req.body
    await authService.verifyForgotPasswordOtp({email , otp});
    return successHandling({ res,})
})

router.patch("/reset-forgot-password-code", validation(validators.resetForgotPasswordOtp), async (req:Request, res:Response, next:NextFunction) => {
    await authService.resetForgotPasswordOtp(req.body);
    return successHandling({ res, })
})

export default router;
