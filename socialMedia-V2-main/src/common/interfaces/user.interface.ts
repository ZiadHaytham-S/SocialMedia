import { GenderEnum, ProviderEnum, RoleEnum } from "../enums";

export interface IUser {
  firstName: string;
  lastName: string;
  username?: string;
  email: string;
  password?: string;
  oldPassword?: string[];
  phone?: string;
  profilePicture?: {
    key?: String;
    url?: String;
  };
  profileCoverPictures: {
    key: String;
  }[];
  profileVisitCount?: number;

  gender?: GenderEnum;
  role: RoleEnum;
  provider: ProviderEnum;

  changeTimeCredentials?: Date;
  DOB?: Date;
  confirmEmail?: Date;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
  restoredAt?: Date;
}
