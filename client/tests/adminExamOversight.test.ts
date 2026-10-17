import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import ExamRow from '../src/pages/ExamsPage/components/ExamRow';
import type { Exam } from '../src/api/examApi';
import { navigationItems, roleLabel } from '../src/components/AppLayout/navigationItems';
import { routes } from '../src/routes/routeConfig';
const exam: Exam = { id: 'a', title: 'آزمون زبان', category: 'General', groupIds: [], date: '2030-01-01', participants: 3, status: 'upcoming', durationMinutes: 30, allowReview: true, instructor: { id: 'teacherA', name: null, username: 'teacherA' } };
const noop = () => {};
const props = { exam, canManage: false, participantCount: 3, onTake: noop, onOpenQuestions: noop, onEdit: noop, onDelete: noop, onPublish: noop, onUnpublish: noop };
test('senior user sees teacher, participant count and inspection without exam mutations or participation', () => {
  const html = renderToString(createElement(ExamRow, { ...props, isObserver: true }));
  assert.match(html, /teacherA/); assert.match(html, /۳/); assert.match(html, /مشاهده سؤال‌ها/);
  for (const text of ['شروع آزمون', 'ویرایش', 'حذف', 'انتشار آزمون']) assert.ok(!html.includes(text));
  const named = renderToString(createElement(ExamRow, { ...props, isObserver: true, exam: { ...exam, instructor: { id: 'A', name: 'مدرس الف', username: 'teacherA' } } }));
  assert.match(named, /مدرس الف/);
});
test('only student participation is exposed; teacher retains management', () => {
  assert.match(renderToString(createElement(ExamRow, { ...props, canTake: true })), /شروع آزمون/);
  const html = renderToString(createElement(ExamRow, { ...props, canManage: true }));
  assert.match(html, /ویرایش/); assert.doesNotMatch(html, /شروع آزمون/);
  assert.deepEqual(routes.find(route => route.path === '/exams/:examId/take')?.allowedRoles, ['Student']);
});
test('senior navigation emphasizes supervision and hides student/teacher activity menus', () => {
  assert.equal(roleLabel.SuperAdmin, 'کاربر ارشد');
  const entries = navigationItems.filter(item => item.roles.includes('SuperAdmin'));
  for (const path of ['/practice', '/question-banks', '/groups', '/lessons', '/my-results']) assert.ok(!entries.some(item => item.to === path));
  for (const path of ['/dashboard', '/exams', '/instructors', '/reports']) assert.ok(entries.some(item => item.to === path));
});

test('oversight search combines teacher/title with status and retains unnamed teachers', async () => {
  const { filterOversightExams } = await import('../src/pages/ExamsPage/components/ExamOversightFilters');
  const other = { ...exam, id: 'b', title: 'آزمون ریاضی', status: 'draft' as const, instructor: { id: 'b', name: 'مدرس ب', username: null } };
  assert.deepEqual(filterOversightExams([exam, other], 'teacherA', '').map(item => item.id), ['a']);
  assert.deepEqual(filterOversightExams([exam, other], 'مدرس ب', 'draft').map(item => item.id), ['b']);
  assert.equal(filterOversightExams([exam, other], 'مدرس ب', 'upcoming').length, 0);
});
