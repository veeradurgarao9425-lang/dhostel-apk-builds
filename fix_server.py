import re

with open(r'c:\dhostel-main\backend\src\server.ts', 'r', encoding='utf-8') as f:
    content = f.read()

new_qr_error_func = r'''
const qrSignupErrorPage = (message: string) =>
  `<div style="background:#fef2f2;color:#7f1d1d;padding:14px;border-radius:10px;font-family:sans-serif;">⚠️ ${message}</div>`;
'''
content = content.replace("app.post('/api/public/qr-signup'", new_qr_error_func + "\napp.post('/api/public/qr-signup'")

old_call = r'''sendNotificationToHostelOwner(
      numHostelId,
      'New Registration Request',
      `${first_name} has submitted a registration request via QR. Review and assign a room.`,
      'REGISTRATION',
      newStudentId
    );'''

new_call = r'''sendNotificationToHostelOwner(
      numHostelId,
      'New Admission',
      'New Registration Request',
      `${first_name} has submitted a registration request via QR. Review and assign a room.`,
      'High',
      { studentId: newStudentId }
    );'''

content = content.replace(old_call, new_call)

with open(r'c:\dhostel-main\backend\src\server.ts', 'w', encoding='utf-8') as f:
    f.write(content)
print('Fixed server.ts')
