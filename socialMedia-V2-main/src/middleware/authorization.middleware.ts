import { NextFunction, Request, Response } from "express"
import { RoleEnum } from "../common/enums"
import { ForBiddenException } from "../common/exceptions"

export const authorization = (accessRoles : [RoleEnum]) => {
    return async (req:Request , res:Response, next:NextFunction) => {
        if (!accessRoles.includes(req.user.role)) {
            throw new  ForBiddenException( "not allowed account")
        }
        next()
    }
}