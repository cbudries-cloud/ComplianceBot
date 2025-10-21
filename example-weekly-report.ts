// Example weekly learning report

const weeklyReport = {
  text: "📊 Weekly Compliance Learning Report",
  blocks: [
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
        text: `*Performance Summary:*
• Total Policies Tracked: 5
• Examples Pending Review: 3
• Average F1 Score: 0.87
• Total Examples This Week: 15`
      }
    },
    {
      type: "section", 
      text: {
        type: "mrkdwn",
        text: `*Key Insights:*
• Policy "eligibility_conditional_language" needs attention (F1: 0.65)
• 2 policies have high false positive rates - consider refining detection criteria
• Policy "medical_focus_required" performing excellently (F1: 0.95)`
      }
    },
    {
      type: "section",
      text: {
        type: "mrkdwn", 
        text: `*Top Performing Policies:*
• terminology_medical_professionals: F1=0.89 (P=0.89, R=0.89)
• tax_savings_qualified: F1=0.87 (P=0.85, R=0.90)
• truemed_cost_transparency: F1=0.85 (P=0.82, R=0.88)`
      }
    }
  ]
};
