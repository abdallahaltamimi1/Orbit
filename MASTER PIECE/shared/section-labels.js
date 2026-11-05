/* Display only: IDs, names and academic snapshots are never rewritten. */
(()=>{'use strict';const latin='ABCDEFGHIJKLMNOPQRSTUVWXYZ',arabic=['أ','ب','ج','د','هـ','و','ز','ح','ط','ي','ك','ل','م','ن','س','ع','ف','ص','ق','ر','ش','ت','ث','خ','ذ','ض'];
function canonical(value){const v=String(value??'').normalize('NFKC').trim().replace(/ـ/g,'').toUpperCase();if(v.length===1&&latin.includes(v))return v;const i=arabic.findIndex(a=>a.replace(/ـ/g,'')===v);return i<0?null:latin[i];}
function label(value,language=document.documentElement.lang){const code=canonical(value);return code?(language==='ar'?arabic[latin.indexOf(code)]:code):value;}
window.OrbitSectionLabels=Object.freeze({canonical,label});})();
