import bcryptjs from "bcryptjs";

// D-04: bcryptjs (pure JavaScript) chosen over native bcrypt/argon2 bindings
// to avoid node-gyp binary compilation friction already documented elsewhere
// in this project. Cost factor 12 follows the OWASP Password Storage Cheat
// Sheet guidance (D-05).
const BCRYPT_COST = 12;

export async function hashPassword(plaintext: string): Promise<string> {
  return bcryptjs.hash(plaintext, BCRYPT_COST);
}

export async function comparePassword(
  plaintext: string,
  hash: string,
): Promise<boolean> {
  return bcryptjs.compare(plaintext, hash);
}
