// One-off manual verification script for the calendar-style scheduler --
// not part of any test suite, just driven directly with `node scripts/test-scheduler.js`.
// Jumps straight to Step 5 via goStep()/treatment_type rather than filling
// out the whole multi-step form, since AppointmentSlotPicker only depends
// on treatment_type + the DOM being present, not on any other step's state.
const { chromium } = require('playwright');

const URL = 'https://ambitious-flower-02570ba0f-dev.eastus2.7.azurestaticapps.net/registration';
const OUT = 'C:\\Users\\steph\\AppData\\Local\\Temp\\claude\\c--Users-steph-OneDrive---AstraFlow-Digital-Documents-VSCode-Main\\5df859f5-955f-4938-85e2-62a9e1edede0\\scratchpad\\scheduler-test';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 480, height: 900 } });
  const consoleErrors = [];
  page.on('pageerror', (e) => consoleErrors.push('pageerror: ' + e.message));
  page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push('console.error: ' + msg.text()); });

  console.log('Navigating to', URL);
  await page.goto(URL, { waitUntil: 'networkidle' });

  // Real interaction: click the actual treatment-type card (this both sets
  // treatment_type and closes the modal, unlike setting the hidden input
  // directly which left the modal open blocking clicks).
  await page.click('.tt-card[data-type="sleep_study"]');
  await page.waitForFunction(() => !document.getElementById('modalTreatmentType').classList.contains('open'), { timeout: 5000 });
  await page.evaluate(() => goStep(5));

  await page.waitForSelector('#apptSlotDays', { state: 'visible', timeout: 15000 });
  await page.waitForSelector('.slotpicker-cal-day.has-slots', { timeout: 15000 });
  await page.screenshot({ path: OUT + '\\1-calendar.png' });
  console.log('Calendar rendered.');

  const calTitle = await page.textContent('.slotpicker-cal-title');
  console.log('Initial month shown:', calTitle);

  const availableCount = await page.locator('.slotpicker-cal-day.has-slots').count();
  console.log('Clickable days in this month:', availableCount);

  // Click the first available day.
  await page.locator('.slotpicker-cal-day.has-slots').first().click();
  await page.waitForSelector('.slotpicker-strip .slot-btn', { timeout: 10000 });
  await page.screenshot({ path: OUT + '\\2-strip-open.png' });
  const stripHeading = await page.textContent('.slotpicker-strip-heading');
  const timeCount = await page.locator('.slotpicker-strip .slot-btn').count();
  console.log('Strip opened for:', stripHeading, '| times available:', timeCount);

  // Click the first time.
  await page.locator('.slotpicker-strip .slot-btn').first().click();
  await page.waitForTimeout(400); // let the .2s background/color transition settle before screenshotting
  await page.screenshot({ path: OUT + '\\3-time-selected.png' });
  const bg = await page.locator('.slotpicker-strip .slot-btn').first().evaluate((el) => getComputedStyle(el).backgroundColor);
  console.log('Selected button computed background-color:', bg);

  const values = await page.evaluate(() => ({
    date: document.querySelector('[name="appointment_date"]').value,
    time: document.querySelector('[name="appointment_time"]').value,
    duration: document.querySelector('[name="appointment_duration_minutes"]').value
  }));
  console.log('Hidden inputs after selecting a time:', JSON.stringify(values));

  const selectedBtnClass = await page.locator('.slotpicker-strip .slot-btn').first().getAttribute('class');
  console.log('Selected button class:', selectedBtnClass);

  // Test month navigation.
  const nextDisabled = await page.locator('[data-nav="next"]').isDisabled();
  console.log('Next-month button disabled?', nextDisabled);
  if (!nextDisabled) {
    await page.locator('[data-nav="next"]').click();
    await page.waitForTimeout(300);
    const newTitle = await page.textContent('.slotpicker-cal-title');
    console.log('After clicking next, month shown:', newTitle);
    await page.screenshot({ path: OUT + '\\4-next-month.png' });
  }

  console.log('Console/page errors captured:', consoleErrors.length ? JSON.stringify(consoleErrors) : 'none');

  await browser.close();
})().catch((e) => { console.error('SCRIPT FAILED:', e.message); process.exit(1); });
