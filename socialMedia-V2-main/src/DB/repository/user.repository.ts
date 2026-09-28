import { IUser } from "../../common/interfaces";
import { UserModel } from "../models/user.model";
import { DataBaseRepository } from "./base.repository";


export class UserRepository extends DataBaseRepository<IUser>{

    constructor(){
        super(UserModel)
    }
    
}