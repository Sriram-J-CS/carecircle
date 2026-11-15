# CareCircle — Project Overview

**One line:** An AI care companion for elderly people living alone in India. It reminds them to take tablets (and watches them take each one on camera), checks on them every 6 hours, scores their health risk, orders over-the-counter medicine on their behalf, and alerts family and doctors the moment something is wrong.

---

## 1. The problem
Elderly people who live alone (or are alone for most of the day) miss medicines, hide symptoms, and have no one nearby when something goes wrong. Family members live in other cities and only find out when it is already serious. Existing apps (ELDARA, AgeCare, Maitri, Reca) send reminders, but they do not *close the loop*: nobody confirms the tablet was really taken, nobody judges the symptoms, nobody acts.

## 2. What CareCircle does differently
| # | Feature | Why it matters |
|---|---|---|
| 1 | **Face ID login** (no password to remember) + email/password fallback | Elders forget passwords |
| 2 | **Three roles**: Patient, Doctor, Relative — one shared care record | Everyone sees the same truth |
| 3 | **Tablet reminders + camera confirmation, one tablet at a time** | Next tablet unlocks only after the previous one is confirmed |
| 4 | **Health check-in every 6 hours and after every medicine session** | Early warning, not late reaction |
| 5 | **AI risk score (0–100)** from symptoms, pain, mood, vitals, missed doses, age, conditions | Turns "I feel odd" into an actionable level |
| 6 | **Agent acts, with consent**: orders OTC medicine from a pharmacy; if the elder says *no*, the family is told | Helpful without being reckless |
| 7 | **Closed-loop emergency alerts**: SMS + phone call to contacts, relative must *acknowledge*, patient sees "Ravi is responding" | Accountability chain |
| 8 | **Voice-first, multilingual** (English / Tamil / Hindi) | Many elders cannot type |
| 9 | **Lifestyle guidance**: exercise, walking target, food, safe travel distance — adapted to today's risk score | Prevention |
| 10 | **Appointments** with 24h + 1h reminders, bookable by family or doctor | Continuity of care |

**Safety stance (say this to the judges):** CareCircle never diagnoses and never suggests prescription drugs. It reports symptoms, scores risk, and only offers a short list of common OTC items — after checking the patient's conditions/allergies — and only with the patient's consent. Unsure = escalate.

## 3. Risk score bands
| Score | Level | What happens |
|---|---|---|
| **70–100** | Normal | Reassurance + healthy tips. Logged for the family's trend chart. |
| **40–69** | Needs attention | Agent explains what it noticed and **offers an OTC medicine** from Apollo Pharmacy / MedPlus / 1mg etc. **Yes →** order placed to home address, family informed. **No →** family + doctor alerted. If nothing safe to order → family alerted + "see your doctor". |
| **0–39** | Emergency | Big "Call 112" screen, critical alert, **SMS + automated call to every emergency contact**, relatives get in-app alert. Any red flag (chest pain, breathing trouble, fainting, stroke signs, heavy bleeding, very low oxygen…) forces score ≤ 25. |

Score = min(rule engine, Gemini). The more cautious one always wins. If Gemini is not confident, the score is capped at 39 (treated as urgent).

## 4. Technology
| Layer | Choice | Reason |
|---|---|---|
| Backend | **Python FastAPI** + **SQLite** (plain `sqlite3`) | One command to run, nothing to configure, auto API docs at `/docs` |
| Auth | JWT + PBKDF2 password hashing; **face descriptors** compared server-side | No heavy ML on the server |
| Face ID | **face-api.js** in the browser → 128-number descriptor → backend matches (Euclidean distance ≤ 0.5) | Works offline from cloud AI, fast |
| AI agent | **Google Gemini API** (`google-genai`) + **rule-based risk engine** (always on) | Gemini = understanding; rules = safety floor |
| Voice | Browser **Web Speech API** (speech-to-text + text-to-speech), Tamil/Hindi/English | No server cost |
| Alerts | **Twilio** SMS + voice call (simulated and logged if no keys) | Real calls to relatives |
| Pharmacy | Adapter in `services/pharmacy.py` (mock now; swap in a partner API later) | Honest placeholder |
| Scheduler | Background loop every 60 s inside the API | Creates doses, marks missed, nudges family, appointment reminders |
| Frontend | **React + Vite + Tailwind PWA** (built with Anti-Gravity) | Installable, large-text, accessible |
| Tests | `pytest` — 12 end-to-end tests of the whole journey | Hackathon "Testing" score |

**On "training the agent":** we do not train a model from scratch in one day (impossible and unsafe). The agent is "trained" by (a) a strict system prompt in `services/ai_agent.py`, (b) the rule engine's clinical red-flag table, (c) your datasets loaded into the database (medicines, hospitals, doctors), and (d) the patient's own context (age, conditions, allergies, last 5 scores) sent with every check-in.

## 5. How it works — the user journey
```
                     ┌──────────── Landing: choose role ────────────┐
                     │   Patient        Doctor        Relative      │
                     └──────┬──────────────┬─────────────┬──────────┘
          Sign in ◄─────────┴─ Face ID  or  Email + Password ─────────► Register (new)

REGISTER (patient, 5 steps)
 1 Scan face (camera) + name, age, mobile, email, password
 2 Emergency contacts: name + mobile (+ relation, + email so they can log in and view)
 3 Health: conditions, allergies, home address
 4 Hospital + doctors  — type "A" → hospitals starting with A; pick doctors
 5 Medicines — type name (autocomplete from DB) + pick times of day
        └─► relatives who register with the same mobile/email are linked automatically

DAILY LOOP (patient)
 Reminder time ─► notification + voice "Time for Telma 40"
   ─► camera opens ─► patient takes tablet on video ─► taps "I took it" ─► NEXT tablet unlocks
   ─► all tablets done ─► "How are you feeling?" check-in (also every 6 hours)
   ─► AI risk score
        ≥70 normal │ 40–69 offer OTC order (consent) │ <40 emergency alert
   ─► not taken within 30 min ─► marked missed ─► family alerted ─► clears when finally taken

FAMILY / DOCTOR
 Dashboard: today's doses, adherence %, risk trend, open alerts (Acknowledge → Resolve),
 appointments, orders, lifestyle plan; relatives can book appointments, doctors can add medicines.
```

