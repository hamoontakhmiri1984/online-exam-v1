import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { addQuestion, addQuestionsBulk, addQuestionsFromBank } from '../src/api/questionApi';
import QuestionSources from '../src/pages/QuestionsPage/components/QuestionSources';
import QuestionCard from '../src/pages/QuestionsPage/components/QuestionCard';
import QuestionFormModal from '../src/pages/QuestionsPage/components/QuestionFormModal';
import QuestionsPage from '../src/pages/QuestionsPage/QuestionsPage';
import { routes } from '../src/routes/routeConfig';

const question = { id: 'q1', examId: 'exam1', text: 'سؤال مستقیم', options: ['اول', 'دوم'], correctOptionIndex: 1 };

test('exam question route loads the exam editor instead of the bank directory', async () => {
  const route = routes.find(item => item.path === '/exams/:examId/questions');
  assert.ok(route?.protected);
  // Exercise the actual lazy module used by the router, not a source-text match.
  const lazy = route!.Component as unknown as { _init: (payload: unknown) => unknown; _payload: unknown };
  let component: unknown;
  try { component = lazy._init(lazy._payload); } catch (pending) {
    await pending;
    component = lazy._init(lazy._payload);
  }
  assert.equal(component, QuestionsPage);
});

test('manual and bulk questions need only an exam; bank import preserves source IDs', async () => {
  const original = globalThis.fetch;
  const requests: { path: string; body: unknown }[] = [];
  globalThis.fetch = (async (input, init) => {
    requests.push({ path: new URL(String(input)).pathname, body: JSON.parse(String(init?.body)) });
    return new Response(JSON.stringify(question), { status: 201 });
  }) as typeof fetch;
  try {
    await addQuestion(question);
    await addQuestionsBulk([question]);
    await addQuestionsFromBank('exam1', ['bank-question-2']);
    const body = { text: question.text, options: question.options, correctOptionIndex: 1 };
    assert.deepEqual(requests, [
      { path: '/exams/exam1/questions', body },
      { path: '/exams/exam1/questions/bulk', body: [body] },
      { path: '/exams/exam1/questions/from-bank', body: { questionIds: ['bank-question-2'] } },
    ]);
  } finally { globalThis.fetch = original; }
});

test('three visible source actions are independent and bank creation is never required', () => {
  const calls: string[] = [];
  const props = { onManual: () => calls.push('manual'), onExcel: () => calls.push('excel'), onBank: () => calls.push('bank') };
  const tree = QuestionSources(props);
  for (const button of tree.props.children) button.props.onClick();
  assert.deepEqual(calls, ['manual', 'excel', 'bank']);
  const html = renderToString(createElement(QuestionSources, props));
  for (const label of ['نوشتن سؤال', 'ورود از اکسل', 'انتخاب از بانک سؤال']) assert.ok(html.includes(label));
  assert.ok(html.includes('اختیاری'));
});

test('read-only exam questions expose answers but no mutation controls', () => {
  const html = renderToString(createElement(QuestionCard, { question, index: 0, canEdit: false, onEdit: () => {}, onDelete: () => {} }));
  assert.ok(html.includes('پاسخ صحیح'));
  assert.ok(html.includes('دوم'));
  assert.doesNotMatch(html, /<button/);
});

test('failed save remains visible inside the manual question form with entered content', () => {
  const noop = () => {};
  const html = renderToString(createElement(QuestionFormModal, {
    isOpen: true, isEditing: false, isSubmitting: false,
    text: question.text, options: question.options, correctOptionIndex: 1,
    error: 'ذخیره انجام نشد', onTextChange: noop, onCorrectOptionChange: noop,
    onOptionTextChange: noop, onAddOption: noop, onRemoveOption: noop, onSubmit: noop, onClose: noop,
  }));
  assert.ok(html.includes('سؤال مستقیم'));
  assert.ok(html.includes('ذخیره انجام نشد'));
  assert.ok(html.includes('role="alert"'));
});


test('Persian CSV works with and without BOM and real Excel works without any bank', async () => {
  const { parseQuestionsFromExcel } = await import('../src/utils/questionExcel');
  const XLSX = await import('xlsx');
  const csv = 'سوال,گزینه A,گزینه B,پاسخ صحیح\nسؤال از فایل,اول,دوم,B\n';
  for (const prefix of ['', '\uFEFF']) {
    const parsed = await parseQuestionsFromExcel(new File([prefix + csv], 'questions.csv'));
    assert.deepEqual(parsed.questions, [{ text: 'سؤال از فایل', options: ['اول', 'دوم'], correctOptionIndex: 1 }]);
  }
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([
    ['سوال', 'گزینه A', 'گزینه B', 'پاسخ صحیح'], ['سؤال اکسل', 'اول', 'دوم', 'B'],
  ]), 'Questions');
  const parsed = await parseQuestionsFromExcel(new File([XLSX.write(workbook, { type: 'array', bookType: 'xlsx' })], 'questions.xlsx'));
  assert.equal(parsed.questions[0].text, 'سؤال اکسل');
  assert.equal(parsed.questions[0].correctOptionIndex, 1);
});
