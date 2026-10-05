import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { answerPractice, getPracticeQuestions, createPractice } from '../src/api/practiceApi';
import Difficulty from '../src/components/QuestionDifficultyBadge/QuestionDifficultyBadge';
import PracticeAnswerCard from '../src/pages/PracticePage/components/PracticeAnswerCard';
import { routes } from '../src/routes/routeConfig';
import { navigationItems } from '../src/components/AppLayout/navigationItems';

test('practice uses independent routes and editing is restricted to instructors',()=>{
  for(const path of ['/practice/new','/practice/:practiceId/edit'])assert.deepEqual(routes.find(r=>r.path===path)?.allowedRoles,['Instructor']);
  assert.equal(routes.find(r=>r.path==='/practice/:practiceId')?.protected,true);
  assert.ok(navigationItems.find(n=>n.to==='/practice')?.roles.includes('Student'));
  assert.equal(navigationItems.find(n=>n.to==='/question-banks')?.roles.includes('Student'),false);
});
test('difficulty badges include readable labels and different light/dark colors',()=>{
  for(const [difficulty,label,color] of [['Easy','آسان','emerald'],['Medium','متوسط','amber'],['Hard','سخت','rose']] as const){
    const html=renderToString(createElement(Difficulty,{difficulty}));assert.ok(html.includes(label));assert.ok(html.includes(color));assert.ok(html.includes('dark:'));
  }
});
test('practice requests preserve parent, filters, group selection and idempotency without client grading',async()=>{
  const original=globalThis.fetch;const calls:{url:URL;body:unknown}[]=[];
  globalThis.fetch=(async(input,init)=>{calls.push({url:new URL(String(input)),body:init?.body?JSON.parse(String(init.body)):null});return new Response('{}',{status:200});}) as typeof fetch;
  try{
    await getPracticeQuestions('p1',{page:2,q:'جستجو'},{difficulty:'Hard',progress:'mistakes'});
    await createPractice({title:'تمرین',description:'',groupIds:['g1'],questionIds:['q1']});
    await answerPractice('p1','q1','00000000-0000-4000-8000-000000000001',1);
    assert.equal(calls[0].url.pathname,'/practice/p1/questions');assert.equal(calls[0].url.searchParams.get('page'),'2');assert.equal(calls[0].url.searchParams.get('difficulty'),'Hard');assert.equal(calls[0].url.searchParams.get('progress'),'mistakes');
    assert.deepEqual(calls[1].body,{title:'تمرین',description:'',groupIds:['g1'],questionIds:['q1']});
    assert.deepEqual(calls[2].body,{requestId:'00000000-0000-4000-8000-000000000001',selectedOptionIndex:1});
  }finally{globalThis.fetch=original;}
});
test('learner initial card shows options and history counts without revealing a correct answer',()=>{
  const html=renderToString(createElement(PracticeAnswerCard,{practiceId:'p1',question:{id:'q1',text:'متن سؤال',options:['الف','ب'],difficulty:'Medium',position:0,stats:{attempts:3,correct:2,incorrect:1,lastCorrect:false,lastAttemptAt:null}},onSaved:()=>{},onHistory:()=>{}}));
  assert.ok(html.includes('متن سؤال'));assert.ok(html.includes('ثبت پاسخ و دیدن نتیجه'));assert.ok(html.includes('سابقهٔ شما'));assert.ok(!html.includes('✓ پاسخ صحیح'));
});
