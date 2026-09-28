import type { ApiMessage } from "@/types/social";
import { apiRequest } from "../client";
import { unwrapResult } from "../normalizers";

export type SendMessageInput = {
  recipientId: string;
  content?: string;
  attachment?: File;
};

export async function sendMessage(input: SendMessageInput): Promise<ApiMessage> {
  const formData = new FormData();
  formData.set("recipientId", input.recipientId);

  if (input.content?.trim()) {
    formData.set("content", input.content.trim());
  }

  if (input.attachment) {
    formData.set("attachment", input.attachment);
  }

  const data = await apiRequest<unknown>("/message", {
    method: "POST",
    body: formData,
  });

  return unwrapResult(data) as ApiMessage;
}

export async function deleteConversation(conversationId: string): Promise<boolean> {
  const data = await apiRequest<unknown>(`/message/conversation/${conversationId}`, {
    method: "DELETE",
  });

  return Boolean(unwrapResult(data));
}

export async function deleteMessage(messageId: string): Promise<boolean> {
  const data = await apiRequest<unknown>(`/message/${messageId}`, {
    method: "DELETE",
  });

  return Boolean(unwrapResult(data));
}

export async function editMessage(messageId: string, content: string): Promise<ApiMessage> {
  const data = await apiRequest<unknown>(`/message/${messageId}`, {
    method: "PATCH",
    body: JSON.stringify({ content }),
  });

  return unwrapResult(data) as ApiMessage;
}

export async function reactToMessage(messageId: string, type: string): Promise<ApiMessage> {
  const data = await apiRequest<unknown>(`/message/${messageId}/react`, {
    method: "PATCH",
    body: JSON.stringify({ type }),
  });

  return unwrapResult(data) as ApiMessage;
}

export async function pinMessage(messageId: string, pinned: boolean): Promise<ApiMessage> {
  const data = await apiRequest<unknown>(`/message/${messageId}/pin`, {
    method: "PATCH",
    body: JSON.stringify({ pinned }),
  });

  return unwrapResult(data) as ApiMessage;
}

export async function forwardMessage(messageId: string, recipientId: string): Promise<ApiMessage> {
  const data = await apiRequest<unknown>(`/message/${messageId}/forward`, {
    method: "POST",
    body: JSON.stringify({ recipientId }),
  });

  return unwrapResult(data) as ApiMessage;
}
