const fs = require('fs');
let code = fs.readFileSync('backend/src/server.ts', 'utf8');

// 1. Header replacement
code = code.replace(
  '<div style="text-align:center;margin-bottom:16px;"><div class="logo"><i data-lucide="user-plus"></i></div></div>\n      <h1>Tenant Registration</h1>\n      <p class="sub">Complete the steps below to request admission</p>',
  `<div style="display:flex;align-items:center;gap:18px;margin-bottom:28px;background:rgba(255,255,255,0.6);padding:20px;border-radius:24px;border:1px solid #fff;box-shadow:0 8px 32px rgba(124,58,237,0.08);">
        <div class="logo" style="margin-bottom:0;flex-shrink:0;width:64px;height:64px;"><i data-lucide="home" style="width:32px;height:32px;"></i></div>
        <div style="text-align:left;flex:1;">
          <h1 style="text-align:left;margin:0 0 6px;font-size:23px;letter-spacing:-0.5px;">Tenant Registration</h1>
          <p class="sub" style="text-align:left;margin:0;font-size:14px;color:#64748B;">Complete the steps below to request admission</p>
        </div>
      </div>`
);

// 2. CSS updates
code = code.replace(
  "body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;background:linear-gradient(135deg,#F8FAFC 0%,#EEF2FF 100%);margin:0;min-height:100vh;padding:16px 12px 48px;}",
  "body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;background:linear-gradient(135deg,#F1F5F9 0%,#E0E7FF 50%,#EDE9FE 100%);margin:0;min-height:100vh;padding:20px 16px 56px;}"
);
code = code.replace(
  ".card{max-width:500px;margin:0 auto;background:#fff;border-radius:24px;padding:24px 20px;box-shadow:0 12px 40px rgba(0,0,0,0.08);position:relative;overflow:hidden;}",
  ".card{max-width:520px;margin:0 auto;background:rgba(255,255,255,0.9);backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);border:1px solid rgba(255,255,255,0.8);border-radius:32px;padding:32px 24px;box-shadow:0 24px 60px rgba(124,58,237,0.12);position:relative;overflow:hidden;}"
);

code = code.replace(
  ".stepper::before{content:'';position:absolute;top:14px;left:28px;right:28px;height:3px;background:#E2E8F0;z-index:1;border-radius:3px;}",
  ".stepper::before{content:'';position:absolute;top:16px;left:32px;right:32px;height:4px;background:#E2E8F0;z-index:1;border-radius:4px;}"
);
code = code.replace(
  ".sp{position:absolute;top:14px;left:28px;height:3px;background:#7C3AED;z-index:2;border-radius:3px;transition:width .3s ease;}",
  ".sp{position:absolute;top:16px;left:32px;height:4px;background:linear-gradient(90deg,#7C3AED,#4F46E5);z-index:2;border-radius:4px;transition:width .5s cubic-bezier(0.4,0,0.2,1);box-shadow:0 0 10px rgba(124,58,237,0.4);}"
);
code = code.replace(
  ".stp{position:relative;z-index:3;display:flex;flex-direction:column;align-items:center;gap:5px;width:56px;}",
  ".stp{position:relative;z-index:3;display:flex;flex-direction:column;align-items:center;gap:6px;width:64px;}"
);
code = code.replace(
  ".sc{width:30px;height:30px;border-radius:50%;background:#F1F5F9;border:2.5px solid #E2E8F0;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#94A3B8;transition:all .3s;}",
  ".sc{width:36px;height:36px;border-radius:50%;background:#F8FAFC;border:2.5px solid #E2E8F0;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;color:#94A3B8;transition:all .4s cubic-bezier(0.4,0,0.2,1);}"
);
code = code.replace(
  ".stp.active .sc{background:#fff;border-color:#7C3AED;color:#7C3AED;box-shadow:0 0 0 4px rgba(124,58,237,.12);}",
  ".stp.active .sc{background:#fff;border-color:#7C3AED;color:#7C3AED;box-shadow:0 0 0 6px rgba(124,58,237,.12);transform:scale(1.1);}"
);

code = code.replace(
  "input,select,textarea{width:100%;padding:12px 13px 12px 42px;border:1.5px solid #E2E8F0;border-radius:12px;font-size:15px;color:#1E293B;outline:none;transition:all .18s;background:#F8FAFC;font-family:inherit;}",
  "input,select,textarea{width:100%;padding:14px 16px 14px 46px;border:2px solid #E2E8F0;border-radius:16px;font-size:15px;font-weight:600;color:#1E293B;outline:none;transition:all .25s;background:rgba(248,250,252,0.6);font-family:inherit;}\\n    input:hover,select:hover,textarea:hover{border-color:#CBD5E1;background:#fff;}"
);
code = code.replace(
  ".ig svg{position:absolute;left:12px;color:#94A3B8;width:20px;height:20px;pointer-events:none;transition:color .2s;}",
  ".ig svg{position:absolute;left:16px;color:#94A3B8;width:20px;height:20px;pointer-events:none;transition:color .2s;}"
);

// 3. JS validation updates
const oldJs = `    // Digits only
    var ids = ['phone','gphone','aadhaar'];
    for(var k=0; k<ids.length; k++){
      (function(id){
        var el=document.getElementById(id);
        if(el) el.addEventListener('input',function(e){ e.target.value=e.target.value.replace(/\\\\D/g,''); });
      })(ids[k]);
    }`;
const newJs = `    // Digits only and real time validation
    var ids = ['phone','gphone','aadhaar'];
    for(var k=0; k<ids.length; k++){
      (function(id){
        var el=document.getElementById(id);
        if(el) el.addEventListener('input',function(e){
          var val = e.target.value.replace(/\\\\D/g,'');
          e.target.value = val;
          if (id === 'phone' || id === 'gphone') {
            if (val.length === 10) {
              if (!/^[6-9]\\\\d{9}$/.test(val)) {
                setErr(id === 'phone' ? 'e2' : 'e5', id, 'Must start with 6, 7, 8, or 9');
              } else {
                setErr(id === 'phone' ? 'e2' : 'e5', id, '');
              }
            } else {
              if (val.length > 0 && /^[1-5]/.test(val)) {
                setErr(id === 'phone' ? 'e2' : 'e5', id, 'Must start with 6, 7, 8, or 9');
              } else {
                setErr(id === 'phone' ? 'e2' : 'e5', id, '');
              }
            }
          }
        });
      })(ids[k]);
    }`;
code = code.replace(oldJs, newJs);

fs.writeFileSync('backend/src/server.ts', code);
console.log('done');
