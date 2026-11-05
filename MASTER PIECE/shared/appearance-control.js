/* Icon control uses the shared appearance preference and the existing ORBIT sun/moon artwork. */
(() => {
  const sun = '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l2 2m10 10 2 2M5 19l2-2m12-12-2 2"/>';
  const moon = '<path d="M21 13A9 9 0 0 1 11 3a9 9 0 1 0 10 10Z"/>';
  function mount(button) {
    const update = () => {
      const dark = document.body.dataset.theme === 'dark', en = document.documentElement.lang === 'en';
      const label = dark ? (en ? 'Switch to light mode' : 'التبديل إلى الوضع الفاتح') : (en ? 'Switch to dark mode' : 'التبديل إلى الوضع الداكن');
      button.setAttribute('aria-label',label); button.setAttribute('aria-pressed',String(dark)); button.title=label;
      const paths=dark?sun:moon;
      if(button.querySelector('svg')?.innerHTML!==paths)button.innerHTML=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
    };
    new MutationObserver(update).observe(document.body,{attributes:true,attributeFilter:['data-theme']});
    new MutationObserver(update).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
    update();
  }
  window.OrbitAppearanceControl=Object.freeze({mount});
})();
