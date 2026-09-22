import { useEffect, useState } from 'react';
import { FileText, Download, Loader2, AlertTriangle } from 'lucide-react';
import type { LessonSession } from '../../../api/lessonApi';
import {
  getSessionVideoSignedUrl,
  getAttachmentSignedUrl,
} from '../../../api/lessonApi';
import { ApiError } from '../../../lib/apiClient';
import { toEmbedUrl } from '../../../utils/video';

type SessionPlayerProps = {
  session: LessonSession | null;
};

// برای نمایش حجم فایل کنار اسمش (مثلاً «۲.۴ مگابایت») به‌جای عدد خام بایت
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} بایت`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} کیلوبایت`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} مگابایت`;
}

// ویدیوی آپلودی و جزوه/PDF دیگه یه URL دائمی قابل‌دسترس نیستن (فایل تو
// bucket خصوصیه) - این کامپوننت هر بار که واقعاً می‌خواد نشونشون بده،
// از سرور یه signed URL موقت (چند دقیقه‌ای) می‌گیره.
function SessionPlayer({ session }: SessionPlayerProps) {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [videoLoading, setVideoLoading] = useState(false);

  // پیوستی که الان داره براش signed URL گرفته می‌شه (برای غیرفعال کردن
  // بقیه‌ی دکمه‌ها موقع دانلود و نشون دادن اسپینر روی همون یکی)
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);

  // وابستگی به خودِ آبجکت session نیست، چون با هر تغییرِ لیست (مثلاً ویرایشِ
  // یه جلسه‌ی دیگه) رفرنسش عوض می‌شد و signed URL دوباره گرفته می‌شد و
  // ویدیوی در حال پخش از اول لود می‌شد. فقط وقتی جلسه یا فایلِ ویدیوش عوض
  // بشه لینک جدید لازمه.
  const sessionId = session?.id;
  const uploadedVideoKey =
    session?.video.type === 'upload' ? session.video.objectKey : null;

  useEffect(() => {
    setVideoUrl(null);
    setVideoError(null);
    setVideoLoading(false);
    setAttachmentError(null);

    if (!sessionId || !uploadedVideoKey) return;

    let cancelled = false;
    setVideoLoading(true);
    getSessionVideoSignedUrl(sessionId)
      .then(({ url }) => {
        if (!cancelled) setVideoUrl(url);
      })
      .catch((err) => {
        if (!cancelled) {
          setVideoError(
            err instanceof ApiError
              ? err.message
              : 'دریافت لینک ویدیو با خطا مواجه شد'
          );
        }
      })
      .finally(() => {
        if (!cancelled) setVideoLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [sessionId, uploadedVideoKey]);

  async function handleDownload(
    attachmentId: string | undefined,
    fileName: string
  ) {
    if (!attachmentId || downloadingId) return;

    setAttachmentError(null);
    setDownloadingId(attachmentId);
    try {
      const { url } = await getAttachmentSignedUrl(attachmentId);
      // signed URL خودش موقتیه، پس نمی‌ذاریمش تو href استاتیک - همینجا که
      // تازه گرفتیمش یه لینک موقت می‌سازیم و کلیکش می‌زنیم تا دانلود شروع بشه
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.rel = 'noreferrer';
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      setAttachmentError(
        err instanceof ApiError
          ? err.message
          : 'دریافت لینک فایل با خطا مواجه شد'
      );
    } finally {
      setDownloadingId(null);
    }
  }

  if (!session) {
    return (
      <div className="rounded-2xl bg-white p-10 text-center text-gray-500 shadow-sm dark:bg-gray-900 dark:text-gray-400">
        یک جلسه را برای پخش انتخاب کن.
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm dark:bg-gray-900">
      <div className="mb-4 flex aspect-video items-center justify-center overflow-hidden rounded-xl bg-black">
        {session.video.type === 'link' ? (
          toEmbedUrl(session.video.url) ? (
            <iframe
              key={session.id}
              src={toEmbedUrl(session.video.url)}
              className="h-full w-full"
              allowFullScreen
              title={session.title}
            />
          ) : (
            <div className="flex flex-col items-center gap-2 px-4 text-center text-sm text-gray-300">
              <AlertTriangle size={20} className="text-danger-400" />
              لینک ویدیو نامعتبر است.
            </div>
          )
        ) : videoLoading ? (
          <Loader2 className="animate-spin text-gray-400" size={28} />
        ) : videoError ? (
          <div className="flex flex-col items-center gap-2 px-4 text-center text-sm text-gray-300">
            <AlertTriangle size={20} className="text-danger-400" />
            {videoError}
          </div>
        ) : videoUrl ? (
          <video
            key={session.id}
            src={videoUrl}
            controls
            className="h-full w-full"
          />
        ) : null}
      </div>
      <h2 className="font-bold text-gray-900 dark:text-white">
        {session.title}
      </h2>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        {session.description}
      </p>

      {attachmentError && (
        <p className="mt-3 text-sm text-danger-600 dark:text-danger-400">
          {attachmentError}
        </p>
      )}

      {session.attachments.length > 0 && (
        <div className="mt-4 flex flex-col gap-2 border-t border-gray-100 pt-4 dark:border-gray-800">
          <h3 className="text-sm font-medium text-gray-600 dark:text-gray-300">
            جزوه و فایل‌های این جلسه
          </h3>
          <ul className="flex flex-col gap-1.5">
            {session.attachments.map((file) => (
              <li key={file.id ?? file.objectKey}>
                <button
                  type="button"
                  onClick={() => handleDownload(file.id, file.fileName)}
                  disabled={!!downloadingId}
                  className="flex w-full items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-700 transition hover:border-brand-300 hover:bg-brand-50/50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:text-gray-200 dark:hover:border-brand-800 dark:hover:bg-brand-950/20"
                >
                  <FileText
                    size={16}
                    className="shrink-0 text-brand-600 dark:text-brand-400"
                  />
                  <span className="flex-1 truncate text-right">
                    {file.fileName}
                  </span>
                  <span className="shrink-0 text-xs text-gray-400 dark:text-gray-500">
                    {formatFileSize(file.fileSize)}
                  </span>
                  {downloadingId === file.id ? (
                    <Loader2
                      size={15}
                      className="shrink-0 animate-spin text-gray-400 dark:text-gray-500"
                    />
                  ) : (
                    <Download
                      size={15}
                      className="shrink-0 text-gray-400 dark:text-gray-500"
                    />
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default SessionPlayer;
