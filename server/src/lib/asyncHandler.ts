import type { Request, Response, NextFunction, RequestHandler } from 'express';

// Express 4 requires async rejections to be forwarded to next().
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
