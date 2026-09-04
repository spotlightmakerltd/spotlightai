import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { synthesizeSpeech, toBase64 } from "./tts.server";

const PreviewSchema = z.object({
  text: z.string().min(1).max(600),
  voice: z.string().min(1),
});

/** Returns a short spoken sample of the chosen voice as a playable data URL. */
export const previewVoice = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => PreviewSchema.parse(data))
  .handler(async ({ data }): Promise<{ ok: boolean; audioUrl?: string; error?: string }> => {
    const speech = await synthesizeSpeech(data.text, data.voice);
    if (!speech) {
      return { ok: false, error: "Voice preview is unavailable right now. Please try again." };
    }
    return { ok: true, audioUrl: `data:${speech.mime};base64,${toBase64(speech.bytes)}` };
  });
