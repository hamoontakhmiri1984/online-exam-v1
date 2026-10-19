import { badRequest } from './errors';
export function reportRange(query: Record<string, unknown>, now = new Date()) {
  const raw = query.days ?? '30';
  if (typeof raw !== 'string' || !['7', '30', '90'].includes(raw))
    throw badRequest('بازه گزارش باید ۷، ۳۰ یا ۹۰ روز باشد');
  const instructorId = query.instructorId;
  if (
    instructorId !== undefined &&
    (typeof instructorId !== 'string' || instructorId.length > 100)
  )
    throw badRequest('مدرس نامعتبر است');
  const days = Number(raw);
  const offset = 3.5 * 3600_000;
  const day =
    Math.floor((now.getTime() + offset) / 86400_000) * 86400_000 - offset;
  return {
    days,
    start: new Date(day - (days - 1) * 86400_000),
    end: now,
    instructorId:
      typeof instructorId === 'string' && instructorId
        ? instructorId
        : undefined,
  };
}
