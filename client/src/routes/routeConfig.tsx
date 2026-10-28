import React, { type ComponentType } from 'react';

import type { Role } from '../api/authApi';
import { MANAGEMENT_ROLES } from '../constants/roles';

export type RouteConfig = {
  path: string;
  Component: ComponentType;
  protected?: boolean;
  allowedRoles?: Role[];
  skipOnboardingGate?: boolean;
};

const SupportPage = React.lazy(() => import('../pages/SupportPage/SupportPage'));

const LandingPage = React.lazy(() => import('../pages/LandingPage/LandingPage'));

const LoginPage = React.lazy(() => import('../pages/LoginPage/LoginPage'));

const SignupPage = React.lazy(() => import('../pages/SignupPage/SignupPage'));

const ForgotPasswordPage = React.lazy(() =>
  import('../pages/ForgotPasswordPage/ForgotPasswordPage')
);

const DashboardPage = React.lazy(() =>
  import('../pages/DashboardPage/DashboardPage')
);

const OnboardingPage = React.lazy(() =>
  import('../pages/OnboardingPage/OnboardingPage')
);

const ExamsPage = React.lazy(() => import('../pages/ExamsPage/ExamsPage'));

const ExamRunnerPage = React.lazy(() =>
  import('../pages/ExamRunnerPage/ExamRunnerPage')
);

const ExamReviewPage = React.lazy(() =>
  import('../pages/ExamReviewPage/ExamReviewPage')
);

const ExamEventsPage = React.lazy(() =>
  import('../pages/ExamEventsPage/ExamEventsPage')
);

const PracticePage = React.lazy(() => import('../pages/PracticePage/PracticePage'));
const PracticeEditorPage = React.lazy(() => import('../pages/PracticePage/PracticeEditorPage'));
const PracticeDetailPage = React.lazy(() => import('../pages/PracticePage/PracticeDetailPage'));
const QuestionsPage = React.lazy(() =>
  import('../pages/QuestionsPage/QuestionsPage')
);

const QuestionBanksPage = React.lazy(() =>
  import('../pages/QuestionBanksPage/QuestionBanksPage')
);

const QuestionBankDetailsPage = React.lazy(() =>
  import('../pages/QuestionBanksPage/QuestionBankDetailsPage')
);

const StudentsPage = React.lazy(() => import('../pages/StudentsPage/StudentsPage'));

const LessonsPage = React.lazy(() => import('../pages/LessonsPage/LessonsPage'));

const GroupLessonsPage = React.lazy(() =>
  import('../pages/GroupLessonsPage/GroupLessonsPage')
);

const ReportsPage = React.lazy(() => import('../pages/ReportsPage/ReportsPage'));

const MyResultsPage = React.lazy(() =>
  import('../pages/MyResultsPage/MyResultsPage')
);

const SettingsPage = React.lazy(() => import('../pages/SettingsPage/SettingsPage'));

const GroupsPage = React.lazy(() => import('../pages/GroupsPage/GroupsPage'));

const PlansPage = React.lazy(() => import('../pages/PlansPage/PlansPage'));

const InstructorApprovalsPage = React.lazy(() =>
  import('../pages/InstructorApprovalsPage/InstructorApprovalsPage')
);

const AdminCategoriesPage = React.lazy(() =>
  import('../pages/AdminCategoriesPage/AdminCategoriesPage')
);

const AdminInstructorsPage = React.lazy(() => import('../pages/AdminInstructorsPage/AdminInstructorsPage'));
const AdminInstructorDetailPage = React.lazy(() => import('../pages/AdminInstructorsPage/AdminInstructorDetailPage'));

const InstructorStudentsPage = React.lazy(() =>
  import('../pages/AdminStudentsPage/AdminStudentsPage')
);

const AdminSiteContentPage = React.lazy(() =>
  import('../pages/AdminSiteContentPage/AdminSiteContentPage')
);

const AdminBlogPostsPage = React.lazy(() =>
  import('../pages/AdminBlogPostsPage/AdminBlogPostsPage')
);

const AdminBlogPostEditorPage = React.lazy(() =>
  import('../pages/AdminBlogPostEditorPage/AdminBlogPostEditorPage')
);

const BlogPage = React.lazy(() => import('../pages/BlogPage/BlogPage'));

const BlogPostPage = React.lazy(() => import('../pages/BlogPage/BlogPostPage'));

const SubscriptionsPage = React.lazy(() => import('../pages/AdminManagementPage/SubscriptionsPage'));
const PaymentsPage = React.lazy(() => import('../pages/AdminManagementPage/PaymentsPage'));
const EventsPage = React.lazy(() => import('../pages/AdminManagementPage/EventsPage'));
const GroupApprovalsPage = React.lazy(() => import('../pages/AdminManagementPage/GroupApprovalsPage'));

