import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import IdentifierStep from '../src/components/ForgotPasswordForm/components/IdentifierStep';
import CodeStep from '../src/components/ForgotPasswordForm/components/CodeStep';
import { requestOtp } from '../src/api/authApi';
const shared = { captcha:null, captchaRequired:false, captchaResetSignal:0, onCaptchaChange:()=>{}, loading:false, onSubmit:()=>{} };
test('reset initial request is enabled without unsolicited captcha; requested captcha still blocks submission',()=>{
  const props={...shared,identifier:'09123456789',onIdentifierChange:()=>{}};
  const html=renderToString(createElement(IdentifierStep,props));
  assert.ok(!/\sdisabled(?:=|\s|>)/.test(html));assert.ok(!html.includes('کد تصویر'));
  const challenged=renderToString(createElement(IdentifierStep,{...props,captchaRequired:true}));
  assert.ok(challenged.includes('کد تصویر'));assert.match(challenged,/<button[^>]*disabled/);
});
test('reset resend respects cooldown, server-requested captcha and an in-flight verification',()=>{
  const props={...shared,identifier:'09123456789',code:'',onCodeChange:()=>{},hasError:false,cooldown:0,resending:false,onResend:()=>{},onBack:()=>{}};
  const html=renderToString(createElement(CodeStep,props));
  const resendTag = html.match(/<button[^>]*>ارسال مجدد کد<\/button>/)?.[0]; assert.ok(resendTag); assert.ok(!/\sdisabled(?:=|\s|>)/.test(resendTag));
  assert.ok(!html.includes('کد تصویر'));
  assert.ok(renderToString(createElement(CodeStep,{...props,cooldown:30})).includes('ارسال مجدد در'));
  assert.match(renderToString(createElement(CodeStep,{...props,captchaRequired:true})),/<button[^>]*disabled[^>]*>ارسال مجدد کد/);
});
test('reset OTP uses the request endpoint and preserves purpose and captcha challenge response',async()=>{
  const original=globalThis.fetch;let body:unknown;
  globalThis.fetch=(async(input,init)=>{assert.ok(String(input).endsWith('/auth/otp/request'));body=JSON.parse(String(init?.body));return new Response(JSON.stringify({error:'captcha needed',captchaRequired:true}),{status:400});}) as typeof fetch;
  try{const result=await requestOtp('09123456789','RESET_PASSWORD');assert.deepEqual(body,{identifier:'09123456789',purpose:'RESET_PASSWORD'});assert.equal(result.status,'error');if(result.status==='error')assert.equal(result.captchaRequired,true);}finally{globalThis.fetch=original;}
});
