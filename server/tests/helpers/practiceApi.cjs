const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const express = require('express');

// Real routes, validation and authorization. Tests can inject either the memory
// fixture or a real PrismaClient; only JWT/session IO is replaced in both cases.
function practiceApp(prisma) {
  const src = path.resolve(__dirname, '../../src');
  const cache = new Map();
  const doubles = {
    'lib/prisma.ts': { prisma },
    'lib/jwt.ts': { verifyAccessToken(token) {
      const [role, sub] = token.split(':');
      if (!['Student','Instructor','SuperAdmin'].includes(role) || !sub) throw Error('invalid');
      return { role, sub, sid: 'practice-test-session' };
    } },
    'lib/session.ts': { isSessionValid: async () => true },
  };
  function load(filename) {
    const key = path.relative(src, filename).split(path.sep).join('/');
    if (doubles[key]) return doubles[key];
    if (cache.has(filename)) return cache.get(filename).exports;
    const module = { exports: {} }; cache.set(filename,module);
    const code = ts.transpileModule(fs.readFileSync(filename,'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
    vm.runInNewContext(code, { module, exports: module.exports, console, Buffer, Date,
      require: name => name.startsWith('.') ? load(path.resolve(path.dirname(filename),name+'.ts')) : require(name),
    }, { filename });
    return module.exports;
  }
  const app = express();app.use(express.json());app.use('/practice',load(path.join(src,'routes/practice.ts')).default);
  app.use((err,_req,res,_next) => res.status(err.statusCode || 500).json({error:err.message}));
  return app;
}
async function withPracticeApi(t, prisma, run) {
  const server = practiceApp(prisma).listen(0,'127.0.0.1');
  await new Promise(resolve => server.once('listening',resolve));
  t.after(() => new Promise(resolve => { server.close(resolve);server.closeAllConnections(); }));
  const request = async (actor, method, endpoint='', body) => {
    const headers = actor ? {Authorization:`Bearer ${actor}`} : {};
    if (body !== undefined) headers['Content-Type']='application/json';
    const response = await fetch(`http://127.0.0.1:${server.address().port}/practice${endpoint}`,{method,headers,body:body === undefined ? undefined : JSON.stringify(body)});
    return { status:response.status, body:await response.json() };
  };
  return run(request);
}
module.exports = { practiceApp, withPracticeApi };
