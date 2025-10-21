// Example of updating policies based on learning feedback

// Original policy that was too aggressive:
const originalPolicy = {
  id: "eligibility_conditional_language",
  prohibited_phrases: ["use your HSA", "HSA eligible", "FSA eligible"],
  // This was catching too many legitimate uses
};

// Updated policy based on false positive feedback:
const improvedPolicy = {
  id: "eligibility_conditional_language", 
  prohibited_phrases: [
    "use your HSA dollars",           // More specific
    "is HSA eligible",                // Absolute claims
    "is FSA eligible",                // Absolute claims  
    "guaranteed HSA approval"         // New pattern found
  ],
  required_phrases: [
    "may be eligible",
    "with Truemed LMN", 
    "if you qualify",
    "qualified customers"
  ],
  // Added context-aware detection
  context_requirements: {
    requires_qualifier: true,
    exception_patterns: ["HSA/FSA eligible with a Truemed LMN"] // This is OK
  }
};
