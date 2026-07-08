const fs = require('fs');
let code = fs.readFileSync('backend/src/server.ts', 'utf8');

// 1. Fix CSS
code = code.replace(
  ".ig{position:relative;display:flex;align-items:center;}\n    .ig i{position:absolute;left:12px;color:#94A3B8;width:20px;height:20px;pointer-events:none;transition:color .2s;}",
  ""
);
code = code.replace(
  "input,select,textarea{width:100%;padding:14px 16px 14px 46px;border:2px solid #E2E8F0;border-radius:16px;font-size:15px;font-weight:600;color:#1E293B;outline:none;transition:all .25s;background:rgba(248,250,252,0.6);font-family:inherit;}\n    input:hover,select:hover,textarea:hover{border-color:#CBD5E1;background:#fff;}",
  "input,select,textarea{width:100%;padding:12px 13px;border:1.5px solid #E2E8F0;border-radius:10px;font-size:15px;color:#1E293B;outline:none;transition:all .18s;background:#F8FAFC;font-family:inherit;}\n    input:focus,select:focus,textarea:focus{border-color:#7C3AED;background:#fff;box-shadow:0 0 0 3px rgba(124,58,237,.1);}"
);
// Remove leftover .ig css
code = code.replace(".ig textarea{padding-left:42px;padding-top:14px;}\n    .ig .lucide-map-pin{top:14px;}\n", "");
code = code.replace("input:focus + i, select:focus + i, textarea:focus + i{color:#7C3AED;}\n    .ig:has(input:focus) i, .ig:has(select:focus) i, .ig:has(textarea:focus) i {color:#7C3AED;}\n", "");

// 2. Fix header
const oldHeader = `<div style="display:flex;align-items:center;gap:18px;margin-bottom:28px;background:rgba(255,255,255,0.6);padding:20px;border-radius:24px;border:1px solid #fff;box-shadow:0 8px 32px rgba(124,58,237,0.08);">
        <div class="logo" style="margin-bottom:0;flex-shrink:0;width:64px;height:64px;"><i data-lucide="home" style="width:32px;height:32px;"></i></div>
        <div style="text-align:left;flex:1;">
          <h1 style="text-align:left;margin:0 0 6px;font-size:23px;letter-spacing:-0.5px;">Tenant Registration</h1>
          <p class="sub" style="text-align:left;margin:0;font-size:14px;color:#64748B;">Complete the steps below to request admission</p>
        </div>
      </div>`;
const newHeader = `<div style="text-align:center;margin-bottom:12px;"><div class="logo">🏠</div></div>
      <h1>Tenant Registration</h1>
      <p class="sub">Complete the steps below to request admission</p>`;
code = code.replace(oldHeader, newHeader);

// 3. Remove .ig and <i data-lucide="..."> from inputs
code = code.replace(/<div class="ig">\s*<i data-lucide="[^"]+"><\/i>\s*(.*?)<\/div>/g, '$1');

// 4. Remove lucide script and icons
code = code.replace('<script src="https://unpkg.com/lucide@latest"></script>\n  ', '');
code = code.replace('lucide.createIcons();', '');

fs.writeFileSync('backend/src/server.ts', code);
console.log('done');
