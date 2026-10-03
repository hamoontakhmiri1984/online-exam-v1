import usePagedCrud from './usePagedCrud';
import {
  createBankQuestion, deleteBankQuestion, getBankQuestionsPage, updateBankQuestion,
  type BankQuestion, type BankQuestionInput,
} from '../api/questionBankApi';

export default function useBankQuestions(bankId?: string) {
  const id = bankId ?? '';
  const list = usePagedCrud<BankQuestion, BankQuestionInput>({
    getPage: query => getBankQuestionsPage(id, query),
    add: input => createBankQuestion(id, input),
    update: (questionId, input) => updateBankQuestion(id, questionId, input),
    remove: questionId => deleteBankQuestion(id, questionId),
  }, id, Boolean(bankId));
  return { ...list, questions: list.items, addQuestion: list.addItem,
    editQuestion: list.updateItem, removeQuestion: list.deleteItem };
}
