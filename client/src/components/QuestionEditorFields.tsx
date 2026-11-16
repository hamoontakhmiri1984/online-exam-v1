import { CheckCircle2, Plus, X } from 'lucide-react';
import UiSelect from './UiSelect';
import type { QuestionDifficulty } from '../api/questionBankApi';

type Props = {
  text: string;
  options: string[];
  correctOptionIndex: number;
  onTextChange: (value: string) => void;
  onOptionChange: (index: number, value: string) => void;
  onCorrectOptionChange: (index: number) => void;
  onAddOption?: () => void;
  onRemoveOption?: (index: number) => void;
  difficulty?: QuestionDifficulty;
  onDifficultyChange?: (value: QuestionDifficulty) => void;
  disabled?: boolean;
};

/** Single question-writing UI shared by exam questions and question banks. */
export default function QuestionEditorFields({
  text, options, correctOptionIndex, onTextChange, onOptionChange,
  onCorrectOptionChange, onAddOption, onRemoveOption,
  difficulty, onDifficultyChange, disabled = false,
}: Props) {
  return (
    <fieldset disabled={disabled} className="space-y-5" dir="rtl">
      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
        متن سؤال
        <textarea
          value={text}
          onChange={event => onTextChange(event.target.value)}
          placeholder="صورت سؤال را اینجا بنویسید…"
          aria-label="متن سوال"
          required
          minLength={2}
          maxLength={5000}
          rows={3}
          className="mt-2 w-full resize-y rounded-xl border border-violet-200 bg-white p-3 text-sm leading-7 text-slate-800 outline-none transition-colors focus:border-violet-400 focus:ring-2 focus:ring-violet-400/15 dark:border-violet-400/25 dark:bg-slate-800 dark:text-white"
        />
      </label>
      <div>
        <p className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
          گزینه‌های پاسخ <span className="text-xs font-normal text-slate-500">(گزینه درست را علامت بزنید)</span>
        </p>
        <div className="space-y-2.5">
          {options.map((option, index) => {
            const correct = correctOptionIndex === index;
            return (
              <div key={index} className={`flex min-w-0 items-center gap-2 rounded-xl border p-3 transition-colors sm:gap-3 ${correct ? 'border-emerald-300 bg-emerald-50/70 dark:border-emerald-500/40 dark:bg-emerald-500/10' : 'border-slate-200 bg-slate-50/60 dark:border-slate-700 dark:bg-slate-800/50'}`}>
                <input
                  type="radio"
                  name="correct-option"
                  aria-label={`گزینه ${index + 1} جواب درست است`}
                  checked={correct}
                  onChange={() => onCorrectOptionChange(index)}
                  className="h-4 w-4 shrink-0 accent-emerald-600"
                />
                <span className="w-10 shrink-0 text-xs text-slate-500">گزینه {(index + 1).toLocaleString('fa-IR')}</span>
                <input
                  value={option}
                  onChange={event => onOptionChange(index, event.target.value)}
                  placeholder={`متن گزینه ${index + 1}`}
                  aria-label={`گزینه ${index + 1}`}
                  required
                  maxLength={1000}
                  className="min-h-10 min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-violet-400 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                />
                {correct && <CheckCircle2 aria-label="پاسخ صحیح" size={18} className="hidden shrink-0 text-emerald-600 sm:block" />}
                {onRemoveOption && options.length > 2 && (
                  <button type="button" onClick={() => onRemoveOption(index)} aria-label={`حذف گزینه ${index + 1}`} title="حذف گزینه" className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10">
                    <X size={16}/>
                  </button>
                )}
              </div>
            );
          })}
        </div>
        {onAddOption && options.length < 6 && (
          <button type="button" onClick={onAddOption} className="mt-3 inline-flex items-center gap-2 rounded-xl border border-dashed border-violet-200 px-4 py-2 text-sm font-semibold text-brand-ink hover:bg-violet-50 dark:border-violet-400/25">
            <Plus size={16}/> افزودن گزینه
          </button>
        )}
      </div>
      {onDifficultyChange && (
        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
          سطح سختی
          <UiSelect className="mt-2 w-full" aria-label="سطح سختی" value={difficulty ?? 'Medium'} onChange={event => onDifficultyChange(event.target.value as QuestionDifficulty)}>
            <option value="Easy">آسان</option>
            <option value="Medium">متوسط</option>
            <option value="Hard">سخت</option>
          </UiSelect>
        </label>
      )}
    </fieldset>
  );
}
