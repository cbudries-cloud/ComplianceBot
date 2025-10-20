import { chromium } from "playwright";

export async function fetchPage(url: string): Promise<{ final_url: string; http_status: number; rendered_text: string }> {
  let browser;
  let attempt = 0;
  const maxAttempts = 2;

  while (attempt < maxAttempts) {
    try {
      browser = await chromium.launch();
      const ctx = await browser.newContext({ 
        userAgent: "Mozilla/5.0 ComplianceBot",
        // Add more timeout options
        timeout: 30000 // 30 second browser context timeout
      });
      const page = await ctx.newPage();
      let http_status = 0;
      
      page.on("response", r => { 
        if (r.url() === page.url()) http_status = r.status(); 
      });

      // Try different wait strategies
      try {
        await page.goto(url, { waitUntil: "networkidle", timeout: 15000 });
      } catch (networkIdleError) {
        console.log(`Network idle timeout, trying domcontentloaded for ${url}`);
        await page.goto(url, { waitUntil: "domcontentloaded", timeout: 10000 });
      }
      
      const rendered_text = await page.evaluate(() => document.body?.innerText || "");
      const final_url = page.url();
      
      await browser.close();
      return { final_url, http_status, rendered_text };
    } catch (error) {
      attempt++;
      console.log(`Attempt ${attempt} failed for ${url}: ${error.message}`);
      if (browser) {
        await browser.close().catch(() => {});
      }
      if (attempt >= maxAttempts) {
        throw error;
      }
    }
  }
  
  throw new Error("Failed to fetch page after retries");
}
