import "dotenv/config";
import express, { Request, Response } from "express";
import { fetchPage } from "./crawler.js";
import { reviewTextEnhanced, ComplianceResult } from "./checker.js";
import { Cache } from "./cache.js";
import { learningSystem } from "./learning.js";
import { createEnhancedSlackMessage } from "./slack-enhanced.js";
import fs from "fs";

const app = express();
app.use(express.json()); // Add JSON body parsing middleware
const cache = new Cache("data.db");
const CSV = "results.csv";

// Create CSV with header if not exists
if (!fs.existsSync(CSV)) {
  fs.writeFileSync(CSV, "timestamp,ticket_id,url,final_url,http_status,decision,confidence,violations_json,company_domain\n");
}

const HUBSPOT_TOKEN = process.env.HUBSPOT_TOKEN!;
const HUBSPOT_PROPERTY = process.env.PROPERTY_LANDING_URL || "landing_page_url";

async function postSlack(text: string): Promise<void> {
  const url = process.env.SLACK_WEBHOOK_URL;
  if (!url) return; // Skip if no webhook URL configured
  
  try {
    await fetch(url, { 
      method: "POST", 
      headers: { "Content-Type": "application/json" }, 
      body: JSON.stringify({ text }) 
    });
  } catch (error) {
    console.error("Slack notification failed:", error);
  }
}

async function postSlackEnhanced(message: any): Promise<void> {
  const url = process.env.SLACK_WEBHOOK_URL;
  if (!url) return;
  
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(message),
    });
    
    if (!response.ok) {
      console.error(`Enhanced Slack webhook failed: ${response.status}`);
    }
  } catch (error) {
    console.error("Failed to post enhanced message to Slack:", error);
  }
}

function summarizeViolations(vs: any[]): string {
  if (!vs?.length) return "No violations.";
  return vs.slice(0, 3).map((v: any) => `Quote: "${v.quote}"\nIssue: ${v.rationale}`).join("\n\n");
}

async function getTicketData(ticketId: string): Promise<{
  landing_page_url: string | null;
  company_domain: string | null;
  error?: string;
}> {
  const headers = {
    "Authorization": `Bearer ${HUBSPOT_TOKEN}`,
    "Content-Type": "application/json"
  };

  try {
    // Step 1: Get the ticket with landing_page_url
    const ticketUrl = `https://api.hubapi.com/crm/v3/objects/tickets/${ticketId}?properties=${HUBSPOT_PROPERTY}`;
    const ticketResp = await fetch(ticketUrl, { headers });
    
    if (!ticketResp.ok) {
      return { 
        landing_page_url: null, 
        company_domain: null, 
        error: `Ticket fetch error: ${ticketResp.status}` 
      };
    }

    const ticketData = await ticketResp.json();
    const landing_page_url = ticketData.properties?.[HUBSPOT_PROPERTY] || null;

    // Step 2: Get associated company domain
    const assocUrl = `https://api.hubapi.com/crm/v4/objects/tickets/${ticketId}/associations/companies`;
    const assocResp = await fetch(assocUrl, { headers });
    
    if (!assocResp.ok) {
      return { 
        landing_page_url, 
        company_domain: null, 
        error: `Association error: ${assocResp.status}` 
      };
    }

    const assocData = await assocResp.json();
    const companyIds = assocData.results?.map((item: any) => item.toObjectId) || [];
    
    if (companyIds.length === 0) {
      return { 
        landing_page_url, 
        company_domain: null, 
        error: "No associated company found" 
      };
    }

    // Step 3: Get company domain
    const companyId = companyIds[0];
    const companyUrl = `https://api.hubapi.com/crm/v3/objects/companies/${companyId}?properties=domain`;
    const companyResp = await fetch(companyUrl, { headers });
    
    if (!companyResp.ok) {
      return { 
        landing_page_url, 
        company_domain: null, 
        error: `Company fetch error: ${companyResp.status}` 
      };
    }

    const companyData = await companyResp.json();
    const company_domain = companyData.properties?.domain || null;

    return { landing_page_url, company_domain };
  } catch (error: any) {
    return { 
      landing_page_url: null, 
      company_domain: null, 
      error: error.message 
    };
  }
}

