import {type NextFunction, type Request, type Response, Router } from "express";
import userService from "./user.service";
import { authentication, validation } from "../../middleware";
import { successHandling } from "../../common/response";
import { TokenTypeEnum } from "../../common/enums";
import { fileFieldValidation, r2FileUpload } from "../../common/helper";
import * as validators from './user.validation'

const router = Router();

router.get("/list",
    authentication(),
    async(req:Request,res:Response):Promise<Response>=>{
    const result = await userService.listUsers(req.user)
    return successHandling({res , data:{result}})
})

router.get("/" ,
    authentication(),
     async(req:Request,res:Response,next:NextFunction):Promise<Response>=>{
    const data = await userService.profile(req.user)
    return successHandling({res , data})
})

router.get("/images",
  authentication(),
  async(req:Request,res:Response):Promise<Response>=>{
    const result = await userService.getUserImages(req.user._id.toString())
    return successHandling({res , data:{result}})
})


router.post("/logout" , 
    authentication(),
    async(req:Request , res:Response , next:NextFunction)=>{
    const status = await userService.logout(req.body , req.user , req.decoded as {jti:string , iat:number , sub:string})
    return successHandling({res , status})
})

router.post("/rotate-token" , 
    authentication(TokenTypeEnum.REFRESH),
    async(req:Request , res:Response , next:NextFunction)=>{
    const credentials = await userService.rotateToken(req.user , req.decoded as {iat:number , jti:string , sub:string} , `${req.protocol}://${req.host}`)
    return successHandling({res , status:201 , data:{...credentials}})
})

router.patch("/update-password" , 
    authentication(),
    validation(validators.updatePassword),
    async(req:Request , res:Response , next:NextFunction)=>{
    const credentials = await userService.updatePassword(req.user , req.body , `${req.protocol}://${req.host}`)
    return successHandling({res , data : {credentials}})
})


router.patch('/profile-image',
  authentication(),
  r2FileUpload({ validation: fileFieldValidation.image }).single("attachment"),
  validation(validators.profileImage),
  async (req:Request, res:Response, next:NextFunction) => {
    const result = await userService.profileImage(req.file as Express.Multer.File, req.user)
    return successHandling({ res, data: { result } })
  })

  router.patch("/profile-cover-image",
  authentication(),
  r2FileUpload({ validation: fileFieldValidation.image }).array("files", 2),
  validation(validators.profileCoverImage),
  async (req, res, next) => {
  const result = await userService.profileCoverImage(req.files  as Express.Multer.File[], req.user)
    return successHandling({ res, data: { result } })
  })

router.patch(
  "/:userId/role",
  authentication(),
  validation(validators.updateUserRole),
  async (req: Request, res: Response): Promise<Response> => {
    const result = await userService.updateUserRole(
      req.params.userId as string,
      Number(req.body.role),
      req.user,
    );
    return successHandling({ res, data: { result } });
  },
);

router.get("/:userId",
  authentication(),
  validation(validators.userIdParam),
  async(req:Request,res:Response):Promise<Response>=>{
    const result = await userService.getUserById(req.params.userId as string, req.user)
    return successHandling({res , data:{result}})
})

router.get("/:userId/images",
  authentication(),
  validation(validators.userIdParam),
  async(req:Request,res:Response):Promise<Response>=>{
    const result = await userService.getUserImages(req.params.userId as string)
    return successHandling({res , data:{result}})
})

router.patch("/:userId",
  authentication(),
  validation(validators.updateProfile),
  async(req:Request,res:Response):Promise<Response>=>{
    const result = await userService.updateProfile(req.params.userId as string, req.body, req.user)
    return successHandling({res , data:{result}})
})

router.delete("/:userId",
  authentication(),
  validation(validators.userIdParam),
  async(req:Request,res:Response):Promise<Response>=>{
    const result = await userService.deleteUser(req.params.userId as string, req.user)
    return successHandling({res , data:{result}})
})

router.patch("/:userId/restore",
  authentication(),
  validation(validators.userIdParam),
  async(req:Request,res:Response):Promise<Response>=>{
    const result = await userService.restoreUser(req.params.userId as string, req.user)
    return successHandling({res , data:{result}})
})

router.get("/profile/:userId", authentication(), async (req, res, next) => {

  const result = await userService.visitProfile({
    userId: req.params.userId as string,
    viewer: req.user
  });

  return successHandling({
    res,
    data: { result },
  });

});

export default router
