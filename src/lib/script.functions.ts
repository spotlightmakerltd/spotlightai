import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const InputSchema = z.object({
  businessName: z.string().min(1),
  niche: z.string().min(1),
  campaignGoal: z.string().min(1),
  targetAudience: z.string().min(1),
  durationSeconds: z.number().int().min(10).max(60),
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
  const third = Math.max(3, Math.round(i.durationSeconds / 3));
  return {
    title: `${i.businessName} — ${i.campaignGoal} spot`,
    hookLine: `${i.targetAudience}: this is why ${i.niche} feels harder than it should.`,
    scenes: [
      {
        label: "Hook",
        timecode: `0:00 – 0:${String(third).padStart(2, "0")}`,
        voiceover: `Stop scrolling. If you're ${i.targetAudience.toLowerCase()}, ${i.niche.toLowerCase()} shouldn't cost you your week.`,
        onScreenText: "STOP SCROLLING 🚨",
        visual: "Fast punch-in on face, hard cut, bold caption pop.",
      },
      {
        label: "Body",
        timecode: `0:${String(third).padStart(2, "0")} – 0:${String(third * 2).padStart(2, "0")}`,
        voiceover: `${i.businessName} makes it simple — built specifically for ${i.niche.toLowerCase()} so you get results without the guesswork.`,
        onScreenText: `Built for ${i.niche}`,
        visual: "B-roll of the product/service in use, quick 3-beat montage.",
      },
      {
        label: "Outro",
        timecode: `0:${String(third * 2).padStart(2, "0")} – 0:${String(i.durationSeconds).padStart(2, "0")}`,
        voiceover: `Tap the link and let ${i.businessName} handle the rest.`,
        onScreenText: goalCta(i.campaignGoal),
        visual: "Logo lockup, animated button, brand colors.",
      },
    ],
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

    const prompt = `Write a high-converting ${data.durationSeconds}-second vertical (9:16) short-form video ad script.
Business: ${data.businessName}
Industry/Niche: ${data.niche}
Campaign goal: ${data.campaignGoal}
Target audience: ${data.targetAudience}
Return exactly three scenes labelled Hook, Body and Outro that fit ${data.durationSeconds} seconds of spoken voiceover.`;

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
