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
    await page.goto(url, { waitUntil: "networkidle0", timeout: 30000 });
    // Allow a beat for any post-load animation/data fetches to settle.
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
