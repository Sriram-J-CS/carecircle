# Anti-Gravity Prompts — CareCircle Frontend

**How to use:** The backend is finished and tested. Start the backend first (`uvicorn app.main:app --reload --port 8000`). Paste **Prompt 0** once, then paste Prompts 1 → 6 one at a time, testing each before the next. If you are short on time, do **0, 1, 2, 3, 4** — that is the full demo.

---

## PROMPT 0 — Master context (paste first)

```
You are building the frontend for "CareCircle", an AI elder-care app for India. The backend is already
running at http://localhost:8000 (FastAPI, interactive docs at /docs, OpenAPI at /openapi.json). Read
/openapi.json first and use the exact request/response shapes. Do NOT change the backend.

STACK: React + Vite + TypeScript + Tailwind CSS + React Router. PWA (manifest + service worker, installable).
Libraries: @vladmandic/face-api (face ID), react-hot-toast, lucide-react, recharts (trend chart).
Put the API base URL in .env as VITE_API_URL=http://localhost:8000. Store the JWT in localStorage and send
"Authorization: Bearer <token>" on every request. On 401 -> go to login.

THREE USER ROLES, each with its own area after login:
  patient  -> /home            (elderly user; simplest possible UI)
  relative -> /family          (dashboard for patients who gave them access)
  doctor   -> /doctor          (dashboard for their patients)

DESIGN RULES (elderly users!):
- Huge text (base 20px), huge tap targets (min 56px), very high contrast, calm colours (deep teal + warm white),
  rounded cards, one main action per screen. No tiny icons without text labels.
- Every input has a <label>; every button has an aria-label; full keyboard navigation; focus rings visible.
- Voice-first: a floating microphone button on all patient screens (see Prompt 3). Use the browser Web Speech API
  (SpeechRecognition for input, speechSynthesis for reading replies aloud). Language switcher: English (en-IN),
  Tamil (ta-IN), Hindi (hi-IN); remember it in localStorage and send it as `language` to the API.
- A red SOS button is always visible on patient screens -> POST /sos, then show the emergency screen.
- Show a small footer on health screens: "CareCircle does not diagnose. Not medical advice."
- Loading skeletons, friendly error messages, works on a phone (mobile-first) and desktop.

API SUMMARY (all JSON; auth = Bearer token unless marked public):
PUBLIC  GET /directory/hospitals?q=&state=&city=&limit=   (q="A" returns names starting with A first)
PUBLIC  GET /directory/doctors?q=&specialty=&hospital_id=
PUBLIC  GET /directory/medicines?q=                        (autocomplete)
PUBLIC  GET /directory/states   GET /directory/pharmacies
POST /auth/register  {role, name, age, phone, email, password, language, face_descriptor[128],
        conditions[], allergies[], address, city, state, pincode,
        emergency_contacts:[{name,phone,relation,email?,app_access}], hospital_id, doctor_ids[],
        doctor_directory_id?, registration_no?}  -> {token,user}
POST /auth/login {email,password} -> {token,user}
POST /auth/face-login {descriptor[128]} -> {token,user}      GET /auth/me
GET  /patients  (patients I can see)      GET /patients/{id}/summary   (whole dashboard in one call)
GET/POST /patients/me/access   DELETE /patients/me/access/{id}   POST /patients/me/contacts   POST /patients/me/care-team
POST /patients/{id}/schedules {medicine_name,dosage,times:["08:00","20:00"],with_food,notes}
GET  /patients/{id}/schedules   DELETE /patients/{id}/schedules/{sid}
POST /patients/{id}/schedules/{sid}/test-dose   (DEMO: makes a tablet due now)
GET  /patients/{id}/doses
GET  /me/reminders  (poll every 20s: {dose_slots:[{slot,doses[]}], checkin:{due,..}, appointments_next_24h, unread_notifications})
POST /doses/{id}/confirm  (multipart, optional file field "proof" = camera clip)
      -> {status, next_dose, slot_complete, checkin_required}      (409 if an earlier tablet in the slot is not taken)
POST /doses/{id}/snooze?minutes=10
GET  /checkins/questions     GET /checkins/status
POST /checkins {feeling 1-5, pain 0-10, symptoms[], text, vitals{}, trigger:"periodic|post_med|manual|voice", language}
      -> {checkin_id, risk_score, level:"normal|attention|emergency", message, offer, notified, emergency_numbers}
POST /checkins/{id}/offer {accept:boolean, pharmacy?}  -> order placed OR family notified
GET  /patients/{id}/checkins   GET /patients/{id}/orders
POST /agent/chat {message, language} -> {intent, reply, action:{type: show_emergency|ask_offer|open_pill_camera|none}}
POST /sos
GET  /alerts?status=open   POST /alerts/{id}/acknowledge   POST /alerts/{id}/resolve
GET  /notifications   POST /notifications/read-all   GET /admin/outbox (demo: shows sent SMS/calls)
POST/GET/DELETE /patients/{id}/appointments {title,doctor_name,hospital,scheduled_at,notes}
POST /activity {kind:"walking|exercise|travel", value, unit}   GET /patients/{id}/activity
GET  /patients/{id}/lifestyle-plan

Build the project skeleton, API client with typed helpers, auth context with role-based routing, the layout,
theme and the language switcher now. Do not build the screens yet - I will ask for them one by one.
```

