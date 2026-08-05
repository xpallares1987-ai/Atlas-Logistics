/**
 * Field-Level Security: Data Masking utilities
 * 
 * Masks PII (Personally Identifiable Information) fields before returning them to the client
 * if the current user lacks the required clearance (e.g. 'VIEW_PII' role).
 */

export function maskEmail(email: string | null): string | null {
  if (!email) return email;
  const [local, domain] = email.split('@');
  if (!domain) return '****';
  const maskedLocal = local.length > 2 ? `${local.slice(0, 2)}****` : '****';
  return `${maskedLocal}@${domain}`;
}

export function maskTaxId(taxId: string | null): string | null {
  if (!taxId) return taxId;
  return `****-****-${taxId.slice(-4)}`;
}

export function maskPhone(phone: string | null): string | null {
  if (!phone) return phone;
  return `****-****-${phone.slice(-4)}`;
}

/**
 * Helper to process a record (e.g. from the 'users' or 'contacts' table)
 * and mask sensitive fields if the context doesn't have the permission.
 */
export function applyDataMasking<T extends { email?: string | null; taxId?: string | null; phone?: string | null }>(
  record: T,
  hasViewPiiPermission: boolean
): T {
  if (hasViewPiiPermission) {
    return record; // Return unmasked
  }

  const maskedRecord = { ...record };
  if (maskedRecord.email) maskedRecord.email = maskEmail(maskedRecord.email);
  if (maskedRecord.taxId) maskedRecord.taxId = maskTaxId(maskedRecord.taxId);
  if (maskedRecord.phone) maskedRecord.phone = maskPhone(maskedRecord.phone);
  
  return maskedRecord;
}
