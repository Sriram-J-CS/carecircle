# Anti-Gravity Prompts — CareCircle (Professional UI/UX edition)

**Model:** in Anti-Gravity's model picker choose the newest **Gemini** model your free plan allows (Gemini 3 Pro/Flash or whatever is listed). Free quota is limited, so prompts are split small. **Order: A → B → C → D → E → F → G → H.** Test after each one. Backend must be running: `uvicorn app.main:app --reload --port 8000`.

Backend changes you must respect (already done): passwords need 8+ chars with a letter and a number; failed logins return **429** after repeated attempts (show a calm "try again in 15 minutes" screen); `/docs` and demo tools only exist when `DEMO_MODE=true`; CORS allows `http://localhost:5173`.

---
## PROMPT A — Role + design system (paste first)
```
You are a senior product designer AND senior frontend engineer at a top health-tech company (think Apple Health,
Headspace, Ada Health, Linear). Build the frontend for "CareCircle", an AI elder-care app for India. The FastAPI backend
runs at http://localhost:8000 - read /openapi.json first and use exact shapes. Do NOT change the backend.

STACK: React + Vite + TypeScript + Tailwind CSS + React Router + TanStack Query + Framer Motion + lucide-react +
recharts + react-hot-toast + @vladmandic/face-api + vite-plugin-pwa. VITE_API_URL in .env.

THE LOOK MUST NOT FEEL AI-GENERATED. Forbidden: purple/blue gradient hero, emoji as icons, generic card grids with
identical shadows, stock "Welcome back!" copy, centered-everything layouts, default Tailwind blue.

DESIGN SYSTEM (create /src/design/tokens.css + tailwind.config with these exactly):
- Mood: calm, trustworthy, warm, human. Like a premium hospital concierge, not a startup template.
- Colours: ink #12302F (text), deep teal #0F5C5A (primary), teal-600 #1E7F7B, mint wash #E6F2EF, warm paper #FBF8F3 (page),
  sand #F1EBDF (surfaces), clay #C8553D (SOS / danger), amber #D9922B (attention), sage #3F8F5B (good).
  Dark mode: paper -> #0E1A1A, surfaces #152626, text #EAF2EF. Contrast >= 7:1 for body text (WCAG AAA) on patient screens.
- Type: headings "Fraunces" (soft serif, 600), UI/body "Inter" (or "Atkinson Hyperlegible" for patient screens). Base 20px
  patient / 16px family+doctor. Scale 1.25. Line-height 1.5. Numbers use tabular-nums.
- Shape & depth: 20px radius cards, 14px inputs, 999px pills. One soft shadow (0 8px 30px rgba(15,92,90,.08)), 1px
  border #E4DCCB. 8px spacing grid. Generous whitespace.
- Motion: Framer Motion, 200-300ms ease-out, spring for modals. Respect prefers-reduced-motion. Skeleton loaders (never spinners alone).
- Components to build first in /src/components/ui: Button (primary/secondary/ghost/danger, min-height 56px patient size),
  Card, Input with floating label + inline error, Chip, ProgressRing, Stepper, Badge, Modal/Sheet, Toast, Skeleton, EmptyState
  (with a friendly line illustration in SVG), Avatar, Tabs, Tooltip.
- Illustrations: draw simple, warm, flat SVG line illustrations (elder + tablet, family hugging, heart-with-shield).
- Logo: a ring of 3 connected circles forming a heart/shield + wordmark "CareCircle" in Fraunces.
- Accessibility: every input labelled, aria-labels on icon buttons, visible 3px focus ring, full keyboard nav, semantic
  landmarks, aria-live for alerts and reminders, 56px minimum tap targets, no information by colour alone.
- Layouts: Patient = single-column, bottom tab bar (Home / Medicines / Help / Me), one action per screen.
  Family & Doctor = desktop sidebar + content, collapses to bottom tabs on mobile.
- Security in the client: keep the JWT in sessionStorage (not localStorage), attach it via one fetch wrapper, on 401 clear and
  redirect to /login, on 429 show a calm "Too many attempts, try again in a few minutes" page. Never log tokens or health data
  to console. Add a strict CSP <meta> (default-src 'self'; connect-src 'self' http://localhost:8000 https://cdn.jsdelivr.net;
  media-src 'self' blob:; img-src 'self' data:; style-src 'self' 'unsafe-inline'). Sanitize all rendered text (never use
  dangerouslySetInnerHTML). Auto-logout after 15 min idle on family/doctor screens (patients stay signed in).
- Footer on health screens: "CareCircle does not diagnose. Not medical advice."

Build: project skeleton, tokens, ui components, API client (typed from openapi), AuthContext with role routing
(patient -> /home, relative -> /family, doctor -> /doctor), a /design page that shows every component, English/Tamil/Hindi
i18n (react-i18next) with a language switcher. No screens yet.
```

## PROMPT B — Landing + Sign in + Face ID
```
Using the design system, build the LANDING page and SIGN-IN.
LANDING: asymmetric editorial hero (not centered): left = Fraunces headline "Never alone. Always cared for.", subcopy, two
buttons (Sign in / Create account); right = warm SVG illustration of an elder with a family circle around her. Below: 3-step
"How it works" (Reminders -> Camera confirms -> Family is told), a trust strip (Face ID, 6-hour check-ins, Emergency alerts,
Works in Tamil / Hindi / English), and a safety statement ("We never diagnose. We act - and we ask first.").
SIGN-IN: split screen (illustration left on desktop). Step 1: three role cards (Patient / Family member / Doctor).
Step 2: tabs "Face ID" and "Email & password". Face ID: circular camera frame with animated scanning ring, live "face found"
state, face-api.js models from https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/, 128-d descriptor -> POST /auth/face-login.
Friendly failure message with fallback. Email form: show/hide password, inline errors, handle 401 and 429.
Redirect by role.
```

