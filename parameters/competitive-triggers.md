# Competitive Triggers

**Core Question:** What competitive developments would undermine the position this theory claims?

## What to Gather (via WebSearch)

Search for: "[TICKER] competitors 2026" and "[COMPANY] market share" and "[TOP COMPETITOR] vs [COMPANY]"

Pull:
- Current market share
- Top competitors and their recent moves
- Any announced product launches from competitors
- Customer wins/losses
- Any regulatory actions affecting competitive landscape

## How to Define Triggers

Read the theory statement carefully. It makes claims about competitive position. For each claim, define what would DISPROVE it.

### Market Share Triggers
- **Market share decline**: if reported market share drops below X%
  - Set threshold relative to current (e.g., if 80%, trigger at <70%)
  - Severity: MINOR (small decline), MAJOR (accelerating decline)
  - These are THEORY-SPECIFIC (they directly test the moat claim)

### Competitor Product Triggers
- **Credible competitor launch**: [specific competitor] launches product matching [specific capability]
  - Be specific: "AMD launches GPU matching H100 performance at lower price" not "AMD does something"
  - Severity: MAJOR (announced), EXIT (shipping + customers adopting)

### Customer Triggers
- **Key customer defection**: if [major customer] publicly switches to competitor
  - Severity: MINOR (one customer), MAJOR (trend of customers switching)

### Regulatory Triggers
- **Antitrust/regulation**: government action that forces interoperability or breaks lock-in
  - E.g., "EU mandates CUDA alternative compatibility"
  - Severity: MAJOR (investigation), EXIT (enforceable ruling)

### Disruption Triggers
- **Paradigm shift**: new approach that makes the company's advantage irrelevant
  - E.g., "custom ASIC chips become viable alternative to GPUs for AI training"
  - Severity: MAJOR (demonstrated in labs), EXIT (deployed at scale)

## Output Format

For each proposed trigger:
```
| # | Trigger | Current Status | Threshold | Severity | Theory-Specific? |
```

Include 2-4 competitive triggers. These should be HIGHLY theory-specific — they directly test the moat/position claims.
