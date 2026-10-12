# Agent & Admin Dashboard (Module 9)

## Setup

The dashboard uses the existing React/Vite client, Express API, and file-backed LowDB database. Start both processes with:

```powershell
npm install
$env:ADMIN_BOOTSTRAP_EMAIL = "admin@example.com"
$env:ADMIN_BOOTSTRAP_PASSWORD = "use-a-unique-password-of-at-least-12-characters"
npm run dev
```

The administrator is created only when no dashboard users exist. The bootstrap password is read from the server environment and is never included in the application. Remove both bootstrap variables after the first successful startup. Administrators can then create Support Agent or additional Admin accounts from **People & teams**. There is no password-reset flow; provision initial passwords securely and arrange a reset process before production use.

For deployment, set `DASHBOARD_ORIGIN` to the exact public origin serving the client (scheme, host, and port, with no path), and run with `NODE_ENV=production` behind HTTPS. The session cookie is marked `Secure` in production. Local development permits localhost origins on any port, including alternate Vite ports.

Run the project with `npm run dev` and open the Vite URL shown in the terminal. The Vite development proxy forwards `/api` requests to `http://localhost:4000`.

## Roles and behavior

- Dashboard authentication and role checks are enforced by the Express API. Agents only receive tickets assigned to their dashboard account; admins can view all project tickets and assign/reassign tickets to active agents.
- Dashboard users have salted scrypt password hashes. Session tokens are random, stored as SHA-256 hashes, and expire after eight hours. Cookies are HttpOnly and SameSite=Strict.
- Agents can update ticket status, add private notes, save response drafts, and request reassignment or escalation review. Drafts are not sent to customers; approval does not send email, page staff, or trigger an external alert.
- The admin can manage dashboard accounts, team/capacity configuration, routing policy records, and escalation thresholds. These Module 9 policy records do not automatically change Module 7 routing.
- Team capacity and availability are administrator-maintained configuration, not live presence or a real-time workload integration. Workload cards count open tickets assigned to agents whose configured team name matches.
- Existing ticket examples are marked as demo data. Dashboard history and configuration are persisted in `server/data/tickets.json` unless `DASHBOARD_DATA_DIR` is set.

## Security and limitations

The local JSON database is intended for development and small single-process deployments; it does not provide database-level transactions, multi-instance coordination, backup/restore, or a formal audit-log retention policy. Failed-login throttling is in memory and resets when the server restarts. There is no password reset, MFA, invitation flow, or external identity provider. Use a production database, HTTPS, backups, monitoring, and an organization-approved account recovery process before handling real customer data.

The original non-dashboard API endpoints remain separate from this module and are not protected by dashboard authentication. Do not expose those existing endpoints to untrusted networks without adding the appropriate access controls.

## Validation

Run the full automated suite with `npm test` and create a production client build with `npm run build`.
