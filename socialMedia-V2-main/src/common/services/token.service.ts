import jwt, {
  type Jwt,
  JwtPayload,
  type SignOptions,
  type VerifyOptions,
} from "jsonwebtoken";
import {
  SYSTEM_ACCESS_TOKEN_SIGNATURE,
  SYSTEM_REFRESH_TOKEN_SIGNATURE,
  USER_ACCESS_TOKEN_SIGNATURE,
  USER_REFRESH_TOKEN_SIGNATURE,
} from "../../config/config";
import { RoleEnum, TokenTypeEnum } from "../enums";
import { HydratedDocument } from "mongoose";
import { IUser } from "../interfaces";
import { randomUUID } from "node:crypto";
import {
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from "../exceptions";
import { UserRepository } from "../../DB/repository/user.repository";
import { redisService, RedisService } from "./redis.service";
import { Types } from "mongoose";
import { CreateLoginType } from "../entity";

type SignatureType = { accessSignature: string; refreshSignature: string };

export class TokenService {
  private readonly userRepository: UserRepository;
  private readonly redis: RedisService;
  constructor() {
    this.userRepository = new UserRepository();
    this.redis = redisService;
  }

  public async sign({
    payload,
    secret = USER_ACCESS_TOKEN_SIGNATURE,
    options,
  }: {
    payload: string | Buffer | object;
    secret?: string;
    options?: SignOptions;
  }): Promise<string> {
    return jwt.sign(payload, secret, options);
  }
  public async verify({
    token,
    secret = USER_ACCESS_TOKEN_SIGNATURE,
    options,
  }: {
    token: string;
    secret?: string;
    options?: VerifyOptions;
  }): Promise<Jwt | JwtPayload | string> {
    return jwt.verify(token, secret, options);
  }

  detectSignatureLevel = async (role: RoleEnum): Promise<SignatureType> => {
    let signatures: SignatureType;
    switch (role) {
      case RoleEnum.ADMIN:
        signatures = {
          accessSignature: SYSTEM_ACCESS_TOKEN_SIGNATURE,
          refreshSignature: SYSTEM_REFRESH_TOKEN_SIGNATURE,
        };
        break;

      default:
        signatures = {
          accessSignature: USER_ACCESS_TOKEN_SIGNATURE,
          refreshSignature: USER_REFRESH_TOKEN_SIGNATURE,
        };
        break;
    }
    return signatures;
  };

  getSignature = async (
    tokenType = TokenTypeEnum.ACCESS,
    signatureLevel: RoleEnum,
  ): Promise<string> => {
    const signatures = await this.detectSignatureLevel(signatureLevel);
    let signature;
    switch (tokenType) {
      case TokenTypeEnum.REFRESH:
        signature = signatures.refreshSignature;
        break;

      default:
        signature = signatures.accessSignature;

        break;
    }
    return signature;
  };

  createLoginCredentials = async (
    user: HydratedDocument<IUser>,
    issuer: string,
  ): Promise<CreateLoginType> => {
    const { accessSignature, refreshSignature } =
      await this.detectSignatureLevel(user.role);
    const jwtid = randomUUID();

    const access_token = await this.sign({
      payload: { sub: user._id },
      secret: accessSignature,
      options: {
        issuer,
        audience: [
          TokenTypeEnum.ACCESS as unknown as string,
          user.role as unknown as string,
        ],
        jwtid,
      },
    });

    const refresh_token = await this.sign({
      payload: { sub: user._id },
      secret: refreshSignature,
      options: {
        issuer,
        audience: [
          TokenTypeEnum.REFRESH as unknown as string,
          user.role as unknown as string,
        ],
        jwtid,
      },
    });
    return { access_token, refresh_token };
  };

  decodedToken = async ({
    token,
    tokenType = TokenTypeEnum.ACCESS,
  }: {
    token: string;
    tokenType: TokenTypeEnum;
  }): Promise<{ user: HydratedDocument<IUser>; decoded: JwtPayload }> => {
    const decoded = (await jwt.decode(token)) as JwtPayload;
    if (!decoded?.aud?.length) {
      throw new BadRequestException("Missing token audience");
    }
    const [tokenApproach, signatureLevel] = decoded.aud;
    if (tokenApproach == undefined || signatureLevel == undefined) {
      throw new BadRequestException("Missing token audience");
    }
    if (tokenType !== (tokenApproach as unknown as TokenTypeEnum)) {
      throw new BadRequestException(
        `Invalid token type token of type ${tokenApproach} cannot access this api while we expected token of type ${tokenType}`,
      );
    }
    if (
      decoded.jti &&
      (await this.redis.get(
        this.redis.revokeTokenKey({
          userId: decoded.sub as string,
          jti: decoded.jti,
        }),
      ))
    ) {
      throw new UnauthorizedException("Invalid Login Session");
    }

    const secret = await this.getSignature(
      tokenApproach as unknown as TokenTypeEnum,
      signatureLevel as unknown as RoleEnum,
    );

    const verifiedData = (await this.verify({ token, secret })) as JwtPayload;
    if (!verifiedData?.sub) {
      throw new BadRequestException("Invalid token payload");
    }

    const user = await this.userRepository.findOne({
      filter: {
        _id: verifiedData.sub,
      },
    });
    if (!user) {
      throw new NotFoundException("Not Register account");
    }
    if (
      user.changeTimeCredentials &&
      user.changeTimeCredentials?.getTime() >= (decoded.iat as number) * 1000
    ) {
      throw new UnauthorizedException("Invalid Login Session");
    }
    return { user, decoded };
  };

  public async createRevokeToken({
    userId,
    jti,
    ttl,
  }: {
    userId: Types.ObjectId | string;
    jti: string;
    ttl: number;
  }) {
    await this.redis.set({
      key: this.redis.revokeTokenKey({ userId, jti }),
      value: jti,
      ttl,
    });
  }
}
