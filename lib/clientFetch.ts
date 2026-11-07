export async function fetchJson(
  url: string,
  init: RequestInit = {},
  timeoutMs = 30000
): Promise<{ ok: boolean; status: number; data: Record<string, unknown> }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    return { ok: response.ok, status: response.status, data };
  } catch (err) {
    const timedOut = err instanceof DOMException && err.name === "AbortError";
    return {
      ok: false,
      status: 0,
      data: {
        error: timedOut
          ? "The request timed out. Check your connection and try again."
          : "Network error. Please try again.",
      },
    };
  } finally {
    clearTimeout(timer);
  }
}

export function errorText(data: Record<string, unknown>, fallback: string): string {
  const value = typeof data.error === "string" ? data.error.trim() : "";
  if (!value || value.length > 200) return fallback;
  if (/secret|credential|stack trace|access key|service_role|BEGIN |eyJ/i.test(value)) return fallback;
  return value;
}

export async function signOutWithTimeout(
  supabase: {
    auth: { signOut: (options?: { scope?: "local" | "global" | "others" }) => Promise<unknown> };
    rpc: (fn: string, args: Record<string, unknown>) => PromiseLike<unknown>;
  },
  timeoutMs = 1000
) {
  void Promise.resolve(supabase.rpc("log_auth_event", { p_event_type: "LOGOUT" })).catch(() => {
    // Audit logging must not block sign-out.
  });
  await Promise.race([
    supabase.auth.signOut({ scope: "local" }),
    new Promise((resolve) => setTimeout(resolve, timeoutMs)),
  ]);
}
