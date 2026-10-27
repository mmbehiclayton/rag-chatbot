# Moving Elimu from Vercel to the EduPro VPS: progress

Last updated 2026-10-26. The runbook with every command is [deploy-vps.md](deploy-vps.md);
this file only tracks where we are. Update it as steps finish, and delete it once the
move is done (keep the runbook).

## Decisions already made

- **Target:** `https://elimu.edupro.co.ke` on the EduPro VPS (`root@178.162.244.166`).
  Cloudflare A record `elimu` → 178.162.244.166, DNS only (grey cloud).
- **Database:** moves off Neon to the VPS Postgres 16 (database `elimu_db`, role `elimu`,
  pgvector 0.6.0). The EduPro database on the same server is not touched.
- **Image:** built locally from `Dockerfile` and streamed over ssh by `deploy.sh`
  (no clone on the server). Run `./deploy.sh` from WSL at
  `/mnt/c/Users/USER/projects/rag-chatbot`.
- **Schema:** no more `db push` against production. Baseline migration
  `prisma/migrations/0_init` (from `migrate diff --from-empty`); production gets
  `migrate deploy` from `deploy.sh`. Neon becomes the dev DB for `migrate dev`.
- **Cutover:** set `MOVED_TO_URL=https://elimu.edupro.co.ke` on Vercel; `next.config.ts`
  then redirects every Vercel request to the VPS.
- **Passwords:** the user rotates them after the deployment (the `elimu` DB password,
  the Neon password, and any key that went through `.env.production`).

## Done

Code, on branch `deploy/vps`, **not committed yet**:
- `next.config.ts`: `output: "standalone"` plus the `MOVED_TO_URL` redirect.
- `src/app/api/health/route.ts` (new, `SELECT 1`) and `/api/health` in `src/proxy.ts` public routes.
- `package.json`: `pnpm.onlyBuiltDependencies`.
- New: `Dockerfile` (node:22.17.0-alpine, pnpm 10.28.1), `.dockerignore`,
  `.gitattributes` (LF for `*.sh`, Dockerfile, `deploy/**`), `deploy.sh`,
  `deploy/nginx/elimu.conf`, `docs/deploy-vps.md`, `prisma/migrations/0_init` + lock file.
- A local test build worked (login 200, dashboard 307, health 503 with no DB as expected).
- The three modified files under `src/app/dashboard/create` and `src/components/create`
  were the user's own work in progress before this move started; not part of it.

On the VPS (runbook steps 1, 2 and the nginx/TLS half of 5):
- Role `elimu` and database `elimu_db` (owner elimu, `vector` installed). The password was
  generated on the server and is only in `/root/apps/elimu/db-password` (root, 600).
- `pg_hba.conf`: `elimu_db elimu` from `172.17.0.0/16` and `127.0.0.1/32`, scram.
  Backup at `/root/pg_hba.conf.bak.20261026195311`.
- `/root/apps/elimu/` (700) with `backups/`; `/root/migrate-elimu/` with prisma@6.19.3.
- nginx site `elimu` enabled, Let's Encrypt cert for `elimu.edupro.co.ke`, HTTP → HTTPS.
  Certbot edited the live file, so the server copy differs from `deploy/nginx/elimu.conf`.
- Checked afterwards: EduPro still 200; elimu HTTPS 502 (no app yet) with a valid cert.

Locally: `npx vercel env pull .env.production --environment=production` worked. One
variable marked Sensitive on Vercel came out as the literal `[SENSITIVE]` placeholder.

Runbook steps 3 and 4 (2026-10-26):
- Neon unpooled URL saved to `/root/apps/elimu/neon-url` (root, 600).
- `.env.production` rewritten for the VPS: DB URLs → `elimu@172.17.0.1/elimu_db`,
  `NEXT_PUBLIC_APP_URL=https://elimu.edupro.co.ke`, Vercel/NX/TURBO lines gone, no quotes.
  The original pull is kept as `.env.production.vercel` (git-ignored).
- `ANTHROPIC_API_KEY` (the `[SENSITIVE]` one) is **blank** for now. It is only the
  fallback; a key saved on Settings, AI keys is in the database and came over with the
  data. Fill it in if there's no saved Claude key.
- Test copy: Neon is 17.11; dump `/root/apps/elimu/neon-2026-10-26_2009.sql` restored in
  one transaction; row counts match on all 34 tables. `migrate diff` exit 0 (no drift),
  `0_init` marked applied, `migrate status` up to date.

