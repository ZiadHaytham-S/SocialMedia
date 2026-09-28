import { HydratedDocument, Types } from "mongoose";
import {
  deleteFileFromR2,
  deleteFilesFromR2,
  getR2FileUrl,
  redisService,
  RedisService,
  TokenService,
  uploadFilesToR2,
  uploadFileToR2,
} from "../../common/services";
import {
  ACCESS_TOKEN_EXPIRES_IN,
  REFRESH_TOKEN_EXPIRES_IN,
} from "../../config/config";
import {
  assignPlainPassword,
  comparePassword,
  generateDecryption,
  isPasswordSameAsCurrent,
  isPasswordUsedBefore,
} from "../../common/utils/security";
import { IUser } from "../../common/interfaces";
import { LogoutEnum, RoleEnum } from "../../common/enums";
import {
  BadRequestException,
  ConflictException,
  ForBiddenException,
  NotFoundException,
} from "../../common/exceptions";
import { ProfileCoverDto, ProfileDto } from "./user.dto";
import { CreateLoginType } from "../../common/entity";
import { UserRepository } from "../../DB/repository";
import friendService from "../friend/friend.service";
import { isAdmin, isAdminOrOwner } from "../../common/utils/adminAccess";

export class UserService {
  private readonly redis: RedisService;
  private readonly tokenService: TokenService;
  private readonly userRepository: UserRepository;
  constructor() {
    this.redis = redisService;
    this.tokenService = new TokenService();
    this.userRepository = new UserRepository();
  }

  private enrichUserMedia(user: Record<string, unknown>) {
    const profilePicture = user.profilePicture as { key?: string; url?: string | null } | undefined;

    if (profilePicture?.key) {
      profilePicture.url = getR2FileUrl(profilePicture.key) ?? profilePicture.url ?? null;
    }

    if (Array.isArray(user.profileCoverPictures)) {
      user.profileCoverPictures = user.profileCoverPictures.map((item) => {
        const picture = item as { key?: string; url?: string | null };

        return {
          ...picture,
          url: getR2FileUrl(picture.key) ?? picture.url ?? null,
        };
      });
    }

    return user;
  }

  private serializeUser(user: HydratedDocument<IUser>) {
    return this.enrichUserMedia(user.toJSON() as unknown as Record<string, unknown>);
  }

  public async profile(user: HydratedDocument<IUser>) {
    return this.serializeUser(user);
  }

  private toObjectId(id: string): Types.ObjectId {
    return Types.ObjectId.createFromHexString(id);
  }

  private canManage(
    requestUser: HydratedDocument<IUser>,
    userId: string,
  ): boolean {
    return isAdminOrOwner(requestUser, userId);
  }

  public async listUsers(viewer: HydratedDocument<IUser>) {
    const users = await this.userRepository.find({
      filter: isAdmin(viewer) ? { paranoid: false } : {},
      projection: "-password -oldPassword",
      options: { sort: { createdAt: -1 } },
    });

    return users.map((user) => this.serializeUser(user));
  }

  public async getUserById(userId: string, requestUser?: HydratedDocument<IUser>) {
    const user = await this.userRepository.findOne({
      filter: {
        _id: this.toObjectId(userId),
        ...(requestUser && isAdmin(requestUser) ? { paranoid: false } : {}),
      },
      projection: "-password -oldPassword",
    });

    if (!user) throw new NotFoundException("User not found");
    return this.serializeUser(user);
  }

  public async updateUserRole(
    userId: string,
    role: RoleEnum,
    requestUser: HydratedDocument<IUser>,
  ) {
    if (!isAdmin(requestUser)) {
      throw new ForBiddenException("Only admins can change user roles");
    }

    if (requestUser._id.toString() === userId) {
      throw new BadRequestException("You cannot change your own role here");
    }

    const user = await this.userRepository.findOneAndUpdate({
      filter: { _id: this.toObjectId(userId), paranoid: false },
      update: { role },
      options: { new: true, projection: "-password -oldPassword" },
    });

    if (!user) throw new NotFoundException("User not found");
    return this.serializeUser(user);
  }

