import ConfirmDeleteModal from '../../../components/Modal/ConfirmDeleteModal';

type Props = { isOpen: boolean; groupName?: string; onConfirm: () => void; onClose: () => void };

export default function DeleteGroupModal({ isOpen, groupName, onConfirm, onClose }: Props) {
  return <ConfirmDeleteModal isOpen={isOpen} title="حذف گروه"
    description={`گروه «${groupName ?? ''}» حذف شود؟ درس‌ها و آزمون‌های متصل برای اعضای این گروه دیگر نمایش داده نمی‌شوند، ولی خودشان حذف نمی‌شوند.`}
    onConfirm={onConfirm} onClose={onClose}/>;
}
