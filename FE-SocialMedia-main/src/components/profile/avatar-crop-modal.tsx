"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLocale } from "@/lib/i18n/locale-context";
import { cn, ui } from "@/lib/theme/ui";

type AvatarCropModalProps = {
  file: File;
  onCancel: () => void;
  onConfirm: (file: File) => void;
};

const previewSize = 280;
const outputSize = 512;

export function AvatarCropModal({ file, onCancel, onConfirm }: AvatarCropModalProps) {
  const { t } = useLocale();
  const imageRef = useRef<HTMLImageElement>(null);
  const [imageUrl, setImageUrl] = useState("");
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });
  const [zoom, setZoom] = useState(1);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);

  useEffect(() => {
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      if (typeof reader.result === "string") {
        setImageUrl(reader.result);
      }
    });
    reader.readAsDataURL(file);
  }, [file]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onCancel();
      }
    }

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [file, onCancel]);

  const baseSize = useMemo(() => {
    if (!naturalSize.width || !naturalSize.height) {
      return { width: previewSize, height: previewSize };
    }

    const aspect = naturalSize.width / naturalSize.height;

    if (aspect >= 1) {
      return { width: previewSize * aspect, height: previewSize };
    }

    return { width: previewSize, height: previewSize / aspect };
  }, [naturalSize.height, naturalSize.width]);

  if (typeof document === "undefined" || !imageUrl) {
    return null;
  }

  function handleConfirm() {
    const image = imageRef.current;

    if (!image) {
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = outputSize;
    canvas.height = outputSize;

    const context = canvas.getContext("2d");

    if (!context) {
      return;
    }

    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, outputSize, outputSize);

    const scale = outputSize / previewSize;
    const drawnWidth = baseSize.width * zoom * scale;
    const drawnHeight = baseSize.height * zoom * scale;
    const drawnX = (outputSize - drawnWidth) / 2 + offsetX * scale;
    const drawnY = (outputSize - drawnHeight) / 2 + offsetY * scale;

    context.drawImage(image, drawnX, drawnY, drawnWidth, drawnHeight);

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          return;
        }

        const croppedFile = new File([blob], file.name.replace(/\.[^.]+$/, "") + "-avatar.jpg", {
          type: "image/jpeg",
          lastModified: Date.now(),
        });

        onConfirm(croppedFile);
      },
      "image/jpeg",
      0.92,
    );
  }

  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-start justify-center overflow-y-auto bg-black/60 p-4 pt-[6vh]">
      <div className="absolute inset-0" onClick={onCancel} role="presentation" />
      <div
        aria-labelledby="avatar-crop-title"
        aria-modal="true"
        className="relative z-10 w-full max-w-[440px] rounded-lg bg-surface shadow-[var(--shadow-elevated)]"
        role="dialog"
      >
        <div className="flex items-center justify-between border-b border-border-light px-4 py-3">
          <h2 className={ui.headingLg} id="avatar-crop-title">
            {t("profile.changeAvatar")}
          </h2>
          <button aria-label={t("composer.closeModal")} className={cn(ui.iconButton, "text-xl leading-none")} onClick={onCancel} type="button">
            x
          </button>
        </div>

        <div className="p-4">
          <div
            className="relative mx-auto overflow-hidden rounded-full bg-surface-muted ring-2 ring-fb/50"
            style={{ height: previewSize, width: previewSize }}
          >
            <img
              alt=""
              className="absolute max-w-none select-none"
              draggable={false}
              onLoad={(event) => {
                setNaturalSize({
                  width: event.currentTarget.naturalWidth,
                  height: event.currentTarget.naturalHeight,
                });
              }}
              ref={imageRef}
              src={imageUrl}
              style={{
                height: baseSize.height,
                left: (previewSize - baseSize.width) / 2,
                top: (previewSize - baseSize.height) / 2,
                transform: `translate(${offsetX}px, ${offsetY}px) scale(${zoom})`,
                transformOrigin: "center",
                width: baseSize.width,
              }}
            />
          </div>

          <div className="mt-5 space-y-4">
            <label className={cn("block text-sm font-bold", ui.textSecondary)}>
              Zoom
              <input
                className="mt-2 w-full accent-fb"
                max="3"
                min="1"
                onChange={(event) => setZoom(Number(event.target.value))}
                step="0.01"
                type="range"
                value={zoom}
              />
            </label>
            <label className={cn("block text-sm font-bold", ui.textSecondary)}>
              X
              <input
                className="mt-2 w-full accent-fb"
                max="140"
                min="-140"
                onChange={(event) => setOffsetX(Number(event.target.value))}
                step="1"
                type="range"
                value={offsetX}
              />
            </label>
            <label className={cn("block text-sm font-bold", ui.textSecondary)}>
              Y
              <input
                className="mt-2 w-full accent-fb"
                max="140"
                min="-140"
                onChange={(event) => setOffsetY(Number(event.target.value))}
                step="1"
                type="range"
                value={offsetY}
              />
            </label>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border-light px-4 py-3">
          <button className={ui.btnSecondary} onClick={onCancel} type="button">
            {t("post.cancel")}
          </button>
          <button className={ui.btnPrimary} onClick={handleConfirm} type="button">
            {t("post.save")}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
