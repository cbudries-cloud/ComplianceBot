// Example workflow for processing one ticket with enhanced system

import { reviewTextEnhanced } from "./checker-enhanced.js";
import { createEnhancedSlackMessage } from "./slack-enhanced.js";
import { learningSystem } from "./learning.js";

async function processTicketEnhanced(ticketId: string, url: string) {
  console.log(`🔍 Processing ticket ${ticketId} with enhanced system...`);
  
  // 1. Fetch the page content
  const pageData = await fetchPage(url);
  
  // 2. Run enhanced compliance check
  const result = await reviewTextEnhanced(pageData.rendered_text);
  
  // 3. Create rich Slack message with feedback buttons
  const slackMessage = await createEnhancedSlackMessage(result, url, pageData.http_status);
  
  // 4. Send to Slack (with interactive buttons)
  await postSlackEnhanced(slackMessage);
  
  // 5. Log to CSV with enhanced data
  logEnhancedResult(ticketId, url, pageData, result);
  
  console.log(`✅ Ticket ${ticketId} processed with ${result.violations.length} violations found`);
}