  public async getUserImages(userId: string) {
    const user = await this.userRepository.findOne({
      filter: { _id: this.toObjectId(userId) },
      projection: "profilePicture profileCoverPictures",
    });

    if (!user) throw new NotFoundException("User not found");

    const profilePictureKey = user.profilePicture?.key;
    const profileCoverPictures = user.profileCoverPictures || [];

    return {
      profilePicture: profilePictureKey
        ? {
            key: profilePictureKey,
            url: getR2FileUrl(profilePictureKey),
          }
        : null,
      profileCoverPictures: profileCoverPictures.map(({ key }) => ({
        key,
        url: getR2FileUrl(key),
      })),
    };
  }

  public async updateProfile(
    userId: string,
    data: {
      username?: string;
      phone?: string;
      gender?: number;
      DOB?: Date;
    },
    requestUser: HydratedDocument<IUser>,
  ) {
    if (!this.canManage(requestUser, userId)) {
      throw new ForBiddenException("You are not allowed to update this user");
    }

    const update: Partial<IUser> = {
      ...(data.phone ? { phone: data.phone } : {}),
      ...(typeof data.gender === "number" ? { gender: data.gender } : {}),
      ...(data.DOB ? { DOB: data.DOB } : {}),
    };

    if (data.username) {
      const [firstName = " ", ...rest] = data.username.trim().split(" ");
      update.firstName = firstName;
      update.lastName = rest.join(" ") || " ";
    }

    const user = await this.userRepository.findOneAndUpdate({
      filter: { _id: this.toObjectId(userId) },
      update,
      options: { new: true, projection: "-password -oldPassword" },
    });

    if (!user) throw new NotFoundException("User not found");
    return this.serializeUser(user);
  }

  public async deleteUser(
    userId: string,
    requestUser: HydratedDocument<IUser>,
  ) {
    if (!this.canManage(requestUser, userId)) {
      throw new ForBiddenException("You are not allowed to delete this user");
    }

    const user = await this.userRepository.findOneAndUpdate({
      filter: { _id: this.toObjectId(userId) },
      update: { deletedAt: new Date() },
      options: { new: true, projection: "-password -oldPassword" },
    });

    if (!user) throw new NotFoundException("User not found");
    return this.serializeUser(user);
  }

  public async restoreUser(
    userId: string,
    requestUser: HydratedDocument<IUser>,
  ) {
    if (!isAdmin(requestUser)) {
      throw new ForBiddenException("Only admins can restore users");
    }

    const user = await this.userRepository.findOneAndUpdate({
      filter: { _id: this.toObjectId(userId), paranoid: false },
      update: { restoredAt: new Date() },
      options: { new: true, projection: "-password -oldPassword" },
    });

    if (!user) throw new NotFoundException("User not found");
    return this.serializeUser(user);
  }

  async logout(
    { flag }: { flag: LogoutEnum },
    user: HydratedDocument<IUser>,
    { jti, iat, sub }: { jti: string; iat: number; sub: string },
  ): Promise<number> {
    let status = 200;
    switch (flag) {
      case LogoutEnum.ALL:
        user.changeTimeCredentials = new Date();
        await user.save();
        await this.redis.deleteKey(
          await this.redis.keys(this.redis.baseRevokeTokenKey(sub)),
        );
        break;

      default:
        await this.tokenService.createRevokeToken({
          userId: sub,
          jti,
          ttl: iat + REFRESH_TOKEN_EXPIRES_IN,
        });
        status = 201;
        break;
    }
    return status;
  }

  async rotateToken(
    user: HydratedDocument<IUser>,
    { iat, jti, sub }: { iat: number; jti: string; sub: string },
    issuer: string,
  ): Promise<CreateLoginType> {
    if ((iat + ACCESS_TOKEN_EXPIRES_IN) * 1000 >= Date.now() + 30 * 60 * 1000) {
      throw new ConflictException("Current access token still valid");
    }

    await this.tokenService.createRevokeToken({
      userId: sub,
      jti,
      ttl: iat + REFRESH_TOKEN_EXPIRES_IN,
    });
    return await this.tokenService.createLoginCredentials(user, issuer);
  }

