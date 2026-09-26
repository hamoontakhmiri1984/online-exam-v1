import { lazy, type ComponentType } from 'react';

import type { Role } from '../api/authApi';
import { MANAGEMENT_ROLES } from '../constants/roles';

export type RouteConfig = {
  path: string;
  Component: ComponentType;
  protected?: boolean;
  allowedRoles?: Role[];
  skipOnboardingGate?: boolean;
};

const LandingPage = lazy(() => import('../pages/LandingPage/LandingPage'));

const LoginPage = lazy(() => import('../pages/LoginPage/LoginPage'));

const SignupPage = lazy(() => import('../pages/SignupPage/SignupPage'));

const ForgotPasswordPage = lazy(() =>
  import('../pages/ForgotPasswordPage/ForgotPasswordPage')
);

const DashboardPage = lazy(() =>
  import('../pages/DashboardPage/DashboardPage')
);

const OnboardingPage = lazy(() =>
  import('../pages/OnboardingPage/OnboardingPage')
);

const ExamsPage = lazy(() => import('../pages/ExamsPage/ExamsPage'));

const ExamRunnerPage = lazy(() =>
  import('../pages/ExamRunnerPage/ExamRunnerPage')
);

const ExamReviewPage = lazy(() =>
  import('../pages/ExamReviewPage/ExamReviewPage')
);

const QuestionsPage = lazy(() =>
  import('../pages/QuestionsPage/QuestionsPage')
);

const QuestionBanksPage = lazy(() =>
  import('../pages/QuestionBanksPage/QuestionBanksPage')
);

const QuestionBankDetailsPage = lazy(() =>
  import('../pages/QuestionBanksPage/QuestionBankDetailsPage')
);

const StudentsPage = lazy(() => import('../pages/StudentsPage/StudentsPage'));

const LessonsPage = lazy(() => import('../pages/LessonsPage/LessonsPage'));

const GroupLessonsPage = lazy(() =>
  import('../pages/GroupLessonsPage/GroupLessonsPage')
);

const ReportsPage = lazy(() => import('../pages/ReportsPage/ReportsPage'));

const MyResultsPage = lazy(() =>
  import('../pages/MyResultsPage/MyResultsPage')
);

const SettingsPage = lazy(() => import('../pages/SettingsPage/SettingsPage'));

const GroupsPage = lazy(() => import('../pages/GroupsPage/GroupsPage'));

const PlansPage = lazy(() => import('../pages/PlansPage/PlansPage'));

const InstructorApprovalsPage = lazy(() =>
  import('../pages/InstructorApprovalsPage/InstructorApprovalsPage')
);

const AdminCategoriesPage = lazy(() =>
  import('../pages/AdminCategoriesPage/AdminCategoriesPage')
);

const InstructorStudentsPage = lazy(() =>
  import('../pages/InstructorStudentsPage/InstructorStudentsPage')
);

const AdminSiteContentPage = lazy(() =>
  import('../pages/AdminSiteContentPage/AdminSiteContentPage')
);

const AdminBlogPostsPage = lazy(() =>
  import('../pages/AdminBlogPostsPage/AdminBlogPostsPage')
);

const AdminBlogPostEditorPage = lazy(() =>
  import('../pages/AdminBlogPostEditorPage/AdminBlogPostEditorPage')
);

const BlogPage = lazy(() => import('../pages/BlogPage/BlogPage'));

const BlogPostPage = lazy(() => import('../pages/BlogPage/BlogPostPage'));

export const routes: RouteConfig[] = [
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
  {
    path: '/exams',
    Component: ExamsPage,
    protected: true,
  },
  {
    path: '/exams/:examId/take',
    Component: ExamRunnerPage,
    protected: true,
  },
  {
    path: '/exams/:examId/review',
    Component: ExamReviewPage,
    protected: true,
    allowedRoles: ['Student'],
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