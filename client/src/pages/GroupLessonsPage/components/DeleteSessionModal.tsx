import ConfirmDeleteModal from '../../../components/Modal/ConfirmDeleteModal';

type DeleteSessionModalProps = {
  isOpen: boolean;
  sessionTitle?: string;
  onConfirm: () => void;
  onClose: () => void;
};

export default function DeleteSessionModal({ isOpen, sessionTitle, onConfirm, onClose }: DeleteSessionModalProps) {
  return <ConfirmDeleteModal isOpen={isOpen} title="حذف جلسه"
    description={`جلسه «${sessionTitle ?? ''}» حذف شود؟`}
    onConfirm={onConfirm} onClose={onClose}/>;
}
