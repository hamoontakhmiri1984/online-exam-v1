import { useState } from 'react';
import { ClipboardList } from 'lucide-react';
import type { Question } from '../../../api/questionApi';
import QuestionCard from './QuestionCard';
type Props = {
  questions: Question[];
  canEdit: boolean;
  busy: boolean;
  onEdit: (q: Question) => void;
  onDelete: (q: Question) => void;
};
export default function ExamQuestionList({
  questions,
  canEdit,
  busy,
  onEdit,
  onDelete,
}: Props) {
  const [search, setSearch] = useState('');
  const shown = questions
    .map((question, index) => ({ question, index }))
    .filter(({ question }) => question.text.includes(search.trim()));
  return (
    <section aria-label="سؤال‌های ذخیره‌شده" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-bold dark:text-white">
          سؤال‌های آزمون ({questions.length.toLocaleString('fa-IR')})
        </h2>
        {questions.length > 0 && (
          <input
            aria-label="جست‌وجو در سؤال‌های آزمون"
            placeholder="جست‌وجو در متن سؤال…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-transparent px-4 py-2 text-sm dark:border-gray-700 dark:text-white sm:w-64"
          />
        )}
      </div>
      {questions.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-gray-200 px-5 py-12 text-center dark:border-gray-700">
          <ClipboardList size={32} className="mx-auto mb-3 text-gray-400" />
          <h3 className="font-bold dark:text-white">
            {canEdit
              ? 'اولین سؤال آزمون را اضافه کنید'
              : 'این آزمون هنوز سؤالی ندارد'}
          </h3>
          {canEdit && (
            <p className="mt-2 text-sm leading-7 text-gray-500">
              ساخت بانک سؤال الزامی نیست. می‌توانید روش دستی، اکسل و بانک را در
              همین آزمون ترکیب کنید.
            </p>
          )}
        </div>
      ) : !shown.length ? (
        <p className="p-6 text-center text-gray-500">
          سؤالی با این متن پیدا نشد.
        </p>
      ) : (
        shown.map(({ question, index }) => (
          <QuestionCard
            key={question.id}
            question={question}
            index={index}
            canEdit={canEdit}
            disabled={busy}
            onEdit={(q) => {
              onEdit(q);
            }}
            onDelete={(q) => {
              onDelete(q);
            }}
          />
        ))
      )}
    </section>
  );
}