---

## PROMPT 1 — Landing, Sign in, Registration wizard (Face ID)

```
Build the authentication screens.

LANDING (/): CareCircle logo + tagline "Never alone. Always cared for." Two giant buttons: "Sign in" and "New here? Register".

SIGN IN (/login):
 - First ask "Who are you?" with 3 big cards: Patient / Doctor / Family member (relative).
 - Two ways in, as tabs: (1) "Face ID" - open the camera, load face-api models (tinyFaceDetector, faceLandmark68Net,
   faceRecognitionNet from https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/), detect the face, compute the
   128-number descriptor, POST /auth/face-login. Show a circular camera frame with "Look at the camera" and a
   live "face found" indicator. On failure say "We could not recognise you - use email and password".
   (2) "Email & password" -> POST /auth/login.
 - After login redirect by user.role: patient->/home, relative->/family, doctor->/doctor.

REGISTER (/register): a step wizard with a progress bar, one question group per screen, Back/Next, state kept between steps.
 Step 0: choose role (Patient / Doctor / Family member).
 PATIENT steps:
  1. "Scan your face": camera + face-api; capture descriptor (average 3 frames for stability). Same screen: name, age,
     mobile (10-digit India), email, password, preferred language. Face scan is required for patients.
  2. "Who should we call in an emergency?": repeat-able cards, each with name*, mobile*, relation (dropdown: son,
     daughter, spouse, brother, sister, neighbour, friend, other), optional email, checkbox "Let them see my health
     dashboard" (app_access). Require at least one contact.
  3. "Your health": chips for common conditions (diabetes, hypertension, heart disease, asthma/COPD, kidney disease,
     arthritis, thyroid, other) + free text; allergies (free text); home address, city, state (dropdown from /directory/states), pincode.
  4. "Your hospital and doctors": an A-Z letter bar (A B C ... Z) plus a search box. Tapping a letter or typing calls
     GET /directory/hospitals?q=<letter or text> (and filter by the state chosen earlier when available) and shows the
     results as big selectable cards. After picking a hospital, list its doctors via GET /directory/doctors?hospital_id=...
     and allow selecting several. Doctors flagged is_sample show a small "sample" badge. Skippable.
  5. "Your medicines": add medicine rows: autocomplete from GET /directory/medicines?q=, dosage, pick time(s) of day with
     big time chips (Morning 08:00, Afternoon 14:00, Evening 18:00, Night 21:00 + custom), before/after food.
     Skippable (can add later). Submit: POST /auth/register, then POST /patients/{id}/schedules for each medicine.
 DOCTOR steps: name, mobile, email, password, NMC registration number, search "Which doctor are you?" using
   /directory/doctors (sets doctor_directory_id), optional face scan.
 RELATIVE steps: name, mobile, email, password, optional face scan. Hint: "Use the same mobile/email your family member gave
   - you will be linked to them automatically."
 On success store the token and redirect by role. Show a success screen "Welcome to CareCircle" with the patient's next steps.

Handle 409 "email already registered" and "face already registered" with friendly messages and a link to Sign in.
```

---

## PROMPT 2 — Patient home, reminders, pill camera (the core flow)

