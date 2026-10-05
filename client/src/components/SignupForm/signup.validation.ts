import { validateIdentifier } from '../../utils/identifier';

import { MIN_NAME_LENGTH, PASSWORD_REGEX } from './signup.types';

export type IdentityField =
  | 'name'
  | 'identifier'
  | 'password'
  | 'confirmPassword';

export type IdentityValues = Record<IdentityField, string>;

export type IdentityErrors = Partial<Record<IdentityField, string>>;

// ترتیب نمایش فیلدها؛ فوکوس بعد از ارسال روی اولین فیلد خطادار می‌رود
export const IDENTITY_FIELD_ORDER: IdentityField[] = [
  'name',
  'identifier',
  'password',
  'confirmPassword',
];

// پیام خطای کوتاه برای یک فیلد؛ null یعنی مقدار درست است
export function validateIdentityField(
  field: IdentityField,
  values: IdentityValues
): string | null {
  switch (field) {
    case 'name': {
      const name = values.name.trim();

      if (!name) {
        return 'نام را وارد کنید';
      }

      if (name.length > 100) return 'نام نباید بیشتر از ۱۰۰ کاراکتر باشد';
      if (name.length < MIN_NAME_LENGTH) {
        return `نام باید حداقل ${MIN_NAME_LENGTH} کاراکتر باشد`;
      }

      return null;
    }

    case 'identifier':
      return validateIdentifier(values.identifier);

    case 'password':
      if (!values.password) {
        return 'رمز عبور را وارد کنید';
      }

      if (values.password.length > 72) return 'رمز نباید بیشتر از ۷۲ کاراکتر باشد';
      // جزئیات شرط‌ها در چک‌لیست زیر فیلد دیده می‌شود
      return PASSWORD_REGEX.test(values.password)
        ? null
        : 'رمز عبور شرایط لازم را ندارد';

    case 'confirmPassword':
      if (!values.confirmPassword) {
        return 'تکرار رمز عبور را وارد کنید';
      }

      return values.confirmPassword === values.password
        ? null
        : 'با رمز عبور بالا یکسان نیست';
  }
}

// همه‌ی فیلدها را هم‌زمان بررسی می‌کند
export function validateIdentity(values: IdentityValues): IdentityErrors {
  const errors: IdentityErrors = {};

  for (const field of IDENTITY_FIELD_ORDER) {
    const message = validateIdentityField(field, values);

    if (message) {
      errors[field] = message;
    }
  }

  return errors;
}