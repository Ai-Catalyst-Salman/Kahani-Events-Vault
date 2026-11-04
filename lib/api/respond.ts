import { NextResponse } from "next/server";

export function apiJson(body: unknown, status = 200) {
  const response = NextResponse.json(body, { status });
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export function apiError(message: string, status: number) {
  return apiJson({ error: message }, status);
}

export async function readJson(
  request: Request,
  maxBytes: number
): Promise<unknown | "too_large" | "invalid"> {
  const declared = request.headers.get("content-length");
  if (declared && Number(declared) > maxBytes) return "too_large";

  const reader = request.body?.getReader();
  if (!reader) return "invalid";

  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      return "too_large";
    }
    chunks.push(value);
  }

  if (total === 0) return "invalid";
  const text = new TextDecoder().decode(Buffer.concat(chunks));
  try {
    return JSON.parse(text);
  } catch {
    return "invalid";
  }
}
