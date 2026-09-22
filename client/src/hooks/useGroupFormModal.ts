import { useState } from 'react';
import type { Group } from '../api/groupApi';
import type { Category } from '../constants/categories';

type GroupInput = Omit<Group, 'id' | 'joinCode'>;

type UseGroupFormModalParams = {
  instructorId: string;
  addItem: (input: GroupInput) => Promise<unknown>;
  updateItem: (id: string, input: GroupInput) => Promise<unknown>;
};

function useGroupFormModal({
  instructorId,
  addItem,
  updateItem,
}: UseGroupFormModalParams) {
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [category, setCategory] = useState<Category | ''>('');
  const [studentIds, setStudentIds] = useState<string[]>([]);
  const [validationError, setValidationError] = useState<string | null>(null);

  function openAdd() {
    setEditingId(null);
    setName('');
    setCategory('');
    setStudentIds([]);
    setIsOpen(true);
  }

  function openEdit(group: Group) {
    setEditingId(group.id);
    setName(group.name);
    setCategory(group.category);
    setStudentIds(group.studentIds);
    setIsOpen(true);
  }

  function close() {
    setIsOpen(false);
  }

  function toggleStudent(studentId: string) {
    setStudentIds((prev) =>
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId]
    );
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (!name.trim() || !category) {
      setValidationError('لطفاً نام گروه و دسته‌بندی را مشخص کنید');
      return;
    }

    const groupData: GroupInput = {
      name: name.trim(),
      category,
      instructorId,
      studentIds,
    };

    const saved = editingId
      ? await updateItem(editingId, groupData)
      : await addItem(groupData);

    // useCrud/هوک صفحه موقع خطا پیام رو تو Toast نشون می‌ده و undefined برمی‌گردونه؛
    // تو اون حالت مودال باز می‌مونه تا اطلاعات واردشده از بین نره
    if (saved) {
      setIsOpen(false);
    }
  }

  return {
    isOpen,
    editingId,
    name,
    setName,
    category,
    setCategory,
    studentIds,
    toggleStudent,
    validationError,
    dismissValidationError: () => setValidationError(null),
    openAdd,
    openEdit,
    close,
    handleSubmit,
  };
}

export default useGroupFormModal;
