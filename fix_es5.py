import re

with open(r'c:\dhostel-main\backend\src\server.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# The ES5 script payload
es5_script = r'''      <script>
        var currentStep = 1;

        function updateStepperUI(step) {
          var progress = step === 1 ? 0 : step === 2 ? 50 : 100;
          document.getElementById('step-progress').style.width = progress + '%';
          
          for (var i = 1; i <= 3; i++) {
            var nav = document.getElementById('step-nav-' + i);
            var circle = document.getElementById('step-circle-' + i);
            
            nav.classList.remove('active');
            nav.classList.remove('completed');
            if (i === step) {
              nav.classList.add('active');
              circle.innerHTML = i;
            } else if (i < step) {
              nav.classList.add('completed');
              circle.innerHTML = '✓';
            } else {
              circle.innerHTML = i;
            }
          }
          
          var contents = document.querySelectorAll('.step-content');
          for (var j = 0; j < contents.length; j++) {
            contents[j].classList.remove('active');
          }
          document.getElementById('step-' + step).classList.add('active');
          if (window.scrollTo) {
            try {
              window.scrollTo({ top: 0, behavior: 'smooth' });
            } catch (e) {
              window.scrollTo(0, 0);
            }
          }
        }

        function prevStep(step) {
          currentStep = step - 1;
          updateStepperUI(currentStep);
        }

        function nextStep(step) {
          var ok = true;
          var form = document.getElementById('signupForm');
          
          if (step === 1) {
            if (!form.first_name.value.trim()) { showError('first_name', 'First name is required'); ok = false; }
            else { showError('first_name', ''); }

            var phone = form.phone.value.trim();
            if (!/^\d{10}$/.test(phone)) { showError('phone', 'Enter a valid 10-digit mobile number'); ok = false; }
            else { showError('phone', ''); }

            var email = form.email.value.trim();
            if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { showError('email', 'Enter a valid email address'); ok = false; }
            else { showError('email', ''); }

            if (!form.permanent_address.value.trim()) { showError('permanent_address', 'Permanent address is required'); ok = false; }
            else { showError('permanent_address', ''); }
          }
          
          if (step === 2) {
            var gphone = form.guardian_phone.value.trim();
            if (gphone && !/^\d{10}$/.test(gphone)) { showError('guardian_phone', 'Enter a valid 10-digit number'); ok = false; }
            else { showError('guardian_phone', ''); }
          }

          if (!ok) {
            showToast('Please fix the errors above.');
            var firstInvalid = form.querySelector('.invalid');
            if (firstInvalid && firstInvalid.scrollIntoView) {
              try { firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
              catch(e) { firstInvalid.scrollIntoView(); }
            }
            return;
          }
          
          currentStep = step + 1;
          updateStepperUI(currentStep);
        }

        function showToast(msg) {
          var t = document.getElementById('toast');
          document.getElementById('toast-msg').textContent = msg;
          t.classList.add('show');
          setTimeout(function() { t.classList.remove('show'); }, 4000);
        }

        function showError(name, msg) {
          var el = document.getElementById('err-' + name);
          var input = document.getElementById(name);
          if (el) el.textContent = msg || '';
          if (input) {
            if (msg) input.classList.add('invalid');
            else input.classList.remove('invalid');
          }
        }

        var fileFields = ['aadhaar_front', 'aadhaar_back'];
        for (var k = 0; k < fileFields.length; k++) {
          (function(name) {
            var input = document.getElementById(name);
            var btn = document.getElementById('btn-' + name);
            var label = document.getElementById('label-' + name);
            if (input) {
              input.addEventListener('change', function () {
                var hasFile = input.files && input.files.length > 0;
                if (hasFile) {
                  btn.classList.add('has-file');
                  label.textContent = '✓ ' + input.files[0].name;
                } else {
                  btn.classList.remove('has-file');
                  label.textContent = '📷 Tap to Upload ' + (name === 'aadhaar_front' ? 'Front' : 'Back');
                }
              });
            }
          })(fileFields[k]);
        }

        var signupForm = document.getElementById('signupForm');
        if (signupForm) {
          signupForm.addEventListener('submit', function (e) {
            e.preventDefault();
            
            var ok = true;
            var form = e.target;
            
            var aadhaar = form.id_proof_number.value.trim();
            if (!/^\d{12}$/.test(aadhaar)) { showError('id_proof_number', 'Aadhaar must be exactly 12 digits'); ok = false; }
            else { showError('id_proof_number', ''); }

            if (!ok) {
              showToast('Please fix the errors in Identity tab.');
              return;
            }

            var submitBtn = document.getElementById('submitBtn');
            submitBtn.disabled = true;
            
            var formData = new FormData(form);
            var actionUrl = "${formAction}";
            
            document.getElementById('loader').classList.add('show');

            fetch(actionUrl, {
              method: 'POST',
              body: formData,
              headers: {
                'Accept': 'application/json'
              }
            })
            .then(function(response) {
              return response.json().then(function(data) {
                return { response: response, data: data };
              });
            })
            .then(function(result) {
              var response = result.response;
              var data = result.data;
              document.getElementById('loader').classList.remove('show');
              submitBtn.disabled = false;

              if (response.ok && data.success) {
                document.getElementById('form-container').style.display = 'none';
                document.getElementById('success-screen').style.display = 'block';
              } else {
                showToast(data.error || 'Registration failed. Please try again.');
                if (data.error && data.error.toLowerCase().indexOf('aadhaar') !== -1) {
                  showError('id_proof_number', data.error);
                  currentStep = 3;
                  updateStepperUI(3);
                }
              }
            })
            .catch(function(err) {
              document.getElementById('loader').classList.remove('show');
              submitBtn.disabled = false;
              showToast('Network error. Please check your connection.');
            });
          });
        }
      </script>'''

# Escape template string properly for regex replacement if needed, 
# but easiest is to replace the chunk:

start_idx = content.find('<script>')
end_idx = content.find('</script>') + 9

if start_idx != -1 and end_idx != -1:
    new_content = content[:start_idx] + es5_script.strip() + content[end_idx:]
    with open(r'c:\dhostel-main\backend\src\server.ts', 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("Successfully replaced <script> block with ES5 compliant code.")
else:
    print("Could not find script block")