export const routes: RouteConfig[] = [
  { path: '/support', Component: SupportPage, protected: true },
  { path: '/subscriptions', Component: SubscriptionsPage, protected: true, allowedRoles: ['SuperAdmin'] },
  { path: '/payments', Component: PaymentsPage, protected: true, allowedRoles: ['SuperAdmin'] },
  { path: '/admin-events', Component: EventsPage, protected: true, allowedRoles: ['SuperAdmin'] },
  { path: '/group-approvals', Component: GroupApprovalsPage, protected: true, allowedRoles: ['SuperAdmin'] },

  { path: '/instructors', Component: AdminInstructorsPage, protected: true, allowedRoles: ['SuperAdmin'] },
  { path: '/instructors/:instructorId', Component: AdminInstructorDetailPage, protected: true, allowedRoles: ['SuperAdmin'] },
  {
    path: '/',
    Component: LandingPage,
  },
  {
    path: '/blog',
    Component: BlogPage,
  },
  {
    path: '/blog/:slug',
    Component: BlogPostPage,
  },
  {
    path: '/login',
    Component: LoginPage,
  },
  {
    path: '/signup',
    Component: SignupPage,
  },
  {
    path: '/forgot-password',
    Component: ForgotPasswordPage,
  },
  {
    path: '/dashboard',
    Component: DashboardPage,
    protected: true,
  },
  {
    path: '/onboarding',
    Component: OnboardingPage,
    protected: true,
    skipOnboardingGate: true,
  },
  { path: '/practice', Component: PracticePage, protected: true },
  { path: '/practice/new', Component: PracticeEditorPage, protected: true, allowedRoles: ['Instructor'] },
  { path: '/practice/:practiceId/edit', Component: PracticeEditorPage, protected: true, allowedRoles: ['Instructor'] },
  { path: '/practice/:practiceId', Component: PracticeDetailPage, protected: true },
  {
    path: '/exams',
    Component: ExamsPage,
    protected: true,
  },
  {
    path: '/exams/:examId/take',
    Component: ExamRunnerPage,
    protected: true,
    allowedRoles: ['Student'],
  },
  {
    path: '/exams/:examId/review',
    Component: ExamReviewPage,
    protected: true,
    allowedRoles: ['Student'],
  },
  {
    path: '/exams/:examId/events',
    Component: ExamEventsPage,
    protected: true,
    allowedRoles: MANAGEMENT_ROLES,
  },
  {
    path: '/exams/:examId/questions',
    Component: QuestionsPage,
    protected: true,
    allowedRoles: MANAGEMENT_ROLES,
  },
  {
    path: '/question-banks',
    Component: QuestionBanksPage,
    protected: true,
    allowedRoles: MANAGEMENT_ROLES,
  },
  {
    path: '/question-banks/:bankId',
    Component: QuestionBankDetailsPage,
    protected: true,
    allowedRoles: MANAGEMENT_ROLES,
  },
  {
    path: '/students',
    Component: StudentsPage,
    protected: true,
    allowedRoles: ['Instructor'],
  },
  {
    path: '/lessons',
    Component: LessonsPage,
    protected: true,
  },
  {
    path: '/lessons/:groupId',
    Component: GroupLessonsPage,
    protected: true,
  },
  {
    path: '/reports',
    Component: ReportsPage,
    protected: true,
    allowedRoles: ['SuperAdmin'],
  },
  {
    path: '/my-results',
    Component: MyResultsPage,
    protected: true,
    allowedRoles: ['Student'],
  },
  {
    path: '/settings',
    Component: SettingsPage,
    protected: true,
  },
  {
    path: '/groups',
    Component: GroupsPage,
    protected: true,
    allowedRoles: MANAGEMENT_ROLES,
  },
  {
    path: '/plans',
    Component: PlansPage,
    protected: true,
    allowedRoles: ['Instructor'],
  },
  {
    path: '/instructor-approvals',
    Component: InstructorApprovalsPage,
    protected: true,
    allowedRoles: ['SuperAdmin'],
  },
  {
    path: '/categories',
    Component: AdminCategoriesPage,
    protected: true,
    allowedRoles: ['SuperAdmin'],
  },
  {
    path: '/instructor-students',
    Component: InstructorStudentsPage,
    protected: true,
    allowedRoles: ['SuperAdmin'],
  },
  {
    path: '/site-content',
    Component: AdminSiteContentPage,
    protected: true,
    allowedRoles: ['SuperAdmin'],
  },
  {
    path: '/blog-posts',
    Component: AdminBlogPostsPage,
    protected: true,
    allowedRoles: ['SuperAdmin'],
  },
  {
    path: '/blog-posts/new',
    Component: AdminBlogPostEditorPage,
    protected: true,
    allowedRoles: ['SuperAdmin'],
  },
  {
    path: '/blog-posts/:id',
    Component: AdminBlogPostEditorPage,
    protected: true,
    allowedRoles: ['SuperAdmin'],
  },
];