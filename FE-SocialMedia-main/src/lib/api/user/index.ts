import type { ApiUser, LoginCredentials } from "@/types/social";
import { updatePasswordSchema, updateProfileSchema } from "@/lib/validation/social-validation";
import { apiRequest } from "../client";
import { extractLoginCredentials } from "../tokens";
import { anonymousUser } from "../fallbacks";
import { normalizeUser, unwrapList, unwrapResult } from "../normalizers";

export type LogoutFlag = "ALL" | "CURRENT" | number;

export type UpdateProfileInput = {
  username?: string;
  phone?: string;
  gender?: number;
  DOB?: Date | string;
};

export type UpdatePasswordInput = {
  oldPassword: string;
  password: string;
  confirmPassword: string;
};

export async function listUsers(): Promise<ApiUser[]> {
  const data = await apiRequest<unknown>("/user/list");
  return unwrapList(data).map((user) => normalizeUser(user));
}

export async function getViewer() {
  const data = await apiRequest<unknown>("/user");
  return normalizeUser(unwrapResult(data), anonymousUser);
}

export function logoutUser(flag: LogoutFlag = "CURRENT") {
  return apiRequest<unknown>("/user/logout", {
    method: "POST",
    body: JSON.stringify({ flag }),
  });
}

export async function rotateToken(): Promise<LoginCredentials> {
  const data = await apiRequest<unknown>("/user/rotate-token", {
    method: "POST",
  });

  return extractLoginCredentials(data);
}

export async function updatePassword(input: UpdatePasswordInput): Promise<LoginCredentials> {
  const parsed = updatePasswordSchema.safeParse(input);

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid password data.");
  }

  const data = await apiRequest<unknown>("/user/update-password", {
    method: "PATCH",
    body: JSON.stringify(parsed.data),
  });

  return extractLoginCredentials(data);
}

export async function updateProfileImage(attachment: File): Promise<ApiUser> {
  const formData = new FormData();
  formData.set("attachment", attachment);

  const data = await apiRequest<unknown>("/user/profile-image", {
    method: "PATCH",
    body: formData,
  });

  return normalizeUser(unwrapResult(data));
}

export async function updateProfileCoverImage(files: File[]): Promise<ApiUser> {
  const formData = new FormData();

  files.forEach((file) => {
    formData.append("files", file);
  });

  const data = await apiRequest<unknown>("/user/profile-cover-image", {
    method: "PATCH",
    body: formData,
  });

  return normalizeUser(unwrapResult(data));
}

export async function getUserById(userId: string): Promise<ApiUser> {
  const data = await apiRequest<unknown>(`/user/${userId}`);
  return normalizeUser(unwrapResult(data));
}

export async function updateProfile(userId: string, input: UpdateProfileInput): Promise<ApiUser> {
  const parsed = updateProfileSchema.safeParse(input);

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid profile data.");
  }

  const data = await apiRequest<unknown>(`/user/${userId}`, {
    method: "PATCH",
    body: JSON.stringify({
      ...parsed.data,
      DOB: parsed.data.DOB instanceof Date ? parsed.data.DOB.toISOString() : parsed.data.DOB,
      phone: parsed.data.phone || undefined,
    }),
  });

  return normalizeUser(unwrapResult(data));
}

export async function deleteUser(userId: string): Promise<ApiUser> {
  const data = await apiRequest<unknown>(`/user/${userId}`, {
    method: "DELETE",
  });

  return normalizeUser(unwrapResult(data));
}

export async function restoreUser(userId: string): Promise<ApiUser> {
  const data = await apiRequest<unknown>(`/user/${userId}/restore`, {
    method: "PATCH",
  });

  return normalizeUser(unwrapResult(data));
}

export async function visitProfile(userId: string): Promise<ApiUser> {
  const data = await apiRequest<unknown>(`/user/profile/${userId}`);
  return normalizeUser(unwrapResult(data));
}

export async function setUserRole(userId: string, role: 0 | 1): Promise<ApiUser> {
  const data = await apiRequest<unknown>(`/user/${userId}/role`, {
    method: "PATCH",
    body: JSON.stringify({ role }),
  });

  return normalizeUser(unwrapResult(data));
}
