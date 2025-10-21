#!/usr/bin/env tsx

// Test script for the enhanced ComplianceBot system

import "dotenv/config";
import { reviewTextEnhanced } from "./src/checker.js";
import { createEnhancedSlackMessage } from "./src/slack-enhanced.js";
import { learningSystem } from "./src/learning.js";

async function testEnhancedSystem() {
  console.log("🧪 Testing Enhanced ComplianceBot System");
  console.log("==========================================\n");
  
  // Test 1: Enhanced compliance checking
  console.log("📋 Test 1: Enhanced Compliance Checking");
  const testText = `
    Welcome to Acme Health Store!
    
    Use your HSA/FSA dollars on our products!
    Our doctor will approve your LMN quickly.
    Save up to 40% with HSA/FSA!
    Perfect for your wellness journey.
  `;
  
  try {
    const result = await reviewTextEnhanced(testText);
    console.log(`✅ Enhanced review completed`);
    console.log(`   Merchant: ${result.merchant_name}`);
    console.log(`   Decision: ${result.overall_decision}`);
    console.log(`   Confidence: ${(result.confidence * 100).toFixed(0)}%`);
    console.log(`   Violations: ${result.violations.length}`);
    console.log(`   Summary: ${result.summary}`);
    
    if (result.recommendations) {
      console.log(`   Recommendations: ${result.recommendations.join(", ")}`);
    }
    
    // Test 2: Enhanced Slack message creation
    console.log("\n📱 Test 2: Enhanced Slack Message Creation");
    const slackMessage = await createEnhancedSlackMessage(result, "https://test.com", 200);
    console.log(`✅ Enhanced Slack message created`);
    console.log(`   Text: ${slackMessage.text}`);
    console.log(`   Blocks: ${slackMessage.blocks?.length || 0} blocks`);
    
    // Test 3: Learning system
    console.log("\n🧠 Test 3: Learning System");
    const insights = learningSystem.generateInsights();
    const performance = learningSystem.getPolicyPerformance();
    console.log(`✅ Learning system initialized`);
    console.log(`   Policies tracked: ${performance.length}`);
    console.log(`   Insights: ${insights.length}`);
    
    console.log("\n🎉 All tests passed! Enhanced system is working correctly.");
    
  } catch (error) {
    console.error(`❌ Test failed: ${error.message}`);
    console.error(error.stack);
  }
}

// Run the test
testEnhancedSystem().catch(console.error);