```
Build the PATIENT HOME (/home), designed for an 75-year-old.

LAYOUT: greeting "Good morning, {name}" + date; the SOS button (red, always visible); the microphone button (Prompt 3);
language switcher; bell icon with unread count (GET /notifications).
 1. Big "NEXT TABLET" card: name, dosage, time, "before/after food", status chips for today's list.
 2. "Today's medicines" timeline built from GET /patients/{me}/doses: taken (green tick), due now (pulsing), upcoming, missed (red).
 3. Cards: "How do you feel?" (opens check-in), "Appointments" (next one), "Today's walk" (steps/km goal), "Call my family".

REMINDERS: poll GET /me/reminders every 20 seconds. When dose_slots is non-empty:
 - show a full-screen modal "Time for your medicine", play a soft chime, speak it aloud ("Time for Telma 40") with speechSynthesis
   in the chosen language, and fire a browser Notification (ask permission on first login).
 - Buttons: "Take it now" and "Remind me in 10 minutes" (POST /doses/{id}/snooze?minutes=10).
 - Repeat the voice prompt every 2 minutes until handled.

PILL CAMERA FLOW (the key feature) - for a slot with several tablets, go ONE TABLET AT A TIME:
 - Show only the current tablet large: name, dosage, a picture placeholder, "Step 1 of 3".
 - "Take it now" opens the front camera (getUserMedia) and starts MediaRecorder. Instruction text: "Show the tablet, put it in your
   mouth, and drink water." After 5 seconds the "I have taken it" button becomes enabled. Stop recording on tap.
 - POST /doses/{id}/confirm as multipart with the recorded clip in field "proof" (webm). On 200:
    * if next_dose exists -> animate to the next tablet ("Great! Now Glycomet 500"). The next tablet must NOT be reachable
      before the previous confirm succeeds (the API also returns 409 - show its message).
    * if slot_complete / checkin_required -> open the Check-in screen (Prompt 3) automatically with trigger "post_med".
 - If camera permission is denied, show a clear explanation and a fallback button "Confirm without camera" (send no proof).
 - Missed doses show in red; allow late confirmation the same way.

DEMO HELPER: a small, discreet "Demo tools" drawer (toggle with a keyboard shortcut Ctrl+Shift+D) with a button for each
schedule that calls POST /patients/{me}/schedules/{sid}/test-dose so I can make a tablet due immediately on stage.
Also an "Add medicine" button on this screen (same form as registration step 5; POST /patients/{me}/schedules).
```

---

## PROMPT 3 — Check-in, voice agent, medicine-order consent, emergency

```
Build the HEALTH CHECK-IN and the VOICE AGENT.

CHECK-IN (/checkin, also a modal): triggered (a) after the last tablet of a slot (trigger "post_med"), (b) when GET /me/reminders
says checkin.due is true (trigger "periodic" - every 6 hours, show a friendly "Time for your health check" prompt), (c) manually.
 Read each question aloud and also show it:
  1. "How are you feeling?" 5 big emoji buttons (1 very bad ... 5 great).
  2. "Any pain?" a large slider/buttons 0-10.
  3. "Do you have any of these?" big toggle cards from GET /checkins/questions (symptoms.options). Include "None of these".
  4. "Anything else? Tell me" - text box + mic button (speech to text, in the chosen language).
  5. Optional vitals (collapsed): oxygen, temperature, pulse, BP, sugar.
 Submit -> POST /checkins. Then show the RESULT SCREEN by level:
  - normal (score>=70): green, big score ring, the message, and 2-3 healthy tips. Speak the message.
  - attention (40-69): amber, score ring, "What I noticed: {symptom_labels}". If `offer` exists show a card listing the suggested
    items, the pharmacy (let the user switch between Apollo Pharmacy, MedPlus, Tata 1mg, PharmEasy, Netmeds) and ETA, with two giant buttons
    "Yes, order it" / "No, thanks". Yes -> POST /checkins/{id}/offer {accept:true,pharmacy} and show an order-confirmation card
    (reference number, ETA, "Your family has been told"). No -> {accept:false} and show "I have informed your family."
    The AI message must be spoken aloud. Show the disclaimer "Over-the-counter only. Ask a pharmacist if you take other medicines."
  - emergency (<40): FULL-SCREEN RED emergency screen, vibrating/pulsing, siren-free but very clear: "Call 112 now" (tel: link),
    "Call ambulance 108" (tel: link), "Your family has been alerted", list of contacts to call with tap-to-call, and a
    "I am okay now" button. Speak "This may be serious. Call 112."

VOICE AGENT: a floating mic button on every patient screen opens a bottom-sheet assistant. Tap and speak (SpeechRecognition,
continuous=false) -> POST /agent/chat {message, language} -> speak `reply` and show it as a chat bubble. Handle `action.type`:
  show_emergency -> open the emergency screen;  ask_offer -> show the medicine-offer card (same as above, using action.checkin_id and action.offer);
  open_pill_camera -> open the pill camera for action.dose_id;  none -> just reply.
Suggestion chips: "I have a headache", "What is my next tablet?", "When is my appointment?", "I need help".
Keep a short chat history in the sheet. Show a friendly message if the browser has no speech support (Chrome/Edge recommended).

SOS: the red SOS button asks nothing - it calls POST /sos immediately and opens the emergency screen.
```

---

## PROMPT 4 — Family (relative) dashboard

