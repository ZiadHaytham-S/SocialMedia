import { config } from "dotenv";
import { resolve } from "node:path";

config({ path: resolve(`./.env.${process.env.NODE_ENV}`) });

export const PORT = process.env.PORT;
export const DB_URI = process.env.DB_URI as string
export const REDIS_URI = process.env.REDIS_URI as string
export const APPLICATION_NAME = process.env.APPLICATION_NAME

export const SALT_ROUND = parseInt(process.env.SALT_ROUND ?? '10')
export const ENC_IV_LENGTH = parseInt(process.env.ENC_IV_LENGTH ?? '16')
export const ENC_KEY = process.env.ENC_KEY as string

/**======================================= JWT =====================================*/
export const USER_ACCESS_TOKEN_SIGNATURE = process.env.USER_ACCESS_TOKEN_SIGNATURE as string
export const USER_REFRESH_TOKEN_SIGNATURE = process.env.USER_REFRESH_TOKEN_SIGNATURE as string
export const SYSTEM_ACCESS_TOKEN_SIGNATURE = process.env.SYSTEM_ACCESS_TOKEN_SIGNATURE as string
export const SYSTEM_REFRESH_TOKEN_SIGNATURE = process.env.SYSTEM_REFRESH_TOKEN_SIGNATURE as string
export const ACCESS_TOKEN_EXPIRES_IN = parseInt(process.env.ACCESS_TOKEN_EXPIRES_IN ?? '1800')
export const REFRESH_TOKEN_EXPIRES_IN = parseInt(process.env.REFRESH_TOKEN_EXPIRES_IN ?? '1800')

export const APP_EMAIL_PASSWORD = process.env.APP_EMAIL_PASSWORD as string
export const APP_EMAIL = process.env.APP_EMAIL as string

export const FACEBOOK_LINK = process.env.FACEBOOK_LINK
export const X_LINK = process.env.X_LINK
export const INSTAGRAM_LINK = process.env.FACEBOOK_LINK

export const APPLICATION_PASSWORD = process.env.APPLICATION_PASSWORD
export const APPLICATION_EMAIL = process.env.APPLICATION_EMAIL

export const CLIENT_ID = process.env.CLIENT_ID as string

export const FE_ORIGIN = process.env.FE_ORIGIN
export const FRONTEND_URL = process.env.FRONTEND_URL

/** Firebase Admin (FCM server) — download service account from Firebase Console */
export const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID
export const FIREBASE_CLIENT_EMAIL = process.env.FIREBASE_CLIENT_EMAIL
export const FIREBASE_PRIVATE_KEY = process.env.FIREBASE_PRIVATE_KEY



// cloudflare

export const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;
export const R2_ENDPOINT = process.env.R2_ENDPOINT;
export const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
export const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
export const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL;
