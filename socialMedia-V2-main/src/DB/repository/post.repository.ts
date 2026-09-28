import { IPost } from "../../common/interfaces";
import { PostModel } from "../models/post.model";
import { DataBaseRepository } from "./base.repository";

export class PostRepository extends DataBaseRepository<IPost>{

    constructor(){
        super(PostModel)
    }
}