import type { HydratedDocument } from "mongoose";
import type { IUser } from "../../interfaces";
import { generateCompare, generateHash } from "./hash.security";

/** Bcrypt hashes are 60 chars and start with $2a$, $2b$, or $2y$. */
const BCRYPT_HASH_PATTERN = /^\$2[aby]\$\d{2}\$.{53}$/;

export function isBcryptHash(value: string) {
  return BCRYPT_HASH_PATTERN.test(value);
}

/**
 * Hash a plain-text password once. If the value is already a bcrypt hash, return as-is
 * so callers cannot accidentally double-hash.
 */
export async function hashPlainPassword(plainText: string) {
  if (isBcryptHash(plainText)) {
    return plainText;
  }

  return generateHash({ plainText });
}

export async function comparePassword(plainText: string, storedHash: string) {
  return generateCompare({ plainText, cipherText: storedHash });
}

export async function isPasswordSameAsCurrent(newPassword: string, currentPasswordHash: string) {
  return comparePassword(newPassword, currentPasswordHash);
}

export async function isPasswordUsedBefore(user: HydratedDocument<IUser>, newPassword: string) {
  for (const hash of user.oldPassword ?? []) {
    if (await comparePassword(newPassword, hash)) {
      return true;
    }
  }

  return false;
}

/**
 * Assign a new plain-text password on a Mongoose document.
 * The user schema `pre("save")` hook performs hashing exactly once.
 */
export function assignPlainPassword(user: HydratedDocument<IUser>, plainPassword: string) {
  user.oldPassword = user.oldPassword ?? [];

  if (user.password) {
    user.oldPassword.push(user.password as string);
  }

  if (user.oldPassword.length > 5) {
    user.oldPassword.shift();
  }

  user.password = plainPassword;
  user.changeTimeCredentials = new Date();
}

async function hashPasswordFieldInUpdate(update: Record<string, unknown>) {
  const setPayload =
    update.$set && typeof update.$set === "object" && !Array.isArray(update.$set)
      ? (update.$set as Record<string, unknown>)
      : undefined;

  const directPassword = update.password;
  const setPassword = setPayload?.password;

  if (typeof directPassword === "string" && directPassword) {
    update.password = await hashPlainPassword(directPassword);
  }

  if (typeof setPassword === "string" && setPassword) {
    setPayload!.password = await hashPlainPassword(setPassword);
    update.$set = setPayload;
  }
}

export async function hashPasswordFieldsInUpdateQuery(update: unknown) {
  if (!update || typeof update !== "object" || Array.isArray(update)) {
    return;
  }

  await hashPasswordFieldInUpdate(update as Record<string, unknown>);
}
