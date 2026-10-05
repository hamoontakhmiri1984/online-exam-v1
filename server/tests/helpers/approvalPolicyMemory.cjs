function approvalMemory() {
  const policy={id:'global',revision:0,requireInstructorApproval:true,requireGroupApproval:false};
  const users=[{id:'admin',role:'SuperAdmin',approvalStatus:'Approved'},{id:'owner',role:'Instructor',approvalStatus:'Approved'},
    {id:'waiting',role:'Instructor',approvalStatus:'Pending'},{id:'rejected',role:'Instructor',approvalStatus:'Rejected'},
    {id:'student',role:'Student',approvalStatus:'Approved'}];
  const groups=[{id:'old',name:'Old',category:'General',instructorId:'owner',approvalStatus:'Approved',joinCode:'OLD123',students:[{id:'student'}]},
    {id:'waiting-group',name:'Waiting',category:'General',instructorId:'owner',approvalStatus:'Pending',joinCode:'WAIT123',students:[{id:'student'}]},
    {id:'rejected-group',name:'Rejected',category:'General',instructorId:'owner',approvalStatus:'Rejected',students:[]}];
  const audits=[];let failAudit=false;let sequence=0;
  const copy=x=>structuredClone(x);
  function match(row,where={}) { return Object.entries(where).every(([k,v])=>!v || typeof v!=='object'?v===undefined||row[k]===v:v.in?v.in.includes(row[k]):v.contains?row[k].toLowerCase().includes(v.contains.toLowerCase()):v.some?(row[k]||[]).some(x=>match(x,v.some)):true); }
  const model=rows=>({
    findUnique:async({where})=>copy(rows.find(x=>match(x,where))||null),
    findFirst:async({where})=>copy(rows.find(x=>match(x,where))||null),
    count:async({where})=>rows.filter(x=>match(x,where)).length,
    findMany:async({where,skip=0,take=100})=>copy(rows.filter(x=>match(x,where)).slice(skip,skip+take).map(x=>({...x,instructor:{name:'Owner',username:'owner'}}))),
    create:async({data})=>{const row={id:'new-'+(++sequence),...copy(data)};if(data.students)row.students=data.students.connect;rows.push(row);return copy(row);},
    update:async({where,data})=>{const row=rows.find(x=>match(x,where));Object.assign(row,copy(data));return copy(row);},
    updateMany:async({where,data})=>{const selected=rows.filter(x=>match(x,where));selected.forEach(x=>Object.assign(x,copy(data)));return {count:selected.length};},
  });
  const db={
    $queryRaw:async()=>[],
    async $transaction(run) {
      if(Array.isArray(run))return Promise.all(run);
      const before=copy({policy,users,groups,audits});
      try{return await run(db);}catch(e){Object.assign(policy,before.policy);users.splice(0,users.length,...before.users);groups.splice(0,groups.length,...before.groups);audits.splice(0,audits.length,...before.audits);throw e;}
    },
    approvalPolicy:{findUniqueOrThrow:async()=>copy(policy),update:async({data})=>{Object.assign(policy,{...data,revision:policy.revision+data.revision.increment});return copy(policy);}},
    user:model(users),group:model(groups),
    adminAuditLog:{create:async({data})=>{if(failAudit)throw Error('audit unavailable');audits.push(copy(data));return data;}},
  };
  return {db,policy,users,groups,audits,failAudit:()=>{failAudit=true;}};
}
module.exports={approvalMemory};
