import { Link } from "react-router-dom";
import { BookOpenCheck, ArrowLeft, Plus } from "lucide-react";
import { getCurrentUser } from "../../api/authApi";
import { getPractices } from "../../api/practiceApi";
import usePagedList from "../../hooks/usePagedList";
import AppLayout from "../../components/AppLayout/AppLayout";
import ListPagination from "../../components/ListPagination/ListPagination";
import { panel, primary, secondary, statusLabels } from "./practiceUi";
export default function PracticePage() {
  const role = getCurrentUser()?.role;
  const learner = role === "Student";
  const list = usePagedList(getPractices);
  return (
    <AppLayout title={learner ? "تمرین‌های من" : "مجموعه‌های تمرین"}>
      <div className="mx-auto max-w-6xl space-y-6" dir="rtl">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="mb-2 text-sm text-brand-600 dark:text-brand-400">
              یادگیری با تکرار
            </p>
            <h1 className="text-2xl font-bold">
              {learner
                ? "هر بار تمرین، یک قدم جلوتر"
                : "تمرین‌های هدفمند برای گروه‌های شما"}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-gray-500 dark:text-gray-400">
              {learner
                ? "بدون محدودیت زمان تمرین کنید، نتیجهٔ هر پاسخ را ببینید و سابقهٔ خود را مرور کنید. این بخش نمرهٔ آزمون ندارد."
                : "سؤال‌ها را از بانک انتخاب کنید و پس از بازبینی، برای گروه‌های خود منتشر کنید. بانک‌ها به‌صورت خودکار در دسترس کارآموز نیستند."}
            </p>
          </div>
          {role === "Instructor" && (
            <Link className={primary} to="/practice/new">
              <Plus size={18} />
              مجموعهٔ تمرین جدید
            </Link>
          )}
        </header>
        <section className={panel}>
          <ListPagination {...list} />
          {list.error ? (
            <div role="alert">
              <p>{list.error}</p>
              <button onClick={list.reload} className={secondary}>
                تلاش مجدد
              </button>
            </div>
          ) : list.loading ? (
            <p role="status" className="py-12 text-center text-gray-500">
              در حال دریافت تمرین‌ها…
            </p>
          ) : !list.items.length ? (
            <div className="py-14 text-center">
              <BookOpenCheck
                size={36}
                className="mx-auto mb-4 text-brand-500"
              />
              <h2 className="font-bold">
                {list.q
                  ? "تمرینی با این نام پیدا نشد"
                  : "هنوز مجموعهٔ تمرینی در این بخش نیست"}
              </h2>
              <p className="mt-3 text-sm text-gray-500">
                {learner
                  ? "تمرین‌هایی که مدرس برای گروه شما فعال کند، اینجا نمایش داده می‌شوند."
                  : "با انتخاب سؤال‌ها و گروه، اولین مجموعه را بسازید."}
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {list.items.map((p) => (
                <article
                  key={p.id}
                  className="flex flex-col rounded-2xl border border-gray-200 p-5 dark:border-gray-700"
                >
                  <div className="mb-4 flex items-center justify-between">
                    <BookOpenCheck size={22} className="text-brand-500" />
                    <span className="rounded-full bg-gray-100 px-3 py-1 text-xs dark:bg-gray-800">
                      {statusLabels[p.status]}
                    </span>
                  </div>
                  <h2 className="break-words text-lg font-bold">{p.title}</h2>
                  <p className="mt-2 line-clamp-2 text-sm leading-7 text-gray-500">
                    {p.description || "تمرین و مرور سؤال‌ها با بازخورد فوری"}
                  </p>
                  <p className="my-4 text-xs text-gray-500">
                    {p.questionCount.toLocaleString("fa-IR")} سؤال • مدرس:{" "}
                    {p.instructorName || "بدون نام"}
                  </p>
                  <Link
                    className={`${secondary} mt-auto`}
                    to={`/practice/${p.id}`}
                  >
                    {learner ? "شروع تمرین و مشاهدهٔ سابقه" : "مشاهده و مدیریت"}
                    <ArrowLeft size={16} />
                  </Link>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </AppLayout>
  );
}
