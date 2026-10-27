import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const index = read('../index.html');
const dock = read('../assets/js/mobile-dock.js');
const css = read('../assets/css/mobile-dock.css');

const checks = [
  ['score page remains present and unique', (index.match(/id="page-score"/g) ?? []).length === 1],
  ['admin page remains present and unique', (index.match(/id="page-admin"/g) ?? []).length === 1],
  ['admin refresh restores the selected page after async work', (() => {
    const start = index.indexOf("rbEl('rbAdminRefresh').addEventListener('click'");
    const end = index.indexOf("rbEl('rbAdminAuditRefresh')", start);
    if (start < 0 || end < 0) return false;
    const refresh = index.slice(start, end);
    return (refresh.match(/preserveAdminView\(\)/g) ?? []).length >= 4
      && refresh.includes('isLocallyAuthorized')
      && refresh.includes('rbAdminStatus(');
  })()],
  ['owner remains explicitly authorized in the late admin UI sync', index.includes("const owner=!!(signed&&String(user.id||'')==='7e799691-ba7e-42ea-ab6f-71ad11ca32ff')")],
  ['privacy gate contains a language control', index.includes('rbLanguageGateSelect')],
  ['language consent dialog respects an already-open privacy gate', index.includes('privacyGate.classList.contains(\'rb-gate-open\')')],
  ['language consent dialog reacts if the privacy gate opens later', index.includes('overlay._rbPrivacyGateObserver.observe(privacyGate,{attributes:true,attributeFilter:[\'class\']})')],
  ['scheduled notice state takes precedence when available', dock.includes('settings.display_notice_active??settings.notice_active')],
  ['disabled dock tabs obey the hidden attribute', css.includes('nav button[data-page][hidden] { display: none !important; }')],
  ['mobile dock is constrained to the viewport', css.includes('left:12px!important;right:12px!important;') && css.includes('max-width:680px!important;')],
];

for (const [label, pass] of checks) {
  assert.ok(pass, `FAIL: ${label}`);
  console.log(`PASS: ${label}`);
}
console.log(`\n${checks.length} regression checks passed.`);
