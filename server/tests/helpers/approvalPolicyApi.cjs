const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const express = require('express');
function approvalApp(db) {
  const src = path.resolve(__dirname, '../../src');
  const cache = new Map();
  const doubles = {
    'lib/prisma.ts': { prisma: db },
    'lib/jwt.ts': { verifyAccessToken(token) { const [role, sub] = token.split(':'); if (!['Student','Instructor','SuperAdmin'].includes(role) || !sub) throw Error('invalid'); return { role, sub, sid:'test' }; } },
    'lib/session.ts': { isSessionValid: async () => true },
    'lib/notifications.ts': { notifyUser: async () => {}, notifyRoles: async () => {} },
    'lib/quota.ts': { withQuotaLock: async (_id,_kind,_count,run) => db.$transaction(run) },
    'lib/joinCode.ts': { generateUniqueJoinCode: async () => 'CODE' + Date.now() },
    'middleware/rateLimiters.ts': { joinGroupLimiter: (_req,_res,next) => next() },
    'lib/otpAbuseGuard.ts': { assertOtpSendAllowed: async () => {} },
    'lib/username.ts': { normalizeUsername: x => x.toLowerCase(), validateUsernameFormat: () => ({ valid:true }), isUsernameTaken: async () => false, suggestUsernameAlternatives: async x => [x] },
    'lib/password.ts': { hashPassword: async () => 'test-only-hash' },
    'lib/otp.ts': { createOtp: async () => ({ code:'000000' }) },
    'services/otpSender.ts': { sendOtp: async () => {} },
    'routes/auth/auth.helpers.ts': { resolveIdentifier: value => ({ type:'EMAIL', value, channel:'EMAIL' }) },
  };
  function load(filename) {
    const key = path.relative(src,filename).split(path.sep).join('/');
    if (doubles[key]) return doubles[key];
    if (cache.has(filename)) return cache.get(filename).exports;
    const module={exports:{}};cache.set(filename,module);
    const code=ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
    vm.runInNewContext(code,{module,exports:module.exports,console,Buffer,Date,require:name=>name.startsWith('.')?load(path.resolve(path.dirname(filename),name+'.ts')):require(name)},{filename});
    return module.exports;
  }
  const app=express();app.use(express.json());
  const {requireAuth,requireRole}=load(path.join(src,'middleware/requireAuth.ts'));
  app.use('/admin',requireAuth,requireRole('SuperAdmin'));
  app.use('/admin/approval-policy',load(path.join(src,'routes/admin/approvalPolicy.routes.ts')).default);
  app.use('/admin/group-approvals',load(path.join(src,'routes/admin/groupApprovals.routes.ts')).default);
  app.use('/groups',load(path.join(src,'routes/groups.ts')).default);
  app.post('/register',async(req,res,next)=>{try{res.json(await load(path.join(src,'routes/auth/register/register.service.ts')).registerUser(req.body,'127.0.0.1'));}catch(e){next(e);}});
  app.use((err,_req,res,_next)=>res.status(err.statusCode||500).json({error:err.message}));
  return {app,load: file=>load(path.join(src,file))};
}
async function withApprovalApi(t,db,run) {
  const {app,load}=approvalApp(db);const server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));
  t.after(()=>new Promise(resolve=>{server.close(resolve);server.closeAllConnections();}));
  async function request(actor,method,url,body) {
    const headers=actor?{Authorization:`Bearer ${actor}`}:{ };if(body!==undefined)headers['Content-Type']='application/json';
    const response=await fetch(`http://127.0.0.1:${server.address().port}${url}`,{method,headers,body:body===undefined?undefined:JSON.stringify(body)});
    return {status:response.status,body:await response.json()};
  }
  return run(request,load);
}
module.exports={approvalApp,withApprovalApi};
