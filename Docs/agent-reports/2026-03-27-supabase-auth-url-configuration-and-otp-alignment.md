Stage
S4: Beta Hardening And Durable Release Memory

Status
Coordinator support note only. The app-side auth surface is now aligned to a 6-digit email-code flow, but the hosted Supabase dashboard still needs one narrow URL-configuration and email-provider verification pass before the next store-facing iOS RC build.

Changes made
- Added this coordinator-facing report:
  - [2026-03-27-supabase-auth-url-configuration-and-otp-alignment.md](/Users/viktor/Desktop/DevProjects/Codex/AddOne/Docs/agent-reports/2026-03-27-supabase-auth-url-configuration-and-otp-alignment.md)
- Confirmed the current app deep-link targets and code-first auth behavior in:
  - [app.config.js](/Users/viktor/Desktop/DevProjects/Codex/AddOne/app.config.js)
  - [providers/auth-provider.tsx](/Users/viktor/Desktop/DevProjects/Codex/AddOne/providers/auth-provider.tsx)
  - [app/sign-in.tsx](/Users/viktor/Desktop/DevProjects/Codex/AddOne/app/sign-in.tsx)
- Confirmed the repo-local Supabase config already models the intended posture for passwordless email auth:
  - email confirmations disabled
  - native redirect URLs allowed
  - 6-digit OTP length configured
  - file: [supabase/config.toml](/Users/viktor/Desktop/DevProjects/Codex/AddOne/supabase/config.toml)
- Confirmed the hosted AddOne Supabase project is linked in the local CLI, but the SMTP provider identity is not stored in repo files or project secrets. The user confirmed the hosted SMTP provider is Resend.

Commands run
- `sed -n '1,220p' /Users/viktor/.codex/skills/stage-coordinator/SKILL.md`
- `sed -n '1,220p' Docs/agent-coordination.md`
- `sed -n '1,220p' app.config.js`
- `sed -n '1,220p' providers/auth-provider.tsx`
- `sed -n '1,260p' app/sign-in.tsx`
- `sed -n '150,260p' supabase/config.toml`
- `rg -n "scheme|addone-beta|addone://|Linking.createURL|signInWithOtp|emailRedirectTo|shouldCreateUser|enable_confirmations|site_url|additional_redirect_urls" app providers supabase Docs -g '!node_modules'`
- `npx supabase projects list`
- `npx supabase secrets list --project-ref sqhzaayqacmgxseiqihs`

Evidence
- App routing and callback posture:
  - the Expo app schemes are `addone` for development and `addone-beta` for beta in [app.config.js](/Users/viktor/Desktop/DevProjects/Codex/AddOne/app.config.js)
  - the app requests native auth callbacks via `Linking.createURL("/auth/callback")` in [providers/auth-provider.tsx](/Users/viktor/Desktop/DevProjects/Codex/AddOne/providers/auth-provider.tsx)
- App UX posture:
  - the sign-in UI now instructs the user to enter a 6-digit code, not tap a magic link, in [app/sign-in.tsx](/Users/viktor/Desktop/DevProjects/Codex/AddOne/app/sign-in.tsx)
- Repo-local Supabase posture:
  - `enable_confirmations = false` under `[auth.email]` in [supabase/config.toml](/Users/viktor/Desktop/DevProjects/Codex/AddOne/supabase/config.toml)
  - allowed redirect patterns in the repo config already include `addone://**`, `addone-beta://**`, and `exp://**` in [supabase/config.toml](/Users/viktor/Desktop/DevProjects/Codex/AddOne/supabase/config.toml)
  - `otp_length = 6` in [supabase/config.toml](/Users/viktor/Desktop/DevProjects/Codex/AddOne/supabase/config.toml)
- Hosted dashboard gap observed from the user-provided Supabase URL Configuration screenshot:
  - `Site URL` is still `http://localhost:3000`
  - `Redirect URLs` is empty
- Hosted email-template posture confirmed by the user:
  - the hosted `Magic Link` template already uses `{{ .Token }}` with AddOne-branded OTP copy, which is the correct Supabase template variable for code delivery rather than link-only delivery

Open risks / blockers
- External dashboard follow-up still required:
  - `Site URL` should not remain `http://localhost:3000` on the hosted AddOne project because any fallback link-based auth path will still try to open localhost
  - the hosted project should add redirect allow-list entries for:
    - `addone://**`
    - `addone-beta://**`
    - `exp://**` while Expo Go remains part of RC validation
    - the eventual real web host such as `https://addone.studio/**` once it exists
- The current hosted `Site URL` fallback should favor the active RC app path:
  - for the current beta-backed iOS RC stage, `addone-beta://auth/callback` is the safest default fallback target
- The hosted Email provider settings still need one explicit verification pass:
  - `Confirm Email` should be `OFF` so first-time passwordless users do not get pushed into a separate confirm-signup ceremony
  - the `Confirm sign up` template should be treated as fallback-only and should not contain localhost-facing or staging-grade copy if it ever fires
- SMTP/provider note:
  - the repo did not expose a configured SMTP host through source or project secrets, so coordinator memory should treat Resend as a user-confirmed hosted dashboard fact until it is explicitly captured in a durable environment/runbook note

Recommendation
Keep this under `S4: Beta Hardening And Durable Release Memory` as a narrow external release-ops follow-up, not a new product stage.

Coordinator action when folding notes:
- record that app-side auth UX is now code-first and aligned with OTP entry
- track one hosted Supabase dashboard cleanup pass before the next store-facing iOS RC build:
  - set `Site URL` to `addone-beta://auth/callback`
  - add redirect URLs for `addone://**`, `addone-beta://**`, and `exp://**`
  - verify `Authentication -> Providers -> Email -> Confirm Email` is `OFF`
  - preserve the `Magic Link` template as token-based OTP copy using `{{ .Token }}`
- once those dashboard settings are verified, fold the result into the stage note and beta-environment memory as completed RC auth configuration, rather than leaving it only in chat.
