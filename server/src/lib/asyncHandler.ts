import type { Request, Response, NextFunction, RequestHandler } from 'express';

// تو Express 4 (که این پروژه ازش استفاده می‌کنه)، reject شدن یه promise
// داخل async (req,res)=>{} به‌صورت خودکار به error middleware forward
// نمی‌شه - یعنی الان تو کل route ها اگه یه await ناگهان throw کنه، اون
// request بدون پاسخ می‌مونه (نه crash، نه پاسخ خطا، فقط hang).
// این wrapper همون کاری رو می‌کنه که Express 5 خودش built-in انجام می‌ده:
// catch کردن reject و صداکردن next(err).
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
