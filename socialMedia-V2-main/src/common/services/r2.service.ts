import { DeleteObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { randomUUID } from "crypto";
import { R2_PUBLIC_URL } from "../../config/config";
import { r2Client } from "../helper/r2";

export const getR2FileUrl = (key?: string | String | null) => {
  if (!key || !R2_PUBLIC_URL) return null;

  const baseUrl = R2_PUBLIC_URL.replace(/\/$/, "");
  const encodedKey = key
    .toString()
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");

  return `${baseUrl}/${encodedKey}`;
};

export const buildStoredAttachment = (key: string) => {
  const url = getR2FileUrl(key);

  return {
    key,
    ...(url ? { url, secure_url: url } : {}),
  };
};

export const uploadFileToR2 = async ({
  file,
  folder = "general",
}: {
  file: Express.Multer.File;
  folder?: string;
}) => {
  const key = `${folder}/${randomUUID()}-${file.originalname}`;

  await r2Client.send(
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
    })
  );

  return buildStoredAttachment(key);
};

export const uploadFilesToR2 = async ({
  files,
  folder = "general",
}: {
  files: Express.Multer.File[];
  folder?: string;
}) => {
  const attachments = [];

  for (const file of files) {
    attachments.push(await uploadFileToR2({ file, folder }));
  }

  return attachments;
};

export const deleteFilesFromR2 = async (keys: string[]) => {
  for (const key of keys) {
    await deleteFileFromR2(key);
  }
};

export const deleteFileFromR2 = async (key: string) => {
  await r2Client.send(
    new DeleteObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: key,
    })
  );
};
