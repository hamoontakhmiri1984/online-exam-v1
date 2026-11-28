import { useState } from 'react';
import type { Group } from '../api/groupApi';
import { GROUP_CARD_DEFAULT_COLOR, type GroupCardColor } from '../constants/groupCardColors';
import type { Category } from '../constants/categories';

type GroupInput = Omit<Group, 'id' | 'joinCode'>;

type UseGroupFormModalParams = {
  instructorId: string;
  isAdmin?: boolean;
  addItem: (input: GroupInput) => Promise<unknown>;
  updateItem: (id: string, input: GroupInput) => Promise<unknown>;
};

function useGroupFormModal({
  instructorId,
  isAdmin = false,
  addItem,
  updateItem,
}: UseGroupFormModalParams) {
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [category, setCategory] = useState<Category | ''>('');
  const [studentIds, setStudentIds] = useState<string[]>([]);
  const [cardColor, setCardColor] = useState<GroupCardColor>(GROUP_CARD_DEFAULT_COLOR);
  const [selectedInstructorId, setSelectedInstructorId] = useState(isAdmin ? '' : instructorId);
  const [validationError, setValidationError] = useState<string | null>(null);

  function openAdd() {
    setEditingId(null);
    setName('');
    setCategory('');
    setStudentIds([]);
    setCardColor(GROUP_CARD_DEFAULT_COLOR);
    setSelectedInstructorId(isAdmin ? '' : instructorId);
    setValidationError(null);
    setIsOpen(true);
  }

  function openEdit(group: Group) {
    setEditingId(group.id);
    setName(group.name);
    setCategory(group.category);
    setStudentIds(group.studentIds);
    setCardColor(group.cardColor ?? GROUP_CARD_DEFAULT_COLOR);
    setSelectedInstructorId(group.instructorId);
    setValidationError(null);
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

    if (name.trim().length < 2 || !category) {
      setValidationError('نام گروه باید حداقل دو حرف باشد و دسته‌بندی انتخاب شود.');
      return;
    }
    if (isAdmin && !selectedInstructorId) {
      setValidationError('مدرس مسئول گروه را انتخاب کنید.');
      return;
    }

    const groupData: GroupInput = {
      name: name.trim(),
      category,
      instructorId: isAdmin ? selectedInstructorId : instructorId,
      studentIds,
      cardColor,
    };

    const saved = editingId
      ? await updateItem(editingId, groupData)
      : await addItem(groupData);

    // Keep the form open when the mutation fails.
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
    cardColor,
    setCardColor,
    selectedInstructorId,
    setSelectedInstructorId,
    validationError,
    dismissValidationError: () => setValidationError(null),
    openAdd,
    openEdit,
    close,
    handleSubmit,
  };
}

export default useGroupFormModal;