async function processTicket(ticketId: string): Promise<void> {
  console.log(`\n🔍 Processing ticket ${ticketId}...`);
  
  try {
    // Get ticket data from HubSpot
    const ticketData = await getTicketData(ticketId);
    
    if (ticketData.error) {
      console.log(`❌ Error fetching ticket data: ${ticketData.error}`);
      return;
    }

    if (!ticketData.landing_page_url) {
      console.log(`⏭️ No landing page URL found for ticket ${ticketId}`);
      return;
    }

    const url = ticketData.landing_page_url;
    const companyDomain = ticketData.company_domain;

    // Check cache for idempotency
    if (cache.seenToday(ticketId, url)) {
      console.log(`♻️ Already processed ticket ${ticketId} with URL ${url} today`);
      return;
    }

    console.log(`🌐 Processing URL: ${url}`);
    if (companyDomain) {
      console.log(`🏢 Company domain: ${companyDomain}`);
    }

    // Fetch and review the page
    let pageData;
    let review;
    
    try {
      pageData = await fetchPage(url);
      console.log(`📄 Fetched page: ${pageData.final_url} (${pageData.http_status})`);
      
      // Enhanced compliance review
      const result: ComplianceResult = await reviewTextEnhanced(pageData.rendered_text);
      console.log(`🤖 Enhanced Review: ${result.overall_decision} (${(result.confidence * 100).toFixed(0)}% confidence)`);
      console.log(`📊 Summary: ${result.summary}`);
      
      // Log to CSV with enhanced data
      const ts = new Date().toISOString();
      const violationsJson = JSON.stringify(result.violations).replaceAll('"', '""');
      fs.appendFileSync(CSV,
        `${ts},${ticketId},"${url}","${pageData.final_url}",${pageData.http_status},${result.overall_decision},${result.confidence},"${violationsJson}","${companyDomain || ''}"\n`
      );
      
      // Create and send enhanced Slack message
      const slackMessage = await createEnhancedSlackMessage(result, url, pageData.http_status);
      await postSlackEnhanced(slackMessage);
      
    } catch (error: any) {
      // Handle fetch/review errors
      const ts = new Date().toISOString();
      const errorRow = `${ts},${ticketId},"${url}","${url}",0,error,0.0,"[]","${companyDomain || ''}"\n`;
      fs.appendFileSync(CSV, errorRow);
      
      const errorMsg = `I attempted to review a website but encountered an error:\n\nError: ${error.message}\nWebsite: ${url}`;
      await postSlack(errorMsg);
      
      console.log(`❌ Error processing ${url}: ${error.message}`);
      return;
    }

    // Mark as processed
    cache.mark(ticketId, url);
    
    console.log(`✅ Completed processing ticket ${ticketId}`);
    
  } catch (error: any) {
    console.error(`💥 Error processing ticket ${ticketId}:`, error.message);
  }
}

// API endpoints
app.get("/healthz", (_, res) => res.send("ok"));

app.post("/process-ticket", async (req: Request, res: Response) => {
  const { ticketId } = req.body;
  
  if (!ticketId) {
    return res.status(400).json({ error: "ticketId is required" });
  }

  // Process ticket asynchronously
  processTicket(String(ticketId));
  
  res.json({ ok: true, message: `Processing ticket ${ticketId}` });
});

app.get("/process-ticket/:ticketId", async (req: Request, res: Response) => {
  const ticketId = req.params.ticketId;
  
  // Process ticket asynchronously
  processTicket(ticketId);
  
  res.json({ ok: true, message: `Processing ticket ${ticketId}` });
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`ComplianceBot listening on :${port}`);
  console.log(`\n📋 Available endpoints:`);
  console.log(`   GET  /healthz`);
  console.log(`   POST /process-ticket (body: {ticketId: "123"})`);
  console.log(`   GET  /process-ticket/123`);
  console.log(`\n🔧 Environment variables needed:`);
  console.log(`   HUBSPOT_TOKEN=${HUBSPOT_TOKEN ? '✅ Set' : '❌ Missing'}`);
  console.log(`   OPENAI_API_KEY=${process.env.OPENAI_API_KEY ? '✅ Set' : '❌ Missing'}`);
  console.log(`   SLACK_WEBHOOK_URL=${process.env.SLACK_WEBHOOK_URL ? '✅ Set' : '❌ Missing'}`);
});
