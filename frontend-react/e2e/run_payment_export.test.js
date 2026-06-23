const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();

  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('request', req => console.log('REQ:', req.method(), req.url()));
  page.on('response', res => console.log('RES:', res.status(), res.url()));

  try {
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });

    // Enable Mock Data toggle to ensure project cards are present and deterministic
    try {
      const [mockBtn] = await page.$x("//button[contains(., 'Mock Data')]");
      if (mockBtn) {
        await mockBtn.click();
        console.log('Toggled Mock Data');
      }
    } catch (e) {
      console.log('No Mock Data toggle found or error toggling it', e);
    }

    // Wait for project cards then click first 'Chọn làm việc' button
    await page.waitForTimeout(600);
    // Try sidebar select first (stable). If not present, fallback to clicking 'Chọn làm việc' on a project card.
    let selected = false;
    try {
      await page.waitForSelector('aside select', { timeout: 10000 });
      // Wait until there is at least one non-empty option
      await page.waitForFunction(() => {
        const sel = document.querySelector('aside select');
        if (!sel) return false;
        return Array.from(sel.options).some(o => o.value && o.value !== '');
      }, { timeout: 10000 });
      const firstValue = await page.evaluate(() => {
        const sel = document.querySelector('aside select');
        const opt = Array.from(sel.options).find(o => o.value && o.value !== '');
        return opt ? opt.value : null;
      });
      if (firstValue) {
        await page.select('aside select', firstValue);
        console.log('Selected project via sidebar select', firstValue);
        selected = true;
      }
    } catch (e) {
      console.log('Sidebar select not usable, will fallback to project card click');
    }

    if (!selected) {
      // fallback: click the first 'Chọn làm việc' button on project cards
      try {
        await page.waitForXPath("//button[contains(normalize-space(.), 'Chọn làm việc')]", { timeout: 20000 });
        const [chooseBtn2] = await page.$x("//button[contains(normalize-space(.), 'Chọn làm việc')]");
        if (chooseBtn2) {
          await chooseBtn2.click();
          console.log('Clicked Chọn làm việc via fallback');
          selected = true;
        }
      } catch (e) {
        console.log('Fallback project card click failed', e);
      }
    }

    // Click the Payments tab in the sidebar. Match Vietnamese label parts to be robust.
    await page.waitForTimeout(400);
  const [paymentsTab] = await page.$x("//button[contains(., 'Nghiệm thu & Hồ sơ đề nghị') or contains(., 'Nghiệm thu') or contains(., 'Thanh toán')]");
    if (paymentsTab) {
      await paymentsTab.click();
      console.log('Clicked Payments sidebar tab');
    } else {
      console.log('Payments sidebar tab not found');
    }

    // Wait for PaymentPage content to load
    await page.waitForSelector('main', { timeout: 10000 });

    // Ensure the 'Đề nghị thanh toán' subtab is active (this contains the generate button)
    try {
      await page.waitForXPath("//button[normalize-space(.) = 'Đề nghị thanh toán' or contains(normalize-space(.), 'Đề nghị') ]", { timeout: 8000 });
      const [deNghiBtn] = await page.$x("//button[normalize-space(.) = 'Đề nghị thanh toán' or contains(normalize-space(.), 'Đề nghị') ]");
      if (deNghiBtn) {
        await deNghiBtn.click();
        console.log("Clicked subtab 'Đề nghị thanh toán'");
        // Wait a bit for the panel to switch
        await page.waitForTimeout(600);
      }
    } catch (e) {
      console.log("Could not explicitly click 'Đề nghị thanh toán' subtab, continuing and hoping default tab or other fallbacks show the button", e);
    }

    // Click the main generate button using test id if present, otherwise fallback to button text or primary button class.
    let clicked = false;
    try {
      await page.waitForSelector('[data-testid="generate-payment"]', { timeout: 15000 });
      await page.click('[data-testid="generate-payment"]');
      console.log('Clicked generate payment button via data-testid');
      clicked = true;
    } catch (e) {
      console.log('generate-payment test id not found, trying fallbacks');
    }

    if (!clicked) {
      // Try to find by button text (Vietnamese) - longer timeout
      try {
        await page.waitForXPath("//button[contains(normalize-space(.), 'Xuất báo cáo') or contains(normalize-space(.), 'Tạo hồ sơ') or contains(normalize-space(.), 'Tạo file') or contains(normalize-space(.), 'Xuất')]", { timeout: 10000 });
        const [genBtn] = await page.$x("//button[contains(normalize-space(.), 'Xuất báo cáo') or contains(normalize-space(.), 'Tạo hồ sơ') or contains(normalize-space(.), 'Tạo file') or contains(normalize-space(.), 'Xuất')]");
        if (genBtn) {
          await genBtn.click();
          console.log('Clicked generate payment button via XPath fallback');
          clicked = true;
        }
      } catch (e) {
        console.log('XPath fallback failed for generate button', e);
      }
    }

    if (!clicked) {
      try {
        await page.waitForSelector('button.btn.primary, button.btn--primary, button.primary', { timeout: 5000 });
        await page.click('button.btn.primary, button.btn--primary, button.primary');
        console.log('Clicked generate payment button via primary-class fallback');
        clicked = true;
      } catch (e) {
        console.log('Primary-class fallback failed', e);
      }
    }

    if (!clicked) throw new Error('Could not find generate payment button via any selector');

    // Wait for a short while to let API call complete
    await page.waitForTimeout(3000);

    // Optionally capture an API response visible on page (success message)
    const successSelector = "div.glass-panel[style*='success']";
    // Save screenshot
    await page.screenshot({ path: 'e2e_payment_flow.png', fullPage: true });

    console.log('Finished e2e playback');
  } catch (err) {
    console.error('E2E script error', err);
    process.exitCode = 2;
  } finally {
    await browser.close();
  }
})();
