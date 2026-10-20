
export function formatExamDateTime(iso: string): string {
  return new Date(iso).toLocaleString('fa-IR', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

export function formatDateOnly(iso: string): string {
  return new Date(iso).toLocaleDateString('fa-IR', { dateStyle: 'short' });
}
