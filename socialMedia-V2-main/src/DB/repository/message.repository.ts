import { IMessage } from "../../common/interfaces/message.interface";
import { MessageModel } from "../models/message.model";
import { DataBaseRepository } from "./base.repository";

export class MessageRepository extends DataBaseRepository<IMessage> {
  constructor() {
    super(MessageModel);
  }
}