```
Build the RELATIVE DASHBOARD (/family).

- Header: logged-in name, bell with notifications (poll GET /notifications every 20s, toast new ones; critical ones in red with a sound).
- If the relative can see several patients (GET /patients) show a patient switcher; otherwise open the single patient.
- Everything for the selected patient comes from GET /patients/{id}/summary - refresh it every 20 seconds.

SECTIONS (cards):
 1. STATUS BANNER: green "All good", amber "Needs attention", or flashing red "EMERGENCY" based on open alerts / latest_checkin.level.
    Big risk-score ring with last check-in time and the reasons (latest_checkin.analysis.reasons).
 2. OPEN ALERTS (from open_alerts): each card shows type, severity colour, message, time. Buttons: "I'm on it" (POST /alerts/{id}/acknowledge)
    then "Resolved" (POST /alerts/{id}/resolve). Show who acknowledged. Emergency alerts also show tap-to-call buttons for the patient and
    emergency contacts (tel: links).
 3. TODAY'S MEDICINES: from today_doses with status (taken/pending/missed) + time taken; adherence_30d_pct as a progress ring.
 4. RISK TREND: recharts line chart from risk_trend with threshold bands at 40 and 70 (red / amber / green zones).
 5. APPOINTMENTS: upcoming list + "Book appointment" form (title, doctor, hospital, date-time) -> POST /patients/{id}/appointments.
 6. ORDERS: recent medicine orders (pharmacy, items, status, reference).
 7. CARE TEAM & CONTACTS: doctors and emergency contacts.
 8. LIFESTYLE: GET /patients/{id}/lifestyle-plan shown as 4 small tabs (Exercise, Walking, Food, Travel).
 9. ACTIVITY LOG: a "Messages sent" panel from GET /admin/outbox showing the SMS/phone calls the system sent (great for the demo).
 
Design: clean, calm, desktop + mobile. Relatives are read-only for medicines (they cannot edit schedules).
```

---

## PROMPT 5 — Doctor dashboard

```
Build the DOCTOR DASHBOARD (/doctor).
- Left: patient list from GET /patients with a coloured risk dot (latest score) and an "alert" badge for open alerts. Search box.
- Right: selected patient from GET /patients/{id}/summary: profile (age, conditions, allergies), risk trend chart, last 10 check-ins
  (GET /patients/{id}/checkins) with expandable analysis, adherence %, today's doses, orders, appointments, activity.
- Doctor actions: "Add / change medicine" (medicine autocomplete from /directory/medicines, dosage, times) -> POST /patients/{id}/schedules;
  stop a medicine -> DELETE /patients/{id}/schedules/{sid}; "Add appointment" -> POST /patients/{id}/appointments;
  acknowledge/resolve alerts.
- Banner: "AI risk scores are decision support, not a diagnosis."
```

---

## PROMPT 6 — Lifestyle, appointments, notifications, PWA, accessibility polish

```
Finish the patient experience and polish.

1. LIFESTYLE page (/me/lifestyle) from GET /patients/{me}/lifestyle-plan: 4 big cards - Exercise (list + minutes), Walking (daily step goal,
   distance km, walked today, "Log my walk" -> POST /activity {kind:"walking", value, unit:"km"}), Food (Eat / Avoid lists), Travel
   (max one-way km and tips). Show the mode (rest / light / normal) as a friendly banner: "Today is a rest day" etc.
2. APPOINTMENTS page: list upcoming, big "Add appointment" form; reminders appear in the bell notifications.
3. PEOPLE page (patient): manage who can see my health: list GET /patients/me/access, add relative (name, phone, email),
   revoke (DELETE), manage emergency contacts (POST /patients/me/contacts), change hospital/doctors (POST /patients/me/care-team).
4. NOTIFICATIONS page for all roles.
5. PWA: manifest, icons, service worker for offline shell, "Add to home screen" prompt. Run Lighthouse; fix every Accessibility
   issue (labels, contrast >= 4.5:1, focus order, aria-live regions for alerts/reminders) and aim for Performance > 85
   (lazy-load face-api models and recharts only on the pages that need them).
6. Add a language-aware UI: translate all static UI strings for English, Tamil and Hindi with a simple i18n dictionary.
7. Error handling: offline banner, API-down message, retry buttons, camera-denied and microphone-denied help text.
```

---

## PROMPT 7 — Wire-up check (run last)

```
Run the full demo script end to end against the real backend and fix every bug you find:
1. Register a patient (Lakshmi, 72, hypertension) with a face scan, one emergency contact (Ravi, son, app_access) and two medicines at 08:00.
2. Register Ravi as a relative using the same phone/email. Register a doctor.
3. Sign in as Lakshmi with Face ID. Use the demo drawer to make both tablets due. Confirm them one at a time on camera. Check-in opens.
4. Say "I have a headache and mild fever" -> expect an amber result + offer -> accept -> order confirmation.
5. Say "My chest hurts and I can't breathe" -> expect the red emergency screen.
6. As Ravi: see the critical alert, tap "I'm on it", see SMS/call entries in "Messages sent". As Lakshmi: see "Ravi is responding".
7. Ravi books an appointment; Lakshmi sees it.
List anything that does not work and fix it. Do not modify the backend; if the API seems wrong, tell me the exact request/response instead.
```
