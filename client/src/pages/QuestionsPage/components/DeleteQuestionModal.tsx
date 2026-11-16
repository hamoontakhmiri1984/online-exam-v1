import ConfirmDeleteModal from '../../../components/Modal/ConfirmDeleteModal';

type Props = { isOpen: boolean; busy?: boolean; error?: string; onConfirm: () => void; onClose: () => void };

export default function DeleteQuestionModal({ isOpen, busy, error, onConfirm, onClose }: Props) {
  return <ConfirmDeleteModal isOpen={isOpen} title="حذف سؤال"
    description="آیا از حذف این سؤال مطمئن هستید؟"
    busy={busy} error={error} onConfirm={onConfirm} onClose={onClose}/>;
}
