// Structured policy definitions for better compliance checking

export interface Policy {
  id: string;
  category: string;
  severity: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  prohibited_phrases: string[];
  required_phrases: string[];
  examples: {
    compliant: string[];
    non_compliant: string[];
  };
  rationale: string;
}

export const POLICIES: Policy[] = [
  {
    id: "terminology_medical_professionals",
    category: "Terminology",
    severity: "high",
    title: "Medical Professional Terminology",
    description: "Must use precise terms for medical professionals",
    prohibited_phrases: ["doctor", "doctor's note", "quick questions"],
    required_phrases: ["practitioner", "clinician", "healthcare provider", "independent", "licensed"],
    examples: {
      compliant: [
        "An independent licensed practitioner will review your clinical intake form",
        "Our healthcare providers are licensed partners"
      ],
      non_compliant: [
        "A doctor will approve your LMN",
        "Just answer a few quick questions"
      ]
    },
    rationale: "Reflects that reviewing professionals may be NPs or PAs, not just MDs/DOs"
  },
  
  {
    id: "eligibility_conditional_language",
    category: "Eligibility Claims",
    severity: "high", 
    title: "Conditional Eligibility Language",
    description: "Eligibility must be presented as conditional, never guaranteed",
    prohibited_phrases: ["is eligible", "is approved", "guaranteed approval", "use your HSA/FSA dollars"],
    required_phrases: ["may be eligible", "if you qualify", "with a Truemed LMN", "qualified customers"],
    examples: {
      compliant: [
        "HSA/FSA eligible with a Truemed LMN",
        "You may be eligible to pay with HSA/FSA",
        "This item may be HSA/FSA-eligible when used to address a specific health condition"
      ],
      non_compliant: [
        "Use your HSA/FSA dollars",
        "Your purchase is now HSA/FSA eligible",
        "We're eligible for payment from HSA/FSA providers"
      ]
    },
    rationale: "Eligibility is determined by licensed practitioners, not automatic"
  },

  {
    id: "tax_savings_qualified",
    category: "Tax Claims",
    severity: "high",
    title: "Qualified Tax Savings Claims", 
    description: "Tax savings must be approximate and explained",
    prohibited_phrases: ["save up to", "save 30% now!", "unlocks 30% savings"],
    required_phrases: ["~30%", "approximately", "individual tax rates vary", "checkout the TrueSavings Estimator"],
    examples: {
      compliant: [
        "Customers who qualify save ~30%*",
        "When you qualify to use HSA/FSA funds, you can save about ~30%, depending on your individual tax bracket"
      ],
      non_compliant: [
        "Save up to 40%",
        "Save 30% now!",
        "Your HSA/FSA unlocks 30% savings on products you were going to purchase anyway"
      ]
    },
    rationale: "Actual tax benefits vary significantly based on individual circumstances and state regulations"
  },

  {
    id: "medical_focus_required",
    category: "Medical Focus",
    severity: "medium",
    title: "Medical Condition Focus",
    description: "Products must be described in terms of medical conditions, not general wellness",
    prohibited_phrases: ["wellness", "look radiant", "feel energized", "health journey", "general health"],
    required_phrases: ["medical condition", "health condition", "chronic", "treat", "prevent", "manage"],
    examples: {
      compliant: [
        "This item may be eligible when used to address a specific health condition",
        "Effective way to manage chronic health conditions like diabetes, obesity, and hypertension"
      ],
      non_compliant: [
        "Look radiant and feel energized by incorporating this into your daily workout routine",
        "Perfect for your health and wellness journey"
      ]
    },
    rationale: "Only products that cure, treat, mitigate, or prevent diagnosed medical conditions are HSA/FSA eligible"
  },

  {
    id: "truemed_cost_transparency",
    category: "Cost Transparency",
    severity: "medium",
    title: "Truemed Cost Disclosure",
    description: "Must not imply Truemed services are free",
    prohibited_phrases: ["Truemed is free", "no charge", "covers the cost", "makes Truemed available at no charge"],
    required_phrases: ["included in the price", "costs are built into", "no additional cost"],
    examples: {
      compliant: [
        "The cost of Truemed's services are included in your purchase price",
        "Truemed's costs are built into the purchase price, so you do not have to pay extra"
      ],
      non_compliant: [
        "Truemed is free for all customers",
        "We cover the cost of Truemed for qualified customers"
      ]
    },
    rationale: "Customers pay for their own healthcare services; third-party payment could create compliance issues"
  }
];

// Policy categories for organization
export const POLICY_CATEGORIES = {
  "Terminology": "Language precision requirements",
  "Eligibility Claims": "How to properly frame HSA/FSA eligibility", 
  "Tax Claims": "Requirements for tax savings statements",
  "Medical Focus": "Medical condition vs wellness language",
  "Cost Transparency": "Truemed service cost disclosure"
};

// Helper functions
export function getPolicyById(id: string): Policy | undefined {
  return POLICIES.find(p => p.id === id);
}

export function getPoliciesByCategory(category: string): Policy[] {
  return POLICIES.filter(p => p.category === category);
}

export function getHighSeverityPolicies(): Policy[] {
  return POLICIES.filter(p => p.severity === "high");
}