## Gotchas found on the way

- **Host vs container address.** Containers reach Postgres at `172.17.0.1`. From the host
  itself that address arrives from the public IP and `pg_hba` refuses it, so host-side
  tools (pg_dump, prisma migrate, psql) must use `127.0.0.1`. `deploy.sh` rewrites it.
- **No quotes in `.env.production`.** `docker --env-file` keeps quotes as part of the value;
  `deploy.sh` refuses a quoted file and prints the `sed` fix. Don't `source` the file
  either; grep single keys out of it.
- **CRLF.** `core.autocrlf=true` here; use Windows git for this repo (WSL git shows every
  file modified). `pnpm install --lockfile-only` rewrites line endings in `pnpm-lock.yaml`;
  restore it with `git checkout -- pnpm-lock.yaml`.
- **Two lockfiles.** `pnpm-lock.yaml` pins Prisma 6.4.1, the npm `package-lock.json` has
  6.19.3. The Docker build uses pnpm. Pick one later.
- **HSTS.** `edupro.co.ke` sends `includeSubDomains`, so the subdomain must always have a
  valid cert.
- **ssh from Windows.** Only WSL has the server key; Git Bash ssh gets "Permission
  denied". Use `wsl ssh …` / `wsl bash -c "ssh … bash -s" < file`.
- **ssh quoting.** Send multi-line server work as a script file: `ssh root@… bash -s < file`
  (inline `$$` etc. get expanded locally).
- The earlier session ran from the EduPro repo, whose rules block reading/editing `.env*`
  files. That's why it stopped here. Sessions in this repo don't have that rule.

## Next steps

1. ~~Fix `.env.production`~~ and 2. ~~test copy~~: done, see above.
3. **First deploy:** done 2026-10-26, `elimu:v1`, healthy; pre-deploy backup
   `db-2026-10-26_201900.dump`. Public checks pass (health 200 `{"status":"ok"}`, `/`
   and `/login` 200, `/dashboard` 307 → `elimu.edupro.co.ke/login`, EduPro still 200).
   Login works and the user confirmed the designs pages match Vercel. (Junior school
   designs look missing on both: Grade 7/8 maps are DRAFT, so the teacher page hides them.)
   Still to test by hand: a generation (streaming), uploads, a saved Claude key on
   Settings, AI keys.
4. **Cutover** (step 6): commit and merge `deploy/vps` to main (ask first), stop
   `elimu-app`, set `MOVED_TO_URL` on Vercel and redeploy, re-copy the data, re-baseline,
   start the container, point the Paystack webhook at
   `https://elimu.edupro.co.ke/api/paystack/webhook`.
5. **After** (step 7): GlitchTip uptime monitor on `/api/health`; delete local dumps and
   `/root/apps/elimu/neon-url`; user rotates passwords; resolve the lockfile mismatch.

## Related change in the EduPro repo (`~/edupro-erp`, uncommitted)

- `scripts/backup/edupro-backup.sh` now also dumps `elimu_db` (when
  `/root/apps/elimu/.env.production` exists), age-encrypts it as `elimu-db-<stamp>.dump.age`
  and ships it to R2 with the 8-hourly EduPro backup. **Not yet copied to the VPS**;
  find where the server runs it from (cron) before replacing it.
- `context/operations.md` and `context/progress-tracker.md` there record Elimu as the
  second app on the host.
- 2026-10-27: edupro.co.ke now links to `https://elimu.edupro.co.ke` (navbar "Elimu for
  Teachers", footer, home hero, pricing hero and FAQ), via `ELIMU_URL` in
  `src/lib/teacher-library/constants.ts`. Deploy that EduPro change only after Elimu is live.

## Theme (2026-10-27, uncommitted, in this repo)

Elimu now uses EduPro's colours: `src/app/globals.css` tokens (blue primary
`hsl(213 94% 48%)`, cool-grey page, white cards, radius 0.625rem), `themeColor` in
`src/app/layout.tsx`, the email buttons in `src/lib/email.ts`, and a note in `Brand.md`.
The sidebar stays white (its text uses muted/foreground). The font stays DM Sans on
purpose (EduPro uses Poppins): the user chose not to change the existing design, and DM
Sans keeps numbers aligned in tables. Check the pages in the browser before deploying.
