const { chromium } = require('d:/carecircle/frontend/node_modules/@playwright/test');
const fs = require('fs');
const path = require('path');

const SCREENSHOT_DIR = path.join(__dirname, '..', 'screenshots');
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function loginViaApi(page, email, password) {
  const resp = await fetch('http://127.0.0.1:8000/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const data = await resp.json();
  if (!data.token) {
    throw new Error(`Login failed for ${email}: ${JSON.stringify(data)}`);
  }

  await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
  await page.evaluate(({ token, user }) => {
    sessionStorage.setItem('carecircle_token', token);
    sessionStorage.setItem('carecircle_user', JSON.stringify(user));
  }, data);
}

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2
  });

  const page = await context.newPage();

  console.log('1. Capturing Landing Page...');
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01_landing_hero.png'), fullPage: false });

  console.log('2. Capturing Login & Role Selection...');
  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02_auth_roles.png'), fullPage: false });

  console.log('3. Capturing Design Showcase...');
  await page.goto('http://localhost:5173/design', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '07_design_system.png'), fullPage: false });

  console.log('4. Logging in as Patient (Lakshmi)...');
  await loginViaApi(page, 'lakshmi@carecircle.in', 'Password123!');
  await page.goto('http://localhost:5173/home', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03_patient_dashboard.png'), fullPage: false });

  console.log('5. Capturing Checkin Page...');
  await page.goto('http://localhost:5173/checkin', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04_ai_checkin_triage.png'), fullPage: false });

  console.log('6. Logging in as Relative (Ravi)...');
  await loginViaApi(page, 'ravi@carecircle.in', 'Password123!');
  await page.goto('http://localhost:5173/family', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05_family_dashboard.png'), fullPage: false });

  console.log('7. Logging in as Doctor (Dr. Karthik)...');
  await loginViaApi(page, 'dr.karthik@carecircle.in', 'Password123!');
  await page.goto('http://localhost:5173/doctor', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '06_doctor_portal.png'), fullPage: false });

  console.log('8. Capturing Mobile Patient View...');
  const mobileContext = await browser.newContext({
    viewport: { width: 412, height: 915 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true
  });
  const mobilePage = await mobileContext.newPage();
  await loginViaApi(mobilePage, 'lakshmi@carecircle.in', 'Password123!');
  await mobilePage.goto('http://localhost:5173/home', { waitUntil: 'networkidle' });
  await mobilePage.waitForTimeout(2000);
  await mobilePage.screenshot({ path: path.join(SCREENSHOT_DIR, '08_mobile_patient_view.png'), fullPage: false });

  await browser.close();
  console.log('ALL SCREENSHOTS CAPTURED WITH 100% SUCCESS!');
})();
