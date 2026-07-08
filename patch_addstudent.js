const fs = require('fs');
let content = fs.readFileSync('mobile/src/Pages/AddStudentScreen.tsx', 'utf8');

// 1. Destructure quickAllocate from route.params
content = content.replace("const { student, isEdit, roomId: paramsRoomId, bedId } = route.params || {};", "const { student, isEdit, roomId: paramsRoomId, bedId, quickAllocate } = route.params || {};");

// 2. Set status payload depending on quickAllocate
content = content.replace("status: isEdit ? student.status : 1,", "status: (isEdit && !quickAllocate) ? student.status : 1,");

// 3. Update the header title
content = content.replace("<AppHeader title={isEdit ? 'Edit Tenant' : 'Add Tenant'} />", "<AppHeader title={quickAllocate ? 'Approve Tenant' : (isEdit ? 'Edit Tenant' : 'Add Tenant')} />");

// 4. Wrap sections in !quickAllocate condition. The formCard sections are:
// "Basic Information", "Identity & Documents", "Guardian (Optional)", "Admission Details", "Room & Bed Allocation", "Address"
// We want to hide all except "Room & Bed Allocation".
// Since we can't reliably regex parse React components, we will insert `{ !quickAllocate && (` before Basic Info, and `)}` after Admission Details.
// And `{ !quickAllocate && (` before Address, and `)}` after Address.

const basicInfoMarker = `{/* 📋 Basic Info 📋 */}`;
const roomBedMarker = `{/* 📋 Room & Bed 📋 */}`;
const addressMarker = `{/* 📋 Address 📋 */}`;
const submitViewMarker = `<View style={styles.submitContainer}>`;

content = content.replace(basicInfoMarker, `{ !quickAllocate && ( <> ` + basicInfoMarker);
content = content.replace(roomBedMarker, `</> )} ` + roomBedMarker);
content = content.replace(addressMarker, `{ !quickAllocate && ( <> ` + addressMarker);
content = content.replace(submitViewMarker, `</> )} ` + submitViewMarker);

// 5. Change the submit button text
content = content.replace("<Text style={styles.submitText}>{isEdit ? 'Update Tenant' : 'Add Tenant'}</Text>", "<Text style={styles.submitText}>{quickAllocate ? 'Approve & Allocate Room' : (isEdit ? 'Update Tenant' : 'Add Tenant')}</Text>");

fs.writeFileSync('mobile/src/Pages/AddStudentScreen.tsx', content);
console.log('Successfully patched AddStudentScreen.tsx');
