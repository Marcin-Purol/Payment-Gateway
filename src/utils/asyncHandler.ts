import { Request, Response, NextFunction } from "express";

type AsyncRequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<any>;

export const asyncHandler = (fn: AsyncRequestHandler) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

export const withDatabase = async <T>(
  operation: () => Promise<T>,
  errorMessage: string = "Database operation failed"
): Promise<T> => {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof Error) {
      const dbError = new Error(errorMessage);
      dbError.name = "DatabaseError";
      throw dbError;
    }
    throw error;
  }
};
