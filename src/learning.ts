// Learning system to improve compliance detection over time

import { Cache } from "./cache.js";
import fs from "fs";

export interface LearningExample {
  id: string;
  url: string;
  text_snippet: string;
  human_feedback: 'correct' | 'incorrect' | 'needs_review';
  ai_decision: string;
  ai_confidence: number;
  violations_found: string[];
  timestamp: string;
  reviewer_notes?: string;
}

export interface PolicyPerformance {
  policy_id: string;
  true_positives: number;
  false_positives: number;
  false_negatives: number;
  precision: number;
  recall: number;
  f1_score: number;
}

export class ComplianceLearningSystem {
  private cache: Cache;
  private learningFile: string;
  
  constructor() {
    this.cache = new Cache("learning.db");
    this.learningFile = "learning_examples.json";
    this.initializeLearningDatabase();
  }
  
  private initializeLearningDatabase(): void {
    // Create learning examples table
    this.cache.db.exec(`
      CREATE TABLE IF NOT EXISTS learning_examples (
        id TEXT PRIMARY KEY,
        url TEXT NOT NULL,
        text_snippet TEXT NOT NULL,
        human_feedback TEXT NOT NULL,
        ai_decision TEXT NOT NULL,
        ai_confidence REAL NOT NULL,
        violations_found TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        reviewer_notes TEXT
      )
    `);
    
    // Create policy performance tracking
    this.cache.db.exec(`
      CREATE TABLE IF NOT EXISTS policy_performance (
        policy_id TEXT PRIMARY KEY,
        true_positives INTEGER DEFAULT 0,
        false_positives INTEGER DEFAULT 0,
        false_negatives INTEGER DEFAULT 0,
        precision REAL DEFAULT 0,
        recall REAL DEFAULT 0,
        f1_score REAL DEFAULT 0,
        last_updated TEXT NOT NULL
      )
    `);
  }
  
  // Record a learning example for human review
  recordExample(
    url: string,
    textSnippet: string,
    aiDecision: string,
    aiConfidence: number,
    violations: string[]
  ): string {
    const id = `example_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = new Date().toISOString();
    
    const stmt = this.cache.db.prepare(`
      INSERT INTO learning_examples 
      (id, url, text_snippet, human_feedback, ai_decision, ai_confidence, violations_found, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      id,
      url,
      textSnippet,
      'pending', // Will be updated when human reviews
      aiDecision,
      aiConfidence,
      JSON.stringify(violations),
      timestamp
    );
    
    return id;
  }
  
  // Update example with human feedback
  updateExampleFeedback(
    id: string,
    feedback: 'correct' | 'incorrect' | 'needs_review',
    notes?: string
  ): void {
    const stmt = this.cache.db.prepare(`
      UPDATE learning_examples 
      SET human_feedback = ?, reviewer_notes = ?
      WHERE id = ?
    `);
    
    stmt.run(feedback, notes || null, id);
    
    // Update policy performance metrics
    this.updatePolicyPerformance(id);
  }
  
  // Calculate policy performance metrics
  private updatePolicyPerformance(exampleId: string): void {
    const example = this.cache.db.prepare(`
      SELECT * FROM learning_examples WHERE id = ?
    `).get(exampleId) as any;
    
    if (!example) return;
    
    const violations = JSON.parse(example.violations_found);
    const isCorrect = example.human_feedback === 'correct';
    
    for (const violation of violations) {
      const policyId = violation.policy_id;
      
      // Get current performance
      let perf = this.cache.db.prepare(`
        SELECT * FROM policy_performance WHERE policy_id = ?
      `).get(policyId) as any;
      
      if (!perf) {
        // Initialize new policy
        this.cache.db.prepare(`
          INSERT INTO policy_performance (policy_id, last_updated)
          VALUES (?, ?)
        `).run(policyId, new Date().toISOString());
        
        perf = { true_positives: 0, false_positives: 0, false_negatives: 0 };
      }
      
      // Update metrics based on AI decision and human feedback
      if (example.ai_decision === 'violation' && isCorrect) {
        perf.true_positives++;
      } else if (example.ai_decision === 'violation' && !isCorrect) {
        perf.false_positives++;
      } else if (example.ai_decision === 'clean' && !isCorrect) {
        perf.false_negatives++;
      }
      
      // Calculate precision, recall, F1
      const precision = perf.true_positives / (perf.true_positives + perf.false_positives) || 0;
      const recall = perf.true_positives / (perf.true_positives + perf.false_negatives) || 0;
      const f1Score = 2 * (precision * recall) / (precision + recall) || 0;
      
      // Update database
      this.cache.db.prepare(`
        UPDATE policy_performance 
        SET true_positives = ?, false_positives = ?, false_negatives = ?,
            precision = ?, recall = ?, f1_score = ?, last_updated = ?
        WHERE policy_id = ?
      `).run(
        perf.true_positives,
        perf.false_positives, 
        perf.false_negatives,
        precision,
        recall,
        f1Score,
        new Date().toISOString(),
        policyId
      );
    }
  }
  
