/** Validation is local: this site hands off to the visitor's email/WhatsApp app. */
export function validateField(key, value, maxLength, typeMismatch = false) {
  const normalized = value.trim();
  if (maxLength >= 0 && normalized.length > maxLength) return false;
  if (key === 'company') return true;
  if (key === 'email') return normalized.length > 0 && !typeMismatch;
  if (key === 'context') return normalized.length >= 15;
  return normalized.length >= 2;
}

export function prepareMessage({ name, company, email, context, interest }) {
  const lines = [
    'Olá, ByAskora! Gostaria de conversar sobre um projeto.',
    '',
    `Nome: ${name}`,
  ];
  if (company) lines.push(`Empresa: ${company}`);
  lines.push(`E-mail: ${email}`, `Interesse: ${interest}`, '', context);
  return lines.join('\n');
}

export function createEmailLink(email, sender, message) {
  const subject = 'Projeto ByAskora | ' + sender.replace(/[\r\n]+/g, ' ');
  return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
}
