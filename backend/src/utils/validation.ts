import db from '../config/database.js';

export interface IdentityIdentifiers {
  phone?: string | null;
  email?: string | null;
  id_number?: string | null;
}

export interface ExcludeEntity {
  entityType: 'student' | 'staff' | 'guest';
  entityId: number | string;
}

export interface ValidationResult {
  isUnique: boolean;
  conflictField?: string;
  conflictEntity?: string;
}

/**
 * Checks if the given identifiers (phone, email, id_number) are unique across 
 * students, staff, and guests within a specific hostel.
 * 
 * @param hostel_id The ID of the hostel to check against.
 * @param identifiers The identifiers to check for uniqueness.
 * @param exclude Optional entity to exclude from the check (e.g. when updating).
 * @returns ValidationResult indicating uniqueness and conflict details if any.
 */
export const checkHostelUniqueIdentifiers = async (
  hostel_id: number,
  identifiers: IdentityIdentifiers,
  exclude?: ExcludeEntity
): Promise<ValidationResult> => {
  const { phone, email, id_number } = identifiers;
  
  // 1. Check Phone
  if (phone) {
    // Check students
    let qStudent = db('students').where({ hostel_id, phone });
    if (exclude?.entityType === 'student') qStudent = qStudent.whereNot('student_id', exclude.entityId);
    if (await qStudent.first()) return { isUnique: false, conflictField: 'phone', conflictEntity: 'student' };
    
    // Check staff
    let qStaff = db('staff').where({ hostel_id, phone });
    if (exclude?.entityType === 'staff') qStaff = qStaff.whereNot('staff_id', exclude.entityId);
    if (await qStaff.first()) return { isUnique: false, conflictField: 'phone', conflictEntity: 'staff' };
    
    // Check guest
    let qGuest = db('guests').where({ hostel_id, phone });
    if (exclude?.entityType === 'guest') qGuest = qGuest.whereNot('guest_id', exclude.entityId);
    if (await qGuest.first()) return { isUnique: false, conflictField: 'phone', conflictEntity: 'guest' };
  }
  
  // 2. Check Email
  if (email) {
    // Check students
    let qStudent = db('students').where({ hostel_id, email });
    if (exclude?.entityType === 'student') qStudent = qStudent.whereNot('student_id', exclude.entityId);
    if (await qStudent.first()) return { isUnique: false, conflictField: 'email', conflictEntity: 'student' };
    
    // Check staff
    let qStaff = db('staff').where({ hostel_id, email });
    if (exclude?.entityType === 'staff') qStaff = qStaff.whereNot('staff_id', exclude.entityId);
    if (await qStaff.first()) return { isUnique: false, conflictField: 'email', conflictEntity: 'staff' };

    // Check guest
    let qGuest = db('guests').where({ hostel_id, email });
    if (exclude?.entityType === 'guest') qGuest = qGuest.whereNot('guest_id', exclude.entityId);
    if (await qGuest.first()) return { isUnique: false, conflictField: 'email', conflictEntity: 'guest' };
  }
  
  // 3. Check ID Number (Aadhaar, PAN, etc.)
  if (id_number) {
    // Check students (id_proof_number)
    let qStudent = db('students').where({ hostel_id, id_proof_number: id_number });
    if (exclude?.entityType === 'student') qStudent = qStudent.whereNot('student_id', exclude.entityId);
    if (await qStudent.first()) return { isUnique: false, conflictField: 'ID proof number', conflictEntity: 'student' };
    
    // Check staff (aadhaar_number)
    let qStaff = db('staff').where({ hostel_id, aadhaar_number: id_number });
    if (exclude?.entityType === 'staff') qStaff = qStaff.whereNot('staff_id', exclude.entityId);
    if (await qStaff.first()) return { isUnique: false, conflictField: 'Aadhaar number', conflictEntity: 'staff' };

    // Check guest (id_proof_number)
    let qGuest = db('guests').where({ hostel_id, id_proof_number: id_number });
    if (exclude?.entityType === 'guest') qGuest = qGuest.whereNot('guest_id', exclude.entityId);
    if (await qGuest.first()) return { isUnique: false, conflictField: 'ID proof number', conflictEntity: 'guest' };
  }
  
  return { isUnique: true };
};
