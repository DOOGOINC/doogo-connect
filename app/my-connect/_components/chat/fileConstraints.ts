"use client";

export const CHAT_FILE_ACCEPT = ".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf";

export const CHAT_ALLOWED_FILE_TYPES = new Set(["image/jpeg", "image/png", "application/pdf"]);
export const CHAT_ALLOWED_FILE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "pdf"]);

export function isAllowedChatFile(file: File) {
  const normalizedName = file.name.toLowerCase();
  const extension = normalizedName.includes(".") ? normalizedName.split(".").pop() || "" : "";

  if (file.type && CHAT_ALLOWED_FILE_TYPES.has(file.type)) {
    return true;
  }

  return CHAT_ALLOWED_FILE_EXTENSIONS.has(extension);
}

export function getChatFileValidationMessage() {
  return "채팅 첨부파일은 JPG, PNG, PDF만 전송할 수 있습니다.";
}
