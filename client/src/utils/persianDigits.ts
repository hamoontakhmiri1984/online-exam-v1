/** Convert ASCII and Arabic-Indic digits for display only. Keep raw values for APIs, filters and inputs. */
export function toPersianDigits(value: string | number | null | undefined): string {
  if (value == null) return '';
  return String(value).replace(/[0-9٠-٩]/g, digit => {
    const code = digit.charCodeAt(0);
    const number = code >= 0x660 && code <= 0x669 ? code - 0x660 : code - 0x30;
    return String.fromCharCode(0x6f0 + number);
  });
}
