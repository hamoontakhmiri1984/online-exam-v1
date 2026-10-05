import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import AppLayout from "../../components/AppLayout/AppLayout";
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
      <div className="mx-auto max-w-5xl space-y-5" dir="rtl">
        <Link to="/practice" className="text-sm text-gray-500">
          ← بازگشت به تمرین‌ها
        </Link>
        <h1 className="text-2xl font-bold">
          {id ? "تنظیم مجموعهٔ تمرین" : "یک مسیر تازه برای تمرین"}
        </h1>
        <p className="text-sm leading-7 text-gray-500">
          مشخصات، سؤال‌ها و گروه‌های مجاز را انتخاب کنید. پس از ذخیره، پیش‌نمایش
          را ببینید و منتشر کنید.
        </p>
        {loading ? (
          <p role="status">در حال دریافت اطلاعات…</p>
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
          <form onSubmit={save} className="space-y-5">
            <fieldset disabled={busy} className={`${panel} space-y-4`}>
              <h2 className="text-lg font-bold">۱. مشخصات مجموعه</h2>
              <label className="block text-sm">
                نام تمرین
                <input
                  className={`${input} mt-2`}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  minLength={2}
                  maxLength={160}
                  placeholder="مثلاً مرور فصل اول ریاضی"
                />
              </label>
              <label className="block text-sm">
                راهنمای کوتاه برای کارآموز
                <textarea
                  className={`${input} mt-2`}
                  rows={3}
                  maxLength={2000}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="هدف این تمرین چیست؟"
                />
              </label>
            </fieldset>
            {frozen ? (
              <section className={panel}>
                <h2 className="font-bold">سؤال‌های این مجموعه ثابت هستند</h2>
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
              <h2 className="text-lg font-bold">۳. دسترسی گروه‌ها</h2>
              <p className="mb-4 mt-2 text-sm text-gray-500">
                فقط اعضای گروه‌های انتخاب‌شده، پس از انتشار این تمرین را
                می‌بینند.
              </p>
              {!groups.length ? (
                <Link to="/groups" className="text-brand-600 underline">
                  ابتدا گروه بسازید
                </Link>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {groups.map((g) => (
                    <label
                      key={g.id}
                      className="flex items-center gap-3 rounded-xl border border-gray-200 p-3 text-sm dark:border-gray-700"
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
                      {g.name}
                    </label>
                  ))}
                </div>
              )}
            </fieldset>
            {error && (
              <p
                role="alert"
                className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700 dark:bg-rose-950 dark:text-rose-300"
              >
                {error}
              </p>
            )}
            <footer
              className={`${panel} flex flex-wrap items-center justify-between gap-4`}
            >
              <p className="text-sm text-gray-500">
                {groupIds.length.toLocaleString("fa-IR")} گروه انتخاب شده •
                انتشار در مرحلهٔ بعد
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
