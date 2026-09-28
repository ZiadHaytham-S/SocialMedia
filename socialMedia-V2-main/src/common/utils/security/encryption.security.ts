import crypto from "crypto";
import { ENC_IV_LENGTH, ENC_KEY } from "../../../config/config";
import { BadRequestException } from "../../exceptions";

const ENCRYPTION_SECRET_KEY = Buffer.from(ENC_KEY);

export const generateEncryption = async (plaintext: string) => {
  const iv = crypto.randomBytes(ENC_IV_LENGTH);

  const cipher = crypto.createCipheriv(
    "aes-256-cbc",
    ENCRYPTION_SECRET_KEY,
    iv,
  );

  let encryptedData = cipher.update(plaintext, "utf-8", "hex");
  encryptedData += cipher.final("hex");

  return `${iv.toString("hex")}:${encryptedData}`;
};


// Decryption
export const generateDecryption = async (cipherText: string) => {
  const [iv, encryptedText] = cipherText.split(":") || ([] as string[]);
  if (!iv || !encryptedText) {
    throw new BadRequestException("Invalid encryption parts");
  }

  const binaryLikeIv = Buffer.from(iv, "hex");

  const decipher = crypto.createDecipheriv(
    "aes-256-cbc",
    ENCRYPTION_SECRET_KEY,
    binaryLikeIv,
  );

  let decryptedData = decipher.update(encryptedText, "hex", "utf8");
  decryptedData += decipher.final("utf-8");

  return decryptedData;
};
