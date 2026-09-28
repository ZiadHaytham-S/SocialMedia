import { IDeviceToken } from "../../common/interfaces/notification.interface";
import { DeviceTokenModel } from "../models/device-token.model";
import { DataBaseRepository } from "./base.repository";

export class DeviceTokenRepository extends DataBaseRepository<IDeviceToken> {
  constructor() {
    super(DeviceTokenModel);
  }
}
