import { IFriendship } from "../../common/interfaces/friendship.interface";
import { FriendshipModel } from "../models/friendship.model";
import { DataBaseRepository } from "./base.repository";

export class FriendshipRepository extends DataBaseRepository<IFriendship> {
  constructor() {
    super(FriendshipModel);
  }
}
