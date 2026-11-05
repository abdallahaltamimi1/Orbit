/* Dashboard-only motion and explicit demo import. No persistent data changes on mount. */
(() => {
  'use strict';
  let entered=false;
  const t=(en,ar)=>document.documentElement.lang==='en'?en:ar;
  function mount(host) {
    if(entered)return;entered=true;
    const media=matchMedia('(prefers-reduced-motion: reduce)');
    if(media.matches||document.body.dataset.orbitMood==='calm')return;
    const cards=[...host.querySelectorAll('.sm-totals > div,.sm-grid > section,.ad-monitor')];
    const easing=getComputedStyle(document.documentElement).getPropertyValue('--orbit-motion-ease-out').trim()||'cubic-bezier(.23,1,.32,1)';
    const animations=cards.map((card,i)=>card.animate([{opacity:0,transform:'translateY(8px)'},{opacity:1,transform:'translateY(0)'}],{duration:200,delay:i*35,easing,fill:'backwards'}));
    const counts=[...host.querySelectorAll('[data-count]')].map(node=>({node,target:Number(node.dataset.count),format:new Intl.NumberFormat(document.documentElement.lang==='en'?'en-GB':'ar-JO')}));
    for(const c of counts){c.node.style.minInlineSize=`${c.format.format(c.target).length}ch`;c.node.firstChild.nodeValue=c.format.format(0);}
    const start=performance.now();let frame;
    const finish=()=>{cancelAnimationFrame(frame);for(const c of counts)if(c.node.isConnected)c.node.firstChild.nodeValue=c.format.format(c.target);media.removeEventListener('change',change);};
    const change=()=>{if(media.matches){animations.forEach(a=>a.cancel());finish();}};
    function tick(now){if(!host.isConnected||!host.closest('.academic-dashboard')){finish();return;}const p=Math.min(1,(now-start)/280),eased=1-Math.pow(1-p,3);for(const c of counts)if(c.node.isConnected)c.node.firstChild.nodeValue=c.format.format(Math.round(c.target*eased));if(p<1)frame=requestAnimationFrame(tick);else finish();}
    media.addEventListener('change',change);frame=requestAnimationFrame(tick);
  }
  function openDemo(trigger) {
    const dialog=document.createElement('dialog');dialog.className='sm-academic-dialog ad-demo-dialog';dialog.setAttribute('aria-labelledby','ad-demo-title');
    dialog.innerHTML=`<form><h2 id="ad-demo-title">${t('Load Demo School Data','تحميل بيانات المدرسة التجريبية')}</h2><p>${t('Create a separate fictional school with 300 students, 15 teachers, 12 sections of 25 students, and one active academic year (2026–2027).','أنشئ مدرسة خيالية منفصلة تضم 300 طالب و15 معلمًا و12 شعبة، في كل منها 25 طالبًا، وسنة دراسية نشطة واحدة (2026–2027).')}</p><p>${t('Includes 108 reviewed teaching assignments, 324 published periods, 15 school channels with lessons and assignments, 2,160 submissions, 1,620 evaluations, and 3 upcoming events.','تشمل 108 توزيعات تدريس و324 حصة منشورة، و15 قناة مدرسية مع دروس وواجبات، و2160 تسليمًا و1620 تقييمًا و3 فعاليات قادمة.')}</p><p>${t('Your current school, recruitment records, and archived data are preserved. Repeating this action reopens the saved demo; it never resets your edits.','تُحفظ مدرستك الحالية وسجلات التوظيف والبيانات المؤرشفة. تؤدي إعادة الإجراء إلى فتح المدرسة التجريبية المحفوظة دون إعادة ضبط تعديلاتك.')}</p><p class="ad-demo-disclaimer">${t('Development/demo only: these fictional browser-local accounts are not production authentication. Password: OrbitDemo2026! Account details are in the demo guide.','للتطوير والعرض فقط: هذه حسابات خيالية محلية في المتصفح وليست مصادقة إنتاجية. كلمة المرور: OrbitDemo2026! تفاصيل الحسابات في دليل التجربة.')}</p><label class="sm-preview-confirm"><input type="checkbox" name="confirmed" required> ${t('I confirm creating or reopening this separate demo school.','أؤكد إنشاء المدرسة التجريبية المنفصلة أو إعادة فتحها.')}</label><p role="status" data-demo-status></p><p role="alert" class="sm-error"></p><div class="sm-dialog-actions"><button class="btn" type="submit">${t('Load and open demo school','تحميل وفتح المدرسة التجريبية')}</button><button class="btn soft" type="button" data-demo-cancel>${t('Cancel','إلغاء')}</button></div></form>`;
    document.getElementById('orbit-page').append(dialog);let busy=false;
    dialog.querySelector('[data-demo-cancel]').onclick=()=>dialog.close();dialog.oncancel=e=>{if(busy)e.preventDefault();};
    dialog.onclose=()=>{dialog.remove();if(trigger.isConnected)trigger.focus();};
    dialog.querySelector('form').onsubmit=async e=>{e.preventDefault();if(busy)return;busy=true;dialog.querySelectorAll('button,input').forEach(b=>b.disabled=true);dialog.setAttribute('aria-busy','true');dialog.querySelector('[data-demo-status]').textContent=t('Preparing local demo records…','جارٍ تجهيز السجلات التجريبية المحلية…');
      try{await OrbitAcademicDemo.load(true);OrbitAcademicDemo.enter();}
      catch(error){const messages={DEMO_CONFLICT:t('Conflicting or incomplete demo records exist. Nothing was replaced. Review browser storage before retrying.','توجد سجلات تجريبية متعارضة أو غير مكتملة. لم يُستبدل شيء. راجع تخزين المتصفح قبل المحاولة.'),STALE_DATA:t('The account or saved data changed. Close this dialog and retry.','تغير الحساب أو البيانات المحفوظة. أغلق النافذة وحاول مجددًا.')};dialog.querySelector('[role=alert]').textContent=messages[error.message]||t('The demo could not be saved. Check browser storage space, then retry; an interrupted import is recovered on the next explicit attempt.','تعذر حفظ التجربة. تحقق من مساحة تخزين المتصفح ثم حاول مجددًا؛ تُستعاد العملية المنقطعة عند المحاولة الصريحة التالية.');busy=false;dialog.querySelectorAll('button,input').forEach(b=>b.disabled=false);dialog.removeAttribute('aria-busy');dialog.querySelector('[data-demo-status]').textContent='';}
    };dialog.showModal();
  }
  document.addEventListener('click',event=>{const trigger=event.target.closest('[data-load-academic-demo]');if(trigger)openDemo(trigger);});
  window.OrbitAcademicDashboard=Object.freeze({mount});
})();
