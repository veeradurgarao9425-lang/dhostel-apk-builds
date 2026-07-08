const fs = require('fs');
let content = fs.readFileSync('backend/src/server.ts', 'utf8');

// Fix CSS: change `.ig i` to `.ig svg` (and anywhere it targets `i`)
content = content.replace(/\.ig i\{/g, '.ig svg{');
content = content.replace(/input:focus \+ i, select:focus \+ i, textarea:focus \+ i/g, 'input:focus + svg, select:focus + svg, textarea:focus + svg');
content = content.replace(/\.ig:has\(input:focus\) i, \.ig:has\(select:focus\) i, \.ig:has\(textarea:focus\) i/g, '.ig:has(input:focus) svg, .ig:has(select:focus) svg, .ig:has(textarea:focus) svg');
content = content.replace(/\.fb i\{/g, '.fb svg{');

// Now explicitly replace the validations
const oldValStart = "if (!first_name || !String(first_name).trim()) return sendError('First Name is required');";
const oldValEnd = "if (!id_proof_number || !/^\\d{12}$/.test(String(id_proof_number).trim())) return sendError('Aadhaar Number must be exactly 12 digits');";

const startIdx = content.indexOf(oldValStart);
const endIdx = content.indexOf(oldValEnd) + oldValEnd.length;

if (startIdx !== -1 && endIdx !== -1) {
    const newVal = `if (!first_name || !String(first_name).trim()) return sendError('First Name is required');
    if (!phone || !/^[6-9]\\d{9}$/.test(String(phone).trim())) return sendError('A valid 10-digit Phone number starting with 6-9 is required');
    if (email && !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(String(email).trim())) return sendError('Enter a valid email address');
    if (guardian_phone && !/^\\d{10}$/.test(String(guardian_phone).trim())) return sendError('Guardian Phone must be a valid 10-digit number');
    if (!date_of_birth) return sendError('Date of Birth is required');
    if (!gender || !String(gender).trim()) return sendError('Gender is required');
    if (!permanent_address || !String(permanent_address).trim()) return sendError('Permanent Address is required');
    if (!id_proof_number || !/^\\d{12}$/.test(String(id_proof_number).trim())) return sendError('Aadhaar Number must be exactly 12 digits');`;
    content = content.substring(0, startIdx) + newVal + content.substring(endIdx);
} else {
    console.error("Could not find validation block");
}

const oldInsert = `      date_of_birth:    date_of_birth ? new Date(date_of_birth) : null,
      gender:           gender || 'Other',`;
const newInsert = `      date_of_birth:    new Date(date_of_birth),
      gender:           String(gender).trim(),`;
content = content.replace(oldInsert, newInsert);

fs.writeFileSync('backend/src/server.ts', content);
console.log("Successfully fixed CSS and validation");
