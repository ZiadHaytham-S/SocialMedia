import { INotification } from "../../common/interfaces/notification.interface";
import { NotificationModel } from "../models/notification.model";
import { DataBaseRepository } from "./base.repository";

export class NotificationRepository extends DataBaseRepository<INotification> {
  constructor() {
    super(NotificationModel);
  }
}
