import { Link as LinkIcon, Upload, Loader2, FileText, X } from 'lucide-react';
import Modal from '../../../components/Modal/Modal';
import type { Attachment } from '../../../api/lessonApi';

type UploadedFile = { fileName: string; objectKey: string };

type SessionFormModalProps = {
  isOpen: boolean;
  isEditing: boolean;
  isSubmitting?: boolean;
  title: string;
  onTitleChange: (value: string) => void;
  description: string;
  onDescriptionChange: (value: string) => void;
  videoType: 'link' | 'upload';
  onVideoTypeChange: (type: 'link' | 'upload') => void;
  videoUrl: string;
  onVideoUrlChange: (value: string) => void;
  uploadedFile: UploadedFile | null;
  isUploading: boolean;
  onFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  attachments: Attachment[];
  isUploadingAttachment: boolean;
  onAttachmentChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveAttachment: (index: number) => void;
  onSubmit: (event: React.FormEvent) => void;
  onClose: () => void;
};

// همون فرمت‌بندی حجم فایل که SessionPlayer هم استفاده می‌کنه - اینجا هم
// لازمه چون کاربر باید حجم فایلی که تازه آپلود کرده رو همینجا تو فرم ببینه
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} بایت`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} کیلوبایت`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} مگابایت`;
}

function SessionFormModal({
  isOpen,
  isEditing,
  isSubmitting = false,
  title,
  onTitleChange,
  description,
  onDescriptionChange,
  videoType,
  onVideoTypeChange,
  videoUrl,
  onVideoUrlChange,
  uploadedFile,
  isUploading,
  onFileChange,
  attachments,
  isUploadingAttachment,
  onAttachmentChange,
  onRemoveAttachment,
  onSubmit,
  onClose,
}: SessionFormModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <h2 className="text-lg font-bold mb-4 dark:text-white">
        {isEditing ? 'ویرایش جلسه' : 'جلسه جدید'}
      </h2>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label
            htmlFor="session-title"
            className="text-sm text-gray-600 dark:text-gray-300"
          >
            عنوان جلسه
          </label>
          <input
            id="session-title"
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            className="border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-50 dark:focus:ring-brand-900 transition"
            placeholder="مثلاً: جلسه ۱: معرفی متغیرها"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label
            htmlFor="session-description"
            className="text-sm text-gray-600 dark:text-gray-300"
          >
            توضیحات (اختیاری)
          </label>
          <textarea
            id="session-description"
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
            rows={2}
            className="border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-50 dark:focus:ring-brand-900 transition resize-none"
            placeholder="توضیح کوتاه درباره‌ی این جلسه"
          />
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-sm text-gray-600 dark:text-gray-300">
            منبع ویدیو
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onVideoTypeChange('link')}
              aria-pressed={videoType === 'link'}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-medium transition ${
                videoType === 'link'
                  ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-950/40 dark:text-brand-300'
                  : 'border-gray-200 text-gray-500 dark:border-gray-700 dark:text-gray-400'
              }`}
            >
              <LinkIcon size={15} />
              لینک (یوتیوب/آپارات)
            </button>
            <button
              type="button"
              onClick={() => onVideoTypeChange('upload')}
              aria-pressed={videoType === 'upload'}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-medium transition ${
                videoType === 'upload'
                  ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-950/40 dark:text-brand-300'
                  : 'border-gray-200 text-gray-500 dark:border-gray-700 dark:text-gray-400'
              }`}
            >
              <Upload size={15} />
              آپلود فایل
            </button>
          </div>

          {videoType === 'link' ? (
            <input
              value={videoUrl}
              aria-label="لینک ویدیو"
              onChange={(e) => onVideoUrlChange(e.target.value)}
              className="border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-50 dark:focus:ring-brand-900 transition"
              placeholder="https://www.aparat.com/v/... یا لینک یوتیوب"
            />
          ) : (
            <label
              className={`flex flex-col items-center gap-2 rounded-xl border-2 border-dashed px-4 py-6 text-center text-sm transition focus-within:border-brand-400 focus-within:ring-4 focus-within:ring-brand-50 ${
                isUploading
                  ? 'cursor-not-allowed border-gray-200 text-gray-400 dark:border-gray-700 dark:text-gray-500'
                  : 'cursor-pointer border-gray-200 text-gray-500 hover:border-brand-300 hover:bg-brand-50/50 dark:border-gray-700 dark:text-gray-400 dark:hover:border-brand-800 dark:hover:bg-brand-950/20'
              }`}
            >
              {isUploading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Upload size={18} />
              )}
              {isUploading
                ? 'در حال آپلود...'
                : uploadedFile
                ? uploadedFile.fileName
                : 'فایل ویدیو را انتخاب کن'}
              <input
                type="file"
                accept="video/*"
                onChange={onFileChange}
                disabled={isUploading}
                // sr-only به‌جای hidden تا با Tab قابل فوکوس باشه
                className="sr-only"
              />
            </label>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-sm text-gray-600 dark:text-gray-300">
            جزوه و فایل‌های پیوست (PDF)
          </span>

          {attachments.length > 0 && (
            <ul className="flex flex-col gap-1.5">
              {attachments.map((file, index) => (
                <li
                  key={file.id ?? file.objectKey}
                  className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
                >
                  <FileText
                    size={16}
                    className="shrink-0 text-brand-600 dark:text-brand-400"
                  />
                  <span className="flex-1 truncate text-gray-700 dark:text-gray-200">
                    {file.fileName}
                  </span>
                  <span className="shrink-0 text-xs text-gray-400 dark:text-gray-500">
                    {formatFileSize(file.fileSize)}
                  </span>
                  <button
                    type="button"
                    onClick={() => onRemoveAttachment(index)}
                    className="shrink-0 text-gray-400 hover:text-danger-600 dark:hover:text-danger-400 cursor-pointer"
                    aria-label="حذف پیوست"
                  >
                    <X size={15} />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <label
            className={`flex flex-col items-center gap-2 rounded-xl border-2 border-dashed px-4 py-5 text-center text-sm transition focus-within:border-brand-400 focus-within:ring-4 focus-within:ring-brand-50 ${
              isUploadingAttachment
                ? 'cursor-not-allowed border-gray-200 text-gray-400 dark:border-gray-700 dark:text-gray-500'
                : 'cursor-pointer border-gray-200 text-gray-500 hover:border-brand-300 hover:bg-brand-50/50 dark:border-gray-700 dark:text-gray-400 dark:hover:border-brand-800 dark:hover:bg-brand-950/20'
            }`}
          >
            {isUploadingAttachment ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Upload size={18} />
            )}
            {isUploadingAttachment ? 'در حال آپلود...' : 'افزودن فایل PDF'}
            <input
              type="file"
              accept="application/pdf"
              onChange={onAttachmentChange}
              disabled={isUploadingAttachment}
              className="sr-only"
            />
          </label>
        </div>

        <button
          type="submit"
          disabled={isUploading || isUploadingAttachment || isSubmitting}
          className="w-full bg-brand-600 text-white font-medium px-4 py-2.5 rounded-xl hover:bg-brand-700 transition disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isEditing ? 'ذخیره تغییرات' : 'افزودن جلسه'}
        </button>
      </form>
    </Modal>
  );
}

export default SessionFormModal;
