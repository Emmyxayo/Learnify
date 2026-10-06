# Deploying Learnify

Target: **https://learnifyng.tech** on Vercel, with the API staying at
`https://api.learnifyng.tech`.

---

## 0. Two things that have to be true before the first deploy

**The production branch must be `main`.** Vercel deploys the repo's
default branch. All of the backend integration landed on
`backend-contract` and was merged forward; if `main` ever falls behind
again, Vercel ships whatever is on it, not the work.

**Set the environment variables before deploying, not after.** Every
`NEXT_PUBLIC_*` value is inlined into the bundle at *build* time, not
read at runtime. Deploy first and `NEXT_PUBLIC_DATA_SOURCE` defaults
to `mock` — the site comes up on the real domain serving invented
courses and fake students, and it stays that way until a *rebuild*,
not a restart.

---

## 1. Environment variables

Set these in Vercel under **Settings → Environment Variables**, for
Production (and Preview, if you want previews pointed at the real API).

| Variable | Value | Why |
|---|---|---|
| `NEXT_PUBLIC_DATA_SOURCE` | `api` | Without it the build serves fixtures. |
| `NEXT_PUBLIC_API_URL` | `/api/backend` | Relative, so calls go through this app's own proxy. See §2. |
| `LEARNIFY_API_ORIGIN` | `https://api.learnifyng.tech` | Read server-side only — no `NEXT_PUBLIC_` prefix, so the API host never reaches the browser bundle. |
| `NEXT_PUBLIC_SITE_ORIGIN` | `https://learnifyng.tech` | Every shareable course link, canonical and OG tag is built from this. Wrong here means a wrong link in somebody's WhatsApp group. |

Leave everything else unset. The feature flags default to "only what
the backend can actually answer", which is the honest setting — see
`src/shared/lib/features.ts`.

**Do not set `NEXT_PUBLIC_TENANT_DOMAIN` yet.** It switches public
links from `learnifyng.tech/c/grace/course` to
`grace.learnifyng.tech/course`, and needs a wildcard DNS record *and*
a wildcard TLS certificate first. See §5.

---

## 2. Why the proxy, and when to stop using it

CORS is enforced by the browser against the page's origin, not between
servers. `api.learnifyng.tech` has not allowlisted `learnifyng.tech`,
so a direct browser call is refused before it is even sent.

`NEXT_PUBLIC_API_URL=/api/backend` points the app at its own route
(`src/app/api/backend/[...path]/route.ts`), which forwards the request
server-side where there is no origin to check.

It works, and it also keeps the API host out of the client bundle. But
it costs a second hop on every single call, which on a Nigerian 3G
connection is the difference people feel.

**The real fix is one line on the backend.** Ask for this:

```python
CORS_ALLOWED_ORIGINS = [
    "https://learnifyng.tech",
    "https://www.learnifyng.tech",
]
```

Then change one variable and the proxy stops being used:

```
NEXT_PUBLIC_API_URL=https://api.learnifyng.tech
```

(`LEARNIFY_API_ORIGIN` can stay; it is simply ignored.)

Verify either state with:

```bash
npm run api:check
```

---

## 3. DNS

### Do not move the nameservers

DNS for this domain is at **Hostinger** (`aster.dns-parking.com`,
`helios.dns-parking.com`), and as published today:

| Record | Value | What it is |
|---|---|---|
| `learnifyng.tech` A | `2.57.91.91` | Hostinger parking — this is the one to change |
| `api.learnifyng.tech` A | `69.62.111.152` | **the backend** |
| `www` CNAME | `learnifyng.tech` | follows the apex |
| MX, TXT | none | no email or verification to preserve |

Pointing the nameservers at Vercel moves the whole zone, and every
record not recreated there stops resolving — **including `api`, which
is the backend.** The API would go down the moment the change
propagated, and the frontend with it.

There is no need for it. Vercel validates a specific domain over HTTP
and issues the certificate without controlling the zone.

### What to actually change

In Vercel: **Settings → Domains → Add** `learnifyng.tech`, then add
`www.learnifyng.tech` and set it to redirect to the apex.

Then at Hostinger, change exactly two records:

| Type | Name | From | To |
|---|---|---|---|
| `A` | `@` | `2.57.91.91` | `76.76.21.21` |
| `CNAME` | `www` | `learnifyng.tech` | `cname.vercel-dns.com` |

**Leave the `api` A record exactly as it is.** Nothing about this
deployment touches the backend's address.

Vercel prints the values it wants on the Domains screen. If they
differ from these, use Vercel's — they are authoritative and these
were correct at the time of writing.

### Later, if you want per-academy subdomains

That is the one thing that *does* want the nameservers at Vercel, for
automatic wildcard certificates. If you ever do it, recreate `api` →
`69.62.111.152` at Vercel **first**, confirm it resolves, and only
then change the nameservers. See §5.

---

## 4. Region

`vercel.json` pins serverless functions to `lhr1` (London).

West African traffic reaches Europe over cables landing in
Portugal and the UK, so London is roughly 80–120 ms from Lagos against
150–200 ms for a US region. While the proxy is in use every API call
goes through a function, so this directly sets how fast the app feels.

Measured from Lagos, the backend answers in about 205 ms, which is
consistent with it being hosted in Europe too. If you find out it is
somewhere else, move this to match it — co-locating the function with
the backend matters more than the browser's distance to the function.

Once CORS is allowlisted and calls go direct, the region stops
mattering for API traffic and static pages serve from the edge
regardless.

---

## 5. Subdomains per academy (later)

The product is designed so each academy lives at
`<academy>.learnifyng.tech`. `middleware.ts` already maps those onto
the `/c/<academy>/...` routes, and setting
`NEXT_PUBLIC_TENANT_DOMAIN=learnifyng.tech` switches every generated
link over.

Before setting it you need both:

1. A wildcard DNS record — `CNAME *.learnifyng.tech → cname.vercel-dns.com`
2. A wildcard TLS certificate, which Vercel issues automatically
   **only when the domain's nameservers are Vercel's.** If you keep
   DNS at Hostinger you have to add each academy's subdomain by hand,
   which does not scale.

Point 2 is the one that costs something, because moving the
nameservers moves the whole zone. Before changing them, recreate
`api.learnifyng.tech → 69.62.111.152` in Vercel's DNS and confirm it
resolves. Miss that and the backend disappears along with the parking
page.

Until both are in place, leave it unset. Links are permanent once
somebody has pasted one into a group chat.

---

## 6. First deploy

```bash
# From the repo, once
npx vercel link

# Deploy a preview and check it
npx vercel

# Promote to learnifyng.tech
npx vercel --prod
```

Or connect the GitHub repo in the Vercel dashboard and let pushes to
`main` deploy themselves.

---

## 7. After the first deploy

- [ ] `https://learnifyng.tech` loads the landing page
- [ ] `npm run api:check` passes against production
- [ ] Sign-up reaches the "confirm your email" step
- [ ] A confirmation code actually arrives — **this is currently
      broken on the backend** and blocks every authenticated screen.
      See the note below.
- [ ] A published course link opens for a signed-out visitor

### The one blocker that is not in this repo

No verification email is being delivered. Measured against the live
API, asking for a code for a real account takes the same time as
asking for one for an account that does not exist, and both are within
noise of a request that sends no mail at all — so no send is being
attempted.

Until that is fixed nobody can complete sign-up, which means none of
the studio screens can be exercised against the real backend. The
frontend side of it is finished and tested against every response
shape the API returns.
