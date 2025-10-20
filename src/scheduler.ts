import "dotenv/config";
import express from "express";
import { fetchPage } from "./crawler.js";
import { reviewText } from "./checker.js";
import { Cache } from "./cache.js";
import fs from "fs";

const app = express();
const cache = new Cache("data.db");
const HUBSPOT_TOKEN = process.env.HUBSPOT_TOKEN!;
const HUBSPOT_PROPERTY = process.env.PROPERTY_LANDING_URL || "landing_page_url";
const POLL_INTERVAL = parseInt(process.env.POLL_INTERVAL || "86400000"); // 24 hours default
const CSV = "results.csv";

// Create CSV with header if not exists
if (!fs.existsSync(CSV)) {
  fs.writeFileSync(CSV, "timestamp,ticket_id,url,final_url,http_status,decision,confidence,violations_json,company_domain\n");
}

const cache = new Cache("data.db");

async function postSlack(text: string): Promise<void> {
  const url = process.env.SLACK_WEBHOOK_URL;
  if (!url) return;
  
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

async function findNewTickets(): Promise<string[]> {
  const headers = {
    "Authorization": `Bearer ${HUBSPOT_TOKEN}`,
    "Content-Type": "application/json"
  };

  try {
    const searchUrl = `https://api.hubapi.com/crm/v3/objects/tickets/search`;
    const searchBody = {
      "filterGroups": [
        {
          "filters": [
            {
              "propertyName": HUBSPOT_PROPERTY,
              "operator": "HAS_PROPERTY"
            },
            {
              "propertyName": "hs_lastmodifieddate",
              "operator": "GTE",
              "value": Date.now() - (24 * 60 * 60 * 1000) // Last 24 hours
            }
          ]
        }
      ],
      "properties": ["hs_ticket_id", HUBSPOT_PROPERTY],
      "limit": 50
    };

    const response = await fetch(searchUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(searchBody)
    });

    if (!response.ok) {
      console.error(`Search failed: ${response.status}`);
      return [];
    }

    const data = await response.json();
    return data.results?.map((ticket: any) => ticket.id) || [];
  } catch (error) {
    console.error("Error searching tickets:", error);
    return [];
  }
}

async function processTicket(ticketId: string): Promise<void> {
  console.log(`🔍 Processing ticket ${ticketId}...`);
  
  try {
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

    if (cache.seenToday(ticketId, url)) {
      console.log(`♻️ Already processed ticket ${ticketId} with URL ${url} today`);
      return;
    }

    console.log(`🌐 Processing URL: ${url}`);
    if (companyDomain) {
      console.log(`🏢 Company domain: ${companyDomain}`);
    }

    let pageData;
    let review;
    
    try {
      pageData = await fetchPage(url);
      review = await reviewText(pageData.rendered_text);
    } catch (error: any) {
      const ts = new Date().toISOString();
      const errorRow = `${ts},${ticketId},"${url}","${url}",0,error,0.0,"[]","${companyDomain || ''}"\n`;
      fs.appendFileSync(CSV, errorRow);
      
      const errorMsg = `I attempted to review a website but encountered an error:\n\nError: ${error.message}\nWebsite: ${url}`;
      await postSlack(errorMsg);
      
      console.log(`❌ Error processing ${url}: ${error.message}`);
      return;
    }

    const ts = new Date().toISOString();

    const violationsJson = JSON.stringify(review.violations).replaceAll('"', '""');
    fs.appendFileSync(CSV,
      `${ts},${ticketId},"${url}","${pageData.final_url}",${pageData.http_status},${review.overall_decision},${review.confidence},"${violationsJson}","${companyDomain || ''}"\n`
    );

    let msg = `I have just read through ${review.merchant_name}'s website, and here are my findings:`;
    
    if (review.overall_decision === "clean") {
      msg += "\n\nGood to go!";
    } else {
      msg += "\n\nIssues found:\n";
      msg += `${summarizeViolations(review.violations)}\n`;
      msg += `\nWebsite: ${pageData.final_url}`;
    }
    
    await postSlack(msg);

    cache.mark(ticketId, url);
    
    console.log(`✅ Completed processing ticket ${ticketId}`);
    console.log(`   Decision: ${review.overall_decision}`);
    console.log(`   Violations: ${review.violations.length}`);
    
  } catch (error: any) {
    console.error(`💥 Error processing ticket ${ticketId}:`, error.message);
  }
}

// Health check endpoint for Railway
app.get("/healthz", (req, res) => {
  res.send("ok");
});

async function runScheduler(): Promise<void> {
  console.log(`🚀 ComplianceBot Scheduler started`);
  console.log(`📅 Polling every ${POLL_INTERVAL / (1000 * 60 * 60)} hours`);
  console.log(`🔧 Environment check:`);
  console.log(`   HUBSPOT_TOKEN: ${HUBSPOT_TOKEN ? '✅ Set' : '❌ Missing'}`);
  console.log(`   OPENAI_API_KEY: ${process.env.OPENAI_API_KEY ? '✅ Set' : '❌ Missing'}`);
  console.log(`   SLACK_WEBHOOK_URL: ${process.env.SLACK_WEBHOOK_URL ? '✅ Set' : '❌ Missing'}`);
  
  // Start Express server for health checks
  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`🌐 Health check server running on port ${port}`);
  });
  
  while (true) {
    try {
      console.log(`\n🔍 Checking for new tickets...`);
      const ticketIds = await findNewTickets();
      
      if (ticketIds.length === 0) {
        console.log(`📭 No new tickets found`);
      } else {
        console.log(`📋 Found ${ticketIds.length} tickets to process`);
        
        for (const ticketId of ticketIds) {
          await processTicket(ticketId);
          await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay between tickets
        }
      }
      
      console.log(`⏰ Waiting ${POLL_INTERVAL / (1000 * 60 * 60)} hours until next check...`);
      await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
      
    } catch (error) {
      console.error(`💥 Scheduler error:`, error);
      console.log(`⏰ Retrying in 60 seconds...`);
      await new Promise(resolve => setTimeout(resolve, 60000));
    }
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down ComplianceBot Scheduler...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down ComplianceBot Scheduler...');
  process.exit(0);
});

runScheduler();
