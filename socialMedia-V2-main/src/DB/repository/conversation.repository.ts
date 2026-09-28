import { IConversation } from "../../common/interfaces/message.interface";
import { ConversationModel } from "../models/conversation.model";
import { DataBaseRepository } from "./base.repository";

export class ConversationRepository extends DataBaseRepository<IConversation> {
  constructor() {
    super(ConversationModel);
  }
}
