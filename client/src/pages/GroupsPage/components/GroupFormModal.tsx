import Modal from '../../../components/Modal/Modal';
import type { Category } from '../../../constants/categories';
import type { Student } from '../../../api/studentApi';
import CategorySelect from '../../../components/CategorySelect/CategorySelect';

type GroupFormModalProps = {
  isOpen: boolean;
  isEditing: boolean;
  name: string;
  onNameChange: (value: string) => void;
  category: Category | '';
  onCategoryChange: (value: Category) => void;
  students: Student[];
  studentIds: string[];
  onToggleStudent: (studentId: string) => void;
  onSubmit: (event: React.FormEvent) => void;
  onClose: () => void;
};

function GroupFormModal({
  isOpen,
  isEditing,
  name,
  onNameChange,
  category,
  onCategoryChange,
  students,
  studentIds,
  onToggleStudent,
  onSubmit,
  onClose,
}: GroupFormModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <h2 className="text-lg font-bold mb-4 dark:text-white">
        {isEditing ? 'ویرایش گروه' : 'گروه جدید'}
      </h2>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-sm text-gray-600 dark:text-gray-300">
            نام گروه
          </label>
          <input
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            className="border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-50 dark:focus:ring-brand-900 transition"
            placeholder="مثلاً: کلاس ریاضی - ترم پاییز"
          />
        </div>

        <CategorySelect
          label="دسته‌بندی موضوعی"
          value={category}
          onChange={(value) => onCategoryChange(value as Category)}
        />

        <div className="flex flex-col gap-2">
          <label className="text-sm text-gray-600 dark:text-gray-300">
            اعضای گروه ({studentIds.length.toLocaleString('fa-IR')} نفر
            انتخاب‌شده)
          </label>
          <div className="max-h-52 overflow-y-auto rounded-xl border border-gray-200 dark:border-gray-700">
            {students.length === 0 ? (
              <p className="p-4 text-center text-sm text-gray-400">
                هنوز دانشجویی ثبت نشده
              </p>
            ) : (
              students.map((student) => (
                <label
                  key={student.id}
                  className="flex cursor-pointer items-center gap-3 border-b border-gray-100 px-4 py-2.5 text-sm last:border-0 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800/50"
                >
                  <input
                    type="checkbox"
                    checked={studentIds.includes(student.id)}
                    onChange={() => onToggleStudent(student.id)}
                    className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-400 dark:border-gray-600"
                  />
                  <span className="text-gray-700 dark:text-gray-200">
                    {student.name}
                  </span>
                  <span className="mr-auto text-xs text-gray-400">
                    {student.username}
                  </span>
                </label>
              ))
            )}
          </div>
        </div>

        <button
          type="submit"
          className="w-full bg-brand-600 text-white font-medium px-4 py-2.5 rounded-xl hover:bg-brand-700 transition"
        >
          {isEditing ? 'ذخیره تغییرات' : 'ساخت گروه'}
        </button>
      </form>
    </Modal>
  );
}

export default GroupFormModal;