## PROMPT C — Registration wizard
```
Build the REGISTRATION wizard exactly as in the API: POST /auth/register. Full-screen stepper with a slim progress bar, one idea
per screen, animated transitions, Back/Next, draft kept in memory between steps.
Step 0 role. PATIENT: 1 Face scan (average 3 frames, shows a guided circular overlay + "move closer / good" hints) + name, age,
mobile, email, password (live strength meter: 8+ chars, letter, number) + language. 2 Emergency contacts (repeatable cards,
relation dropdown, optional email, toggle "Let them see my dashboard"; min one). 3 Health (condition chips, allergies, address,
city, state from /directory/states, pincode). 4 Hospital + doctors: A-Z letter rail + search, big selectable hospital cards, then
doctors of that hospital (badge "sample" when is_sample). 5 Medicines: autocomplete from /directory/medicines, dosage, time chips
(Morning 08:00 / Afternoon 14:00 / Evening 18:00 / Night 21:00 / custom), before/after food. Then POST /patients/{id}/schedules for each.
DOCTOR: name, mobile, email, password, NMC number, "Which doctor are you?" search. RELATIVE: name, mobile, email, password
(hint: use the same mobile/email your family member gave).
Finish with a success screen and next steps. Handle 409 (email/face exists) and 422 messages in plain language.
```

## PROMPT D — Patient home + pill camera (core feature)
```
Build PATIENT HOME for a 75-year-old. Top: greeting in Fraunces, date, always-visible red SOS (POST /sos then emergency screen),
mic button, language, bell. Hero card "Next tablet" with big name/dosage/time + a calm progress ring for today's adherence.
Timeline of today's doses (taken green tick / due pulsing / upcoming / missed clay-red). Cards: How do you feel, Appointment,
Today's walk, Call my family.
Poll GET /me/reminders every 20s. When a slot is due: full-screen modal "Time for your medicine", soft chime, speechSynthesis
in chosen language, browser Notification, repeat every 2 min; buttons Take now / Remind in 10 min.
PILL CAMERA: ONE TABLET AT A TIME. Show only the current tablet ("Step 1 of 3"). Front camera + MediaRecorder; instruction
"Show the tablet, take it, sip water"; button enabled after 5s; POST /doses/{id}/confirm multipart field "proof" (webm). Animate to
the next tablet; show 409 messages; after the last one open the check-in (trigger post_med). If camera denied: explain + "Confirm
without camera". Demo tools drawer on Ctrl+Shift+D calling test-dose per schedule (only if the endpoint exists).
```

## PROMPT E — Check-in, voice agent, consent, emergency
```
Build CHECK-IN: 5 one-question screens read aloud (feeling emoji-free: 5 illustrated faces as SVG; pain 0-10 big slider;
symptom toggle cards from /checkins/questions + "None of these"; free text + mic; optional vitals). POST /checkins.
RESULT by level: normal = sage ring + tips; attention = amber ring, "What I noticed", pharmacy switcher, offer card, giant
"Yes, order it" / "No, thanks" -> POST /checkins/{id}/offer, order confirmation with reference + ETA, disclaimer
"Over-the-counter only. Ask a pharmacist."; emergency = full-screen clay-red pulsing screen: Call 112, Call 108, contacts tap-to-call,
"Your family has been alerted", "I am okay now".
VOICE AGENT: floating mic -> bottom sheet, speech-to-text -> POST /agent/chat -> speak + chat bubble; handle action.type
show_emergency / ask_offer / open_pill_camera. Suggestion chips. Graceful message if no speech support.
```

## PROMPT F — Family dashboard
```
Build /family as a polished desktop-first dashboard with sidebar. From GET /patients/{id}/summary (refresh 20s): status banner
(green / amber / flashing red), large risk ring + reasons, open alerts with "I'm on it" -> acknowledge and "Resolved" -> resolve,
today's doses + 30-day adherence ring, risk trend line chart with red/amber/green bands at 40 and 70, appointments + booking form,
orders, care team and contacts, lifestyle tabs, and a "Messages sent" panel (/admin/outbox, hide if 404). Toast + sound on new
critical notifications. Read-only for medicines. Patient switcher if several patients.
```

## PROMPT G — Doctor dashboard
```
Build /doctor: left patient list with risk dot, alert badge and search; right panel with profile, trend chart, last 10 check-ins
(expandable analysis), adherence, doses, orders, appointments, activity. Actions: add/change medicine (autocomplete), stop medicine,
add appointment, acknowledge/resolve alerts. Dense but airy, clinical-grade typography.
```

## PROMPT H — Quality pass (do this last)
```
Run a final professional quality pass: (1) Lighthouse >= 95 for Performance, Accessibility, Best Practices, SEO; fix everything
below. (2) Check keyboard-only use of every flow and screen-reader labels. (3) Verify contrast AAA on patient screens in light and
dark mode. (4) Add empty, loading and error states to every list. (5) Add Vitest unit tests for API client, auth guard, risk-ring
colours and i18n; add Playwright tests for: register patient, sign in, confirm tablet, emergency check-in, family acknowledge.
(6) Add README with screenshots and run steps. (7) Make it an installable PWA with offline fallback page. (8) Confirm no token
or health data is ever logged and CSP has no violations in the console.
```

---
## How to score high
Show judges: the 21 passing tests, SECURITY.md, Lighthouse report, the live demo (README section 11 of PROJECT_OVERVIEW.md), and the "Honest limits" list.
