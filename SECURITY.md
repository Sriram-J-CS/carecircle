# CareCircle — Security Summary (for judges)

| Area | Control | Where |
|---|---|---|
| Passwords | PBKDF2-SHA256, 200k iterations, per-user salt, constant-time compare; policy: 8+ chars, letter + number | security.py, schemas.py |
| Login abuse | 5 failed logins -> 15 min lockout per account; face-login lockout per IP; 10 auth requests/min/IP; 120 requests/min/IP | protection.py |
| User enumeration | Same error + dummy hash on unknown email (no timing leak) | routers/auth.py |
| Tokens | JWT HS256, 24h expiry, `jti`, required `exp`/`sub`, role must match DB | security.py |
| Secrets | App refuses to start in production with a weak/default `JWT_SECRET` or wildcard CORS | config.py |
| CORS | Explicit origin list, only needed methods/headers, no credentials | main.py |
| Headers | nosniff, X-Frame-Options DENY, CSP, no-referrer, Permissions-Policy, no-store, HSTS (prod) | protection.py |
| Input | Pydantic limits on every text field, phone/email/face-vector validation | schemas.py |
| Uploads | Extension + MIME allow-list, 25 MB cap, request body cap | medications.py, protection.py |
| Authorization | Every patient route calls `require_access` (self / relative grant / doctor team); tested 403s | security.py |
| Audit | `audit_log` table: register, login, failed login, face login (with IP) | protection.py |
| Attack surface | `/docs` hidden and demo helpers disabled when `APP_ENV=production`, `DEMO_MODE=false` | main.py, config.py |
| SQL injection | Parameterised queries everywhere (`?` placeholders) | all routers |
| Tests | 21 pytest tests incl. 9 security tests | tests/ |

## Production checklist
```
APP_ENV=production
DEMO_MODE=false
JWT_SECRET=<python -c "import secrets;print(secrets.token_urlsafe(48))">
CORS_ORIGINS=https://your-frontend.example
```
Serve behind HTTPS (Render / Railway / Cloud Run give this for free).

## Honest limits (say them — judges reward honesty)
- Face login has no liveness detection (a photo could fool it); password login is the fallback.
- SQLite + in-memory rate limiter suit one server; use Postgres + Redis to scale out.
- No encryption-at-rest of the DB file; production needs DPDP Act 2023 consent screens.
- Not a medical device.
