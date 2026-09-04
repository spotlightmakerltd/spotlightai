/** Server-only speech synthesis via the hosted speech gateway. */

const VOICE_MAP: Record<string, { voice: string; instructions: string }> = {
  "en-NG-EzinneNeural": {
    voice: "shimmer",
    instructions:
      "Speak as a warm, confident Nigerian woman with a natural Nigerian English accent. Energetic advertising read, clear and friendly.",
  },
  "en-NG-AbeoNeural": {
    voice: "onyx",
    instructions:
      "Speak as a confident Nigerian man with a natural Nigerian English accent. Bold, persuasive advertising read.",
  },
  "en-US-AriaNeural": {
    voice: "nova",
    instructions:
      "Speak as an upbeat American woman with a natural African American English cadence. Bright, punchy advertising read.",
  },
  "en-US-ChristopherNeural": {
    voice: "ash",
    instructions:
      "Speak as a smooth American man with a natural African American English cadence. Deep, persuasive advertising read.",
  },
};

export type SpeechResult = { bytes: Uint8Array; mime: string };

/** Generates spoken MP3 audio for the given text, or undefined when unavailable. */
export async function synthesizeSpeech(
  text: string,
  voiceId: string,
): Promise<SpeechResult | undefined> {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key || !text.trim()) return undefined;
  const mapped = VOICE_MAP[voiceId] ?? VOICE_MAP["en-US-AriaNeural"]!;
  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/audio/speech", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "openai/gpt-4o-mini-tts",
        input: text.slice(0, 3000),
        voice: mapped.voice,
        instructions: mapped.instructions,
        response_format: "mp3",
      }),
    });
    if (!res.ok) {
      console.error("Speech generation failed", res.status, await res.text().catch(() => ""));
      return undefined;
    }
    const buf = new Uint8Array(await res.arrayBuffer());
    if (!buf.length) return undefined;
    return { bytes: buf, mime: "audio/mpeg" };
  } catch (err) {
    console.error("Speech generation error", err);
    return undefined;
  }
}

export function toBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}
