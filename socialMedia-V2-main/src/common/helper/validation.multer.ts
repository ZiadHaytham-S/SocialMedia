import type{ Request } from "express"
import { FileFilterCallback } from "multer"

export const fileFieldValidation = {
    image: [
        "image/avif",
        "image/bmp",
        "image/gif",
        "image/heic",
        "image/heif",
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/svg+xml",
        "image/tiff",
        "image/webp",
        "image/x-icon",
    ],
    video: [
        "video/3gpp",
        "video/3gpp2",
        "video/avi",
        "video/mp2t",
        "video/mp4",
        "video/mpeg",
        "video/ogg",
        "video/quicktime",
        "video/webm",
        "video/x-m4v",
        "video/x-ms-wmv",
        "video/x-msvideo",
    ]
}

export const fileFilter = (validation:Array<string> = []) => {
    return function (req:Request, file:Express.Multer.File, cb:FileFilterCallback) {
        const allowed = validation.some((type) => {
            if (type.endsWith("/*")) {
                return file.mimetype.startsWith(type.slice(0, -1))
            }

            return type === file.mimetype
        })

        if (!allowed) {
            return cb(new Error("Invalid file format"))
        }
        return cb(null, true)
    }
}
