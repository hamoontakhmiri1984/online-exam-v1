import usePagedCrud from './usePagedCrud';
import {
  createQuestionBank, deleteQuestionBank, getQuestionBanksPage, updateQuestionBank,
  type QuestionBank, type QuestionBankInput,
} from '../api/questionBankApi';

export default function useQuestionBanks() {
  const list = usePagedCrud<QuestionBank, QuestionBankInput>({
    getPage: getQuestionBanksPage,
    add: createQuestionBank, update: updateQuestionBank, remove: deleteQuestionBank,
  });
  return { ...list, banks: list.items, addBank: list.addItem, updateBank: list.updateItem,
    deleteBank: list.deleteItem, patchBank: list.patchItem };
}
