const fs = require('fs');
let content = fs.readFileSync('mobile/src/Pages/StudentDetailsScreen.tsx', 'utf8');

const oldConfirm = `        } else if (currentStatus === 3) {
            nextStatus = 1;
            title = 'Approve QR Signup?';
            message = 'Approve this tenant signup? They will be active and you will need to allocate a room to start billing.';
            confirmText = 'Approve & Check In';`;

const newConfirm = `        } else if (currentStatus === 3) {
            navigation.navigate('AddStudent', { student: coreData, isEdit: true, quickAllocate: true });
            return;`;

content = content.replace(oldConfirm, newConfirm);
fs.writeFileSync('mobile/src/Pages/StudentDetailsScreen.tsx', content);
console.log('Successfully patched StudentDetailsScreen.tsx');
