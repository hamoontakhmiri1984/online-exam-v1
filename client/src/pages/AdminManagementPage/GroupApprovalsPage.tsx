import AppLayout from '../../components/AppLayout/AppLayout';
import LearningPageLayout from '../../components/LearningPageLayout/LearningPageLayout';
import { ShieldCheck } from 'lucide-react';
import GroupApprovalQueue from '../SettingsPage/components/GroupApprovalQueue';
const changed = () => {};
export default function GroupApprovalsPage() {
  return (
    <AppLayout title="تأیید گروه‌ها">
      <LearningPageLayout
        eyebrow="درخواست‌ها و رسیدگی"
        title="تأیید گروه‌ها"
        description="درخواست ایجاد گروه را همراه با مشخصات مدرس ثبت‌کننده بررسی کنید."
        icon={ShieldCheck}
      >
        <GroupApprovalQueue onChanged={changed} />
      </LearningPageLayout>
    </AppLayout>
  );
}
