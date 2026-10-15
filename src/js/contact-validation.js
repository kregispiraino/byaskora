/** Client-side validation; the receiving service must validate independently. */
export function validateField(key, value, maxLength, typeMismatch = false) {
  const normalized = value.trim();
  if (maxLength >= 0 && normalized.length > maxLength) return false;
  if (key === 'phone')
    return (
      !normalized ||
      (/^\+?[\d\s().-]+$/.test(normalized) &&
        /^\d{10,15}$/.test(normalized.replace(/\D/g, '')))
    );
  if (key === 'company') return true;
  if (key === 'email') return normalized.length > 0 && !typeMismatch;
  if (key === 'context') return normalized.length >= 15;
  return normalized.length >= 2;
}
