// Only operational error messages are safe to expose to the client.
export class AppError extends Error {
  readonly statusCode: number;
  readonly isOperational = true;
  readonly details?: Record<string, unknown>;

  constructor(
    statusCode: number,
    message: string,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.name = 'AppError';
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export function notFound(message = 'یافت نشد') {
  return new AppError(404, message);
}

export function forbidden(message = 'دسترسی غیرمجاز') {
  return new AppError(403, message);
}

export function badRequest(message: string) {
  return new AppError(400, message);
}

export function conflict(message: string) {
  return new AppError(409, message);
}
