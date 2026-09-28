import z from "zod";
import { profileCoverImage, updatePassword } from "./user.validation";

export type ProfileDto = z.infer<typeof profileCoverImage>
export type UpdatePasswordDto = z.infer<typeof updatePassword>
export type ProfileCoverDto = z.infer<typeof profileCoverImage>