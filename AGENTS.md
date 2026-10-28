<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Decisions

- Scene visuals are generated as real motion clips by fal.ai (Kling 2.5 Turbo Pro, queue API, `FAL_API_KEY` server secret), polled client-side via `startSceneVideo`/`checkSceneVideo`; Shotstack remains the assembler for captions and voiceover. Why: real AI video without long-running server requests, which caused edge-proxy timeouts.
