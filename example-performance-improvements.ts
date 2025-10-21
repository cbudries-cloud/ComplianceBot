// Example of how to improve performance based on learning data

// If a policy has high false positives (AI too aggressive):
const problematicPolicy = {
  policy_id: "eligibility_conditional_language",
  false_positives: 5,  // AI flagged 5 things that were actually OK
  true_positives: 8,   // AI correctly flagged 8 real violations
  precision: 0.62      // Only 62% accuracy when flagging
};

// The system suggests:
const improvements = [
  "Consider adding more context to detection patterns",
  "Review false positive examples to refine prohibited phrases",
  "Add exception cases for common false positives"
];

// If a policy has high false negatives (AI missing violations):
const missedPolicy = {
  policy_id: "medical_focus_required", 
  false_negatives: 3,  // AI missed 3 real violations
  true_positives: 7,   // AI caught 7 real violations
  recall: 0.70         // Only catching 70% of violations
};

// The system suggests:
const improvements2 = [
  "Add more prohibited phrases to detection patterns",
  "Strengthen pattern matching for wellness language",
  "Review missed examples to identify new patterns"
];
