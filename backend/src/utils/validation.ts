import db from '../config/database.js';

export interface IdentityIdentifiers {
  phone?: string | null;
  email?: string | null;
  id_number?: string | null;
}

export interface ExcludeEntity {
  entityType: 'student' | 'staff' | 'guest';
  entityId?: number | string;
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
  const phone = identifiers.phone?.trim() || null;
  const email = identifiers.email?.trim() || null;
  const id_number = identifiers.id_number?.trim() || null;
  const checks: Promise<{ isUnique: boolean; conflictField?: string; conflictEntity?: string } | null>[] = [];

  // 1. Phone checks (Parallel)
  if (phone) {
    let qStudent = db('students').where({ hostel_id, phone }).first('student_id');
    if (exclude?.entityType === 'student') qStudent = qStudent.whereNot('student_id', exclude.entityId);
    checks.push(qStudent.then(res => res ? { isUnique: false, conflictField: 'phone', conflictEntity: 'student' } : null));

    let qStaff = db('staff').where({ hostel_id, phone }).first('staff_id');
    if (exclude?.entityType === 'staff') qStaff = qStaff.whereNot('staff_id', exclude.entityId);
    checks.push(qStaff.then(res => res ? { isUnique: false, conflictField: 'phone', conflictEntity: 'staff' } : null));

    let qGuest = db('guests').where({ hostel_id, phone }).first('guest_id');
    if (exclude?.entityType === 'guest') qGuest = qGuest.whereNot('guest_id', exclude.entityId);
    checks.push(qGuest.then(res => res ? { isUnique: false, conflictField: 'phone', conflictEntity: 'guest' } : null));
  }

  // 2. Email checks (Parallel)
  if (email) {
    let qStudent = db('students').where({ hostel_id, email }).first('student_id');
    if (exclude?.entityType === 'student') qStudent = qStudent.whereNot('student_id', exclude.entityId);
    checks.push(qStudent.then(res => res ? { isUnique: false, conflictField: 'email', conflictEntity: 'student' } : null));

    let qStaff = db('staff').where({ hostel_id, email }).first('staff_id');
    if (exclude?.entityType === 'staff') qStaff = qStaff.whereNot('staff_id', exclude.entityId);
    checks.push(qStaff.then(res => res ? { isUnique: false, conflictField: 'email', conflictEntity: 'staff' } : null));

    let qGuest = db('guests').where({ hostel_id, email }).first('guest_id');
    if (exclude?.entityType === 'guest') qGuest = qGuest.whereNot('guest_id', exclude.entityId);
    checks.push(qGuest.then(res => res ? { isUnique: false, conflictField: 'email', conflictEntity: 'guest' } : null));
  }

  // 3. ID Number checks (Parallel)
  if (id_number) {
    let qStudent = db('students').where({ hostel_id, id_proof_number: id_number }).first('student_id');
    if (exclude?.entityType === 'student') qStudent = qStudent.whereNot('student_id', exclude.entityId);
    checks.push(qStudent.then(res => res ? { isUnique: false, conflictField: 'ID proof number', conflictEntity: 'student' } : null));

    let qStaff = db('staff').where({ hostel_id, aadhaar_number: id_number }).first('staff_id');
    if (exclude?.entityType === 'staff') qStaff = qStaff.whereNot('staff_id', exclude.entityId);
    checks.push(qStaff.then(res => res ? { isUnique: false, conflictField: 'Aadhaar number', conflictEntity: 'staff' } : null));

    let qGuest = db('guests').where({ hostel_id, id_proof_number: id_number }).first('guest_id');
    if (exclude?.entityType === 'guest') qGuest = qGuest.whereNot('guest_id', exclude.entityId);
    checks.push(qGuest.then(res => res ? { isUnique: false, conflictField: 'ID proof number', conflictEntity: 'guest' } : null));
  }

  if (checks.length === 0) return { isUnique: true };

  const results = await Promise.all(checks);
  for (const r of results) {
    if (r && !r.isUnique) {
      return r;
    }
  }

  return { isUnique: true };
};
