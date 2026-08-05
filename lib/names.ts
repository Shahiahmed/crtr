/**
 * Public display: "Саяжан Е." — first name + surname initial.
 * Directory order: Surname FirstName [Patronymic]
 * Manual order: FirstName Surname
 */
export function formatPublicName(
  fullName: string,
  isFromDirectory: boolean,
): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return fullName;
  }

  if (parts.length === 1) {
    return parts[0];
  }

  if (!isFromDirectory) {
    const firstName = parts[0];
    const surnameInitial = parts[1].charAt(0).toUpperCase();
    return `${firstName} ${surnameInitial}.`;
  }

  const firstName = parts[1];
  const surnameInitial = parts[0].charAt(0).toUpperCase();
  return `${firstName} ${surnameInitial}.`;
}
