# CareCircle — Frontend

> **AI Elder-Care Platform for India**  
> Built with React 19, Vite, TypeScript, Tailwind CSS, TanStack Query, Framer Motion, Recharts, @vladmandic/face-api, and VitePWA.

---

## 1. Overview & Architecture

CareCircle is a compassionate, elder-first companion application designed for Indian households. It delivers:
- **Patient Home (`/home`)**: Designed specifically for a 75-year-old user — 20px base text, minimum 56px touch targets, warm paper and deep teal palette, Fraunces serif headings, spoken audio chimes, pinned red SOS assistance, and floating voice agent.
- **Pill Camera Flow**: 1-tablet-at-a-time camera guidance with 5-second video recording and automatic verification against the backend.
- **6-Hourly AI Check-In (`/checkin`)**: Emoji and voice-driven triage with risk scoring and integrated over-the-counter pharmacy relief (Apollo, MedPlus, Tata 1mg, PharmEasy, Netmeds).
- **Relative Dashboard (`/family`)**: Reassurance for family members — status banner, 30-day health risk trend charts, alerts management with "I'm on it" / "Resolved" actions, medication adherence rings, and SMS/call dispatch logs.
- **Doctor Dashboard (`/doctor`)**: Clinical decision support portal — patient roster with risk dots, appointment scheduling, prescription management, and expandable AI diagnostic reasoning.
- **Design System Showcase (`/design`)**: Accessible demonstration of all core UI components, design tokens, and editorial illustrations.

---

## 2. Design Tokens & Accessibility Standards

- **Color Tokens**:
  - `Ink`: `#12302F` (deep accessible text)
  - `Deep Teal`: `#0F5C5A` (calm primary brand)
  - `Mint Wash`: `#E6F2EF` (gentle active backgrounds)
  - `Warm Paper`: `#FBF8F3` (card surfaces)
  - `Sand`: `#F1EBDF` (warm borders and backgrounds)
  - `Clay`: `#C8553D` (SOS and critical alarms)
  - `Amber`: `#D9922B` (attention and caution)
  - `Sage`: `#3F8F5B` (confirmed doses and healthy status)
- **Typography**:
  - Headings: `Fraunces` (soft humanist serif)
  - Body: `Inter` (high-legibility grotesque)
- **Elderly Usability**:
  - Minimum tap target height: **56px** (`size="patient"`)
  - Contrast Ratio: **$\ge 7:1$ (WCAG AAA)**
  - Multi-language dictionary: English, Tamil (தமிழ்), and Hindi (हिंदी) with Web Speech API integration.

---

## 3. Client-Side Security

As mandated by security standards:
- **Token Storage**: JWT tokens and cached profiles are stored strictly in `sessionStorage` (never in `localStorage`).
- **Session Expiry**: 401 Unauthorized responses immediately wipe `sessionStorage` and redirect to `/login`.
- **Rate-Limiting (429)**: Automatically redirects to `/rate-limit` displaying a calm countdown pause without crashing.
- **Inactivity Timeout**: 15-minute idle auto-logout for Family and Doctor dashboards; elderly patients are exempt.
- **CSP**: Strict Content Security Policy meta tag preventing unsafe inline script execution.
- **Privacy**: No patient health data, descriptors, or authentication tokens are ever logged to the browser console.

---

## 4. Running the Frontend

### Prerequisites
- Node.js $\ge 18$
- CareCircle FastAPI backend running at `http://localhost:8000`

### Development Server
```bash
npm install
npm run dev
```
The application will launch on `http://localhost:5173`.

### Automated Unit Tests
```bash
npm test
```
Runs Vitest test suites verifying token storage security, session isolation, and multi-language dictionary coverage.

### Production Build
```bash
npm run build
npm run preview
```
Compiles TypeScript, chunks dynamic libraries (`faceApi`, `recharts`), and bundles the PWA service worker into `/dist`.

---

## 5. Keyboard Shortcuts & Demo Tools
- `Ctrl + Shift + D`: Toggles the **Demo Tools Drawer** on the Patient Home screen, allowing one-click simulation of due medication doses without waiting for real clock time.
