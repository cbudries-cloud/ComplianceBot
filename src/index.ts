import "dotenv/config";
import express, { Request, Response } from "express";
import getRawBody from "raw-body";
import { verifyHubSpotRequest } from "./verify.js";
import { fetchPage } from "./crawler.js";
import { reviewText } from "./checker.js";
import { Cache } from "./cache.js";
import fs from "fs";

const app = express();
const cache = new Cache("data.db");
const LANDING_PROP = process.env.PROPERTY_LANDING_URL || "landing_page_url";
const CSV = "results.csv";

// Create CSV with header if not exists
if (!fs.existsSync(CSV)) {
  fs.writeFileSync(CSV, "timestamp,ticket_id,url,final_url,http_status,decision,confidence,violations_json\n");
}

async function postSlack(text: string): Promise<void> {
  const url = process.env.SLACK_WEBHOOK_URL!;
  await fetch(url, { 
    method: "POST", 
    headers: { "Content-Type": "application/json" }, 
    body: JSON.stringify({ text }) 
  });
}

function summarizeViolations(vs: any[]): string {
  if (!vs?.length) return "No violations.";
  return vs.slice(0, 3).map((v: any) => `Quote: "${v.quote}"\nIssue: ${v.rationale}`).join("\n\n");
}

// Raw body middleware for webhook route (required for signature verification)
app.use("/webhooks/hubspot", async (req: Request, _res: Response, next) => {
  (req as any).rawBody = await getRawBody(req);
  next();
});

app.post("/webhooks/hubspot", verifyHubSpotRequest, async (req: Request, res: Response) => {
  // HubSpot sends an array of events as the raw JSON body
  const events = JSON.parse((req as any).rawBody.toString());
  const handled: any[] = [];

  for (const ev of events) {
    try {
      if (ev.objectType !== "TICKET") continue;
      
      const ticketId = String(ev.objectId);
      const propName = ev?.propertyName || ev?.propertyChange?.name;
      const url = ev?.propertyValue || ev?.propertyChange?.value;
      
      if (propName !== LANDING_PROP || !url) continue;

      // Idempotency: skip if processed in last 24h
      if (cache.seenToday(ticketId, url)) { 
        handled.push({ ticketId, status: "skipped_cached" }); 
        continue; 
      }

      let art;
      let review;
      
      try {
        art = await fetchPage(url);
        review = await reviewText(art.rendered_text);
      } catch (error: any) {
        // Handle fetch/review errors
        const ts = new Date().toISOString();
        const errorRow = `${ts},${ticketId},"${url}","${url}",0,error,0.0,"[]"\n`;
        fs.appendFileSync(CSV, errorRow);
        
        const errorMsg = `I attempted to review a website but encountered an error:\n\nError: ${error?.message || 'Unknown error'}\nWebsite: ${url}`;
        await postSlack(errorMsg);
        
        handled.push({ ticketId, status: "error", error: error?.message });
        continue;
      }

      const ts = new Date().toISOString();

      // Append to CSV (escape quotes in violations JSON)
      const violationsJson = JSON.stringify(review.violations).replaceAll('"', '""');
      fs.appendFileSync(CSV,
        `${ts},${ticketId},"${url}","${art.final_url}",${art.http_status},${review.overall_decision},${review.confidence},"${violationsJson}"\n`
      );

      // Post to Slack
      let msg = `I have just read through ${review.merchant_name}'s website, and here are my findings:`;
      
      if (review.overall_decision === "clean") {
        msg += "\n\nGood to go!";
      } else {
        msg += "\n\nIssues found:\n";
        msg += `${summarizeViolations(review.violations)}\n`;
        msg += `\nWebsite: ${art.final_url}`;
      }
      
      await postSlack(msg);

      cache.mark(ticketId, url);
      handled.push({ ticketId, status: "processed" });
    } catch (e: any) {
      handled.push({ status: "error", error: e?.message });
    }
  }

  // Respond 200 so HubSpot doesn't retry aggressively
  res.status(200).json({ ok: true, handled });
});

app.get("/healthz", (_, res) => res.send("ok"));

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`ComplianceBot listening on :${port}`));
