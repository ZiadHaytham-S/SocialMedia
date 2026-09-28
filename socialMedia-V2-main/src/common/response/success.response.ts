import { Response } from "express"

export const successHandling = <T>({
    res , message="Done" , status=200 , data
}:{
    res:Response,
    message?:string,
    status?:number,
    data?:T
})=>{

    return res.status(status).json({
        message,
        status,
        data
    })
}