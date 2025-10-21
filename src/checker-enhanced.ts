import OpenAI from "openai";
import { COMPLIANCE_GUIDE } from "./compliance_guide.js";
import { POLICIES, Policy } from "./policies.js";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface Violation {
  policy_id: string;
  severity: 'high' | 'medium' | 'low';
  quote: string;
  rationale: string;
  suggested_fix?: string;
  policy_title?: string;
}

export interface ComplianceResult {
  merchant_name: string;
  overall_decision: 'violation' | 'needs_review' | 'clean';
  confidence: number;
  violations: Violation[];
  summary: string;
  recommendations?: string[];
}

// Enhanced compliance checking with structured policies
export async function reviewTextEnhanced(text: string): Promise<ComplianceResult> {
  // First, do a quick pattern-based pre-check for obvious violations
  const quickViolations = await quickPatternCheck(text);
  
  // Then do the full LLM analysis
  const llmResult = await reviewTextLLM(text);
  
  // Merge and enhance results
  const enhancedViolations = enhanceViolations(llmResult.violations, quickViolations);
  
  // Generate summary and recommendations
  const summary = generateSummary(llmResult.merchant_name, enhancedViolations);
  const recommendations = generateRecommendations(enhancedViolations);
  
  return {
    merchant_name: llmResult.merchant_name,
    overall_decision: llmResult.overall_decision,
    confidence: llmResult.confidence,
    violations: enhancedViolations,
    summary,
    recommendations
  };
}

// Quick pattern-based check for obvious violations
async function quickPatternCheck(text: string): Promise<Partial<Violation>[]> {
  const violations: Partial<Violation>[] = [];
  
  for (const policy of POLICIES) {
    // Check for prohibited phrases
    for (const phrase of policy.prohibited_phrases) {
      const regex = new RegExp(`\\b${phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
      const matches = text.match(regex);
      
      if (matches) {
        violations.push({
          policy_id: policy.id,
          severity: policy.severity,
          policy_title: policy.title,
          rationale: `Contains prohibited phrase: "${phrase}"`,
          suggested_fix: `Replace with approved terminology from policy guidelines`
        });
      }
    }
    
    // Check for missing required phrases in critical contexts
    if (policy.severity === 'high' && policy.required_phrases.length > 0) {
      const hasRequiredPhrase = policy.required_phrases.some(phrase => 
        text.toLowerCase().includes(phrase.toLowerCase())
      );
      
      if (!hasRequiredPhrase && text.toLowerCase().includes('hsa') || text.toLowerCase().includes('fsa')) {
        violations.push({
          policy_id: policy.id,
          severity: policy.severity,
          policy_title: policy.title,
          rationale: `Missing required qualifying language for HSA/FSA claims`,
          suggested_fix: `Add conditional language like "may be eligible" or "with Truemed LMN"`
        });
      }
    }
  }
  
  return violations;
}

// Original LLM-based review
async function reviewTextLLM(text: string): Promise<{
  merchant_name: string;
  overall_decision: string;
  confidence: number;
  violations: Violation[];
}> {
  const resp = await client.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    temperature: 0,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: COMPLIANCE_GUIDE },
      { role: "user", content: `PAGE_TEXT:\n"""${text.slice(0, 30000)}"""` }
    ],
  });
  
  const j = JSON.parse(resp.choices[0].message.content || "{}");
  
  // Validate and set defaults
  if (!j.merchant_name) j.merchant_name = "Unknown Company";
  if (!j.overall_decision) j.overall_decision = "needs_review";
  if (!Array.isArray(j.violations)) j.violations = [];
  if (typeof j.confidence !== "number") j.confidence = 0.5;
  
  // Downgrade logic: if any violation lacks a quote, set overall_decision to needs_review
  if (j.violations.some((v: any) => !v.quote)) {
    j.overall_decision = "needs_review";
  }
  
  return j;
}

// Enhance violations with policy details and suggestions
function enhanceViolations(llmViolations: any[], quickViolations: Partial<Violation>[]): Violation[] {
  const enhanced: Violation[] = [];
  
  // Process LLM violations
  for (const violation of llmViolations) {
    const policy = POLICIES.find(p => p.id === violation.policy_id);
    enhanced.push({
      policy_id: violation.policy_id,
      severity: violation.severity || policy?.severity || 'medium',
      quote: violation.quote,
      rationale: violation.rationale,
      policy_title: policy?.title,
      suggested_fix: generateSuggestedFix(violation.policy_id, violation.quote)
    });
  }
  
  // Add quick check violations (avoid duplicates)
  for (const quickViolation of quickViolations) {
    const exists = enhanced.some(v => 
      v.policy_id === quickViolation.policy_id && 
      v.quote === quickViolation.quote
    );
    
    if (!exists) {
      enhanced.push(quickViolation as Violation);
    }
  }
  
  return enhanced;
}

// Generate specific fix suggestions based on policy
function generateSuggestedFix(policyId: string, quote: string): string {
  const policy = POLICIES.find(p => p.id === policyId);
  if (!policy) return "Review compliance guidelines";
  
  // Find a compliant example that matches the context
  const compliantExample = policy.examples.compliant[0];
  if (compliantExample) {
    return `Suggested fix: "${compliantExample}"`;
  }
  
  return `Review ${policy.title} guidelines for proper terminology`;
}

// Generate human-readable summary
function generateSummary(merchantName: string, violations: Violation[]): string {
  if (violations.length === 0) {
    return `${merchantName}'s website appears compliant with Truemed guidelines.`;
  }
  
  const highSeverity = violations.filter(v => v.severity === 'high').length;
  const mediumSeverity = violations.filter(v => v.severity === 'medium').length;
  const lowSeverity = violations.filter(v => v.severity === 'low').length;
  
  let summary = `${merchantName}'s website has ${violations.length} compliance issue(s): `;
  
  if (highSeverity > 0) summary += `${highSeverity} high-priority, `;
  if (mediumSeverity > 0) summary += `${mediumSeverity} medium-priority, `;
  if (lowSeverity > 0) summary += `${lowSeverity} low-priority.`;
  
  return summary.replace(/, $/, '.');
}

// Generate actionable recommendations
function generateRecommendations(violations: Violation[]): string[] {
  const recommendations: string[] = [];
  const categories = new Set(violations.map(v => {
    const policy = POLICIES.find(p => p.id === v.policy_id);
    return policy?.category;
  }));
  
  for (const category of categories) {
    if (category === 'Terminology') {
      recommendations.push("Review and update terminology to use precise medical language");
    } else if (category === 'Eligibility Claims') {
      recommendations.push("Add conditional language to all HSA/FSA eligibility statements");
    } else if (category === 'Tax Claims') {
      recommendations.push("Qualify all tax savings claims with appropriate disclaimers");
    } else if (category === 'Medical Focus') {
      recommendations.push("Reframe product benefits in terms of medical conditions, not general wellness");
    } else if (category === 'Cost Transparency') {
      recommendations.push("Clarify that Truemed costs are included in product pricing");
    }
  }
  
  return recommendations;
}

// Backward compatibility - keep original function
export async function reviewText(text: string): Promise<{
  merchant_name: string;
  overall_decision: string;
  confidence: number;
  violations: Array<{ policy_id: string; severity: string; quote: string; rationale: string }>;
}> {
  const result = await reviewTextEnhanced(text);
  return {
    merchant_name: result.merchant_name,
    overall_decision: result.overall_decision,
    confidence: result.confidence,
    violations: result.violations.map(v => ({
      policy_id: v.policy_id,
      severity: v.severity,
      quote: v.quote,
      rationale: v.rationale
    }))
  };
}
