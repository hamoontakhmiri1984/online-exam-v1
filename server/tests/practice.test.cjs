const test=require('node:test');
const assert=require('node:assert/strict');
const {randomUUID}=require('node:crypto');
const {withPracticeApi}=require('./helpers/practiceApi.cjs');
const {practiceMemory}=require('./helpers/practiceMemory.cjs');
const input={title:'Practice A',description:'',groupIds:['group-a'],questionIds:['qa']};
async function fixture(t,run){const memory=practiceMemory();await withPracticeApi(t,memory.db,request=>run(request,memory));}
async function create(request,data=input){const r=await request('Instructor:teacher-a','POST','',data);assert.equal(r.status,201,JSON.stringify(r.body));return r.body.id;}
async function publish(request,id){assert.equal((await request('Instructor:teacher-a','POST',`/${id}/status`,{status:'Published'})).status,200);}

test('practice HTTP: anonymous and non-instructor creation fail; foreign groups/questions fail',t=>fixture(t,async r=>{
  assert.equal((await r(null,'GET')).status,401);
  for(const actor of ['Student:student-a','SuperAdmin:admin'])assert.equal((await r(actor,'POST','',input)).status,403);
  for(const data of [{...input,groupIds:['group-b']},{...input,questionIds:['qb']}])assert.equal((await r('Instructor:teacher-a','POST','',data)).status,404);
  assert.equal((await r('Instructor:teacher-a','POST','',{...input,questionIds:['qa','qa']})).status,400);
}));
test('practice HTTP: draft invisible to learners; publishing scopes list, count and detail to groups',t=>fixture(t,async r=>{
  const id=await create(r);
  assert.equal((await r('Student:student-a','GET',`/${id}`)).status,404);
  assert.equal((await r('Instructor:teacher-b','GET',`/${id}`)).status,404);
  await publish(r,id);
  const own=await r('Student:student-a','GET');assert.equal(own.body.total,1);assert.deepEqual(own.body.items[0].groups,[]);
  const other=await r('Student:outsider','GET');assert.equal(other.body.total,0);
  assert.equal((await r('Student:outsider','GET',`/${id}/questions`)).status,404);
  assert.equal((await r('Instructor:teacher-b','POST',`/${id}/status`,{status:'Archived'})).status,404);
}));
test('practice HTTP: answers hidden, grading server-side, retries idempotent, history isolated',t=>fixture(t,async(r,m)=>{
  const id=await create(r);await publish(r,id);
  const q=(await r('Student:student-a','GET',`/${id}/questions`)).body.items[0];
  assert.equal(q.correctOptionIndex,undefined);assert.equal(q.sourceQuestionId,undefined);assert.equal(q.stats.attempts,0);
  const url=`/${id}/questions/${q.id}/answers`,body={requestId:randomUUID(),selectedOptionIndex:1};
  const results=await Promise.all(Array.from({length:5},()=>r('Student:student-a','POST',url,body)));
  for(const result of results){assert.equal(result.status,200);assert.equal(result.body.isCorrect,true);assert.equal(result.body.stats.attempts,1);}
  assert.equal(m.attempts.length,1);
  assert.equal((await r('Student:student-a','POST',url,{...body,selectedOptionIndex:0})).status,409);
  assert.equal((await r('Student:student-a','POST',url,{...body,requestId:randomUUID(),selectedOptionIndex:9})).status,400);
  assert.equal((await r('Student:student-a','POST',url,{...body,requestId:randomUUID(),isCorrect:true})).status,400);
  const wrong=await r('Student:student-a','POST',url,{requestId:randomUUID(),selectedOptionIndex:0});assert.equal(wrong.body.isCorrect,false);assert.deepEqual([wrong.body.stats.attempts,wrong.body.stats.correct,wrong.body.stats.incorrect],[2,1,1]);
  assert.equal((await r('Student:student-b','GET',`/${id}/questions/${q.id}/history`)).body.total,0);
  assert.equal((await r('Student:student-a','GET',`/${id}/questions/${q.id}/history`)).body.total,2);
  assert.equal((await r('Instructor:teacher-a','POST',url,body)).status,403);
}));
test('practice HTTP: snapshots survive source changes; published content immutable; archive keeps history',t=>fixture(t,async(r,m)=>{
  const id=await create(r);await publish(r,id);const q=m.questions[0];
  m.source[0].correctOptionIndex=0;m.source[0].text='Changed source';
  const answer={requestId:randomUUID(),selectedOptionIndex:1};
  assert.equal((await r('Student:student-a','POST',`/${id}/questions/${q.id}/answers`,answer)).body.isCorrect,true);
  assert.equal((await r('Instructor:teacher-a','PUT',`/${id}`,input)).status,409);
  await r('Instructor:teacher-a','POST',`/${id}/status`,{status:'Archived'});
  assert.equal((await r('Student:student-a','POST',`/${id}/questions/${q.id}/answers`,answer)).status,404);
  await publish(r,id);
  assert.equal((await r('Student:student-a','GET',`/${id}/questions/${q.id}/history`)).body.total,1);
  assert.equal((await r('Student:student-a','GET',`/${id}/questions`)).body.items[0].text,'Source A');
}));
test('practice HTTP: paging/filters and parent question IDs cannot bypass access',t=>fixture(t,async r=>{
  const id=await create(r);await publish(r,id);const id2=await create(r);await publish(r,id2);
  const q=(await r('Student:student-a','GET',`/${id}/questions`)).body.items[0];
  assert.equal((await r('Student:student-a','POST',`/${id2}/questions/${q.id}/answers`,{requestId:randomUUID(),selectedOptionIndex:1})).status,404);
  for(const query of ['page=0','pageSize=101','difficulty=Bad','progress=Bad'])assert.equal((await r('Student:student-a','GET',`/${id}/questions?${query}`)).status,400);
  assert.equal((await r('Student:student-a','GET',`/${id}/questions?difficulty=Hard`)).body.total,0);
  assert.equal((await r('Student:student-a','GET',`/${id}/questions?progress=unanswered`)).body.total,1);
  await r('Student:student-a','POST',`/${id}/questions/${q.id}/answers`,{requestId:randomUUID(),selectedOptionIndex:0});
  assert.equal((await r('Student:student-a','GET',`/${id}/questions?progress=unanswered`)).body.total,0);
  assert.equal((await r('Student:student-a','GET',`/${id}/questions?progress=mistakes`)).body.total,1);
}));
test('practice HTTP: empty-group drafts save but cannot publish, and removing membership revokes access',t=>fixture(t,async(r,m)=>{
  const id=await create(r,{...input,groupIds:[]});
  assert.equal((await r('Instructor:teacher-a','POST',`/${id}/status`,{status:'Published'})).status,400);
  assert.equal((await r('Instructor:teacher-a','PUT',`/${id}`,input)).status,200);await publish(r,id);
  m.groups[0].students=[];
  assert.equal((await r('Student:student-a','GET',`/${id}`)).status,404);
}));
