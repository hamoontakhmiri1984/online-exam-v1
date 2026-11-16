import type { ReactNode } from 'react';
import Modal from '../../../components/Modal/Modal';

type Props = { isOpen: boolean; onClose: () => void; label: string; children: ReactNode };

// Questions use the same modal base, focus trap and close treatment as all other editors.
export default function ExamQuestionDialog({ isOpen, onClose, label, children }: Props) {
  return <Modal isOpen={isOpen} onClose={onClose} label={label} wide>{children}</Modal>;
}
