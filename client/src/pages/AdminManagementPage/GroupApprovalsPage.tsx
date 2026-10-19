import AppLayout from '../../components/AppLayout/AppLayout';
import PageHeader from '../../components/PageHeader/PageHeader';
import GroupApprovalQueue from '../SettingsPage/components/GroupApprovalQueue';
const changed = () => {};
export default function GroupApprovalsPage() {
  return (
    <AppLayout title="تأیید گروه‌ها">
      <PageHeader
        title="تأیید گروه‌ها"
        description="بررسی درخواست ایجاد گروه، با مشخصات مدرس ثبت‌کننده"
      />
      <GroupApprovalQueue onChanged={changed} />
    </AppLayout>
  );
}
