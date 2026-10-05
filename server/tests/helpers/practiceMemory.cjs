// A behavioral double, not a substitute for practice.integration.test.cjs.
function practiceMemory() {
  let sequence=0;
  const id=()=>`generated-${++sequence}`;
  const groups=[{id:'group-a',instructorId:'teacher-a',name:'Group A',students:['student-a','student-b']},{id:'group-b',instructorId:'teacher-b',name:'Group B',students:['outsider']}];
  const source=[{id:'qa',bank:{instructorId:'teacher-a'},text:'Source A',options:['One','Two'],correctOptionIndex:1,difficulty:'Easy'},{id:'qb',bank:{instructorId:'teacher-b'},text:'Source B',options:['One','Two'],correctOptionIndex:0,difficulty:'Hard'}];
  const sets=[],access=[],questions=[],attempts=[];
  const copy=x=>structuredClone(x);
  const basic=(x,w={})=>Object.entries(w).every(([k,v])=>v===undefined || (v && typeof v==='object' ? v.in ? v.in.includes(x[k]) : v.contains ? x[k].includes(v.contains) : true : x[k]===v));
  function setMatch(p,w={}) {
    if(!basic(p,w))return false;
    if(w.groups?.some) return access.some(a=>a.practiceId===p.id && groups.find(g=>g.id===a.groupId)?.students.includes(w.groups.some.group.students.some.id));
    return true;
  }
  const expand=p=>p && ({...copy(p),groups:access.filter(a=>a.practiceId===p.id).map(a=>({...a,group:groups.find(g=>g.id===a.groupId)})),instructor:{name:p.instructorId},_count:{groups:access.filter(a=>a.practiceId===p.id).length,questions:questions.filter(q=>q.practiceId===p.id).length}});
  function questionMatch(q,w={}) {
    if(!basic(q,w))return false;
    if(w.attempts?.none && attempts.some(a=>a.questionId===q.id && basic(a,w.attempts.none)))return false;
    if(w.attempts?.some && !attempts.some(a=>a.questionId===q.id && basic(a,w.attempts.some)))return false;
    return true;
  }
  const remove=(items,w,match=basic)=>{for(let i=items.length-1;i>=0;i--)if(match(items[i],w))items.splice(i,1);};
  const slice=(items,args)=>items.slice(args.skip??0,(args.skip??0)+(args.take??items.length));
  let chain=Promise.resolve();
  const db={
    $transaction(run){const result=chain.then(()=>run(db));chain=result.catch(()=>{});return result;},
    async $queryRaw(strings,...values){
      if(String(strings[0]).includes('DISTINCT ON')){
        const student=values[0], ids=values[1].values, latest=new Map();
        for(const a of attempts.filter(a=>a.studentId===student && ids.includes(a.questionId)))latest.set(a.questionId,a);
        return [...latest.values()].map(a=>({questionId:a.questionId,isCorrect:a.isCorrect,createdAt:a.createdAt}));
      }
      return [];
    },
    user:{findUnique:async()=>({role:'Instructor',approvalStatus:'Approved'})},
    group:{count:async({where})=>groups.filter(g=>basic(g,where)).length},
    question:{findMany:async({where})=>source.filter(q=>basic(q,where)&&q.bank.instructorId===where.bank.instructorId).map(copy)},
    practiceSet:{
      async create({data}){const p={id:id(),title:data.title,description:data.description,instructorId:data.instructorId,status:'Draft',publishedAt:null,createdAt:new Date()};sets.push(p);access.push(...data.groups.create.map(a=>({...a,practiceId:p.id})));questions.push(...data.questions.create.map(q=>({...copy(q),practiceId:p.id,id:id()})));return {id:p.id};},
      findFirst:async({where})=>expand(sets.find(p=>setMatch(p,where))),
      findMany:async(args)=>slice(sets.filter(p=>setMatch(p,args.where)),args).map(expand),
      count:async({where})=>sets.filter(p=>setMatch(p,where)).length,
      async update({where,data}){const p=sets.find(p=>p.id===where.id);Object.assign(p,data);return {id:p.id};},
    },
    practiceSetGroup:{async deleteMany({where}){remove(access,where);},async createMany({data}){access.push(...copy(data));}},
    practiceQuestion:{
      async deleteMany({where}){remove(questions,where);},async createMany({data}){questions.push(...data.map(q=>({...copy(q),id:id()})));},
      findFirst:async({where})=>copy(questions.find(q=>questionMatch(q,where))),
      findMany:async(args)=>slice(questions.filter(q=>questionMatch(q,args.where)),args).map(copy),
      count:async({where})=>questions.filter(q=>questionMatch(q,where)).length,
    },
    practiceAttempt:{
      findUnique:async({where})=>copy(attempts.find(a=>basic(a,where.studentId_requestId))),
      async create({data}){const a={...data,id:id(),createdAt:new Date()};attempts.push(a);return copy(a);},
      async groupBy({where}){const sums=new Map();for(const a of attempts.filter(a=>basic(a,where))){const k=a.questionId+':'+a.isCorrect;const sum=sums.get(k)??{questionId:a.questionId,isCorrect:a.isCorrect,_count:{_all:0}};sum._count._all++;sums.set(k,sum);}return [...sums.values()];},
      findMany:async(args)=>slice(attempts.filter(a=>basic(a,args.where)).reverse(),args).map(a=>({id:a.id,selectedOptionIndex:a.selectedOptionIndex,isCorrect:a.isCorrect,createdAt:a.createdAt})),
      count:async({where})=>attempts.filter(a=>basic(a,where)).length,
    },
  };
  return {db,sets,groups,source,questions,attempts};
}
module.exports={practiceMemory};
