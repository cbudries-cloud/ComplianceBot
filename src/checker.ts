import OpenAI from "openai";
import { COMPLIANCE_GUIDE } from "./compliance_guide.js";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function reviewText(text: string): Promise<{
  merchant_name: string;
  overall_decision: string;
  confidence: number;
  violations: Array<{ policy_id: string; severity: string; quote: string; rationale: string }>;
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
