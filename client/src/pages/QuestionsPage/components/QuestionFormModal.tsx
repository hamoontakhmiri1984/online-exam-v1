import { Save, X } from 'lucide-react';
import Modal from './ExamQuestionDialog';
import QuestionEditorFields from '../../../components/QuestionEditorFields';

type QuestionFormModalProps = {
  isOpen: boolean;
  error?: string;
  isEditing: boolean;
  isSubmitting?: boolean;
  text: string;
  onTextChange: (value: string) => void;
  options: string[];
  correctOptionIndex: number;
  onCorrectOptionChange: (index: number) => void;
  onOptionTextChange: (index: number, value: string) => void;
  onAddOption: () => void;
  onRemoveOption: (index: number) => void;
  onSubmit: (event: React.FormEvent) => void;
  onClose: () => void;
};

export default function QuestionFormModal({
  isOpen, isEditing, error, isSubmitting = false,
  text, onTextChange, options, correctOptionIndex, onCorrectOptionChange,
  onOptionTextChange, onAddOption, onRemoveOption, onSubmit, onClose,
}: QuestionFormModalProps) {
  return (
    <Modal label="نوشتن و ویرایش سؤال" isOpen={isOpen} onClose={onClose}>
      <form onSubmit={onSubmit} noValidate dir="rtl" className="space-y-5">
        <header>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">{isEditing ? 'ویرایش سؤال' : 'سؤال جدید'}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">صورت سؤال را بنویسید، گزینه‌ها را تکمیل کنید و پاسخ درست را علامت بزنید.</p>
        </header>
        <QuestionEditorFields
          text={text}
          options={options}
          correctOptionIndex={correctOptionIndex}
          onTextChange={onTextChange}
          onOptionChange={onOptionTextChange}
          onCorrectOptionChange={onCorrectOptionChange}
          onAddOption={onAddOption}
          onRemoveOption={onRemoveOption}
          disabled={isSubmitting}
        />
        {error && <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-500/10 dark:text-rose-200">{error}</p>}
        <footer className="flex flex-wrap gap-3 border-t border-slate-100 pt-4 dark:border-white/10">
          <button type="button" onClick={onClose} disabled={isSubmitting} className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-violet-200 px-4 text-sm font-semibold text-violet-700 disabled:opacity-50 dark:border-violet-400/25 dark:text-violet-200"><X size={16}/> انصراف</button>
          <button type="submit" disabled={isSubmitting || text.trim().length < 2 || options.some(option => !option.trim())} className="ui-primary-gradient inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold disabled:opacity-40"><Save size={16}/>{isSubmitting ? 'در حال ذخیره…' : isEditing ? 'ذخیره تغییرات' : 'افزودن سؤال'}</button>
        </footer>
      </form>
    </Modal>
  );
}
