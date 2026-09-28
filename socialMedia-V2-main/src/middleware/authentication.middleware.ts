import type { NextFunction, Request, Response } from "express";
import { TokenService } from "../common/services";
import { UnauthorizedException } from "../common/exceptions";
import { TokenTypeEnum } from "../common/enums";

// export const authentication = (
//   tokenType: TokenTypeEnum = TokenTypeEnum.ACCESS,
// ) => {
//   return async (req: Request, res: Response, next: NextFunction) => {
//     const tokenService = new TokenService();
//     if (!req.headers?.authorization) {
//       throw new UnauthorizedException("Missing authorized key");
//     }

//     const [key, credential] = req.headers.authorization.split(" ") || [];
//     if (!key || !credential) {
//       throw new UnauthorizedException("Missing authorization parts");
//     }
//     switch (key) {
//       case "Basic":
//         console.log("Token Basic 🤦‍♂️");

//         break;

//       default:
//         const { user, decoded } = await tokenService.decodedToken({
//           token: credential,
//           tokenType,
//         });
//         req.user = user;
//         req.decoded = decoded;

//         break;
//     }
//   };
// };

export const authentication = (
  tokenType: TokenTypeEnum = TokenTypeEnum.ACCESS,
) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const tokenService = new TokenService();
    if (!req.headers?.authorization) {
      throw new UnauthorizedException("Missing authorized key");
    }

    const [key, credential] = req.headers?.authorization?.split(" ") || [];

    if (!key || !credential) {
      throw new UnauthorizedException("Missing authorization");
    }

    switch (key) {
      case "Basic":
        break;
      default:
        const { decoded, user } = await tokenService.decodedToken({
          token: credential,
          tokenType,
        });
        ((req.user = user), (req.decoded = decoded));
        break;
    }

    next();
  };
};
