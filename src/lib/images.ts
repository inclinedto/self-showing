"use client";

/** Max request payload we send per page; Vercel functions reject bodies above ~4.5 MB. */
export const MAX_IMAGE_DATA_URL_LENGTH = 3_500_000;

async function drawToJpeg(
  source: CanvasImageSource,
  width: number,
  height: number,
  quality: number,
) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas is not supported");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.drawImage(source, 0, 0, width, height);
  const url = canvas.toDataURL("image/jpeg", quality);
  canvas.width = 0;
  canvas.height = 0;
  return url;
}

/** Downscales an uploaded photo/screenshot to a JPEG data URL that fits the request size limit. */
export async function imageFileToJpeg(file: Blob, maxSide = 2000): Promise<string> {
  const bitmap = await createImageBitmap(file);
  try {
    let side = maxSide;
    let quality = 0.85;
    for (let attempt = 0; attempt < 5; attempt++) {
      const scale = Math.min(1, side / Math.max(bitmap.width, bitmap.height));
      const url = await drawToJpeg(
        bitmap,
        Math.round(bitmap.width * scale),
        Math.round(bitmap.height * scale),
        quality,
      );
      if (url.length <= MAX_IMAGE_DATA_URL_LENGTH) return url;
      side = Math.round(side * 0.8);
      quality = Math.max(0.6, quality - 0.1);
    }
    throw new Error("图片太大，压缩后仍超过上传限制");
  } finally {
    bitmap.close();
  }
}

/** Shrinks an existing JPEG data URL (e.g. a rendered PDF page) until it fits the size limit. */
export async function fitDataUrl(dataUrl: string): Promise<string> {
  if (dataUrl.length <= MAX_IMAGE_DATA_URL_LENGTH) return dataUrl;
  const blob = await (await fetch(dataUrl)).blob();
  return imageFileToJpeg(blob, 1600);
}
