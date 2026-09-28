import { hash , compare } from "bcrypt";
import { SALT_ROUND } from "../../../config/config";


export const generateHash = async({
    plainText,
    salt = SALT_ROUND
}:{
    plainText:string,
    salt?:number
}):Promise<string>=>{
    return await hash(plainText , salt)
}
export const generateCompare = async({
    plainText,
    cipherText
}:{
    plainText:string,
    cipherText:string
}): Promise<boolean>=>{
return await compare(plainText , cipherText)
}