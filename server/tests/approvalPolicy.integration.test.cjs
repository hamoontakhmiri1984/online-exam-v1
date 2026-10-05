require('dotenv').config({path:require('node:path').resolve(__dirname,'../.env')});
const test=require('node:test');
const assert=require('node:assert/strict');
const {randomUUID}=require('node:crypto');
const {execFile}=require('node:child_process');
const {promisify}=require('node:util');
const path=require('node:path');
const {PrismaClient}=require('@prisma/client');
const {withApprovalApi}=require('./helpers/approvalPolicyApi.cjs');

test('Postgres approval: isolated schema, concurrent revisions, registration and group eligibility',async t=>{
  const url=process.env.DATABASE_URL;
  if(!url){if(process.env.REQUIRE_SERVICES==='1')throw Error('DATABASE_URL required');t.skip('Postgres not configured');return;}
  const admin=new PrismaClient({datasources:{db:{url}}});
  try{await admin.$queryRaw`SELECT 1`;}catch(e){await admin.$disconnect();if(process.env.REQUIRE_SERVICES==='1')throw e;t.skip('Postgres unavailable');return;}
  // Never change the live singleton: every run has its own fresh schema.
  const schema='approval_test_'+randomUUID().replaceAll('-','');
  await admin.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);
  t.after(async()=>{try{await admin.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);}finally{await admin.$disconnect();}});
  const isolated=new URL(url);isolated.searchParams.set('schema',schema);
  await promisify(execFile)(process.execPath,[require.resolve('prisma/build/index.js'),'db','push','--skip-generate','--schema',path.resolve(__dirname,'../prisma/schema.prisma')],
    {env:{...process.env,DATABASE_URL:isolated.toString()},timeout:60000});
  const db=new PrismaClient({datasources:{db:{url:isolated.toString()}}});t.after(()=>db.$disconnect());
  await db.approvalPolicy.create({data:{id:'global'}});
  await db.user.createMany({data:[{id:'admin',role:'SuperAdmin'},{id:'owner',role:'Instructor'},{id:'student',role:'Student'},
    {id:'waiting',role:'Instructor',approvalStatus:'Pending'},{id:'rejected',role:'Instructor',approvalStatus:'Rejected'}]});
  await withApprovalApi(t,db,async(r,load)=>{
    const actor='SuperAdmin:admin',url='/admin/approval-policy';
    const body={revision:0,requireInstructorApproval:false,requireGroupApproval:true,pendingInstructors:'keep'};
    const concurrent=await Promise.all(Array.from({length:4},()=>r(actor,'PUT',url,body)));
    assert.equal(concurrent.filter(x=>x.status===200).length,1,JSON.stringify(concurrent));assert.equal(concurrent.filter(x=>x.status===409).length,3);
    assert.equal((await db.user.findUnique({where:{id:'waiting'}})).approvalStatus,'Pending');
    const created=await r('Instructor:owner','POST','/groups',{name:'Pending group',category:'test',studentIds:[]});assert.equal(created.status,201,JSON.stringify(created.body));
    const group=created.body;assert.equal(group.approvalStatus,'Pending');
    assert.equal((await r('Student:student','POST','/groups/join',{joinCode:group.joinCode})).status,403);
    const {assertOwnsAllGroups}=load('routes/exams/exams.service.ts');
    await assert.rejects(assertOwnsAllGroups([group.id],'Instructor','owner'));
    const {ownedGroupIds}=load('routes/lessonSessions/lessonSessions.service.ts');
    assert.equal((await ownedGroupIds('owner')).has(group.id),false);
    const free=await r(null,'POST','/register',{identifier:'free@example.test',username:'free_instructor',role:'Instructor'});assert.equal(free.status,200,JSON.stringify(free.body));
    assert.equal((await db.user.findUnique({where:{email:'free@example.test'}})).approvalStatus,'Approved');
    const current=await r(actor,'GET',url);
    assert.equal((await r(actor,'PUT',url,{revision:current.body.revision,requireInstructorApproval:false,requireGroupApproval:false,pendingInstructors:'approve',pendingGroups:'approve'})).status,200);
    assert.equal((await db.user.findUnique({where:{id:'waiting'}})).approvalStatus,'Approved');
    assert.equal((await db.user.findUnique({where:{id:'rejected'}})).approvalStatus,'Rejected');
    await assertOwnsAllGroups([group.id],'Instructor','owner');assert.equal((await ownedGroupIds('owner')).has(group.id),true);
    assert.equal((await r('Student:student','POST','/groups/join',{joinCode:group.joinCode})).status,200);
    assert.equal(await db.adminAuditLog.count(),2);
  });
});
