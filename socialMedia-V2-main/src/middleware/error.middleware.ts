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
  if (process.env.NODE_ENV === "production") {
    if (statusCode >= 500) {
      console.error("Request failed", { name: error.name, message: error.message });
    }
    return res.status(statusCode).json({
      message: statusCode >= 500 ? "Internal Server Error" : error.message,
    });
  }
  return res.status(statusCode).json({
    message: error.message || "Internal Server Error",
    cause: error.cause,
    stack: error.stack,
    error,
  });
};
