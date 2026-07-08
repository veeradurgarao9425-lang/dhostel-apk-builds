const fs = require('fs');
let code = fs.readFileSync('backend/src/server.ts', 'utf8');

// 1. Fix CSS padding and remove .ig rules
code = code.replace('padding:12px 13px 12px 42px', 'padding:14px 16px');
code = code.replace('border:1.5px solid #E2E8F0;border-radius:12px;', 'border:2px solid #E2E8F0;border-radius:16px;');

// 2. Fix Logo
code = code.replace('<div class="logo"><i data-lucide="user-plus"></i></div>', '<div class="logo" style="font-size:32px;">🏠</div>');

// 3. Remove .ig wrappers and lucide icons
// inputs
code = code.replace(/<div class="ig"><i data-lucide="[^"]+"><\/i>(<input[^>]+>)<\/div>/g, '$1');
// textareas
code = code.replace(/<div class="ig"><i data-lucide="[^"]+"><\/i>(<textarea[^>]*>.*?<\/textarea>)<\/div>/g, '$1');
// selects
code = code.replace(/<div class="ig"><i data-lucide="[^"]+"><\/i>(<select[\s\S]*?<\/select>)<\/div>/g, '$1');

// 4. Ensure real-time validation is there
const oldJs = `    // Digits only
    var ids = ['phone','gphone','aadhaar'];
    for(var k=0; k<ids.length; k++){
      (function(id){
        var el=document.getElementById(id);
        if(el) el.addEventListener('input',function(e){ e.target.value=e.target.value.replace(/\\D/g,''); });
      })(ids[k]);
    }`;
const newJs = `    // Digits only and real-time validation
    ['phone','gphone','aadhaar'].forEach(function(id){
      var el=document.getElementById(id);
      if(el) el.addEventListener('input',function(){
        var val = this.value.replace(/[^0-9]/g,'');
        this.value = val;
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
    });`;

if (code.includes(oldJs)) {
    code = code.replace(oldJs, newJs);
}

// Ensure the form doesn't submit if validation fails
const oldSubmit = `      var p = val('phone').trim();
      if(!/^[6-9]\\d{9}$/.test(p)){
        if(p.length > 0 && /^[1-5]/.test(p)) {
          setErr('e2','phone','Mobile number must start with 6, 7, 8, or 9');
        } else {
          setErr('e2','phone','Enter a valid 10-digit mobile number starting with 6-9');
        }
        ok=false;
      }else{setErr('e2','phone','');}`;

const newSubmit = `      if(!/^[6-9]\\\\d{9}$/.test(val('phone').trim())){setErr('e2','phone','Enter a valid 10-digit mobile number');ok=false;}else{setErr('e2','phone','');}`;

if (code.includes(oldSubmit)) {
    code = code.replace(oldSubmit, newSubmit);
}

fs.writeFileSync('backend/src/server.ts', code);
console.log('Fixed UI successfully without overhauling the whole file.');
