import type { ContentItem, ContentTab } from '../../../api/adminInstructorApi';

type Props = { items: ContentItem[]; tab: ContentTab; onOpenBank: (bank: { id: string; name: string }) => void };
export default function InstructorContentList({ items, tab, onOpenBank }: Props) {
  if (!items.length) return <p className="text-gray-500">موردی پیدا نشد.</p>;
  return (
    <div className="space-y-3">
      {items.map(item => (
        <article key={item.id} className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200">
          <h3 className="whitespace-pre-wrap font-semibold">{item.text || item.title || item.name || item.fileName || item.exam?.title || item.id}</h3>
          <p className="mt-2 text-sm text-gray-500">{item.category || item.username || item.difficulty}</p>
          {item.groups && <p className="text-sm">گروه‌ها: {item.groups.map(group => group.name).join('، ') || 'بدون گروه'}</p>}
          {item.group && <p className="text-sm">گروه: {item.group.name}</p>}
          {item.session && <p className="text-sm">درس: {item.session.title}</p>}
          {item.bank && <p className="text-sm">بانک: {item.bank.name}</p>}
          {item.joinCode && <p className="text-sm">کد عضویت: {item.joinCode}</p>}
          {item.fileSize !== undefined && <p className="text-sm">حجم: {Math.ceil(item.fileSize / 1024)} کیلوبایت</p>}
          {item._count && <p className="text-sm">{Object.entries(item._count).map(([key, value]) => `${({ students: 'دانشجو', exams: 'آزمون', questions: 'سوال', attachments: 'پیوست', attempts: 'تلاش' } as Record<string, string>)[key]}: ${value}`).join(' · ')}</p>}
          {item.status && <p className="text-sm">{item.status === 'Published' ? 'منتشرشده' : item.status === 'Draft' ? 'پیش‌نویس' : item.status}</p>}
          {item.options && <ol className="mt-3 list-inside list-decimal space-y-1">{item.options.map((option, index) => <li key={index} className={index === item.correctOptionIndex ? 'font-bold text-brand-600' : ''}>{option}{index === item.correctOptionIndex ? ' — پاسخ صحیح' : ''}</li>)}</ol>}
          {tab === 'results' && <p className="mt-2 text-sm">دانشجو: {item.student?.name || item.student?.id} · {item.correctCount} از {item.totalQuestions} · {item.finishedAt ? 'تمام‌شده' : 'ناتمام'}</p>}
          {tab === 'banks' && <button type="button" onClick={() => onOpenBank({ id: item.id, name: item.name ?? item.id })} className="mt-3 text-sm text-brand-600">مشاهدهٔ سوال‌های این بانک</button>}
        </article>
      ))}
    </div>
  );
}
