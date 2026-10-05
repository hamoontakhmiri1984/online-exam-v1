const test=require('node:test');const assert=require('node:assert/strict');
const {withApprovalApi}=require('./helpers/approvalPolicyApi.cjs');
const {approvalMemory}=require('./helpers/approvalPolicyMemory.cjs');
const admin='SuperAdmin:admin';
const url='/admin/approval-policy';
const update={revision:0,requireInstructorApproval:false,requireGroupApproval:false,pendingInstructors:'keep',pendingGroups:'keep'};
async function fixture(t,run){const m=approvalMemory();await withApprovalApi(t,m.db,(r,load)=>run(r,m,load));}
test('approval HTTP: only SuperAdmin can read or change policy and review queue',t=>fixture(t,async r=>{
  for(const actor of [null,'Student:student','Instructor:owner']){
    for(const path of [url,'/admin/group-approvals'])assert.equal((await r(actor,'GET',path)).status,actor?403:401);
    assert.equal((await r(actor,'PUT',url,update)).status,actor?403:401);
    assert.equal((await r(actor,'POST','/admin/group-approvals/waiting-group/decision',{status:'Approved',expectedStatus:'Pending'})).status,actor?403:401);
  }
}));
test('approval HTTP: independent toggles preserve approved/rejected and require explicit pending choice',t=>fixture(t,async(r,m)=>{
  const first=await r(admin,'GET',url);assert.equal(first.body.pendingInstructors,1);assert.equal(first.body.requireGroupApproval,false);
  assert.equal((await r(admin,'PUT',url,{revision:0,requireInstructorApproval:false,requireGroupApproval:true})).status,400);
  const saved=await r(admin,'PUT',url,{...update,requireGroupApproval:true});assert.equal(saved.status,200);assert.equal(saved.body.revision,1);
  assert.equal(m.users.find(x=>x.id==='waiting').approvalStatus,'Pending');assert.equal(m.groups[0].approvalStatus,'Approved');
  assert.equal((await r(admin,'PUT',url,update)).status,409);
  assert.equal((await r(admin,'PUT',url,{...update,revision:1,pendingInstructors:'approve',pendingGroups:'approve'})).status,200);
  assert.equal(m.users.find(x=>x.id==='waiting').approvalStatus,'Approved');assert.equal(m.users.find(x=>x.id==='rejected').approvalStatus,'Rejected');
  assert.equal(m.groups.find(x=>x.id==='waiting-group').approvalStatus,'Approved');assert.equal(m.groups.find(x=>x.id==='rejected-group').approvalStatus,'Rejected');
  assert.equal(m.audits.length,2);assert.equal(m.audits[1].after.approvedInstructors,1);
}));
test('approval HTTP: failure to audit rolls back policy and mass approvals',t=>fixture(t,async(r,m)=>{
  m.failAudit();assert.equal((await r(admin,'PUT',url,{...update,pendingInstructors:'approve',pendingGroups:'approve'})).status,500);
  assert.equal(m.policy.revision,0);assert.equal(m.users.find(x=>x.id==='waiting').approvalStatus,'Pending');assert.equal(m.groups[1].approvalStatus,'Pending');
}));
test('approval HTTP: group creation obeys policy; pending is visible to owner but cannot join',t=>fixture(t,async(r,m)=>{
  m.policy.requireGroupApproval=true;
  const created=await r('Instructor:owner','POST','/groups',{name:'New group',category:'General',studentIds:[]});assert.equal(created.status,201,JSON.stringify(created.body));assert.equal(created.body.approvalStatus,'Pending');
  assert.equal((await r('Instructor:owner','GET','/groups/'+created.body.id)).status,200);
  assert.equal((await r('Student:student','POST','/groups/join',{joinCode:'WAIT123'})).status,403);
  assert.equal((await r('Student:student','GET','/groups/waiting-group')).status,403);
  const list=await r('Student:student','GET','/groups');assert.deepEqual(list.body.items.map(x=>x.id),['old']);
  m.policy.requireGroupApproval=false;
  assert.equal((await r('Instructor:owner','POST','/groups',{name:'Free group',category:'General',studentIds:[]})).body.approvalStatus,'Approved');
}));
test('approval HTTP: review is idempotent, stale decisions conflict, active groups cannot be rejected',t=>fixture(t,async(r,m)=>{
  const path='/admin/group-approvals/waiting-group/decision';const body={status:'Approved',expectedStatus:'Pending'};
  assert.equal((await r(admin,'POST',path,body)).status,200);assert.equal((await r(admin,'POST',path,body)).status,200);assert.equal(m.audits.length,1);
  assert.equal((await r(admin,'POST',path,{status:'Rejected',expectedStatus:'Pending'})).status,409);
  assert.equal((await r(admin,'POST','/admin/group-approvals/missing/decision',body)).status,404);
  assert.equal((await r(admin,'GET','/admin/group-approvals?pageSize=101')).status,400);
}));
test('approval registration: new instructors follow policy; student and prior review decisions are preserved',t=>fixture(t,async(r,m)=>{
  const signup=(identifier,role='Instructor',extra={})=>r(null,'POST','/register',{identifier,role,username:identifier.split('@')[0],...extra});
  assert.equal((await signup('first@test.local')).status,200);assert.equal(m.users.find(x=>x.email==='first@test.local').approvalStatus,'Pending');
  m.policy.requireInstructorApproval=false;
  assert.equal((await signup('second@test.local')).status,200);assert.equal(m.users.find(x=>x.email==='second@test.local').approvalStatus,'Approved');
  assert.equal((await signup('first@test.local')).status,200);assert.equal(m.users.find(x=>x.email==='first@test.local').approvalStatus,'Pending');
  assert.equal((await signup('student@test.local','Student')).status,200);assert.equal(m.users.find(x=>x.email==='student@test.local').approvalStatus,'Approved');
  assert.equal((await signup('blocked@test.local','Student',{joinCode:'WAIT123'})).status,400);
}));
test('approval eligibility: pending/rejected groups cannot be assigned to exams, lessons or practices',t=>fixture(t,async(_r,m,load)=>{
  const {assertOwnsAllGroups}=load('routes/exams/exams.service.ts');
  const {ownedGroupIds,assertGroupsExist}=load('routes/lessonSessions/lessonSessions.service.ts');
  const {createPractice}=load('routes/practice/practice.manage.ts');
  for(const id of ['waiting-group','rejected-group']){
    await assert.rejects(assertOwnsAllGroups([id],'Instructor','owner'));
    await assert.rejects(assertOwnsAllGroups([id],'SuperAdmin','admin'));
    await assert.rejects(assertGroupsExist([id]));
    await assert.rejects(createPractice('owner',{title:'test',description:'',groupIds:[id],questionIds:['q']}));
  }
  assert.deepEqual([...(await ownedGroupIds('owner'))],['old']);
  await assertOwnsAllGroups(['old'],'Instructor','owner');await assertGroupsExist(['old']);
}));
