/* Saved promotion review over the existing annual-enrollment batch service. */
(() => {
  'use strict';
  const prefix='orbit.school.promotion-previews.demo.v1:',fail=code=>{throw Error(code);},clone=v=>JSON.parse(JSON.stringify(v));
  const id=v=>typeof v==='string'&&!!v.trim()&&v===v.trim(),norm=v=>String(v).normalize('NFKC').trim().toLocaleLowerCase();
  const actions=['manual-review','promote','repeat','change','exclude','graduation'],order=Object.freeze(['7','8','9','10','11','12']);
  const storageKey=schoolId=>prefix+encodeURIComponent(schoolId||OrbitSchoolAcademicReadModel.availableYears().schoolId);
  function json(key,fallback){let raw;try{raw=localStorage.getItem(key);}catch{fail('STORAGE_FAILED');}if(raw===null)return clone(fallback);try{return JSON.parse(raw);}catch{fail('INVALID_DATA');}}
  function state(){
    const years=OrbitSchoolAcademicReadModel.availableYears(),schoolId=years.schoolId,academic=json(OrbitSchoolAcademics.storageKey(schoolId),null);
    if(!academic||academic.schema!==1||academic.schoolId!==schoolId||!Array.isArray(academic.classes)||!Number.isSafeInteger(academic.revision))fail('ACADEMIC_DATA_REQUIRED');
    const db=json(storageKey(schoolId),{schema:1,schoolId,revision:0,progression:null,drafts:[],operations:[]});
    if(!db||db.schema!==1||db.schoolId!==schoolId||!Number.isSafeInteger(db.revision)||db.revision<0||!Array.isArray(db.drafts)||!Array.isArray(db.operations))fail('INVALID_DATA');
    const seen=new Set();
    for(const d of db.drafts){
      if(!d||!id(d.id)||seen.has(d.id)||d.schoolId!==schoolId||d.status!=='draft'||!Number.isSafeInteger(d.revision)||d.revision<1||!id(d.sourceYearId)||!id(d.targetYearId)||typeof d.sourceSignature!=='string'||!d.sourceYear||!d.targetYear||!Array.isArray(d.items)||!Array.isArray(d.reviews))fail('INVALID_DATA');seen.add(d.id);
      if(new Set(d.items.map(r=>r.id)).size!==d.items.length||new Set(d.items.map(r=>r.academicStudentId)).size!==d.items.length||d.items.some(r=>!id(r.id)||!id(r.academicStudentId)||!actions.includes(r.action)||!['needs-review','unresolved','reviewed'].includes(r.reviewStatus)||!Array.isArray(r.diagnostics)||r.sourceYearId!==d.sourceYearId||r.targetYearId!==d.targetYearId))fail('INVALID_DATA');
      if(d.execution&&(!id(d.execution.operationId)||!['pending','completed'].includes(d.execution.status)||!Array.isArray(d.execution.choices)))fail('INVALID_DATA');
    }
    if(new Set(db.operations.map(r=>r.operationId)).size!==db.operations.length||db.operations.some(r=>!id(r.operationId)||typeof r.payload!=='string'||!r.result))fail('INVALID_DATA');
    return {db,years,schoolId,academic,catalogSnapshot:JSON.stringify(academic),grades:[...new Set(academic.classes.map(c=>c.grade))]};
  }
  const context=s=>({schoolId:s.schoolId,revision:s.db.revision,catalogSnapshot:s.catalogSnapshot});
  // Existing registries use a canonical numeric token as name. Prefer an explicit code
  // when supplied; never extract a number from a translated/custom display label.
  const canonicalGrade=g=>{const code=String(g?.canonicalCode??g?.name??'');return order.includes(code)?code:null;};
  function source(s,fromId,toId){
    const from=s.years.years.find(y=>y.id===fromId),to=s.years.years.find(y=>y.id===toId);
    if(!from||!to||from.schoolId!==s.schoolId||to.schoolId!==s.schoolId)fail('YEAR_NOT_FOUND');
    if(from.status!=='active')fail('SOURCE_NOT_ACTIVE');if(to.status!=='upcoming')fail('TARGET_NOT_UPCOMING');
    const fromModel=OrbitSchoolAcademicReadModel.read(fromId),toModel=OrbitSchoolAcademicReadModel.read(toId),structure=OrbitSchoolSections.view(toId);
    const grades=new Map(structure.grades.map(g=>[g.id,g]));
    const destinations=structure.sections.map(q=>({classId:q.id,sectionId:q.id,gradeId:q.gradeId,grade:grades.get(q.gradeId)?.name,canonicalGrade:canonicalGrade(grades.get(q.gradeId)),section:q.name,structure:'section'}));
    // Capture each relevant relationship once. The full read model repeats students,
    // identities and placements in several projections and exceeds localStorage at 300 rows.
    const signature=JSON.stringify({mode:'canonical-v1',revisions:fromModel.sourceRevisions,
      sourceYear:fromModel.selectedYear,targetYear:toModel.selectedYear,
      students:fromModel.students.filter(s=>s.hasAnnualEnrollment).map(s=>[s.academicStudentId,s.name,s.enrollmentId,s.verification,s.identity,s.currentPlacement]),
      destinationEnrollments:toModel.enrollments,
      structure:{grades:structure.grades,sections:structure.sections}});
    return {fromModel,toModel,structure,grades,destinations,signature};
  }
  const currentGrade=(item,view)=>item.sourcePlacement?.gradeId?canonicalGrade(view.grades.get(item.sourcePlacement.gradeId)):canonicalGrade({name:item.sourcePlacement?.gradeSnapshot});
  const nextGrade=code=>code&&code!=='12'?order[order.indexOf(code)+1]||null:null;
  function issues(item,view){
    if(item.action==='exclude')return [];
    const codes=[],code=currentGrade(item,view),next=nextGrade(code);
    if(item.sourceVerification!=='verified')codes.push('SOURCE_UNRESOLVED');
    if(item.action==='manual-review')codes.push(code==='12'?'FINAL_GRADE_REVIEW_REQUIRED':'MANUAL_REVIEW_REQUIRED');
    if(item.action==='graduation'){
      if(code!=='12')codes.push('NOT_FINAL_GRADE');if(!item.eligibilityReviewed)codes.push('ELIGIBILITY_REVIEW_REQUIRED');return [...new Set(codes)];
    }
    if(['promote','repeat','change'].includes(item.action)){
      if(!item.eligibilityReviewed)codes.push('ELIGIBILITY_REVIEW_REQUIRED');
      const wanted=item.action==='repeat'?code:item.action==='promote'?next:null;
      if(item.action!=='change'&&!wanted)codes.push(code==='12'?'FINAL_GRADE_REVIEW_REQUIRED':'GRADE_NOT_CONFIGURED');
      if(wanted&&!view.structure.grades.some(g=>canonicalGrade(g)===wanted))codes.push('DESTINATION_GRADE_MISSING');
      const destination=view.destinations.find(d=>d.classId===item.destinationClassId);
      if(!destination)codes.push('DESTINATION_REQUIRED');else if(wanted&&destination.canonicalGrade!==wanted)codes.push('INVALID_DESTINATION');
      if(view.toModel.enrollments.some(e=>e.academicStudentId===item.academicStudentId||e.accountId===item.accountId))codes.push('DUPLICATE_ENROLLMENT');
    }
    return [...new Set(codes)];
  }
  function read(){const s=state();return clone({...s.db,grades:s.grades,years:s.years.years,context:context(s),automaticProgression:order,educationalAccess:false});}
  function enrollmentOperation(d){if(!d.execution?.choices.length)return null;const op=OrbitSchoolEnrollments.read().operations.find(r=>r.operationId===d.execution.operationId);if(!op)return null;if(op.payload!==JSON.stringify(['reviewed-promotion',[d.sourceYearId,d.targetYearId,d.execution.choices]]))fail('OPERATION_CONFLICT');return op;}
  function summary(items){return {total:items.length,promote:items.filter(i=>i.action==='promote'&&i.reviewStatus==='reviewed').length,repeat:items.filter(i=>i.action==='repeat'&&i.reviewStatus==='reviewed').length,exclude:items.filter(i=>i.action==='exclude'&&i.reviewStatus==='reviewed').length,graduation:items.filter(i=>i.action==='graduation'&&i.reviewStatus==='reviewed').length,review:items.filter(i=>i.reviewStatus!=='reviewed').length,missing:items.filter(i=>i.diagnostics.some(c=>['DESTINATION_GRADE_MISSING','DESTINATION_REQUIRED','INVALID_DESTINATION'].includes(c))).length,conflicts:items.filter(i=>i.diagnostics.some(c=>['DUPLICATE_ENROLLMENT','CROSS_SCHOOL_OVERLAP','CROSS_SCHOOL_UNVERIFIABLE'].includes(c))).length};}
  function readDraft(draftId){
    const s=state(),saved=s.db.drafts.find(d=>d.id===draftId)||fail('DRAFT_NOT_FOUND'),d=clone(saved),diagnostics=[];
    const completed=d.execution?.status==='completed'||!!enrollmentOperation(d);
    let view;
    if(!completed){try{view=source(s,d.sourceYearId,d.targetYearId);if(d.progression?.mode!=='canonical-v1')diagnostics.push('LEGACY_DRAFT_REVIEW_REQUIRED');else if(view.signature!==d.sourceSignature)diagnostics.push('STALE_SOURCE');}catch(e){diagnostics.push(e.message);}}
    if(view&&d.progression?.mode==='canonical-v1'){
      for(const item of d.items){item.diagnostics=issues(item,view);item.reviewStatus=item.diagnostics.length?(item.diagnostics.some(c=>c!=='ELIGIBILITY_REVIEW_REQUIRED')?'unresolved':'needs-review'):'reviewed';}
      const choices=d.items.filter(i=>['promote','repeat','change'].includes(i.action)&&!i.diagnostics.some(c=>['SOURCE_UNRESOLVED','DESTINATION_REQUIRED','INVALID_DESTINATION'].includes(c))).map(i=>{const target=view.destinations.find(q=>q.classId===i.destinationClassId);return {academicStudentId:i.academicStudentId,sectionId:target.sectionId,gradeId:target.gradeId};});
      if(choices.length){const checks=OrbitSchoolEnrollments.previewPromotion(d.sourceYearId,d.targetYearId,choices);for(const check of checks.results)if(check.issue){const item=d.items.find(i=>i.academicStudentId===check.id);item.diagnostics=[...new Set([...item.diagnostics,check.issue])];item.reviewStatus='unresolved';}}
    }
    const totals=summary(d.items);
    return {...d,executed:completed,auditPending:completed&&d.execution?.status!=='completed',stale:diagnostics.length>0,diagnostics,destinations:view?.destinations||d.destinations||[],context:{...context(s),draftRevision:d.revision},summary:totals,ready:!completed&&!diagnostics.length&&d.items.length>0&&totals.review===0,educationalAccess:false};
  }
  function mutate(expected,operationId,action,values,operation){
    const s=state();if(expected?.schoolId!==s.schoolId)fail('SCHOOL_CHANGED');if(!id(operationId)||operationId.length>160)fail('OPERATION_ID_REQUIRED');
    const payload=JSON.stringify([action,values]),prior=s.db.operations.find(r=>r.operationId===operationId);
    if(prior){if(prior.payload!==payload)fail('OPERATION_CONFLICT');return clone(prior.result.kind==='draft'?s.db.drafts.find(d=>d.id===prior.result.draftId):prior.result);}
    if(expected.revision!==s.db.revision||expected.catalogSnapshot!==s.catalogSnapshot)fail('STALE_DATA');
    const result=operation(s);s.db.revision++;
    s.db.operations.push({operationId,payload,result:action==='create'?{kind:'draft',draftId:result.id}:clone(result),createdAt:new Date().toISOString()});
    const latest=state();if(latest.db.revision!==expected.revision||latest.catalogSnapshot!==expected.catalogSnapshot)fail('STALE_DATA');
    if(['create','decision','decision-batch'].includes(action)){const d=action==='create'?result:s.db.drafts.find(d=>d.id===values[0]);if(source(latest,d.sourceYearId,d.targetYearId).signature!==d.sourceSignature)fail('STALE_SOURCE');}
    try{localStorage.setItem(storageKey(s.schoolId),JSON.stringify(s.db));}catch{fail('STORAGE_FAILED');}return clone(result);
  }
  // Compatibility API only. Legacy ordering is retained but never drives proposals.
  function saveProgression(grades,expected,operationId,confirmed=false){return mutate(expected,operationId,'progression',[grades,confirmed],s=>{if(!confirmed)fail('CONFIRMATION_REQUIRED');if(!Array.isArray(grades)||!grades.length||grades.some(g=>!id(g)))fail('INVALID_PROGRESSION');if(new Set(grades.map(norm)).size!==grades.length)fail('DUPLICATE_GRADE');if(grades.some(g=>!s.grades.some(v=>norm(v)===norm(g))))fail('INVALID_GRADE');return s.db.progression={grades:clone(grades),revision:(s.db.progression?.revision||0)+1,actorId:s.schoolId,reviewedAt:new Date().toISOString()};});}
  function createDraft(fromId,toId,expected,operationId,confirmed=false){return mutate(expected,operationId,'create',[fromId,toId,confirmed],s=>{
    if(!confirmed)fail('CONFIRMATION_REQUIRED');const view=source(s,fromId,toId);
    if(s.db.drafts.some(d=>d.sourceYearId===fromId&&d.targetYearId===toId&&d.sourceSignature===view.signature&&d.progression?.mode==='canonical-v1'&&!d.execution))fail('DUPLICATE_DRAFT');
    const now=new Date().toISOString(),items=view.fromModel.students.filter(student=>student.hasAnnualEnrollment).map(student=>{
      const item={id:crypto.randomUUID(),academicStudentId:student.academicStudentId,name:student.name,sourceYearId:fromId,targetYearId:toId,sourceEnrollmentId:student.enrollmentId,accountId:student.identity.accountId,sourceVerification:student.verification,sourcePlacement:student.currentPlacement,eligibilityReviewed:false};
      const code=currentGrade(item,view),next=nextGrade(code),options=view.destinations.filter(d=>d.canonicalGrade===next),target=options.length===1?options[0]:null;
      Object.assign(item,{suggestedGrade:next,suggestedGradeId:target?.gradeId||null,suggestedSection:target?.section||null,suggestedClassId:target?.classId||null,destinationClassId:target?.classId||null,action:next?'promote':'manual-review'});item.diagnostics=issues(item,view);item.reviewStatus=item.diagnostics.some(c=>c!=='ELIGIBILITY_REVIEW_REQUIRED')?'unresolved':'needs-review';return item;
    });
    const d={id:crypto.randomUUID(),schoolId:s.schoolId,sourceYearId:fromId,targetYearId:toId,sourceYear:view.fromModel.selectedYear,targetYear:view.toModel.selectedYear,sourceSignature:view.signature,progression:{mode:'canonical-v1',grades:clone(order)},destinations:view.destinations,status:'draft',revision:1,items,reviews:[],actorId:s.schoolId,createdAt:now,updatedAt:now};s.db.drafts.push(d);return d;
  });}
  function editable(s,draftId,expected){const d=s.db.drafts.find(d=>d.id===draftId)||fail('DRAFT_NOT_FOUND');if(d.execution)fail('EXECUTION_LOCKED');if(expected.draftRevision!==d.revision)fail('STALE_DATA');const view=source(s,d.sourceYearId,d.targetYearId);if(d.progression?.mode!=='canonical-v1')fail('LEGACY_DRAFT_REVIEW_REQUIRED');if(view.signature!==d.sourceSignature)fail('STALE_SOURCE');return {d,view};}
  function applyDecision(d,item,decision,view,operationId){
    if(!actions.includes(decision.action))fail('INVALID_ACTION');const previous=clone(item);
    const destinationClassId=['exclude','graduation','manual-review'].includes(decision.action)?null:decision.destinationClassId||null;
    if(decision.destinationClassId&&(destinationClassId===null||!view.destinations.some(q=>q.classId===destinationClassId)))fail('INVALID_DESTINATION');
    const next={...item,action:decision.action,destinationClassId,eligibilityReviewed:decision.eligibilityReviewed===true};
    const diagnostics=issues(next,view);if(diagnostics.includes('NOT_FINAL_GRADE'))fail('NOT_FINAL_GRADE');if(diagnostics.includes('INVALID_DESTINATION'))fail('INVALID_DESTINATION');
    Object.assign(item,next,{diagnostics,reviewStatus:diagnostics.length?(diagnostics.some(c=>c!=='ELIGIBILITY_REVIEW_REQUIRED')?'unresolved':'needs-review'):'reviewed'});
    d.reviews.push({itemId:item.id,previous,decision:clone(item),operationId,actorId:d.schoolId,createdAt:new Date().toISOString()});return item;
  }
  function saveDecision(draftId,itemId,decision,expected,operationId,confirmed=false){return mutate(expected,operationId,'decision',[draftId,itemId,decision,confirmed],s=>{if(!confirmed)fail('CONFIRMATION_REQUIRED');const {d,view}=editable(s,draftId,expected),item=d.items.find(i=>i.id===itemId)||fail('ITEM_NOT_FOUND');applyDecision(d,item,decision,view,operationId);d.revision++;d.updatedAt=new Date().toISOString();return item;});}
  function reviewBatch(draftId,itemIds,decision,expected,operationId,confirmed=false){return mutate(expected,operationId,'decision-batch',[draftId,itemIds,decision,confirmed],s=>{
    if(!confirmed)fail('CONFIRMATION_REQUIRED');if(!Array.isArray(itemIds)||!itemIds.length||new Set(itemIds).size!==itemIds.length)fail('INVALID_FIELDS');const {d,view}=editable(s,draftId,expected);
    const picked=itemIds.map(id=>d.items.find(i=>i.id===id)||fail('ITEM_NOT_FOUND')).sort((a,b)=>a.academicStudentId.localeCompare(b.academicStudentId));
    const loads=new Map(view.destinations.map(q=>[q.sectionId,view.toModel.enrollments.filter(e=>e.sectionId===q.sectionId).length+d.items.filter(i=>!itemIds.includes(i.id)&&['promote','repeat','change'].includes(i.action)&&i.destinationClassId===q.sectionId).length]));
    for(const item of picked){let destination=decision.destinationClassId||null;
      if(decision.distribution==='balanced'&&['promote','repeat'].includes(decision.action)){const code=currentGrade(item,view),wanted=decision.action==='repeat'?code:nextGrade(code),options=view.destinations.filter(q=>q.canonicalGrade===wanted).sort((a,b)=>(loads.get(a.sectionId)-loads.get(b.sectionId))||a.section.localeCompare(b.section)||a.sectionId.localeCompare(b.sectionId));destination=options[0]?.sectionId||null;if(destination)loads.set(destination,loads.get(destination)+1);}
      applyDecision(d,item,{...decision,destinationClassId:['exclude','graduation','manual-review'].includes(decision.action)?null:destination},view,operationId);
    }
    d.revision++;d.updatedAt=new Date().toISOString();return {draftId:d.id,reviewed:picked.length,revision:d.revision};
  });}
  function persist(s){try{localStorage.setItem(storageKey(s.schoolId),JSON.stringify(s.db));}catch{fail('STORAGE_FAILED');}}
  function executeDraft(draftId,expected,operationId,confirmed=false){
    if(!confirmed)fail('CONFIRMATION_REQUIRED');let s=state(),d=s.db.drafts.find(d=>d.id===draftId)||fail('DRAFT_NOT_FOUND');
    if(d.execution?.status==='completed')return clone(d.execution);
    if(expected?.schoolId!==s.schoolId||expected.revision!==s.db.revision||expected.catalogSnapshot!==s.catalogSnapshot||expected.draftRevision!==d.revision)fail('STALE_DATA');
    if(!d.execution){
      const reviewed=readDraft(draftId);if(!reviewed.ready)fail(reviewed.stale?'STALE_SOURCE':'BLOCKING_ISSUES');
      const choices=reviewed.items.filter(i=>['promote','repeat','change'].includes(i.action)).map(i=>{const q=reviewed.destinations.find(q=>q.classId===i.destinationClassId);return {academicStudentId:i.academicStudentId,sectionId:q.sectionId,gradeId:q.gradeId};});
      if(!id(operationId))fail('OPERATION_ID_REQUIRED');
      d.execution={status:'pending',operationId,choices,expected:OrbitSchoolEnrollments.read().context,summary:reviewed.summary,confirmedAt:new Date().toISOString(),actorId:s.schoolId};d.revision++;s.db.revision++;persist(s);
    }
    let committed=enrollmentOperation(d),result=committed?.result;
    if(!committed){const checked=readDraft(draftId);if(checked.stale||!checked.ready)fail('STALE_SOURCE');result=d.execution.choices.length?OrbitSchoolEnrollments.promoteBatch(d.sourceYearId,d.targetYearId,d.execution.choices,d.execution.expected,d.execution.operationId,true):{placements:[]};}
    // The durable pending journal is written before the single enrollment-store commit.
    // If final audit storage fails, the enrollment operation proves completion and a
    // confirmed retry only finalizes this audit; it never enrolls the batch twice.
    s=state();d=s.db.drafts.find(d=>d.id===draftId);d.execution={...d.execution,status:'completed',completedAt:new Date().toISOString(),result};d.revision++;s.db.revision++;
    try{persist(s);}catch{return {...clone(d.execution),status:'audit-pending'};}return clone(d.execution);
  }
  window.OrbitSchoolPromotionPreviews=Object.freeze({prefix,storageKey,read,readDraft,saveProgression,createDraft,saveDecision,reviewBatch,executeDraft,canonicalGrade,automaticProgression:order,capabilities:Object.freeze({draftOnly:false,enrollmentExecution:true,graduationExecution:'review-record-only',educationalAccess:false})});
})();
