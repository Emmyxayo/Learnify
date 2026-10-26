# Notes for the backend

Everything here was found by running the real frontend against
`https://api.learnifyng.tech` and reading what came back, not from the
OpenAPI document. Each item says what the frontend now does about it, so
nothing is blocked on any of this — but most of these are a line of
backend work that would let a workaround be deleted.

Ordered by what it costs a user.

---

## 1. A one-time code sent to a phone number goes nowhere

`POST /api/v1/auth/otp/request/` takes an `identifier`, and a phone
number is accepted exactly like an email:

```
{"identifier": "+2348031002244", "purpose": "login"}
-> 202 {"detail": "If the account exists, a code has been sent."}
```

Nothing arrives. Codes are delivered by mail only.

That reply is the right shape for not leaking which accounts exist, but
it also hides a real failure, so it took a mailbox to notice. Phone is
the identity in this product and the sign-in form asked for one, which
meant the one-time-code door could not open for anybody.

**Frontend now:** the sign-in form takes an email or a phone number and
says codes arrive by email. Enrolment requires an email, because it is
the only way a student can get back in.

**Worth doing:** when `identifier` is a phone number, send the code to
that account's email. One lookup, and the product gets its phone-first
sign-in back. Sending an actual SMS would be better still.

---

## 2. Refresh tokens rotate and the old one is blacklisted

Confirmed directly:

```
POST /auth/refresh/  {refresh: R}   -> 200, returns a new refresh R2
POST /auth/refresh/  {refresh: R}   -> 401 {"code": "token_not_valid"}
```

This is fine and is SimpleJWT's safer setting — flagging it because it
is not in the schema and it is load-bearing. Any client that fires two
refreshes with the same token loses the session: the second one 401s and
looks exactly like a dead session.

That was happening here. The access token is held in memory, so after a
reload every request on a screen 401s at once, each refreshed
independently, and all but the first killed the session. It presented as
"signs me out on reload", intermittently, because whichever request won
the race still rendered the page.

**Frontend now:** refresh is single-flight — the first 401 starts it and
the rest await the same promise.

**Nothing needed from you**, unless you were planning to turn rotation
off, in which case say so rather than doing it quietly.

---

## 3. `progress` is declared as an object with no properties

The schema gives `progress: {}` with nothing inside, so the keys had to
be guessed. All the guesses were wrong. It actually sends:

```json
{"total_lessons": 1, "released_lessons": 1,
 "completed_lessons": 1, "percent_complete": 100}
```

Every count fell through to zero, so "My learning" showed a course the
student had just finished as **0 of 0 lessons**.

**Frontend now:** reads the real keys, with the old guesses behind them,
and counts the lesson list directly wherever there is one.

**Worth doing:** declare the four fields. Nothing in `npm run
schema:check` can catch this drifting while the shape is empty.

---

## 4. `locked_reason` is a machine code, and undocumented

```json
{"available": false, "locked_reason": "enrollment_inactive", "completed": true}
```

It is typed as a plain string, so it was rendered to the student as
written. A student who finished a course saw the literal text
`enrollment_inactive` sitting under the lesson they had just completed.

**Frontend now:** translates the codes it knows and falls back to a
date-based line for anything it does not recognise, so an unknown code
is never printed.

**Worth doing:** declare it as an enum and list the values. If it is
meant to be shown to a student, send a sentence instead.

---

## 5. Finishing a course locks it behind you

Once an enrolment reaches `completed`, every lesson comes back with
`available: false` and `locked_reason: "enrollment_inactive"` — including
lessons the student has read and completed.

Taken literally, a student can never reread a course they finished.
That seems unintended rather than a policy, so flagging it as a
question: should a completed enrolment still serve its lessons?

**Frontend now:** treats a lesson with `completed: true` as openable
regardless of `available`, since completion does not expire. If the
lesson endpoint does refuse it, the reader shows the lock — so if the
answer is "no, deliberately", nothing breaks, it just costs a tap.

---

## 6. The public course list has no lesson count

`GET /public/academies/{slug}/courses/` returns id, title, slug,
subtitle, description, cover, price, schedule and `published_at` — and
no count of lessons and no modules. The course *detail* endpoint has
modules and is fine.

So the academy storefront advertised **"0 lessons"** on every course,
which is the worst possible thing for a shop window to say.

**Frontend now:** omits the count on the listing rather than printing
zero. The sales page behind the link was always right.

**Worth doing:** add `lesson_count` to the summary. One annotated
`Count` on the queryset, and the shop window gets its number back.

---

## 7. Two endpoints return something other than what they declare

- `POST /auth/register/` declares `AuthResponse`, returns
  `{detail, email, next}` — no tokens.
- `POST /auth/otp/verify/` declares a bare `User`, returns a full token
  pair.

Both are handled, but each one cost a debugging session, and
`schema:check` cannot see either because the declaration is what it
checks against.

---

## 8. The error envelope is not in the schema

The schema declares `{detail}`. The API actually sends:

```json
{"error": {"code": "validation_error",
           "message": "Validation failed.",
           "details": {"email": ["An account with this email already exists."]}}}
```

The frontend handles this shape and DRF's three defaults. Flagging it
because `details` is what puts a message under the right field in a
form, and nothing in the document says it exists.

---

## 9. CORS would let us delete the proxy

Browser requests go through a same-origin proxy at `/api/backend/*`
purely to avoid CORS. It costs roughly **350ms per call** (measured:
558–809ms through the proxy against 205–428ms direct).

Adding `https://learnifyng.tech` to `CORS_ALLOWED_ORIGINS` retires the
whole thing and makes every authenticated screen noticeably faster on a
3G phone, which is what these creators are on.

---

## 10. Rate limiting is unannounced

`POST /auth/otp/request/` starts returning `429` after a few calls, with
no `Retry-After` header. The frontend now says "wait a minute" on a 429
instead of blaming the network, but a `Retry-After` would let it say how
long.
