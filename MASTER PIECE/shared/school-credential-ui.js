/* Shared in-memory issuance receipt for school-managed student and teacher accounts. */
(() => {
  'use strict';
  const esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function temporary(){
    const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%&*+-?';
    const limit=256-(256%alphabet.length);
    let password;
    do {
      password='';
      while(password.length<12){
        const bytes=crypto.getRandomValues(new Uint8Array(12-password.length));
        // Reject the incomplete range before modulo so every character is equally likely.
        for(const byte of bytes)if(byte<limit)password+=alphabet[byte%alphabet.length];
      }
      // Reject the entire candidate to preserve uniform selection among valid passwords.
    }while(!/[A-Z]/.test(password)||!/[a-z]/.test(password)||!/[0-9]/.test(password)||!/[!@#$%&*+?=-]/.test(password));
    return password;
  }
  function show(host,email,password,t){
    host.querySelector('[data-issued-credentials]')?.remove();
    const receipt=document.createElement('section');receipt.className='sm-issued-credentials';receipt.dataset.issuedCredentials='';receipt.setAttribute('aria-label',t('One-time account credentials','بيانات الحساب لمرة واحدة'));
    receipt.innerHTML=`<h3>${t('Account issued · Share privately now','أُصدر الحساب · شارك البيانات بشكل خاص الآن')}</h3><p>${t('Shown once. Closing this receipt or leaving this page clears the temporary password.','تُعرض مرة واحدة. إغلاق الإيصال أو مغادرة الصفحة يمسح كلمة المرور المؤقتة.')}</p><p><bdi>${esc(email)}</bdi></p><p><code dir="ltr" tabindex="0" aria-label="${t('Temporary password','كلمة المرور المؤقتة')}">${esc(password)}</code></p><button class="btn soft" type="button" data-credential-copy>${t('Copy temporary password','نسخ كلمة المرور المؤقتة')}</button><span role="status" data-copy-status></span><button class="btn soft" type="button" data-credential-dismiss>${t('Dismiss credentials','إغلاق بيانات الدخول')}</button>`;
    receipt.querySelector('[data-credential-dismiss]').onclick=()=>{password='';receipt.remove();};
    receipt.querySelector('[data-credential-copy]').onclick=async()=>{const status=receipt.querySelector('[data-copy-status]');try{await navigator.clipboard.writeText(password);status.textContent=t('Copied. Clear your clipboard after sharing privately.','نُسخت. امسح الحافظة بعد المشاركة بشكل خاص.');}catch{status.textContent=t('Copy unavailable. Select and copy the password above.','النسخ غير متاح. حدد وانسخ كلمة المرور أعلاه.');}};
    const anchor=host.querySelector('[data-student-feedback],.sm-section-heading');if(anchor)anchor.after(receipt);else host.prepend(receipt);receipt.querySelector('button').focus();
  }
  window.OrbitSchoolCredentials=Object.freeze({temporary,show});
})();
