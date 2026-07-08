const fs = require('fs');
let content = fs.readFileSync('backend/src/server.ts', 'utf8');

const tOld1 = "if (!first_name || !String(first_name).trim()) return sendError('First Name is required');\r\n    if (!phone || !/^\\d{10}$/.test(String(phone).trim())) return sendError('A valid 10-digit Phone number is required');\r\n    if (email && !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(String(email).trim())) return sendError('Enter a valid email address');\r\n    if (guardian_phone && !/^\\d{10}$/.test(String(guardian_phone).trim())) return sendError('Guardian Phone must be a valid 10-digit number');\r\n    if (!permanent_address || !String(permanent_address).trim()) return sendError('Permanent Address is required');\r\n    if (!id_proof_number || !/^\\d{12}$/.test(String(id_proof_number).trim())) return sendError('Aadhaar Number must be exactly 12 digits');";

const tNew1 = "if (!first_name || !String(first_name).trim()) return sendError('First Name is required');\r\n    if (!phone || !/^[6-9]\\d{9}$/.test(String(phone).trim())) return sendError('A valid 10-digit Phone number starting with 6-9 is required');\r\n    if (email && !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(String(email).trim())) return sendError('Enter a valid email address');\r\n    if (guardian_phone && !/^\\d{10}$/.test(String(guardian_phone).trim())) return sendError('Guardian Phone must be a valid 10-digit number');\r\n    if (!date_of_birth) return sendError('Date of Birth is required');\r\n    if (!gender || !String(gender).trim()) return sendError('Gender is required');\r\n    if (!permanent_address || !String(permanent_address).trim()) return sendError('Permanent Address is required');\r\n    if (!id_proof_number || !/^\\d{12}$/.test(String(id_proof_number).trim())) return sendError('Aadhaar Number must be exactly 12 digits');";

content = content.replace(tOld1.replace(/\r\n/g, '\n'), tNew1.replace(/\r\n/g, '\n'));

const tOld2 = "date_of_birth:    date_of_birth ? new Date(date_of_birth) : null,\n      gender:           gender || 'Other',";
const tNew2 = "date_of_birth:    new Date(date_of_birth),\n      gender:           String(gender).trim(),";

content = content.replace(tOld2, tNew2);

fs.writeFileSync('backend/src/server.ts', content);
console.log('Successfully updated validations!');