  // password
  async updatePassword(
    user: HydratedDocument<IUser>,
    { oldPassword, password }: { oldPassword: string; password: string },
    issuer: string,
  ): Promise<CreateLoginType> {
    if (!(await comparePassword(oldPassword, user.password as string))) {
      throw new ConflictException("Invalid old password");
    }

    if (await isPasswordSameAsCurrent(password, user.password as string)) {
      throw new ConflictException("New password must be different from current password");
    }

    if (await isPasswordUsedBefore(user, password)) {
      throw new ConflictException("This Password is already used before");
    }

    assignPlainPassword(user, password);
    await user.save();

    await this.redis.deleteKey(
      await this.redis.keys(await this.redis.baseRevokeTokenKey(user._id)),
    );

    return await this.tokenService.createLoginCredentials(user, issuer);
  }

  // images handling
async profileImage(
  file: Express.Multer.File,
  user: HydratedDocument<IUser>,
): Promise<ProfileDto> {
  if (!file) {
    throw new BadRequestException("Image is required");
  }

  if (user.profilePicture?.key) {
    await deleteFileFromR2(user.profilePicture.key as string);
  }

  const { key } = await uploadFileToR2({
    file,
    folder: `users/${user._id}/profile`,
  });

  const url = getR2FileUrl(key);

  if (!url) {
    throw new BadRequestException(
      "R2_PUBLIC_URL is not configured on the server. Add your R2 public bucket URL to .env.development",
    );
  }

  user.profilePicture = { key, url };

  await user.save();

  return this.serializeUser(user);
}

async profileCoverImage(
  files: Express.Multer.File[],
  user: HydratedDocument<IUser>,
):Promise<ProfileCoverDto> {
  if (!files?.length) {
    throw new BadRequestException("Cover images are required");
  }

  const oldKeys =
    user.profileCoverPictures
      ?.map(({ key }) => key)
      .filter(Boolean) || [];

  const newCoverPictures = await uploadFilesToR2({
    files,
    folder: `users/${user._id}/cover`,
  });

  user.profileCoverPictures = newCoverPictures.map(({ key }) => {
    const url = getR2FileUrl(key);

    if (!url) {
      throw new BadRequestException(
        "R2_PUBLIC_URL is not configured on the server. Add your R2 public bucket URL to .env.development",
      );
    }

    return { key, url };
  });
  await user.save();

  if (oldKeys.length) {
    await deleteFilesFromR2(oldKeys as string[]);
  }

  return this.serializeUser(user);
}

  
 visitProfile = async ({
  userId,
  viewer,
}: {
  userId: string | Types.ObjectId;
  viewer: HydratedDocument<IUser>;
}) => {
  const targetUserId = userId.toString();

  let selectFields = "-password -isEmailVerified -otpCode -otpExpiresAt -provider -__v -oldPassword";

  if (!isAdmin(viewer)) {
    selectFields += " -profileVisitCount -role";
  }

  const filter: Record<string, unknown> = {
    _id: targetUserId,
    ...(isAdmin(viewer) ? { paranoid: false } : {}),
  };

  const user = await this.userRepository.findOne({
    filter,

    options: {
      select: selectFields,
    },
  });

  if (!user) {
    throw new NotFoundException("User not found");
  }

  if (viewer._id.toString() !== targetUserId) {
    await this.userRepository.findByIdAndUpdate({
      id: targetUserId,
      update: {
        $inc: { profileVisitCount: 1 },
      },
    });
  }

  if (user.phone) {
    user.phone = await generateDecryption(user.phone);
  }

  const friendMeta = await friendService.profileMeta(viewer, targetUserId);

  return {
    ...this.serializeUser(user),
    friendMeta,
  };
};


}

export default new UserService();
