export function formatUser(name: string, age: number): string {
  if (age < 0) {
    throw new Error("Age cannot be negative");
  }
  return `${name} (${age})`;
}

export function validateEmail(email: string): boolean {
  if (!email.includes("@")) {
    throw new TypeError(`Invalid email: ${email}`);
  }
  return true;
}
