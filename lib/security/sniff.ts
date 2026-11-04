export type SniffedFile = { mime: string; ext: string };

function startsWith(bytes: Uint8Array, signature: number[]): boolean {
  if (bytes.length < signature.length) return false;
  return signature.every((value, index) => bytes[index] === value);
}

function sniffImage(bytes: Uint8Array): SniffedFile | null {
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return { mime: "image/jpeg", ext: "jpg" };
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return { mime: "image/png", ext: "png" };
  }
  if (
    bytes.length >= 12 &&
    startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return { mime: "image/webp", ext: "webp" };
  }
  if (startsWith(bytes, [0x47, 0x49, 0x46, 0x38])) return { mime: "image/gif", ext: "gif" };
  return null;
}

function sampleText(bytes: Uint8Array): string {
  return Buffer.from(bytes.subarray(0, Math.min(bytes.length, 262144))).toString("latin1");
}

function sniffPresentation(bytes: Uint8Array): SniffedFile | null {
  const head = sampleText(bytes).trimStart();
  if (head.startsWith("%PDF-")) {
    if (/\/JavaScript|\/JS[\s<(]|\/Launch|\/EmbeddedFile/.test(head)) return null;
    return { mime: "application/pdf", ext: "pdf" };
  }
  if (startsWith(bytes, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])) {
    const latin = sampleText(bytes);
    const utf16 = Buffer.from(bytes.subarray(0, Math.min(bytes.length, 262144))).toString("utf16le");
    if (latin.includes("PowerPoint Document") || utf16.includes("PowerPoint Document")) {
      return { mime: "application/vnd.ms-powerpoint", ext: "ppt" };
    }
    return null;
  }
  if (
    startsWith(bytes, [0x50, 0x4b, 0x03, 0x04]) ||
    startsWith(bytes, [0x50, 0x4b, 0x05, 0x06]) ||
    startsWith(bytes, [0x50, 0x4b, 0x07, 0x08])
  ) {
    const window = sampleText(bytes);
    if (window.includes("vbaProject") || window.includes("ppt/vbaProject.bin")) return null;
    if (window.includes("ppt/")) {
      return {
        mime: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        ext: "pptx",
      };
    }
  }
  return null;
}

export function sniffUpload(folder: "presentations" | "thumbnails", bytes: Uint8Array): SniffedFile | null {
  if (!bytes.byteLength) return null;
  return folder === "thumbnails" ? sniffImage(bytes) : sniffPresentation(bytes);
}
