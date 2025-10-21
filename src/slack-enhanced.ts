// Enhanced Slack notifications with rich formatting and actionable insights

import { ComplianceResult, Violation } from "./checker-enhanced.js";
import { learningSystem } from "./learning.js";

export interface SlackNotification {
  text: string;
  blocks?: any[];
  attachments?: any[];
}

export async function createEnhancedSlackMessage(
  result: ComplianceResult,
  url: string,
  httpStatus: number
): Promise<SlackNotification> {
  
  // Record example for learning
  const exampleId = learningSystem.recordExample(
    url,
    result.summary,
    result.overall_decision,
    result.confidence,
    result.violations.map(v => v.policy_id)
  );
  
  if (result.overall_decision === "clean") {
    return createCleanMessage(result.merchant_name, url);
  } else {
    return createViolationMessage(result, url, httpStatus, exampleId);
  }
}

function createCleanMessage(merchantName: string, url: string): SlackNotification {
  return {
    text: `✅ Compliance Check Complete - ${merchantName}`,
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: `✅ ${merchantName} - Compliance Check Complete`
        }
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Good news!* ${merchantName}'s website appears to be compliant with Truemed guidelines.`
        }
      },
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: `🌐 *Website:* ${url}`
          }
        ]
      }
    ]
  };
}

function createViolationMessage(
  result: ComplianceResult,
  url: string,
  httpStatus: number,
  exampleId: string
): SlackNotification {
  
  const blocks: any[] = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: `⚠️ Compliance Issues Found - ${result.merchant_name}`
      }
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Summary:* ${result.summary}\n*Confidence:* ${(result.confidence * 100).toFixed(0)}%`
      }
    }
  ];
  
  // Add violation details
  if (result.violations.length > 0) {
    const violationBlocks = result.violations.slice(0, 3).map((violation, index) => ({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Issue ${index + 1}:* ${violation.policy_title || violation.policy_id}\n` +
              `*Severity:* ${violation.severity.toUpperCase()}\n` +
              `*Quote:* "${violation.quote}"\n` +
              `*Issue:* ${violation.rationale}` +
              (violation.suggested_fix ? `\n*Suggested Fix:* ${violation.suggested_fix}` : '')
      }
    }));
    
    blocks.push(...violationBlocks);
  }
  
  // Add recommendations
  if (result.recommendations && result.recommendations.length > 0) {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Recommendations:*\n${result.recommendations.map(r => `• ${r}`).join('\n')}`
      }
    });
  }
  
  // Add context information
  blocks.push({
    type: "context",
    elements: [
      {
        type: "mrkdwn",
        text: `🌐 *Website:* ${url} | 📊 *HTTP Status:* ${httpStatus}`
      }
    ]
  });
  
  // Add learning feedback buttons
  blocks.push({
    type: "actions",
    elements: [
      {
        type: "button",
        text: {
          type: "plain_text",
          text: "✅ Correct"
        },
        style: "primary",
        action_id: `feedback_correct_${exampleId}`,
        value: exampleId
      },
      {
        type: "button", 
        text: {
          type: "plain_text",
          text: "❌ Incorrect"
        },
        style: "danger",
        action_id: `feedback_incorrect_${exampleId}`,
        value: exampleId
      },
      {
        type: "button",
        text: {
          type: "plain_text",
          text: "🤔 Needs Review"
        },
        action_id: `feedback_review_${exampleId}`,
        value: exampleId
      }
    ]
  });
  
  return {
    text: `⚠️ Compliance Issues Found - ${result.merchant_name}: ${result.summary}`,
    blocks
  };
}

// Handle Slack interactive feedback
export function handleSlackFeedback(payload: any): string {
  const action = payload.actions[0];
  const exampleId = action.value;
  const feedback = action.action_id.startsWith('feedback_correct') ? 'correct' :
                   action.action_id.startsWith('feedback_incorrect') ? 'incorrect' : 'needs_review';
  
  learningSystem.updateExampleFeedback(exampleId, feedback);
  
  return `Thank you for your feedback! This will help improve our compliance detection.`;
}

// Generate weekly learning report
export function generateWeeklyReport(): SlackNotification {
  const insights = learningSystem.generateInsights();
  const performance = learningSystem.getPolicyPerformance();
  const pendingExamples = learningSystem.getPendingExamples();
  
  const blocks: any[] = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: "📊 Weekly Compliance Learning Report"
      }
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Performance Summary:*\n` +
              `• Total Policies Tracked: ${performance.length}\n` +
              `• Examples Pending Review: ${pendingExamples.length}\n` +
              `• Average F1 Score: ${(performance.reduce((sum, p) => sum + p.f1_score, 0) / performance.length).toFixed(2)}`
      }
    }
  ];
  
  if (insights.length > 0) {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Key Insights:*\n${insights.map(i => `• ${i}`).join('\n')}`
      }
    });
  }
  
  // Top performing policies
  const topPolicies = performance
    .sort((a, b) => b.f1_score - a.f1_score)
    .slice(0, 3);
    
  if (topPolicies.length > 0) {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Top Performing Policies:*\n${topPolicies.map(p => 
          `• ${p.policy_id}: F1=${p.f1_score.toFixed(2)} (P=${p.precision.toFixed(2)}, R=${p.recall.toFixed(2)})`
        ).join('\n')}`
      }
    });
  }
  
  return {
    text: "Weekly Compliance Learning Report",
    blocks
  };
}
