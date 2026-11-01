# Spotlight Ad Maker

Build a modern, high-converting B2B SaaS web application named "SpotlightMaker". The app allows business owners and marketers to generate AI-powered short-form video advertisement, scripts, hooks, and production layouts.

Key Requirements & Features:

1. Landing & Dashboard Layout:

   - Modern, sleek UI styled with Tailwind CSS (clean white/gray background with a vibrant indigo/violet accent color).

   - Top Navbar displaying the "SpotlightMaker" brand logo, credit balance counter, and user profile avatar/logout. And a background color switcher.

   - Main dashboard view featuring a split-screen layout: an ad generation input form on the left, and a live preview/output canvas on the right.

2. Ad Generation Form Inputs:

   - Business Name (text input)

   - Industry / Niche (text input)

   - Campaign Goal (dropdown: Drive Sales, Book Appointments, Brand Awareness)

   - Target Audience (text input)

   - A prominent "⚡ Generate Ad (1 Credit)" action button.

3. Supabase Backend Integration:

   - Connect to this Supabase for User Authentication (Sign up / Login).

Supabase Project URL: https://xhzmwcevyxaphsxibnxg.supabase.co

Supabase Anon Key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhoem13Y2V2eXhhcGhzeGlibnhnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc2NzgzODYsImV4cCI6MjEwMzI1NDM4Nn0.szGYvPI-OquOs9g5ED48_6d-ziQ9L4pxDN7xRVMldrc

   - Automatically create a user profile row upon signup with 5 free credits and a 'free' subscription tier.

   - A `video_generations` table logging each created ad (storing user_id, business_name, niche, prompt input, and generation status).

   - Deduct the credit from the user's profile upon successful generation submission.

4. Output & Preview Panel:- 

Once submitted, show a loading/processing state ("Compiling Ad Script...").

   - Display the generated multi-scene video ad script (Hook, Body, and Outro scenes) in a clean, professional preview card with options to copy or export.

   - A sidebar or history section showing past video generations.

5. Mandatory User Sign-Up & Persistent History:

   - Require users to sign up or log in before accessing the dashboard. 

   - Ensure all video creations, account activity, and generation history are securely tied to the authenticated user's profile in Supabase.

   - Implement strict session management: clearing the screen on logout, and seamlessly restoring their exact history and session state upon logging back in.

6. Automated Best-in-Class AI Script Generation:

   - Remove manual LLM provider switching (OpenAI vs Anthropic). Instead, automatically route requests behind the scenes to the highest-performing model to generate the best script instantly without user friction.

7. Revised Credit Pricing Structure:

   - Update the video generation credit cost scaling to:

     - 10s: 2 credits

     - 20s: 3.5 credits

     - 30s: 4.5 credits

     - 40s: 5.5 credits

     - 50s: 6.5 credits

     - 60s: 8 credits

   - Update all helper text and UI components across the app to reflect these exact rates.

8. Form Autosave & Inline Validation:

   - Implement autosave on the onboarding form so user inputs are never lost on accidental page refreshes.

   - Show validation errors inline to guide users smoothly.

9. Video & Caption Customization Controls:

   - Add intuitive controls allowing users to edit caption text, font style, and highlight colors before final export.

10. Granular Loading & Multi-Platform Export:

   - Improve the Generation & Script Studio loading flow to display real-time, step-by-step progress for scriptwriting, voiceover generation, captions, and media assembly.

   - Enable direct export options for the generated 9:16 vertical ad video to any social media like Instagram, Facebook, TikTok, YouTube, WhatsApp, and as a direct MP4 download optimized for mobile browsers. Paid user get their generated video asset without watermark. While free user get watermark on their assets.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://spotlightai.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/5674f2b2-70e4-4b6b-8e29-b5efc5aa4fcf).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
