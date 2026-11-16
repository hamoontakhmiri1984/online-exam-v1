import Spinner from '../../components/Spinner/Spinner';
import { useEffect, useRef, useState } from "react";
import { BookOpenCheck, CheckCircle2, Layers, LibraryBig } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import AppLayout from "../../components/AppLayout/AppLayout";
import { notifySaveSuccess } from "../../components/Toast/Toast";
import { getGroups, type Group } from "../../api/groupApi";
import { getQuestionBanks, type QuestionBank } from "../../api/questionBankApi";
import {
  createPractice,
  getPractice,
  getPracticeQuestions,
  updatePractice,
} from "../../api/practiceApi";
import { collectListPages } from "../../lib/listPagination";
import { ApiError } from "../../lib/apiClient";
import PracticeQuestionPicker, {
  type PickedQuestion,
} from "./components/PracticeQuestionPicker";
import PanelBack from "../../components/PanelBack/PanelBack";
import { input, panel, primary, secondary } from "./practiceUi";
export default function PracticeEditorPage() {
  const { practiceId } = useParams();
  return <Editor key={practiceId ?? "new"} id={practiceId} />;
}
function Editor({ id }: { id?: string }) {
  const navigate = useNavigate();
  const [groups, setGroups] = useState<Group[]>([]);
  const [banks, setBanks] = useState<QuestionBank[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [groupIds, setGroupIds] = useState<string[]>([]);
  const [selected, setSelected] = useState<PickedQuestion[]>([]);
  const [frozen, setFrozen] = useState(false);
  const [questionCount, setQuestionCount] = useState(0);
  const [unavailableGroups, setUnavailableGroups] = useState<string[]>([]);
  const [selecting, setSelecting] = useState(false);
  const originalQuestionIds = useRef<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);
  const pending = useRef(false);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError("");
    async function load() {
      const [availableGroups, practice] = await Promise.all([
        getGroups(),
        id ? getPractice(id) : null,
      ]);
      const locked = Boolean(practice?.publishedAt || practice?.status === 'Published');
      const [availableBanks, questions] = locked ? [[], []] as const : await Promise.all([
        getQuestionBanks(),
        id ? collectListPages(query => getPracticeQuestions(id, query)) : [],
      ]);
      if (!active) return;
      setGroups(availableGroups);
      setBanks([...availableBanks]);
      if (!practice) return;

      const approvedGroupIds = new Set(availableGroups.map(group => group.id));
      setTitle(practice.title);
      setDescription(practice.description);
      setGroupIds(practice.groups.filter(group => approvedGroupIds.has(group.id)).map(group => group.id));
      setUnavailableGroups(practice.groups.filter(group => !approvedGroupIds.has(group.id)).map(group => group.name));
      setFrozen(locked);
      setQuestionCount(practice.questionCount);
      const choices = questions.map(question => ({
        id: question.sourceQuestionId ?? question.id,
        text: question.text,
        difficulty: question.difficulty,
      }));
      originalQuestionIds.current = choices.map(question => question.id);
      setSelected(choices);
    }
    load()
      .catch((e) => {
        if (active)
          setLoadError(
            e instanceof ApiError ? e.message : "دریافت اطلاعات ناموفق بود.",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id, revision]);
  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (pending.current || selecting) return;
    if (title.trim().length < 2) {
      setError("نام تمرین الزامی است و باید حداقل دو حرف داشته باشد.");
      return;
    }
    if (!frozen && !selected.length) {
      setError("حداقل یک سؤال انتخاب کنید.");
      return;
    }
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      const questionIds = selected.map(question => question.id);
      const changedQuestions = questionIds.length !== originalQuestionIds.current.length ||
        questionIds.some((questionId, index) => questionId !== originalQuestionIds.current[index]);
      const data = {
        title,
        description,
        groupIds,
        ...(!frozen && (!id || changedQuestions) ? { questionIds } : {}),
      };
      const saved = id
        ? await updatePractice(id, data)
        : await createPractice(data);
      notifySaveSuccess(id ? "تمرین با موفقیت ویرایش شد" : "تمرین با موفقیت ثبت شد");
      navigate(`/practice/${saved.id}`);
    } catch (e) {
      setError(
        e instanceof ApiError
          ? e.message
          : "ذخیره انجام نشد؛ دوباره تلاش کنید.",
      );
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return (
    <AppLayout title={id ? "ویرایش مجموعهٔ تمرین" : "مجموعهٔ تمرین جدید"}>
      <div className="mx-auto max-w-4xl space-y-4" dir="rtl">
        <PanelBack to="/practice" label="بازگشت به تمرین‌ها" />
        <header className="rounded-3xl border border-violet-200/50 bg-gradient-to-bl from-violet-50 via-white to-white p-4 sm:p-5 dark:border-violet-400/20 dark:from-violet-500/10 dark:via-slate-900 dark:to-slate-900">
          <div className="mb-2 inline-flex items-center gap-2 text-sm font-semibold text-brand-ink"><BookOpenCheck size={18}/> ساخت و مدیریت تمرین</div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">{id ? "ویرایش مجموعه تمرین" : "ساخت مجموعه تمرین"}</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">نام تمرین را بنویسید، سؤال‌ها و گروه‌ها را انتخاب کنید و ذخیره بزنید.</p>
        </header>
        {loading ? (
          <Spinner label="در حال دریافت اطلاعات تمرین…" />
        ) : loadError ? (
          <div role="alert">
            {loadError}
            <button
              className={secondary}
              onClick={() => setRevision((n) => n + 1)}
            >
              تلاش مجدد
            </button>
          </div>
        ) : (
          <form onSubmit={save} noValidate className="space-y-4">
            {error && <p role="alert" className="form-inline-error">{error}</p>}
            <fieldset disabled={busy} className={`${panel} space-y-3`}>
              <h2 className="inline-flex items-center gap-2 text-base font-bold"><BookOpenCheck size={19} className="text-brand-ink"/>مشخصات تمرین</h2>
              <label className="block text-sm">
                نام تمرین
                <input
                  className={`${input} mt-2`}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  aria-invalid={!!error && title.trim().length < 2}
                  minLength={2}
                  maxLength={160}
                  placeholder="مثلاً مرور فصل اول ریاضی"
                />
              </label>
              <label className="block text-sm">
                توضیحات (اختیاری)
                <textarea
                  className={`${input} mt-2`}
                  rows={2}
                  maxLength={2000}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="هدف این تمرین چیست؟"
                />
              </label>
            </fieldset>
            {frozen ? (
              <section className={panel}>
                <h2 className="inline-flex items-center gap-2 font-bold"><LibraryBig size={18} className="text-brand-ink"/>سؤال‌های این مجموعه ثابت هستند</h2>
                <p className="mt-2 text-sm leading-7 text-gray-500">
                  برای حفظ اعتبار سابقهٔ کارآموز، سؤال‌ها پس از اولین انتشار
                  تغییر نمی‌کنند. می‌توانید نام، توضیح و دسترسی گروه‌ها را
                  ویرایش کنید یا مجموعهٔ تازه بسازید.
                </p>
              </section>
            ) : (
              <PracticeQuestionPicker
                banks={banks}
                selected={selected}
                onChange={setSelected}
                sampling={selecting}
                onSamplingChange={setSelecting}
                disabled={busy}
              />
            )}
            <fieldset disabled={busy} className={panel}>
              <h2 className="inline-flex items-center gap-2 text-lg font-bold"><Layers size={19} className="text-brand-ink"/>گروه‌های مجاز</h2>
              <p className="mb-3 mt-1 text-xs leading-6 text-gray-500">
                می‌توانید تمرین را بدون گروه به‌صورت پیش‌نویس ذخیره کنید. برای انتشار، حداقل یک گروه لازم است.
              </p>
              {unavailableGroups.length > 0 && (
                <p className="mb-3 text-sm text-amber-800 dark:text-amber-300">
                  این گروه‌ها دیگر در دسترس نیستند و با ذخیره از تمرین حذف می‌شوند: {unavailableGroups.join('، ')}
                </p>
              )}
              {!groups.length ? (
                <Link to="/groups" className="text-brand-ink underline">
                  ابتدا گروه بسازید
                </Link>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {groups.map((g) => (
                    <label
                      key={g.id}
                      className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm transition-colors ${groupIds.includes(g.id) ? "border-violet-400 bg-violet-50 text-brand-ink dark:border-violet-400/45 dark:bg-violet-500/10" : "border-slate-200 hover:border-violet-300 dark:border-slate-700"}`}
                    >
                      <input
                        type="checkbox"
                        checked={groupIds.includes(g.id)}
                        onChange={() =>
                          setGroupIds((ids) =>
                            ids.includes(g.id)
                              ? ids.filter((value) => value !== g.id)
                              : [...ids, g.id],
                          )
                        }
                        className="h-4 w-4 accent-brand-600"
                      />
                      <span className="min-w-0 flex-1 break-words">{g.name}</span>
                      {groupIds.includes(g.id) && <CheckCircle2 size={17} className="shrink-0 text-brand-ink"/>}
                    </label>
                  ))}
                </div>
              )}
            </fieldset>
            <footer
              className={`${panel} flex flex-wrap items-center justify-between gap-3`}
            >
              <p className="text-sm text-gray-500">
                {groupIds.length.toLocaleString("fa-IR")} گروه • {(frozen ? questionCount : selected.length).toLocaleString("fa-IR")} سؤال
                {frozen ? " • سؤال‌ها پس از انتشار ثابت می‌مانند" : " • انتشار پس از بازبینی"}
              </p>
              <button type="submit" className={primary} disabled={busy || selecting}>
                {busy ? "در حال ذخیره…" : "ذخیره و بازبینی"}
              </button>
            </footer>
          </form>
        )}
      </div>
    </AppLayout>
  );
}
