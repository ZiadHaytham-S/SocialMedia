import { RedisClientType, SetOptions } from "@redis/client";
import { createClient } from "redis";
import { REDIS_URI } from "../../config/config";
import { EmailEnum } from "../enums";
import { Types } from "mongoose";


type KeyEmail = {
    email:string;
    subject? : EmailEnum
}
export class RedisService {
    private readonly client: RedisClientType
    constructor(){
        this.client = createClient({url:REDIS_URI})
        this.handelEvent()
    }

    private handelEvent():void{
        this.client.on("error" , (error)=>{console.log(`REDIS ERROR 🤦‍♂️ ,,, ${error}`)});
        this.client.on("ready" , ()=>{console.log(`REDIS Ready ,,, 🍜`)});
    }
    public async connect():Promise<void>{
        await this.client.connect()
        console.log(`REDIS IS CONNECTED 💕`);
        
    }

     otpKey =  ({ email, subject = EmailEnum.ConfirmEmail } : KeyEmail) => {
    return `OTP::User::${email}::${subject}`
}
 maxAttemptOtpKey =  ({ email, subject = EmailEnum.ConfirmEmail } : KeyEmail) => {
    return `${this.otpKey({ email, subject })}::maxTrial`
}
 blockOtpKey =  ({ email, subject = EmailEnum.ConfirmEmail } : KeyEmail) => {
    return `${this.otpKey({ email, subject })}::Block`
}

 baseRevokeTokenKey =  (userId:Types.ObjectId|string) => {
    return `RevokeToken::${userId.toString()}`
}

 revokeTokenKey =  ({ userId, jti }:{userId:Types.ObjectId|string , jti:string}) => {
    return `RevokeToken::${userId}::${jti}`
}

 set = async ({
    key,
    value,
    ttl
} : {
    key:string,
    value:any,
    ttl?:number
}):Promise<string|null> => {
    try {
        let data = typeof value === 'string' ? value : JSON.stringify(value)
        return ttl ? await this.client.set(key, data, { EX: ttl }) : await this.client.set(key, data)
    } catch (error) {
        console.log(`Fail in redis set operation ${error}`);
        return null
    }
}

 get = async (key:string):Promise<any> => {
    try {
        try {
            return JSON.parse(await this.client.get(key) as string)
        } catch (error) {

            return await this.client.get(key)
        }
    } catch (error) {
        console.log(`Fail in redis get operation ${error}`);
        return;
    }
}

 update = async ({ key, value, ttl } : {key:string , value:any , ttl?:SetOptions}):Promise<string|number|null> => {

    try {
        if (!await this.client.exists(key)) return 0;
        return await this.client.set(key, value, ttl)
    } catch (error) {
        console.log(`Fail in redis update operation ${error}`);
        return null
    }
}

 keys = async (prefix:string):Promise<string[]> => {
    try {
        return await this.client.keys(`${prefix}*`)
    } catch (error) {
        console.log(`Fail in redis keys operation ${error}`);
        return []
    }
}
 ttl = async (key:string):Promise<number> => {
    try {
        return await this.client.ttl(key)
    } catch (error) {
        console.log(`Fail in redis ttl operation ${error}`);
        return 0
    }
}
 exists = async (key:string):Promise<number|null> => {
    try {
        return await this.client.exists(key)
    } catch (error) {
        console.log(`Fail in redis exists operation ${error}`);
        return null
    }
}
 expire = async ({ key, ttl } : {key:string , ttl:number}):Promise<number> => {
    try {
        return await this.client.expire(key, ttl)
    } catch (error) {
        console.log(`Fail in redis expire operation ${error}`);
        return 0
    }
}
 mGet = async (keys: string[]): Promise<(string | null)[] | null> => {
    try { 
        if (!keys.length) return [];
        return await this.client.mGet(keys);
    } catch (error) {
        console.log(`Fail in redis mGet operation ${error}`);
        return null;
    }
}
 deleteKey = async (key:string[]|string):Promise<number> => {
    try {
        if (!key.length) return 0;
        return await this.client.del(key)
    } catch (error) {
        console.log(`Fail in redis del operation ${error}`);
        return 0
    }
}

 incr = async (key:string):Promise<number> => {
    try {
        return await this.client.incr(key) ;
    } catch (error) {
        console.log(`Fail in redis incr operation ${error}`);
        return -2
    }
}
}

export const redisService = new RedisService()