const test=require('node:test');const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
const express=require('express');const {Prisma}=require('@prisma/client');const {z}=require('zod');
function setup(doubles={}){
 const root=path.resolve(__dirname,'../src'),cache=new Map(),logs=[],counters=new Map();
 const redis={isReady:true,async sendCommand(args){const key=args[3];if(args[1].includes("'DECR'")){const row=counters.get(key);if(row)row.count=Math.max(0,row.count-1);return row?.count||0;}
  let row=counters.get(key);if(!row||row.until<=Date.now()){row={count:0,until:Date.now()+Number(args[4])};counters.set(key,row);}return [++row.count,row.until-Date.now()];}};
 function load(file){const full=path.resolve(root,file);const key=path.relative(root,full);if(key in doubles)return doubles[key];if(cache.has(full))return cache.get(full).exports;const module={exports:{}};cache.set(full,module);
 const code=ts.transpileModule(fs.readFileSync(full,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
 vm.runInNewContext(code,{module,exports:module.exports,console:{...console,error:(...args)=>logs.push(args),info:(...args)=>logs.push(args)},Date,Error,setTimeout,clearTimeout,
 require:name=>name==='../lib/rateLimitRedis'?{rateLimitRedis:redis}:name.startsWith('.')?load(path.relative(root,path.resolve(path.dirname(full),name+'.ts'))):require(name)},{filename:full});return module.exports;}
 return {load,logs,redis};
}
async function listen(t,app){const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));t.after(()=>new Promise(r=>{server.close(r);server.closeAllConnections();}));return async(url,body)=>fetch(`http://127.0.0.1:${server.address().port}${url}`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body||{})});}
test('HTTP errors: database outage, Prisma validation and unknown failures never expose internals',async t=>{
 const {load,logs}=setup();const {errorHandler}=load('middleware/errorHandler.ts');const app=express();
 const errors=[new Prisma.PrismaClientInitializationError('localhost:5432 /secret/server.ts SELECT passwordHash','5.22','P1001'),
 new Prisma.PrismaClientKnownRequestError('SQL /private/file',{code:'P1001',clientVersion:'5.22'}),new Prisma.PrismaClientValidationError('Invalid prisma.user.findFirst() /secret',{clientVersion:'5.22'}),new Error('secret stack /workspaces/private')];
 app.post('/:index',(req,_res,next)=>next(errors[Number(req.params.index)]));app.use(errorHandler);const request=await listen(t,app);
 for(let i=0;i<errors.length;i++){const response=await request('/'+i);assert.equal(response.status,i<2?503:500);const body=await response.json();assert.match(body.error,/[\u0600-\u06ff]/);assert.doesNotMatch(JSON.stringify(body),/localhost|secret|prisma|workspaces|SELECT|stack/);}
 assert.equal(logs.length,4);
});
test('HTTP errors: conflict and operational flags preserved; English validation becomes Persian',async t=>{
 const {load}=setup();const {errorHandler}=load('middleware/errorHandler.ts');const {AppError}=load('lib/errors.ts');const app=express();
 const invalid=z.object({email:z.string().email()}).safeParse({email:'invalid'}).error;
 const errors=[new AppError(400,'کد امنیتی لازم است',{captchaRequired:true}),new AppError(403,'محدودیت پلن',{reason:'limit_reached'}),new Prisma.PrismaClientKnownRequestError('private details',{code:'P2002',clientVersion:'5.22'}),invalid];
 app.post('/:index',(req,_res,next)=>next(errors[Number(req.params.index)]));app.use(errorHandler);const request=await listen(t,app);
 assert.equal((await (await request('/0')).json()).captchaRequired,true);assert.equal((await (await request('/1')).json()).reason,'limit_reached');assert.equal((await request('/2')).status,409);
 const body=await (await request('/3')).json();assert.match(body.error,/[\u0600-\u06ff]/);assert.doesNotMatch(body.error,/Invalid|email/);
});
test('OTP cooldown: reset does not block signup/login; normalized identifiers and fixed register purpose prevent bypass',async t=>{
 const {load}=setup();const {otpSendLimiter}=load('middleware/rateLimiters.ts');const app=express();app.use(express.json());app.post(['/otp/request','/register'],otpSendLimiter,(_req,res)=>res.json({ok:true}));const request=await listen(t,app);
 const identifier='09123456789';
 assert.equal((await request('/otp/request',{identifier,purpose:'RESET_PASSWORD'})).status,200);
 assert.equal((await request('/register',{identifier,purpose:'LOGIN'})).status,200);
 assert.equal((await request('/otp/request',{identifier,purpose:'LOGIN'})).status,200);
 for(const spelling of [identifier,'+989123456789','۰۹۱۲۳۴۵۶۷۸۹']){
  const response=await request('/otp/request',{identifier:spelling,purpose:'RESET_PASSWORD'});assert.equal(response.status,429);const body=await response.json();assert.ok(body.retryAfterSeconds>0);assert.ok(response.headers.get('Retry-After'));assert.ok(!body.error.includes('کد قبلی'));
 }
 assert.equal((await request('/register/',{identifier,purpose:'RESET_PASSWORD'})).status,429);
});
test('OTP cooldown: captcha/database failures can retry, successful requests remain limited',async t=>{
 const {load}=setup();const {otpSendLimiter}=load('middleware/rateLimiters.ts');const {errorHandler}=load('middleware/errorHandler.ts');const {AppError}=load('lib/errors.ts');const app=express();app.use(express.json());
 app.post('/otp/request',otpSendLimiter,(req,res,next)=>{
  if(req.body.failure==='captcha')return next(new AppError(400,'کد امنیتی لازم است',{captchaRequired:true}));
  if(req.body.failure==='database')return next(new Prisma.PrismaClientInitializationError('private','5.22','P1001'));
  res.json({ok:true});
 });app.use(errorHandler);const request=await listen(t,app);const body={identifier:'test@example.com',purpose:'RESET_PASSWORD'};
 assert.equal((await request('/otp/request',{...body,failure:'captcha'})).status,400);
 assert.equal((await request('/otp/request',{...body,failure:'database'})).status,503);
 assert.equal((await request('/otp/request',body)).status,200);assert.equal((await request('/otp/request',body)).status,429);
});
test('OTP diagnosis: unknown account has no code, login/reset for an existing account both deliver; public response stays generic',async()=>{
 let exists=false,created=0,sent=0;const env={NODE_ENV:'development'};
 const {load,logs}=setup({
  'config/env.ts':{env},
  'lib/prisma.ts':{prisma:{user:{findFirst:async()=>exists?{id:'test-user'}:null}}},
  'lib/otp.ts':{createOtp:async()=>{created++;return {code:'test-code'};},simulateOtpCreationCost:async()=>{}},
  'lib/otpAbuseGuard.ts':{assertOtpSendAllowed:async()=>{}},
  'services/otpSender.ts':{sendOtp:async()=>{sent++;}},
  'lib/authTokens.ts':{},'realtime/socket.ts':{},
 });
 const {requestOtp}=load('routes/auth/otp/otp.service.ts');
 const missing=await requestOtp({identifier:'09123456789',purpose:'RESET_PASSWORD'},'test-ip');assert.equal(created,0);assert.equal(sent,0);assert.match(logs[0][0],/account_not_found/);
 exists=true;const found=await requestOtp({identifier:'09123456789',purpose:'RESET_PASSWORD'},'test-ip');await requestOtp({identifier:'09123456789',purpose:'LOGIN'},'test-ip');assert.equal(created,2);assert.equal(sent,2);assert.equal(missing.message,found.message);
 assert.match(logs[1][0],/RESET_PASSWORD: code_created/);assert.match(logs[2][0],/LOGIN: code_created/);
 const count=logs.length;env.NODE_ENV='production';exists=false;await requestOtp({identifier:'09123456789',purpose:'RESET_PASSWORD'},'test-ip');assert.equal(logs.length,count);
});
