/** Viewport coordinates for the text caret inside a textarea. */
export type TextareaCaretPoint = {
  top: number;
  left: number;
  bottom: number;
  height: number;
};

function copyTextareaStyles(source: HTMLElement, target: HTMLElement) {
  const computed = window.getComputedStyle(source);

  for (let index = 0; index < computed.length; index += 1) {
    const prop = computed.item(index);
    target.style.setProperty(prop, computed.getPropertyValue(prop));
  }
}

/**
 * Returns caret position in viewport space (for anchoring mention menus).
 */
export function getTextareaCaretCoordinates(
  textarea: HTMLTextAreaElement,
  position = textarea.selectionStart,
): TextareaCaretPoint {
  const mirror = document.createElement("div");
  document.body.appendChild(mirror);

  copyTextareaStyles(textarea, mirror);

  mirror.style.position = "absolute";
  mirror.style.visibility = "hidden";
  mirror.style.whiteSpace = "pre-wrap";
  mirror.style.wordWrap = "break-word";
  mirror.style.overflow = "hidden";
  mirror.style.width = `${textarea.offsetWidth}px`;
  mirror.style.height = `${textarea.offsetHeight}px`;

  const textBefore = textarea.value.substring(0, position);
  mirror.textContent = textBefore;

  if (textBefore.endsWith("\n")) {
    mirror.append("\u200b");
  }

  const marker = document.createElement("span");
  marker.textContent = textarea.value.substring(position) || ".";
  mirror.append(marker);

  const markerTop = marker.offsetTop;
  const markerLeft = marker.offsetLeft;
  const lineHeight = marker.offsetHeight || parseInt(window.getComputedStyle(textarea).lineHeight, 10) || 20;

  document.body.removeChild(mirror);

  const textareaRect = textarea.getBoundingClientRect();

  return {
    top: textareaRect.top + markerTop - textarea.scrollTop,
    left: textareaRect.left + markerLeft - textarea.scrollLeft,
    bottom: textareaRect.top + markerTop - textarea.scrollTop + lineHeight,
    height: lineHeight,
  };
}