  // Get policy performance metrics
  getPolicyPerformance(): PolicyPerformance[] {
    const results = this.cache.db.prepare(`
      SELECT * FROM policy_performance ORDER BY f1_score DESC
    `).all() as any[];
    
    return results.map(r => ({
      policy_id: r.policy_id,
      true_positives: r.true_positives,
      false_positives: r.false_positives,
      false_negatives: r.false_negatives,
      precision: r.precision,
      recall: r.recall,
      f1_score: r.f1_score
    }));
  }
  
  // Get examples pending human review
  getPendingExamples(): LearningExample[] {
    const results = this.cache.db.prepare(`
      SELECT * FROM learning_examples 
      WHERE human_feedback = 'pending'
      ORDER BY timestamp DESC
      LIMIT 50
    `).all() as any[];
    
    return results.map(r => ({
      id: r.id,
      url: r.url,
      text_snippet: r.text_snippet,
      human_feedback: r.human_feedback as any,
      ai_decision: r.ai_decision,
      ai_confidence: r.ai_confidence,
      violations_found: JSON.parse(r.violations_found),
      timestamp: r.timestamp,
      reviewer_notes: r.reviewer_notes
    }));
  }
  
  // Export learning data for analysis
  exportLearningData(): string {
    const examples = this.cache.db.prepare(`
      SELECT * FROM learning_examples ORDER BY timestamp DESC
    `).all();
    
    const performance = this.getPolicyPerformance();
    
    return JSON.stringify({
      examples,
      performance,
      export_date: new Date().toISOString(),
      total_examples: examples.length,
      reviewed_examples: examples.filter((e: any) => e.human_feedback !== 'pending').length
    }, null, 2);
  }
  
  // Generate learning insights
  generateInsights(): string[] {
    const performance = this.getPolicyPerformance();
    const insights: string[] = [];
    
    // Find worst performing policies
    const worstPolicy = performance.length > 0 ? performance.reduce((worst, current) => 
      current.f1_score < worst.f1_score ? current : worst
    ) : null;
    
    if (worstPolicy && worstPolicy.f1_score < 0.7) {
      insights.push(`Policy "${worstPolicy.policy_id}" needs attention (F1: ${worstPolicy.f1_score.toFixed(2)})`);
    }
    
    // Find high false positive rate
    const highFalsePositives = performance.filter(p => 
      p.false_positives > p.true_positives && p.precision < 0.6
    );
    
    if (highFalsePositives.length > 0) {
      insights.push(`${highFalsePositives.length} policies have high false positive rates - consider refining detection criteria`);
    }
    
    // Find high false negative rate  
    const highFalseNegatives = performance.filter(p => 
      p.false_negatives > p.true_positives && p.recall < 0.6
    );
    
    if (highFalseNegatives.length > 0) {
      insights.push(`${highFalseNegatives.length} policies missing violations - consider strengthening detection patterns`);
    }
    
    return insights;
  }
}

// Global learning system instance
export const learningSystem = new ComplianceLearningSystem();
