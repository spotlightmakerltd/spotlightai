import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const InputSchema = z.object({
  businessName: z.string().min(1),
  niche: z.string().min(1),
  campaignGoal: z.string().min(1),
  targetAudience: z.string().min(1),
  // Ad lengths come in 5-second scene multiples (15/30/45/60).
  durationSeconds: z.number().int().min(15).max(60),
});

export type AdScene = {
  label: string;
  timecode: string;
  voiceover: string;
  onScreenText: string;
  visual: string;
};

export type AdScript = {
  title: string;
  hookLine: string;
  scenes: AdScene[];
  cta: string;
  hashtags: string[];
};

function fallbackScript(i: z.infer<typeof InputSchema>): AdScript {
  const count = Math.max(1, Math.round(i.durationSeconds / 5));
  const scenes: AdScene[] = [];
  for (let n = 0; n < count; n++) {
    const from = `0:${String(n * 5).padStart(2, "0")}`;
    const to = `0:${String(Math.min(i.durationSeconds, (n + 1) * 5)).padStart(2, "0")}`;
    const label = n === 0 ? "Hook" : n === count - 1 ? "Outro" : count === 3 ? "Body" : `Body ${n}`;
    const voiceover =
      n === 0
        ? `Stop scrolling. If you're ${i.targetAudience.toLowerCase()}, ${i.niche.toLowerCase()} shouldn't cost you your week.`
        : n === count - 1
          ? `Tap the link and let ${i.businessName} handle the rest.`
          : n % 2 === 1
            ? `${i.businessName} makes it simple — built specifically for ${i.niche.toLowerCase()} so you get results without the guesswork.`
            : `Real results from people exactly like you — no guesswork, no waiting, no bloat.`;
    const onScreenText =
      n === 0
        ? "STOP SCROLLING 🚨"
        : n === count - 1
          ? goalCta(i.campaignGoal)
          : `Built for ${i.niche}`;
    const visual =
      n === 0
        ? "Fast punch-in on face, hard cut, bold caption pop."
        : n === count - 1
          ? "Logo lockup, animated button, brand colors."
          : "B-roll of the product/service in use, quick 3-beat montage.";
    scenes.push({ label, timecode: `${from} – ${to}`, voiceover, onScreenText, visual });
  }
  return {
    title: `${i.businessName} — ${i.campaignGoal} spot`,
    hookLine: `${i.targetAudience}: this is why ${i.niche} feels harder than it should.`,
    scenes,
    cta: goalCta(i.campaignGoal),
    hashtags: ["#smallbusiness", "#ads", `#${i.niche.replace(/\s+/g, "").toLowerCase()}`],
  };
}

function goalCta(goal: string) {
  if (goal === "Book Appointments") return "Book your slot today →";
  if (goal === "Brand Awareness") return "Follow for more →";
  return "Shop now →";
}

export const generateAdScript = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => InputSchema.parse(data))
  .handler(async ({ data }): Promise<AdScript> => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) return fallbackScript(data);

    // One scene per 5-second motion clip the video engine produces.
    const sceneCount = Math.max(1, Math.round(data.durationSeconds / 5));
    const prompt = `Write a high-converting ${data.durationSeconds}-second vertical (9:16) short-form video ad script.
Business: ${data.businessName}
Industry/Niche: ${data.niche}
Campaign goal: ${data.campaignGoal}
Target audience: ${data.targetAudience}
Return exactly ${sceneCount} scenes (label the first Hook and the last Outro, middle scenes Body). Each scene is exactly 5 seconds of screen time, and together they fill ${data.durationSeconds} seconds of spoken voiceover.`;

    try {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash",
          messages: [
            {
              role: "system",
              content:
                "You are an elite direct-response short-form video ad copywriter. Always answer with the requested JSON only.",
            },
            { role: "user", content: prompt },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "emit_script",
                description: "Return the finished ad script",
                parameters: {
                  type: "object",
                  properties: {
                    title: { type: "string" },
                    hookLine: { type: "string" },
                    scenes: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          label: { type: "string" },
                          timecode: { type: "string" },
                          voiceover: { type: "string" },
                          onScreenText: { type: "string" },
                          visual: { type: "string" },
                        },
                        required: ["label", "timecode", "voiceover", "onScreenText", "visual"],
                      },
                    },
                    cta: { type: "string" },
                    hashtags: { type: "array", items: { type: "string" } },
                  },
                  required: ["title", "hookLine", "scenes", "cta", "hashtags"],
                },
              },
            },
          ],
          tool_choice: { type: "function", function: { name: "emit_script" } },
        }),
      });

      if (!res.ok) {
        console.error("AI gateway error", res.status, await res.text());
        return fallbackScript(data);
      }

      const json = (await res.json()) as {
        choices?: Array<{
          message?: { tool_calls?: Array<{ function?: { arguments?: string } }> };
        }>;
      };
      const args = json.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
      if (!args) return fallbackScript(data);
      const parsed = JSON.parse(args) as AdScript;
      if (!parsed.scenes?.length) return fallbackScript(data);
      return parsed;
    } catch (err) {
      console.error("Script generation failed", err);
      return fallbackScript(data);
    }
  });
