export type PasswordChecks = {
  length: boolean;
  upper: boolean;
  lower: boolean;
  number: boolean;
  special: boolean;
};

export function passwordChecks(password: string): PasswordChecks {
  return {
    length: password.length >= 8,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    number: /\d/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  };
}

export function isStrongPassword(password: string): boolean {
  return Object.values(passwordChecks(password)).every(Boolean) && password.length <= 100;
}

export function passwordStrength(password: string) {
  const checks = passwordChecks(password);
  let score = Object.values(checks).filter(Boolean).length;
  if (password.length >= 12 && score === 5) score += 1;

  if (!password) return { score: 0, label: "Chưa nhập", level: 0 as const };
  if (score <= 2) return { score, label: "Yếu", level: 1 as const };
  if (score <= 4) return { score, label: "Trung bình", level: 2 as const };
  if (score === 5) return { score, label: "Mạnh", level: 3 as const };
  return { score, label: "Rất mạnh", level: 4 as const };
}
