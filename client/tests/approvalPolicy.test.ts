import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import ApprovalPolicyChoice from '../src/pages/SettingsPage/components/ApprovalPolicyChoice';
import GroupCard from '../src/pages/GroupsPage/components/GroupCard';
import { getGroups, getGroupsPage } from '../src/api/groupApi';
import { saveApprovalPolicy, getGroupReviews, reviewGroup } from '../src/api/approvalPolicyApi';

test('approval choice requires an explicit decision for pending records in free mode and supports dark mode', () => {
  const props = { label:'مدرس', required:false, count:2, disabled:false, decision:'' as const, onRequired:()=>{}, onDecision:()=>{} };
  const html=renderToString(createElement(ApprovalPolicyChoice,props));
  assert.ok(html.includes('برای بررسی دستی باقی بمانند'));assert.ok(html.includes('همهٔ درخواست‌های معلق تأیید شوند'));assert.ok(html.includes('required'));assert.ok(html.includes('dark:bg-gray-950'));
  assert.ok(!renderToString(createElement(ApprovalPolicyChoice,{...props,required:true})).includes('<select'));
});
test('pending group card explains its status and never offers an invitation code',()=>{
  const html=renderToString(createElement(GroupCard,{group:{id:'g',name:'Group',category:'General',instructorId:'owner',studentIds:[],joinCode:'SECRET',approvalStatus:'Pending'},isCopied:false,isRegenerating:false,onCopyCode:()=>{},onRegenerateCode:()=>{},onEdit:()=>{},onDelete:()=>{}}));
  assert.ok(html.includes('منتظر تأیید مدیر'));assert.ok(!html.includes('SECRET'));assert.ok(!html.includes('کپی کد'));
});
test('group selectors exclude pending/rejected while group management keeps all records',async()=>{
  const original=globalThis.fetch;
  globalThis.fetch=(async()=>new Response(JSON.stringify({items:[{id:'a',approvalStatus:'Approved'},{id:'p',approvalStatus:'Pending'},{id:'r',approvalStatus:'Rejected'}],total:3,page:1,pageSize:100}),{status:200})) as typeof fetch;
  try{assert.deepEqual((await getGroups()).map(g=>g.id),['a']);assert.equal((await getGroupsPage()).items.length,3);}finally{globalThis.fetch=original;}
});
test('approval API carries revision, independent toggles and review precondition',async()=>{
  const original=globalThis.fetch;const calls:{url:URL;body:unknown}[]=[];
  globalThis.fetch=(async(input,init)=>{calls.push({url:new URL(String(input)),body:init?.body?JSON.parse(String(init.body)):null});return new Response('{}',{status:200});}) as typeof fetch;
  try{
    const payload={revision:3,requireInstructorApproval:false,requireGroupApproval:true,pendingInstructors:'keep' as const};await saveApprovalPolicy(payload);
    await getGroupReviews('Pending',{page:2,pageSize:10});await reviewGroup({id:'group/id',name:'g',category:'General',approvalStatus:'Pending',instructor:{name:null,username:null}},'Approved');
    assert.deepEqual(calls[0].body,payload);assert.equal(calls[1].url.searchParams.get('status'),'Pending');assert.equal(calls[1].url.searchParams.get('page'),'2');
    assert.deepEqual(calls[2].body,{status:'Approved',expectedStatus:'Pending'});assert.ok(calls[2].url.pathname.includes('group%2Fid'));
  }finally{globalThis.fetch=original;}
});
