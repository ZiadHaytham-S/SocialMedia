import multer from "multer";
import { fileFilter } from "./validation.multer";

export const r2FileUpload = ({
  validation = [],
  maxSize = 5,
}: {
  validation: string[];
  maxSize?: number;
}) => {
  const storage = multer.memoryStorage();

  return multer({
    storage,
    fileFilter: fileFilter(validation),
    limits: {
      fileSize: maxSize * 1024 * 1024,
    },
  });
};