## 6. Roles & permissions
- **Patient** — everything about themselves; can grant/revoke relatives and doctors.
- **Relative** — read-only dashboard for patients who granted access; acknowledge/resolve alerts; book appointments.
- **Doctor** — sees patients who chose them (or granted access); can add medicines and appointments; acknowledge alerts.
- Anyone else gets **403**. (Tested.)

## 7. Backend file map
```
backend/
  app/
    main.py              app + scheduler startup
    config.py  db.py  security.py  schemas.py  timeutil.py  seed.py
    routers/
      auth.py            register, login, face-login, me
      directory.py       hospitals / doctors / medicines search (prefix A-Z), pharmacies
      patients.py        dashboard summary, relatives/doctor access, contacts, care team
      medications.py     schedules, due reminders, camera confirm (ordered), snooze, demo test-dose
      checkins.py        questions, submit check-in, offer yes/no, history, orders
      agent.py           voice/text assistant (/agent/chat) + SOS
      alerts.py          alerts (ack/resolve), notifications, demo outbox
      care.py            appointments, activity log, lifestyle plan
    services/
      risk_engine.py     symptoms, red flags, vitals → score; OTC suggestion rules
      ai_agent.py        Gemini prompt + calls (optional)
      checkin_flow.py    score → action (reassure / offer / emergency)
      notifier.py        in-app + SMS + call (Twilio)
      pharmacy.py        pharmacy ordering adapter (mock)
      scheduler.py       minute loop
      lifestyle.py       exercise / walking / food / travel plan
  scripts/import_csv.py  load full India datasets
  tests/test_api.py      12 end-to-end tests
  requirements.txt  .env.example
```

## 8. Run it (Windows 11)
```
cd carecircle\backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env          (then add GEMINI_API_KEY; Twilio optional)
uvicorn app.main:app --reload --port 8000
```
Open **http://localhost:8000/docs** — every endpoint is testable there. Run tests: `pytest -q`.
Demo helper: `POST /patients/{id}/schedules/{sid}/test-dose` makes a tablet due *right now* so you can show the reminder + camera flow live.

## 9. Data I need from you (the "training" data)
Download these and tell me the file names — I will map the columns with `scripts/import_csv.py`:
1. **Medicines of India** — Kaggle "A-Z Medicine Dataset of India" (≈250k brands). Replaces the 90-item starter list.
2. **Hospitals of India** — National Health Portal / data.gov.in "Hospital Directory", or a Kaggle India hospitals CSV. Replaces the ~145-hospital starter list.
3. **Doctors** — there is no clean free national doctor dataset (the NMC register has no bulk download; scraping Practo/Lybrate is not allowed). The seeded doctors are marked **sample**. For the demo, doctors self-register with their NMC number.
4. **Keys:** a free **Gemini API key** (aistudio.google.com/apikey). **Twilio** (trial) only if you want real SMS/calls on stage.
Check each dataset's licence before using it in a public product.

## 10. Honest limits (judges respect honesty)
- **Starter data:** ~145 well-known hospitals, 90 medicines, sample doctors. Full-India data needs the datasets above.
- **Pharmacy orders are simulated.** Apollo/MedPlus do not offer a public ordering API; a real integration needs a partner agreement. The adapter is ready.
- **Camera proof is recorded, not verified** (a person could show any pill). Future: Gemini Vision check of pill + swallowing. Face login has **no liveness check** yet (a photo could fool it).
- **Doctors are not verified** against the NMC registry in the demo.
- **SMS/calls are simulated** until Twilio keys are added (they still appear in the outbox).
- Health data is sensitive: production needs consent screens and DPDP Act 2023 compliance, encryption at rest, and a real secret key.
- Not a medical device. Wellness guidance only.

## 11. Demo script (3–4 minutes)
1. **Register** Lakshmi (72): face scan, son Ravi as contact, hypertension, pick Apollo (type "A"), add Telma 40 + Glycomet.
2. **Sign in with Face ID.** Home shows today's tablets.
3. Press **test-dose**: reminder pops + voice. Open camera, confirm tablet 1 → tablet 2 unlocks → confirm → check-in appears.
4. Say *"I have a headache and mild fever"* → score ~55 → agent offers Paracetamol → **Yes** → order placed; Ravi's dashboard shows it.
5. Say *"My chest hurts and I can't breathe"* → score ≤25 → red Emergency screen; switch to **Ravi's** screen: critical alert → **Acknowledge** → Lakshmi sees "Ravi is responding". Show the outbox with SMS + call.
6. Ravi books a **cardiology appointment**; show the lifestyle plan changing with the score.
7. Close: "Not a diagnosis tool — a safety net that acts, and asks first."

## 12. Rubric mapping
- **Problem alignment:** missed doses + living alone + distance care → reminders, camera confirm, escalation, family loop.
- **Google services:** Gemini API (understanding), Web Speech API (voice). Optional extra: Firebase Cloud Messaging for push.
- **Testing:** `pytest` suite. **Accessibility:** large buttons, high contrast, ARIA labels, voice-first (see prompts).
- **Code quality:** small modules, typed request models, auto-generated API docs.
