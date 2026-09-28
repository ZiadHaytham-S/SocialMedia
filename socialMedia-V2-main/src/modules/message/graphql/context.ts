import type { HydratedDocument } from "mongoose";
import type { JwtPayload } from "jsonwebtoken";
import type { IUser } from "../../../common/interfaces";
import { TokenService } from "../../../common/services";
import { TokenTypeEnum } from "../../../common/enums";
import { UnauthorizedException } from "../../../common/exceptions";

export type GraphqlContext = {
  user: HydratedDocument<IUser> | null;
  decoded: JwtPayload | null;
};

export async function createGraphqlContext(req: {
  headers: { authorization?: string | undefined };
}): Promise<GraphqlContext> {
  const authorization = req.headers?.authorization;

  if (!authorization) {
    return { user: null, decoded: null };
  }

  const [scheme, token] = authorization.split(" ");

  if (scheme !== "Bearer" || !token) {
    throw new UnauthorizedException("Invalid authorization header");
  }

  const tokenService = new TokenService();
  const { user, decoded } = await tokenService.decodedToken({
    token,
    tokenType: TokenTypeEnum.ACCESS,
  });

  return { user, decoded: decoded as JwtPayload };
}
