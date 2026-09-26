import { FileQuestion } from 'lucide-react';

import Spinner from '../../../../components/Spinner/Spinner';
import EmptyState from '../../../../components/EmptyState/EmptyState';
import BankQuestionCard from '../BankQuestionCard/BankQuestionCard';

import type { BankQuestion } from '../../../../api/questionBankApi';

type BankQuestionListProps = {
  questions: BankQuestion[];
  loading: boolean;
  onEdit: (question: BankQuestion) => void;
  onDelete: (question: BankQuestion) => void;
};

function BankQuestionList({
  questions,
  loading,
  onEdit,
  onDelete,
}: BankQuestionListProps) {
  if (loading) return <Spinner />;

  if (questions.length === 0) {
    return (
      <EmptyState
        icon={FileQuestion}
        title="هنوز سوالی وجود ندارد"
        description="اولین سوال این بانک را اضافه کن."
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {questions.map((question, index) => (
        <BankQuestionCard
          key={question.id}
          question={question}
          order={index + 1}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}

export default BankQuestionList;