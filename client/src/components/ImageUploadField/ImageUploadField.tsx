import { useRef, useState } from 'react';
import { ImagePlus, Loader2, X } from 'lucide-react';

type ImageUploadFieldProps = {
  /** آدرسِ تصویرِ فعلی (از سرور) - اگه هنوز چیزی آپلود نشده، null/undefined */
  imageUrl?: string | null;
  onUpload: (file: File) => void;
  uploading?: boolean;
  disabled?: boolean;
  /** وقتی disabled=true (مثلاً پستِ بلاگ هنوز ذخیره نشده) این پیام نشون داده می‌شه */
  disabledHint?: string;
};

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

function ImageUploadField({
  imageUrl,
  onUpload,
  uploading = false,
  disabled = false,
  disabledHint,
}: ImageUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  function handleFiles(files: FileList | null) {
    if (disabled || uploading) return;
    const file = files?.[0];
    if (!file) return;
    if (!ACCEPTED_TYPES.includes(file.type)) return;
    onUpload(file);
  }

  return (
    <div className="flex flex-col gap-2">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled && !uploading) setIsDraggingOver(true);
        }}
        onDragLeave={() => setIsDraggingOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDraggingOver(false);
          handleFiles(e.dataTransfer.files);
        }}
        onClick={() => !disabled && !uploading && inputRef.current?.click()}
        className={`relative flex min-h-40 items-center justify-center overflow-hidden rounded-xl border-2 border-dashed transition ${
          disabled
            ? 'cursor-not-allowed border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900/40'
            : isDraggingOver
            ? 'cursor-pointer border-brand-500 bg-brand-50 dark:bg-brand-600/10'
            : 'cursor-pointer border-gray-200 bg-gray-50 hover:border-brand-300 hover:bg-brand-50/40 dark:border-gray-700 dark:bg-gray-900/40 dark:hover:border-brand-700'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_TYPES.join(',')}
          className="hidden"
          onChange={(e) => {
            handleFiles(e.target.files);
            // ریست کردنِ value - وگرنه انتخابِ دوباره‌ی همون فایل (مثلاً
            // بعدِ خطا) رویدادِ onChange رو فایر نمی‌کنه
            e.target.value = '';
          }}
          disabled={disabled || uploading}
        />

        {imageUrl && !uploading && (
          <img
            src={imageUrl}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
        )}

        <div
          className={`relative z-10 flex flex-col items-center gap-1.5 px-4 py-6 text-center text-xs ${
            imageUrl && !uploading
              ? 'rounded-lg bg-black/50 text-white'
              : 'text-gray-400 dark:text-gray-500'
          }`}
        >
          {uploading ? (
            <>
              <Loader2 size={20} className="animate-spin" />
              در حال آپلود...
            </>
          ) : disabled ? (
            <>
              <ImagePlus size={20} />
              {disabledHint ?? 'اول باید ذخیره کنی'}
            </>
          ) : (
            <>
              <ImagePlus size={20} />
              {imageUrl
                ? 'برای جایگزینی، تصویرِ جدید رو بکش یا کلیک کن'
                : 'تصویر رو بکش این‌جا، یا کلیک کن'}
            </>
          )}
        </div>
      </div>

      {imageUrl && !uploading && !disabled && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="inline-flex w-fit items-center gap-1 text-xs font-medium text-gray-500 transition hover:text-danger-600 dark:text-gray-400 dark:hover:text-danger-400"
        >
          <X size={12} />
          تغییرِ تصویر
        </button>
      )}
    </div>
  );
}

export default ImageUploadField;
