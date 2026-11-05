(() => {
 'use strict';
 const t=(en,ar)=>document.documentElement.lang==='en'?en:ar,esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const days=()=>[t('Sunday','الأحد'),t('Monday','الاثنين'),t('Tuesday','الثلاثاء'),t('Wednesday','الأربعاء'),t('Thursday','الخميس'),t('Friday','الجمعة'),t('Saturday','السبت')];
 function mount(){
  const host=document.querySelector('#teacher-app main,#app main,#app .main-content,#app .dashboard-content');if(!host||host.querySelector('[data-school-member]'))return;
  const actor = OrbitAuth.current();
  const contentReviews = actor?.role === 'teacher' ? window.OrbitAnnualMonitoring?.teacherRequests() || [] : [];
  let modern=[];try{modern=window.OrbitSchoolPeriods?.memberTimetables()||[];}catch{}let view;try{view=OrbitSchoolWorkflow.memberView();}catch{if(!modern.length&&!contentReviews.length)return;view={periods:[],events:[],requests:[]};}
  const section=document.createElement('section');section.dataset.schoolMember='';section.className='orbit-school-member';
  section.innerHTML=`<h2>${t('School timetable & announcements','الجدول والإعلانات المدرسية')}</h2>${view.periods.length?`<ul>${[...view.periods].sort((a,b)=>a.day-b.day||a.startTime.localeCompare(b.startTime)).map(p=>`<li><div><strong>${esc(p.subjectName||p.classLabel||p.classId)}</strong><small>${esc(OrbitAuth.get('orbit.school.academics.demo.v1:'+encodeURIComponent(view.schoolId),{teachers:[]}).teachers.find(r=>r.id===p.teacherId)?.name||t('Teacher needs review','المعلم بحاجة إلى مراجعة'))}</small><p>${esc(p.classLabel||'')} · ${p.day<=4?days()[p.day]:t('Outside current teaching days','خارج أيام التدريس الحالية')} · ${t('Legacy schedule · Review required','جدول قديم · بحاجة إلى مراجعة')} · ${esc(p.room)}</p><a href="../channel/channel.html?id=${encodeURIComponent(p.channelId)}">${t('Open class channel','فتح قناة الصف')}</a></div></li>`).join('')}</ul>`:`<p>${t('The school has not published your timetable yet.','لم تنشر المدرسة جدولك بعد.')}</p>`}${view.events.length?`<h3>${t('School announcements','إعلانات المدرسة')}</h3>${view.events.map(e=>`<article><h4>${esc(e.title)}</h4><p>${esc(e.description)}</p><time>${esc(e.dateTime.replace('T',' · '))}</time></article>`).join('')}`:''}${view.requests.length?`<h3>${t('Your change requests','طلبات التعديل الخاصة بك')}</h3><ul>${view.requests.map(r=>`<li>${esc(r.reason)} · ${t(({pending:'Pending',approved:'Approved',rejected:'Rejected'})[r.status],({pending:'قيد المراجعة',approved:'مقبول',rejected:'مرفوض'})[r.status])}</li>`).join('')}</ul>`:''}`;
  if(modern.length){if(!view.periods.length)section.querySelector('h2+p')?.remove();OrbitSchoolPeriodMember.append(section,modern);}
  if(modern.length)section.querySelector('h2').textContent=t('School workspace','مساحة المدرسة');
  if (contentReviews.length) {
    const statuses = { pending: t('Awaiting teacher','بانتظار المعلم'), reopened: t('Reopened','أُعيد الفتح'),
      responded: t('Awaiting school decision','بانتظار قرار المدرسة'), closed: t('Closed','مغلق'),
      corrected: t('Correction completed','تم التصحيح'), explained: t('Explanation provided','تم تقديم توضيح') };
    section.insertAdjacentHTML('beforeend', `<h3>${t('School content review requests','طلبات المدرسة لمراجعة المحتوى')}</h3>
      <ul>${contentReviews.map(note => `<li><strong>${esc(note.title || '')}</strong>
        <p>${esc(note.reason)}</p><p>${t('Status','الحالة')} · ${esc(statuses[note.status])}</p>
        ${note.history?.length ? `<details><summary>${t('Review history','سجل المراجعة')}</summary><ul>
          ${note.history.map(item => `<li>${esc(statuses[item.decision])} · ${esc(item.response)}</li>`).join('')}</ul></details>` : ''}
        ${!note.archived && ['pending','reopened'].includes(note.status) ? `<form data-review-request="${esc(note.id)}">
          <label>${t('Response','الرد')} <input name="response" required maxlength="500"></label>
          <button name="decision" value="corrected">${t('Correction completed','تم التصحيح')}</button>
          <button name="decision" value="explained">${t('Explain why no change was made','توضيح سبب عدم التغيير')}</button>
          <p role="status"></p></form>` : ''}<a href="../channel/channel.html?id=${encodeURIComponent(note.channelId)}&amp;post=${encodeURIComponent(note.postId)}">${t('Open content','فتح المحتوى')}</a></li>`).join('')}</ul>`);
  }
  section.addEventListener('submit', event => {
    const form = event.target.closest('[data-review-request]');
    if (!form) return;
    event.preventDefault();
    const request = contentReviews.find(item => item.id === form.dataset.reviewRequest);
    try {
      OrbitAnnualMonitoring.resolve(request.schoolId, request.yearId, request.id, event.submitter?.value, new FormData(form).get('response'));
      const status = form.querySelector('[role=status]');
      status.textContent = t('Response sent for school review.','أُرسل الرد لمراجعة المدرسة.');
      status.tabIndex = -1;
      status.focus();
      for (const control of form.elements) control.disabled = true;
    } catch { form.querySelector('[role=status]').textContent = t('This request could not be updated.','تعذر تحديث الطلب.'); }
  });
  const welcome=host.querySelector('.welcome');if(welcome)welcome.after(section);else if(host.querySelector('footer'))host.querySelector('footer').before(section);else host.append(section);
 }
 window.addEventListener('orbit:school-member-refresh',()=>{document.querySelector('[data-school-member]')?.remove();mount();});
 window.addEventListener('focus',()=>document.querySelector('[data-numbered-school-timetable]')?.refresh?.());
 window.addEventListener('orbit:school-periods-change',()=>queueMicrotask(()=>document.querySelector('[data-numbered-school-timetable]')?.refresh?.()));
 window.addEventListener('storage',e=>{if(!e.key||['orbit.recruitment.v1','orbit.admin.v1','orbit.assignments.v1'].includes(e.key)||['orbit.school.monitoring-reviews.v1:','orbit.school.period-timetables.demo.v1:','orbit.school.teaching-assignments.demo.v1:','orbit.school.years.demo.v1:','orbit.school.enrollments.demo.v1:','orbit.school.enrollment-identities.demo.v1:','orbit.school.section-structures.demo.v1:','orbit.school.education.links.v1:'].some(k=>e.key.startsWith(k))){document.querySelector('[data-school-member]')?.remove();mount();}});
 document.addEventListener('DOMContentLoaded',()=>{mount();new MutationObserver(()=>{if(!document.querySelector('[data-school-member]'))mount();}).observe(document.getElementById('teacher-app')||document.getElementById('app'),{childList:true,subtree:true});});
})();
