import { Save, X } from 'lucide-react';
import QuestionEditorFields from '../../../components/QuestionEditorFields';
import type { BankQuestionInput, QuestionDifficulty } from '../../../api/questionBankApi';

type BankQuestionFormProps = {
  form: BankQuestionInput;
  isEditing: boolean;
  saving: boolean;
  error: string;
  canSubmit: boolean;
  onTextChange: (value: string) => void;
  onOptionChange: (index: number, value: string) => void;
  onAddOption: () => void;
  onRemoveOption: (index: number) => void;
  onCorrectOptionChange: (index: number) => void;
  onDifficultyChange: (value: QuestionDifficulty) => void;
  onSubmit: (event: React.FormEvent) => void;
  onCancel: () => void;
};

export default function BankQuestionForm({
  form, isEditing, saving, error, canSubmit,
  onTextChange, onOptionChange, onAddOption, onRemoveOption, onCorrectOptionChange, onDifficultyChange,
  onSubmit, onCancel,
}: BankQuestionFormProps) {
  return (
    <form onSubmit={onSubmit} dir="rtl" className="space-y-5">
      <header>
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">{isEditing ? 'ویرایش سؤال' : 'سؤال جدید'}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">صورت سؤال را بنویسید، گزینه‌ها را تکمیل کنید و پاسخ درست را علامت بزنید.</p>
      </header>
      <QuestionEditorFields
        text={form.text}
        options={form.options}
        correctOptionIndex={form.correctOptionIndex}
        difficulty={form.difficulty}
        onTextChange={onTextChange}
        onOptionChange={onOptionChange}
        onAddOption={onAddOption}
        onRemoveOption={onRemoveOption}
        onCorrectOptionChange={onCorrectOptionChange}
        onDifficultyChange={onDifficultyChange}
        disabled={saving}
      />
      {error && <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-500/10 dark:text-rose-200">{error}</p>}
      <footer className="flex flex-wrap gap-3 border-t border-slate-100 pt-4 dark:border-white/10">
        <button type="button" onClick={onCancel} disabled={saving} className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-violet-200 px-4 text-sm font-semibold text-violet-700 disabled:opacity-50 dark:border-violet-400/25 dark:text-violet-200"><X size={16}/> انصراف</button>
        <button type="submit" disabled={saving || !canSubmit} className="ui-primary-gradient inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold disabled:opacity-40"><Save size={16}/>{saving ? 'در حال ذخیره…' : isEditing ? 'ذخیره تغییرات' : 'افزودن سؤال'}</button>
      </footer>
    </form>
  );
}
