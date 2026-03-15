# AddOne Beta Hosting Recommendation

Last locked: March 14, 2026

For the first pre-launch beta, prefer the simplest low-ops hosted stack:

1. Current hosted `AddOne` Supabase project as beta for now
2. Managed MQTT broker
3. Small hosted realtime gateway service
4. EAS internal app builds

## Recommended default

### Supabase
Use the current hosted `AddOne` Supabase project as beta for now.

Reason:
- no extra project creation needed right now
- avoids blocking on the Supabase free-project limit
- keeps momentum while we move the rest of the stack online

Tradeoff:
- dev and beta still share the same hosted backend temporarily
- we can split a dedicated development or beta project later if we outgrow that setup

### MQTT broker
Use a managed MQTT broker for beta.

Reason:
- no Mosquitto maintenance
- no manual TLS certificate handling
- provider-managed stable hostname
- simpler monitoring and credentials

### Realtime gateway
Deploy the existing Node gateway as a small hosted service.

Reason:
- always-on without your laptop
- simple env-var-based deployment
- custom domain support is easy

### App delivery
Use EAS internal distribution first.

Reason:
- no Expo Go dependency
- closest path to real tester installs

## Where the VPS still helps
Your VPS is still useful, but not mandatory for beta.

Best uses:
- optional fallback if we later want to self-host broker + gateway
- hosting marketing/start pages under `addone.studio`
- optionally hosting the gateway later if we want to reduce vendors
- future consolidation after beta if we want fewer vendors

## Current repo support

Managed/default path:
- app beta config: `app.config.js`, `eas.json`
- gateway beta env: `services/realtime-gateway/.env.beta.example`
- firmware beta profile: `firmware/include/cloud_config.beta.example.h`
- current hosted beta Supabase project: `AddOne` (`sqhzaayqacmgxseiqihs`)

Fallback self-hosted path:
- `deploy/beta-vps`
