import ConfirmDeleteModal from '../../../components/Modal/ConfirmDeleteModal';

type DeleteExamModalProps = {
  isOpen: boolean;
  examTitle?: string;
  onConfirm: () => void;
  onClose: () => void;
};

export default function DeleteExamModal({ isOpen, examTitle, onConfirm, onClose }: DeleteExamModalProps) {
  return <ConfirmDeleteModal isOpen={isOpen} title="حذف آزمون"
    description={`آزمون «${examTitle ?? ''}» حذف شود؟`}
    onConfirm={onConfirm} onClose={onClose}/>;
}
