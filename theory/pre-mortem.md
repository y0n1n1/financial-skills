# Pre-Mortem Analysis

**Core Question:** It's 18 months from now. This trade was a disaster. What happened?

The pre-mortem is psychologically different from the contrarian check. The contrarian check asks "what's the bear case?" — a logical exercise. The pre-mortem asks you to ASSUME FAILURE and work backward — an imaginative exercise that accesses different cognitive pathways and surfaces risks that pure logic misses.

Research shows pre-mortems increase the ability to identify potential problems by up to 30% compared to standard risk analysis (Klein, 2007).

## Why This Is Different From the Contrarian Check

The contrarian check: "What are the arguments against this theory?"
→ This is still ANALYTICAL. You search for bear cases and evaluate them.

The pre-mortem: "The theory was wrong. You lost money. Tell the story of what happened."
→ This is NARRATIVE. You construct a plausible failure story. This surfaces:
- Cascading failures (A led to B led to C)
- Unlikely but devastating scenarios
- Psychological failure modes (you ignored a warning sign, you held too long)
- Interaction effects between risks that look manageable individually

## Process

### Step 1: Set the Scene
"It's [18 months from now]. Gabriel's position in [TICKER] has lost [40-60%] of its value. The theory was wrong. Here's what happened..."

### Step 2: Write 3 Distinct Failure Narratives
Each narrative should be a plausible, specific story — not just "the stock went down":

**Narrative 1: The Slow Bleed**
How does the theory die gradually? What sequence of small, ignorable warning signs leads to a major loss? This is the most dangerous failure mode because each individual step seems manageable.

**Narrative 2: The Shock Event**
What single event could kill the theory overnight? What's the "black swan" specific to this stock/sector? Think: regulatory action, competitor breakthrough, executive scandal, geopolitical event.

**Narrative 3: The Thesis Was Right But the Trade Was Wrong**
The company does well but the stock doesn't move (or drops). Why? Possible causes: already priced in, multiple compression, sector rotation, currency effects, dilution. This is the most overlooked failure mode — being right about the company but wrong about the trade.

### Step 3: Assess Each Narrative
For each:
- **Plausibility**: LOW / MEDIUM / HIGH
- **Detectability**: Would the current parameter set catch this early enough?
- **Parameter gaps**: Does this narrative reveal a risk that NO current parameter monitors?
- **Suggested additions**: New parameters to watch for this specific failure mode

### Step 4: The "What Would I Regret?" Test
Ask Gabriel: "If each of these failure narratives played out, which one would make you feel the most stupid for not seeing it coming?" That's the one to take most seriously.

## Output Format

```
### Pre-Mortem: [TICKER]
Date set: [now]. Imagined failure date: [18 months out].

#### Narrative 1: The Slow Bleed
[3-4 paragraph story of gradual failure]
Plausibility: [LOW/MEDIUM/HIGH]
Current parameters would catch it: [YES/NO/PARTIALLY]
Gap: [what this reveals that we're not monitoring]

#### Narrative 2: The Shock Event
[3-4 paragraph story of sudden failure]
Plausibility: [LOW/MEDIUM/HIGH]
Current parameters would catch it: [YES/NO/PARTIALLY]
Gap: [what this reveals]

#### Narrative 3: Right Company, Wrong Trade
[3-4 paragraph story]
Plausibility: [LOW/MEDIUM/HIGH]
Current parameters would catch it: [YES/NO/PARTIALLY]
Gap: [what this reveals]

#### Most Dangerous Narrative: [which one and why]
#### Suggested New Parameters: [any gaps identified]
```

## Critical Rule

The pre-mortem narratives must be SPECIFIC and VIVID, not abstract. Not "a competitor might emerge" but "AMD announces MI500 at GTC 2027 with 2x H100 performance per dollar, Meta immediately shifts 40% of their training fleet, NVDA's data center revenue misses by 25%, stock gaps down 20% premarket."

Specificity is what makes this exercise work. Vague risks don't trigger the emotional circuitry that helps you actually prepare for them.
