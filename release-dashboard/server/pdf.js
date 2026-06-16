// Headless-Chrome PDF rendering. Imports puppeteer lazily so the API server
// can boot on machines that haven't downloaded the bundled Chromium yet.

export async function renderReleasePdf(url) {
  const { default: puppeteer } = await import("puppeteer");
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 1600, deviceScaleFactor: 2 });
    // Skip the strict `networkidle0` wait — the SPA fires cascading fetches
    // (release → JIRA table) and `networkidle0` can finish before the JIRA
    // call starts. We use `domcontentloaded` plus an explicit ready signal
    // that the SPA flips after all required fetches resolve.
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });

    // The SPA sets `window.__pdfReady = true` once the release record and
    // (if applicable) the JIRA table have finished loading. Bail out after
    // 20s so a stuck JIRA call doesn't hang PDF export forever — the page
    // is then captured in whatever state it's in.
    await page
      .waitForFunction(() => window.__pdfReady === true, { timeout: 20000 })
      .catch(() => {
        console.warn("[pdf] __pdfReady never flipped — proceeding with snapshot anyway");
      });

    // Allow a beat for the JIRA table to actually paint after state flips.
    await new Promise((r) => setTimeout(r, 500));

    return await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "12mm", bottom: "12mm", left: "10mm", right: "10mm" },
    });
  } finally {
    await browser.close();
  }
}
