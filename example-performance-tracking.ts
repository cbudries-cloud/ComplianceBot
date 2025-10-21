// Example of how performance metrics improve over time

// After processing 10 tickets with feedback, here's what the learning system tracks:

const policyPerformance = {
  "terminology_medical_professionals": {
    true_positives: 8,    // AI correctly flagged violations
    false_positives: 1,   // AI flagged something that was actually OK
    false_negatives: 1,  // AI missed a real violation
    precision: 0.89,      // 8/(8+1) - how often AI is right when it flags something
    recall: 0.89,         // 8/(8+1) - how often AI catches real violations
    f1_score: 0.89        // Overall performance score
  },
  
  "eligibility_conditional_language": {
    true_positives: 12,
    false_positives: 3,   // AI was too aggressive here
    false_negatives: 0,
    precision: 0.80,      // Lower precision - needs tuning
    recall: 1.00,          // Perfect recall - catches all violations
    f1_score: 0.89
  }
};

// The system generates insights like:
const insights = [
  "Policy 'eligibility_conditional_language' has high false positive rate - consider refining detection criteria",
  "Policy 'terminology_medical_professionals' performing well (F1: 0.89)"
];
