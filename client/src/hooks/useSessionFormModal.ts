import { useRef, useState } from 'react';
import type { Category } from '../constants/categories';
import type { Attachment, LessonSession, VideoSource } from '../api/lessonApi';
import { uploadLessonVideo, uploadLessonAttachment } from '../api/uploadApi';
import { toEmbedUrl } from '../utils/video';

// همون سقف‌های سمت سرور (lib/videoUpload.ts و lib/attachmentUpload.ts)؛ اینجا
// چک می‌شن تا مدرس بعد از آپلودِ چند دقیقه‌ایِ یه فایل ۶۰۰ مگابایتی تازه
// نفهمه که رد شده
const MAX_VIDEO_BYTES = 500 * 1024 * 1024;
const MAX_ATTACHMENT_BYTES = 20 * 1024 * 1024;

type SessionInput = Omit<LessonSession, 'id'>;
type UploadedFile = { fileName: string; objectKey: string };

type UseSessionFormModalParams = {
  groupId: string | undefined;
  category: Category | undefined;
  addItem: (input: SessionInput) => Promise<unknown>;
  updateItem: (id: string, input: SessionInput) => Promise<unknown>;
};

function useSessionFormModal({
  groupId,
  category,
  addItem,
  updateItem,
}: UseSessionFormModalParams) {
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [videoType, setVideoType] = useState<'link' | 'upload'>('link');
  const [videoUrl, setVideoUrl] = useState('');
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // با هر باز/بسته‌شدنِ فرم یکی زیاد می‌شه. اگه آپلودی وسط کار باشه و فرم
  // بسته (یا برای جلسه‌ی دیگه‌ای باز) بشه، نتیجه‌ی اون آپلود قدیمی نباید تو
  // فرمِ جدید بشینه.
  const formVersion = useRef(0);

  function openAdd() {
    formVersion.current += 1;
    setEditingId(null);
    setTitle('');
    setDescription('');
    setVideoType('link');
    setVideoUrl('');
    setUploadedFile(null);
    setIsUploading(false);
    setAttachments([]);
    setIsUploadingAttachment(false);
    setIsOpen(true);
  }

  function openEdit(session: LessonSession) {
    formVersion.current += 1;
    setValidationError(null);
    setEditingId(session.id);
    setTitle(session.title);
    setDescription(session.description);
    setVideoType(session.video.type);
    if (session.video.type === 'link') {
      setVideoUrl(session.video.url);
      setUploadedFile(null);
    } else {
      setVideoUrl('');
      setUploadedFile({
        fileName: session.video.fileName,
        objectKey: session.video.objectKey,
      });
    }
    setIsUploading(false);
    setAttachments(session.attachments);
    setIsUploadingAttachment(false);
    setIsOpen(true);
  }

  function close() {
    formVersion.current += 1;
    setIsUploading(false);
    setIsUploadingAttachment(false);
    setValidationError(null);
    setIsOpen(false);
  }

  // قبلاً اینجا فقط URL.createObjectURL(file) صدا زده می‌شد که یه blob:
  // URL محلی و موقتیه - فقط تو همین تب مرورگر معتبره، با رفرش از بین
  // می‌ره و از هیچ مرورگر دیگه‌ای (مثلاً دانشجو) قابل‌دسترس نیست. الان فایل
  // واقعاً به bucket خصوصی آپلود می‌شه و فقط object key برمی‌گرده - پخش
  // واقعی بعداً با یه signed URL موقت انجام می‌شه (SessionPlayer.tsx)
  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const input = event.target;
    const file = input.files?.[0];
    if (!file) return;

    // اجازه بده همون فایل دوباره انتخاب بشه (مثلاً بعد از شکست آپلود)
    input.value = '';

    if (file.size > MAX_VIDEO_BYTES) {
      setValidationError('حجم ویدیو بیشتر از حد مجاز (۵۰۰ مگابایت) است');
      return;
    }

    const version = formVersion.current;
    setValidationError(null);
    setIsUploading(true);
    try {
      const uploaded = await uploadLessonVideo(file);
      if (version !== formVersion.current) return;
      setUploadedFile(uploaded);
    } catch (err) {
      if (version !== formVersion.current) return;
      setUploadedFile(null);
      setValidationError(
        err instanceof Error ? err.message : 'آپلود فایل با خطا مواجه شد'
      );
    } finally {
      if (version === formVersion.current) setIsUploading(false);
    }
  }

  async function handleAttachmentChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const input = event.target;
    const file = input.files?.[0];
    if (!file) return;

    // اجازه بده همون فایل دوباره انتخاب بشه (مثلاً بعد از شکست آپلود)
    input.value = '';

    if (file.size > MAX_ATTACHMENT_BYTES) {
      setValidationError('حجم فایل بیشتر از حد مجاز (۲۰ مگابایت) است');
      return;
    }

    const version = formVersion.current;
    setValidationError(null);
    setIsUploadingAttachment(true);
    try {
      const uploaded = await uploadLessonAttachment(file);
      if (version !== formVersion.current) return;
      setAttachments((prev) => [...prev, uploaded]);
    } catch (err) {
      if (version !== formVersion.current) return;
      setValidationError(
        err instanceof Error ? err.message : 'آپلود فایل با خطا مواجه شد'
      );
    } finally {
      if (version === formVersion.current) setIsUploadingAttachment(false);
    }
  }

  function removeAttachment(index: number) {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!groupId || !category || isSubmitting) return;

    if (isUploading) {
      setValidationError('صبر کن تا آپلود ویدیو تموم بشه');
      return;
    }

    if (isUploadingAttachment) {
      setValidationError('صبر کن تا آپلود جزوه تموم بشه');
      return;
    }

    // سرور عنوانِ کمتر از ۲ حرف رو رد می‌کنه؛ همینجا با پیام روشن جلوش رو
    // می‌گیریم
    if (title.trim().length < 2) {
      setValidationError('عنوان جلسه باید حداقل ۲ حرف باشه');
      return;
    }

    let video: VideoSource;
    if (videoType === 'link') {
      if (!videoUrl.trim()) {
        setValidationError('لطفاً لینک ویدیو را وارد کنید');
        return;
      }
      // همون اعتبارسنجی‌ای که پلیر استفاده می‌کنه؛ وگرنه لینکِ خراب ذخیره
      // می‌شد و بعداً تو پلیر «لینک نامعتبر است» می‌دیدن
      if (!toEmbedUrl(videoUrl)) {
        setValidationError('لینک ویدیو نامعتبر است');
        return;
      }
      video = { type: 'link', url: videoUrl.trim() };
    } else {
      if (!uploadedFile) {
        setValidationError('لطفاً فایل ویدیو را انتخاب کنید');
        return;
      }
      video = { type: 'upload', ...uploadedFile };
    }

    const sessionData: SessionInput = {
      category,
      groupIds: [groupId],
      title: title.trim(),
      description: description.trim(),
      video,
      attachments,
    };

    setIsSubmitting(true);

    let saved: unknown;

    try {
      saved = editingId
        ? await updateItem(editingId, sessionData)
        : await addItem(sessionData);
    } finally {
      setIsSubmitting(false);
    }

    // useCrud/هوک صفحه موقع خطا پیام رو تو Toast نشون می‌ده و undefined برمی‌گردونه؛
    // تو اون حالت مودال باز می‌مونه تا اطلاعات واردشده از بین نره
    if (saved) {
      setIsOpen(false);
    }
  }

  return {
    isOpen,
    editingId,
    title,
    setTitle,
    description,
    setDescription,
    videoType,
    setVideoType,
    videoUrl,
    setVideoUrl,
    uploadedFile,
    isUploading,
    handleFileChange,
    attachments,
    isUploadingAttachment,
    handleAttachmentChange,
    removeAttachment,
    validationError,
    isSubmitting,
    dismissValidationError: () => setValidationError(null),
    openAdd,
    openEdit,
    close,
    handleSubmit,
  };
}

export default useSessionFormModal;
