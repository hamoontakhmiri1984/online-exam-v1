import { BookOpen, BookOpenCheck, Layers } from 'lucide-react';
import type { ReactNode } from 'react';
import './LearningContentCard.css';

type LearningContentCardProps = {
  kind: 'bank' | 'practice';
  title: string;
  description: string;
  questionCount: number;
  status?: ReactNode;
  metadata?: ReactNode;
  children: ReactNode;
};

export default function LearningContentCard({
  kind, title, description, questionCount, status, metadata, children,
}: LearningContentCardProps) {
  const Icon = kind === 'bank' ? BookOpen : BookOpenCheck;

  return (
    <article className={`learning-content-card learning-content-card--${kind}`}>
      <div className="learning-content-card-header">
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
          <span className="learning-content-card-icon"><Icon size={18} aria-hidden="true" /></span>
          <span>{kind === 'bank' ? 'بانک سؤال' : 'مجموعه تمرین'}</span>
          {status}
        </div>
        <div className="learning-content-card-art" aria-hidden="true"><span /><span /><span /><span /></div>
        <h2 className="mt-3 text-base font-bold [overflow-wrap:anywhere]"><bdi>{title}</bdi></h2>
        <p className="mt-1 line-clamp-2 text-xs leading-6 [overflow-wrap:anywhere]">{description}</p>
      </div>
      <div className="learning-content-card-meta">
        <span className="inline-flex items-center gap-1.5">
          <Layers size={14} aria-hidden="true" />
          <strong>{questionCount.toLocaleString('fa-IR')}</strong> سؤال
        </span>
        {metadata}
      </div>
      <div className="learning-content-card-actions">{children}</div>
    </article>
  );
}
