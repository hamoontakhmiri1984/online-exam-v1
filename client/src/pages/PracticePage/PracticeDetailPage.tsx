import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getCurrentUser } from "../../api/authApi";
import {
  getPractice,
  setPracticeStatus,
  type Practice,
} from "../../api/practiceApi";
import { ApiError } from "../../lib/apiClient";
import AppLayout from "../../components/AppLayout/AppLayout";
import PracticeQuestions from "./components/PracticeQuestions";
import { panel, primary, secondary, statusLabels } from "./practiceUi";
export default function PracticeDetailPage() {
  const { practiceId } = useParams();
  return <Detail key={practiceId} id={practiceId!} />;
}
function Detail({ id }: { id: string }) {
  const role = getCurrentUser()?.role;
  const [practice, setPractice] = useState<Practice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);
  const pending = useRef(false);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    getPractice(id)
      .then((p) => {
        if (active) setPractice(p);
      })
      .catch((e) => {
        if (active)
          setError(
            e instanceof ApiError ? e.message : "دریافت تمرین ناموفق بود.",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id, revision]);
  async function changeStatus() {
    if (!practice || pending.current) return;
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      await setPracticeStatus(
        id,
        practice.status === "Published" ? "Archived" : "Published",
      );
      setPractice(await getPractice(id));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "تغییر وضعیت ناموفق بود.");
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return (
    <AppLayout
      title={role === "Student" ? "تمرین و مرور" : "بازبینی مجموعهٔ تمرین"}
    >
      <div className="mx-auto max-w-6xl space-y-5" dir="rtl">
        <Link to="/practice" className="text-sm text-gray-500">
          ← بازگشت به تمرین‌ها
        </Link>
        {error && (
          <div
            role="alert"
            className={`${panel} text-rose-700 dark:text-rose-300`}
          >
            {error}
            <button
              className={`${secondary} mr-3`}
              onClick={() => setRevision((n) => n + 1)}
            >
              دریافت دوباره
            </button>
          </div>
        )}
        {loading ? (
          <p role="status">در حال دریافت تمرین…</p>
        ) : (
          practice && (
            <>
              <header className={panel}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="mb-2 text-sm text-brand-600 dark:text-brand-300">
                      {role === "Student"
                        ? "فضای تمرین شما"
                        : "بازبینی پیش از انتشار"}
                    </p>
                    <h1 className="break-words text-2xl font-bold">
                      {practice.title}
                    </h1>
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-gray-500">
                      {practice.description}
                    </p>
                  </div>
                  <span className="rounded-full bg-gray-100 px-3 py-1 text-xs dark:bg-gray-800">
                    {statusLabels[practice.status]}
                  </span>
                </div>
                <p className="mt-4 text-sm text-gray-500">
                  {practice.questionCount.toLocaleString("fa-IR")} سؤال • مدرس:{" "}
                  {practice.instructorName || "بدون نام"} • بدون محدودیت زمان
                </p>
                {role === "Instructor" && (
                  <div className="mt-5 border-t border-gray-100 pt-5 dark:border-gray-800">
                    <p className="mb-3 text-sm leading-7 text-gray-500">
                      گروه‌های مجاز:{" "}
                      {practice.groups.map((g) => g.name).join("، ") ||
                        "هنوز گروهی انتخاب نشده"}
                      {!practice.publishedAt &&
                        " • پس از انتشار، سؤال‌ها برای حفظ سابقه ثابت می‌مانند."}
                    </p>
                    <div className="flex flex-wrap gap-3">
                      <Link to={`/practice/${id}/edit`} className={secondary}>
                        ویرایش مشخصات و دسترسی
                      </Link>
                      <button
                        className={primary}
                        disabled={
                          busy ||
                          (!practice.groups.length &&
                            practice.status !== "Published")
                        }
                        onClick={changeStatus}
                      >
                        {busy
                          ? "در حال ذخیره…"
                          : practice.status === "Published"
                            ? "توقف دسترسی به تمرین"
                            : "انتشار برای گروه‌های انتخاب‌شده"}
                      </button>
                    </div>
                    <p className="mt-3 text-xs text-gray-500">
                      توقف دسترسی، سابقه‌ها را حذف نمی‌کند؛ با انتشار دوباره،
                      دسترسی برمی‌گردد.
                    </p>
                  </div>
                )}
              </header>
              <PracticeQuestions practiceId={id} learner={role === "Student"} />
            </>
          )
        )}
      </div>
    </AppLayout>
  );
}
