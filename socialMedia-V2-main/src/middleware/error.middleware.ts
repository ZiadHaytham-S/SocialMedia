import type { NextFunction, Request, Response } from "express";

interface IError extends Error {
  statusCode: number;
}
export const globalErrorHandler = (
  error: IError,
  req: Request,
  res: Response,
  next: NextFunction,
): Response => {
  const statusCode = error.statusCode || 500;
  return res.status(statusCode).json({
    message: error.message || "Internal Server Error",
    cause: error.cause,
    stack: error.stack,
    error,
  });
};
