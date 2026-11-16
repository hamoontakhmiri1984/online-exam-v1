import Spinner from '../../components/Spinner/Spinner';
import { useEffect, useRef, useState } from "react";
import { ArrowRight, BookOpenCheck, CheckCircle2, Layers, LibraryBig } from "lucide-react";
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
    Promise.all([
      getGroups(),
      getQuestionBanks(),
      id ? getPractice(id) : null,
      id ? collectListPages((query) => getPracticeQuestions(id, query)) : [],
    ])
      .then(([g, b, p, qs]) => {
        if (!active) return;
        setGroups(g);
        setBanks(b);
        if (p) {
          setTitle(p.title);
          setDescription(p.description);
          setGroupIds(p.groups.map((item) => item.id));
          setFrozen(!!p.publishedAt);
          setSelected(
            qs
              .filter((q) => q.sourceQuestionId)
              .map((q) => ({
                id: q.sourceQuestionId!,
                text: q.text,
                difficulty: q.difficulty,
              })),
          );
        }
      })
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
    if (pending.current) return;
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
      const data = {
        title,
        description,
        groupIds,
        ...(!frozen ? { questionIds: selected.map((q) => q.id) } : {}),
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
        <Link to="/practice" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-violet-600"><ArrowRight size={16}/> بازگشت به تمرین‌ها</Link>
        <header className="rounded-3xl border border-violet-200/50 bg-gradient-to-bl from-violet-50 via-white to-white p-4 sm:p-5 dark:border-violet-400/20 dark:from-violet-500/10 dark:via-slate-900 dark:to-slate-900">
          <div className="mb-2 inline-flex items-center gap-2 text-sm font-semibold text-violet-600 dark:text-violet-300"><BookOpenCheck size={18}/> ساخت و مدیریت تمرین</div>
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
              <h2 className="inline-flex items-center gap-2 text-base font-bold"><BookOpenCheck size={19} className="text-violet-600"/>مشخصات تمرین</h2>
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
                <h2 className="inline-flex items-center gap-2 font-bold"><LibraryBig size={18} className="text-violet-600"/>سؤال‌های این مجموعه ثابت هستند</h2>
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
                disabled={busy}
              />
            )}
            <fieldset disabled={busy} className={panel}>
              <h2 className="inline-flex items-center gap-2 text-lg font-bold"><Layers size={19} className="text-violet-600"/>گروه‌های مجاز</h2>
              <p className="mb-3 mt-1 text-xs leading-6 text-gray-500">
                می‌توانید تمرین را بدون گروه به‌صورت پیش‌نویس ذخیره کنید. برای انتشار، حداقل یک گروه لازم است.
              </p>
              {!groups.length ? (
                <Link to="/groups" className="text-brand-600 underline">
                  ابتدا گروه بسازید
                </Link>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {groups.map((g) => (
                    <label
                      key={g.id}
                      className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm transition-colors ${groupIds.includes(g.id) ? "border-violet-400 bg-violet-50 text-violet-800 dark:border-violet-400/45 dark:bg-violet-500/10 dark:text-violet-200" : "border-slate-200 hover:border-violet-300 dark:border-slate-700"}`}
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
                      {groupIds.includes(g.id) && <CheckCircle2 size={17} className="shrink-0 text-violet-600"/>}
                    </label>
                  ))}
                </div>
              )}
            </fieldset>
            <footer
              className={`${panel} flex flex-wrap items-center justify-between gap-3`}
            >
              <p className="text-sm text-gray-500">
                {groupIds.length.toLocaleString("fa-IR")} گروه • {selected.length.toLocaleString("fa-IR")} سؤال
                {frozen ? " • سؤال‌ها پس از انتشار ثابت می‌مانند" : " • انتشار پس از بازبینی"}
              </p>
              <button className={primary} disabled={busy}>
                {busy ? "در حال ذخیره…" : "ذخیره و بازبینی"}
              </button>
            </footer>
          </form>
        )}
      </div>
    </AppLayout>
  );
}
