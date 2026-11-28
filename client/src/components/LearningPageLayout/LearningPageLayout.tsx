import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import ContentPageHeader from '../ContentPageHeader/ContentPageHeader';

type LearningPageLayoutProps = {
  eyebrow: string;
  title: string;
  description: string;
  icon: LucideIcon;
  actions?: ReactNode;
  children: ReactNode;
};

export default function LearningPageLayout({
  eyebrow,
  title,
  description,
  icon,
  actions,
  children,
}: LearningPageLayoutProps) {
  return (
    <div className="mx-auto max-w-6xl space-y-5" dir="rtl">
      <ContentPageHeader
        icon={icon}
        eyebrow={eyebrow}
        title={title}
        description={description}
        actions={actions}
      />
      <section className="app-panel-card learning-page-panel bg-white p-4 dark:bg-slate-900 sm:p-6">
        {children}
      </section>
    </div>
  );
}
