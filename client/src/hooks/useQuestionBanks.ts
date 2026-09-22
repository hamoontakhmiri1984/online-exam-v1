import useCrud from './useCrud';

import {
  createQuestionBank,
  deleteQuestionBank,
  getQuestionBanks,
  updateQuestionBank,
  type QuestionBank,
  type QuestionBankInput,
} from '../api/questionBankApi';

function useQuestionBanks() {
  const {
    items: banks,
    loading,
    error,
    clearError,
    addItem,
    updateItem,
    deleteItem,
    patchItem,
  } = useCrud<QuestionBank, QuestionBankInput>(
    {
      getAll: getQuestionBanks,
      add: createQuestionBank,
      update: updateQuestionBank,
      remove: deleteQuestionBank,
    },
    {
      fetch: 'دریافت بانک‌های سوال با خطا مواجه شد',
      add: 'ساخت بانک سوال با خطا مواجه شد',
      update: 'ویرایش بانک سوال با خطا مواجه شد',
      remove: 'حذف بانک سوال با خطا مواجه شد',
    },
  );

  return {
    banks,
    loading,
    error,
    clearError,
    addBank: addItem,
    updateBank: updateItem,
    deleteBank: deleteItem,
    patchBank: patchItem,
  };
}

export default useQuestionBanks;