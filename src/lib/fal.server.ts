/** Server-only helpers for the fal.ai video engine (Kling 2.5 Turbo Pro via the queue API). */

const QUEUE_BASE = "https://queue.fal.run";
/** First two segments of the endpoint id form the queue status path. */
const QUEUE_OWNER = "fal-ai";
const QUEUE_APP = "kling-video";
export const FAL_VIDEO_ENDPOINT = `${QUEUE_OWNER}/kling-video/v2.5-turbo/pro`;

export class FalApiError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.status = status;
  }
}

export function falApiKey(): string | undefined {
  return process.env["FAL_API_KEY"];
}

/** Turns an fal HTTP failure into a message a marketer can act on. */
export function describeFalError(status: number, body: string): string {
  let detail = "";
  try {
    const json = JSON.parse(body) as { detail?: string | { message?: string } };
    detail = typeof json.detail === "string" ? json.detail : (json.detail?.message ?? "");
  } catch {
    detail = body.slice(0, 200);
  }
  if (status === 401 || status === 403) {
    return "Your fal.ai API key was rejected. Check that FAL_API_KEY in the project secrets is valid.";
  }
  if (status === 402) return "Your fal.ai account is out of credits — top it up at fal.ai and retry.";
  if (status === 429) return "The video engine is rate limiting requests — wait a moment and retry.";
  if (status === 422) return `The video engine rejected this request${detail ? `: ${detail}` : ""}.`;
  return `The video engine request failed (${status})${detail ? `: ${detail}` : ""}.`;
}

/** Maps a finished-but-failed fal execution into a friendly message. */
export function describeFalExecutionError(error: string, errorType?: string): string {
  const e = (error || "").toLowerCase();
  if (e.includes("credit") || e.includes("balance") || e.includes("payment") || e.includes("insufficient")) {
    return "Your fal.ai account ran out of credits — top it up at fal.ai and retry.";
  }
  if (e.includes("auth") || errorType?.toLowerCase().includes("auth")) {
    return "Your fal.ai API key was rejected. Check FAL_API_KEY in the project secrets.";
  }
  if (e.includes("safety") || e.includes("flagged") || e.includes("moderation")) {
    return "The video engine declined this scene's content. Rephrase the scene description and retry.";
  }
  return `The video engine could not finish this scene${error ? `: ${error}` : ""}.`;
}

type FalSubmitResponse = {
  status?: string;
  request_id?: string;
  detail?: string;
};

/** Submits a generation request to the fal queue and returns its request id. */
export async function falSubmit(
  input: Record<string, unknown>,
  mode: "text" | "image",
): Promise<string> {
  const key = falApiKey();
  if (!key) {
    throw new FalApiError("Video generation is not configured yet — add your fal.ai API key.");
  }
  const endpoint = `${FAL_VIDEO_ENDPOINT}/${mode === "image" ? "image-to-video" : "text-to-video"}`;
  const res = await fetch(`${QUEUE_BASE}/${endpoint}`, {
    method: "POST",
    headers: { Authorization: `Key ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const text = await res.text();
  if (!res.ok) {
    console.error("fal submit failed", res.status, text);
    throw new FalApiError(describeFalError(res.status, text), res.status);
  }
  const json = JSON.parse(text) as FalSubmitResponse;
  if (!json.request_id) {
    throw new FalApiError("The video engine did not return a job id.");
  }
  return json.request_id;
}

export function falStatusUrl(requestId: string): string {
  return `${QUEUE_BASE}/${QUEUE_OWNER}/${QUEUE_APP}/requests/${requestId}/status`;
}

export function falResultUrl(requestId: string): string {
  return `${QUEUE_BASE}/${QUEUE_OWNER}/${QUEUE_APP}/requests/${requestId}`;
}

type FalQueueState = {
  status?: "IN_QUEUE" | "IN_PROGRESS" | "COMPLETED";
  queue_position?: number;
  error?: string;
  error_type?: string;
};

async function falFetch(url: string): Promise<unknown> {
  const key = falApiKey();
  if (!key) throw new FalApiError("Video generation is not configured.");
  const res = await fetch(url, { headers: { Authorization: `Key ${key}` } });
  const text = await res.text();
  if (!res.ok) {
    console.error("fal request failed", res.status, text);
    throw new FalApiError(describeFalError(res.status, text), res.status);
  }
  return JSON.parse(text);
}

export async function falFetchStatus(requestId: string): Promise<FalQueueState> {
  return (await falFetch(falStatusUrl(requestId))) as FalQueueState;
}

export async function falFetchResult(requestId: string): Promise<{ video?: { url?: string } }> {
  return (await falFetch(falResultUrl(requestId))) as { video?: { url?: string } };
}
