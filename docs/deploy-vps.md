# Running Elimu on the VPS

Elimu moved from Vercel + Neon to the EduPro VPS. This is the runbook: the one-time
move, everyday deploys, schema changes and rollback. It never lists secrets.

## Layout

| Thing | Value |
|---|---|
| Address | https://elimu.edupro.co.ke (Cloudflare A record, **DNS only**, grey cloud) |
| Server | `178.162.244.166`, the same VPS as EduPro (see EduPro's `context/operations.md`) |
| Container | `elimu-app`, image `elimu:vN`, listens on `127.0.0.1:3001` |
| Env file | `/root/apps/elimu/.env.production` (chmod 600), uploaded by `deploy.sh` |
| Database | `elimu_db`, owned by role `elimu`, on the host's Postgres 16 with pgvector |
| Migrations | run from `/root/migrate-elimu` (Prisma 6.19.3) by `deploy.sh` |
| nginx | `/etc/nginx/sites-available/elimu` (from `deploy/nginx/elimu.conf`) |
| Files | PDFs live on UploadThing, not on the server |
| Backups | EduPro's 8-hourly `edupro-backup.sh` also dumps `elimu_db` to R2 (`elimu-db-*.dump.age`) |

The proxy must stay **DNS only**: Cloudflare's proxy cuts requests at 100 s, and
generations are allowed 300 s.

---

## The one-time move

Do the steps in order. Steps 1–5 can happen any day: the old site keeps running on
Vercel and nobody uses the new address yet. Step 6 (cutover) needs a quiet hour.

### 1. Check the server has room

```bash
ssh root@178.162.244.166
free -h          # "available" should be ≥ 1.5 GB with EduPro running
df -h /          # a few GB free for the image and dumps
node -v          # used by the migration folder; any 18+ is fine
sudo -u postgres psql -tAc "SELECT default_version FROM pg_available_extensions WHERE name='vector'"
```

If memory is tight, stop and ask: the container is capped at 1 GB.

### 2. Database and role

```bash
sudo -u postgres createuser elimu --pwprompt     # use: openssl rand -hex 24  (hex, no URL escaping)
sudo -u postgres psql <<'SQL'
CREATE DATABASE elimu_db OWNER elimu;
\c elimu_db
ALTER SCHEMA public OWNER TO elimu;
CREATE EXTENSION IF NOT EXISTS vector;
SQL
```

Let the container (Docker bridge) and the host's own tools (`127.0.0.1`) reach it, the
same two lines EduPro has for its database:

```bash
printf 'host    elimu_db     elimu     172.17.0.0/16    scram-sha-256\nhost    elimu_db     elimu     127.0.0.1/32     scram-sha-256\n' >> /etc/postgresql/16/main/pg_hba.conf
systemctl reload postgresql
```

From the host itself, always connect to `127.0.0.1`: a host connection to `172.17.0.1`
arrives from the public IP and is refused. `deploy.sh` rewrites the address for that reason.

> **Done 2026-10-26:** steps 1–2, the migration folder, and the nginx site + certificate
> from step 5. The role's password is in `/root/apps/elimu/db-password` (root only):
> `ssh root@178.162.244.166 cat /root/apps/elimu/db-password`. Certbot has edited the
> live nginx file (HTTPS lines), so it no longer matches `deploy/nginx/elimu.conf` exactly.

Migration folder (once):

```bash
mkdir -p /root/migrate-elimu/prisma /root/apps/elimu/backups
cd /root/migrate-elimu && npm init -y >/dev/null && npm install prisma@6.19.3
```

### 3. The environment file

On your PC, in the repo (it's already linked to the Vercel project):

```powershell
npx vercel env pull .env.production --environment=production
```

Then edit `.env.production`:

- **Change**
  - `DATABASE_URL=postgresql://elimu:<password>@172.17.0.1:5432/elimu_db`
  - `DATABASE_URL_UNPOOLED=` the same value (the schema needs both)
  - `NEXT_PUBLIC_APP_URL=https://elimu.edupro.co.ke`
- **Delete** every `VERCEL_*`, `NX_*` and `TURBO_*` line.
- **Keep exactly as they are**
  - `ELIMU_SECRETS_KEY`: schools' AI keys are encrypted with it. A new value makes them unreadable.
  - `JWT_SECRET_KEY`, the AI provider keys, `PAYSTACK_SECRET_KEY`, `UPLOADTHING_TOKEN`, `RESEND_*`, `ELIMU_*`.
- **Remove the quotes** Vercel adds (Docker would keep them as part of the value):
  ```bash
  sed -i -E 's/^([A-Za-z0-9_]+)="(.*)"$/\1=\2/' .env.production
  ```

**Keep the Neon direct URL** (the old `DATABASE_URL_UNPOOLED` value) somewhere safe
before you overwrite it: you need it in steps 4 and 6.

`.env*` is git-ignored. Never commit this file.

### 4. First copy of the data (a test copy)

On the VPS. Paste the Neon **direct** URL when asked; it isn't echoed or saved to history.

```bash
read -rs NEON_URL && export NEON_URL
docker run --rm -e NEON_URL postgres:17-alpine sh -c 'psql "$NEON_URL" -tAc "show server_version"'
```

The dump tool must be at least Neon's version. 17.x or lower: use `postgres:17-alpine`
below. 18.x: use `postgres:18-alpine`.

```bash
DUMP=/root/apps/elimu/neon-$(date +%F_%H%M).sql
docker run --rm -e NEON_URL postgres:17-alpine \
  sh -c 'pg_dump "$NEON_URL" --no-owner --no-acl' > "$DUMP"
# Lines that only a superuser or a newer server accepts; the extension already exists.
sed -i -e '/^SET transaction_timeout/d' -e '/^COMMENT ON EXTENSION/d' "$DUMP"
psql -h 127.0.0.1 -U elimu -d elimu_db -v ON_ERROR_STOP=1 --single-transaction -f "$DUMP"
```

`--single-transaction` means a failure leaves the database empty, not half-filled. Send
the error over rather than working around it.

**Check the row counts match.** Run this query on both, with
`docker run --rm -e NEON_URL postgres:17-alpine sh -c 'psql "$NEON_URL"'` for Neon and
`psql -h 127.0.0.1 -U elimu -d elimu_db` for the VPS:

```sql
SELECT table_name,
       (xpath('/row/c/text()', query_to_xml(format('SELECT count(*) AS c FROM %I.%I', table_schema, table_name), false, true, '')))[1]::text::int AS rows
FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
ORDER BY 1;
```

**Baseline the migrations.** Neon was managed with `db push`, so the database has no
migration history. `0_init` describes the current schema; mark it as already applied.
From your PC:

```bash
scp prisma/schema.prisma root@178.162.244.166:/root/migrate-elimu/prisma/
scp -r prisma/migrations root@178.162.244.166:/root/migrate-elimu/prisma/
```

On the VPS:

```bash
cd /root/migrate-elimu
read -rs PW && export DATABASE_URL="postgresql://elimu:${PW}@127.0.0.1:5432/elimu_db" DATABASE_URL_UNPOOLED="postgresql://elimu:${PW}@127.0.0.1:5432/elimu_db"
npx prisma migrate diff --from-url "$DATABASE_URL" --to-schema-datamodel prisma/schema.prisma --exit-code; echo "exit $?"
```

- `exit 0`: the database matches the schema. Run `npx prisma migrate resolve --applied 0_init`.
- `exit 2`: Neon has drifted from the schema (something made by hand). **Stop** and send
  the printed SQL over; don't mark the baseline.

### 5. First deploy, nginx and TLS

Deploy from WSL (Docker Desktop must be running):

```bash
cd /mnt/c/Users/USER/projects/rag-chatbot && ./deploy.sh
```

It builds the image, uploads it and `.env.production`, backs up `elimu_db`, runs
migrations (none to apply yet), starts `elimu-app` and waits for `/api/health`.

nginx, on the VPS (copy `deploy/nginx/elimu.conf` up first with `scp`):

```bash
cp elimu.conf /etc/nginx/sites-available/elimu
ln -s /etc/nginx/sites-available/elimu /etc/nginx/sites-enabled/elimu
nginx -t && systemctl reload nginx
certbot --nginx -d elimu.edupro.co.ke      # adds HTTPS and the http→https redirect
nginx -t && systemctl reload nginx
```

`nginx -t` checks EduPro's config too. If it fails, remove the symlink and EduPro is
untouched.

**Test on https://elimu.edupro.co.ke**, on a phone as well as a laptop:

1. Sign in; open lessons, schemes and the chat.
2. Generate a lesson plan: it should stream in, not arrive all at once.
3. Upload a design PDF (UploadThing) and wait for it to be indexed.
4. Request a password reset; the emailed link must start with `https://elimu.edupro.co.ke`.
5. A Paystack test payment, if test mode is on.

Anything you create here is thrown away at cutover (step 6 copies the data again).

### 6. Cutover (quiet hour, ~15 minutes)

1. **Merge this branch to `main`** so the Vercel build has the redirect switch.
2. **Stop the new app** so nobody writes to the test copy: `docker stop elimu-app`.
3. **Point the old site at the new one.** Vercel → Project → Settings → Environment
   Variables: add `MOVED_TO_URL=https://elimu.edupro.co.ke` (Production), then redeploy.
   From now on the old address redirects, so nothing more is written to Neon.
4. **Copy the data again.** Reset the database, then repeat step 4 (dump, clean,
   restore, check counts, baseline):
   ```bash
   sudo -u postgres psql -c "DROP DATABASE elimu_db"
   sudo -u postgres psql <<'SQL'
   CREATE DATABASE elimu_db OWNER elimu;
   \c elimu_db
   ALTER SCHEMA public OWNER TO elimu;
   CREATE EXTENSION IF NOT EXISTS vector;
   SQL
   ```
5. **Start the app:** `docker start elimu-app`, then
   `curl -s http://127.0.0.1:3001/api/health` shows `{"status":"ok"}`.
6. **Paystack:** Dashboard → Settings → API Keys & Webhooks → Webhook URL:
   `https://elimu.edupro.co.ke/api/paystack/webhook` (live mode; test mode too if used).
   The callback URL needs no change: the app builds it per payment.
7. Open the old Vercel address and confirm it lands on the new site.

### 7. After cutover

- **Backups:** once `/root/apps/elimu/.env.production` exists, EduPro's backup script also
  dumps `elimu_db` (deploy that script change from the EduPro repo). After the next run,
  check `/var/log/edupro-backup.log` for `elimu dump ok`.
- **Uptime:** in GlitchTip, add an uptime monitor for `https://elimu.edupro.co.ke/api/health`.
- **Leave Vercel and Neon alone for two weeks** as a fallback, then delete the Vercel
  project. Keep Neon as your **development** database (see below) or delete it.
- **Delete the local dumps** (`/root/apps/elimu/neon-*.sql`): they hold every teacher's
  data unencrypted.

---

## Everyday deploys

```bash
cd /mnt/c/Users/USER/projects/rag-chatbot && ./deploy.sh
```

It warns before building with uncommitted changes, because they would ship.
`NEXT_PUBLIC_*` values are baked in at build time, so change them in `.env.production`
and redeploy; other values only need a container restart after the file is uploaded.

## Schema changes (no more `db push`)

Production now runs migrations, so `prisma db push` is never used against it.

1. Point your local `.env` at a development database: the old Neon database works. Run
   `npx prisma migrate resolve --applied 0_init` against it once.
2. Change `prisma/schema.prisma`, then `npx prisma migrate dev --name what_changed`.
   This writes `prisma/migrations/<timestamp>_what_changed/migration.sql`. Commit it.
3. `./deploy.sh` applies it (after a fresh backup) before swapping the container. If the
   migration fails, the deploy stops and the old container keeps running.

## Rolling back

**A bad deploy:** the VPS keeps the last 3 images.

```bash
docker images elimu                                   # pick the previous vN
docker stop elimu-app && docker rm elimu-app
docker run -d --name elimu-app -p 127.0.0.1:3001:3000 \
  --env-file /root/apps/elimu/.env.production \
  --add-host=host.docker.internal:172.17.0.1 --restart unless-stopped \
  --memory=1g --memory-swap=1.5g --cpus=1.5 \
  --log-driver=json-file --log-opt max-size=50m --log-opt max-file=3 \
  elimu:vN
```

A migration that already ran stays applied. Restore `/root/apps/elimu/backups/db-*.dump`
(taken just before it) only if the old code can't work with the new schema.

**The whole move**, before cutover: nothing to undo, the old site never stopped.
After cutover: remove `MOVED_TO_URL` in Vercel and redeploy, then copy the VPS data
back to Neon first (the same dump-and-restore in the other direction), or everything
done since cutover is lost.

## Health checks

```bash
docker ps --format '{{.Names}}\t{{.Status}}'          # elimu-app Up … (healthy)
docker logs --tail 50 elimu-app
curl -s http://127.0.0.1:3001/api/health              # {"status":"ok"} needs the database
grep -c 'limiting requests.*elimu' /var/log/nginx/error.log
```
