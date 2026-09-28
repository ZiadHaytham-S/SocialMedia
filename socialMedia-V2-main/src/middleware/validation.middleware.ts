import type { NextFunction, Request, Response } from "express";
import { ZodError, ZodType } from "zod";
import { BadRequestException } from "../common/exceptions";


type KeyReqType = keyof Request;
type SchemaType = Partial<Record<KeyReqType, ZodType>>;
type issuesType = Array<{
  key: KeyReqType;
  issues: Array<{
    message: string;
    path: Array<symbol | number | string | null | undefined>;
  }>;
}>;
export const validation = (schema: SchemaType) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const issues: issuesType = [];
    for (const key of Object.keys(schema) as KeyReqType[]) {
      if (!schema[key]) continue;
      const validationResult = schema[key].safeParse(req[key]);
      if (!validationResult.success) {
        const error = validationResult.error as ZodError;
        issues.push({
          key,
          issues: error.issues.map((issue) => {
            return { path: issue.path, message: issue.message };
          }),
        });
      } else {
        if (key === "query") {
          // Express 5 exposes query as a getter; shadow it on this request.
          Object.defineProperty(req, "query", {
            value: validationResult.data,
            writable: true,
            enumerable: true,
            configurable: true,
          });
        } else {
          (req as unknown as Record<string, unknown>)[String(key)] = validationResult.data;
        }
      }
    }

    if (issues.length) {
      throw new BadRequestException("Validation Error", { issues });
    }
    next();
  };
};
