# Understanding Surfaces — Review / Outcome

**Date:** 2026-10-03  
**Scope:** existing artifacts in `oli-nio/Playground`  
**Status:** REVIEW / OUTCOME — no architecture or baseline decision

## Review question

Which existing Playground surfaces actually reduce cognitive load, which mainly communicate or persuade, and which recurring UI primitives are strong enough to reuse?

## Reviewed artifacts

### A. `formikat-os/index.html`
**Primary job:** understand a large system of relationships.

Useful mechanisms:
- spatial zones for conceptual layers
- nodes + edges for relationships
- zoom / pan for scale
- filters / impact mode
- selected-node detail and relations

**Outcome:** STRONG UNDERSTANDING SURFACE.

Why: the interface maps a graph-shaped problem to a graph-shaped representation. It supports inspection, not only presentation.

Risk: visual topology can imply architectural truth. The page must remain explicitly non-canonical unless backed by canonical state.

### B. `formikat-funding-opportunity-radar.html`
**Primary job:** inspect heterogeneous funding/opportunity evidence.

Useful mechanisms:
- KPI overview
- evidence/status colors
- source registry and statement registry
- current vs historical distinctions
- tables + drill-down overlays
- timelines, money-flow/Sankey-style views
- matrices, filters and workspaces

**Outcome:** STRONG BUT OVERLOADED UNDERSTANDING SURFACE.

Why: it preserves multiple dimensions that prose handles badly: source, amount, time, status, project, relationship, uncertainty.

Risk: one surface accumulated many analytical modes. The UI can become a second complex system. Progressive disclosure and task-specific views are preferable to exposing every dimension at once.

### C. `formikat-opportunity-radar-v1.html`
**Primary job:** turn opportunity research into human next actions.

Useful mechanisms:
- “Was tun — heute”
- separate cases / accounts / tenders / outcomes
- Fit and Readiness separated
- UNKNOWN kept visible
- next action + trigger
- operational lanes

**Outcome:** VERY STRONG OPERATIONAL UNDERSTANDING SURFACE.

Why: it compresses a research corpus into a task-oriented interface while retaining uncertainty.

Risk: prioritization and scoring can look authoritative. Derived values need visible basis/provenance and must not silently become decisions.

### D. `formikat-astra-pitch.html`
**Primary job:** explain and communicate a system vision.

Useful mechanisms:
- narrative sections
- contrast cards
- horizontal rails
- source/state interactions
- visual examples and responsive presentation

**Outcome:** STRONG EXPLAINER / PRESENTATION SURFACE, weaker as evidence inspection.

Why: it makes an abstract system understandable to an audience.

Risk: persuasive visual design can collapse the distinction between implemented capability, target vision and hypothesis. This risk is already recognized by the Playground README.

### E. `demo-formikat-spatial-process.html`
### F. `demo-formikat-reality-states.html`
**Primary job:** make process/state transformation perceptible.

Useful mechanisms:
- one persistent object / scene
- state slider or timeline
- direct manipulation / orbit
- progressive visual transformation

**Outcome:** STRONG EXPERIENTIAL EXPLAINERS.

Why: the user perceives change directly rather than reconstructing it from prose.

Risk: generated geometry is illustrative unless connected to verified source geometry. Experiential clarity must not be mistaken for factual fidelity.

## Cross-case findings

### Finding 1 — Match representation to problem topology

The strongest surfaces do not merely decorate text. They choose a representation that mirrors the structure of the problem:

- graph problem → graph
- temporal problem → timeline
- state transition → slider / morph
- comparison problem → matrix
- money movement → flow
- evidence problem → provenance-aware drill-down
- action problem → queue / case workspace

### Finding 2 — Interaction is valuable when it removes mental bookkeeping

Useful interaction lets the human:
- filter
- compare
- reveal detail
- move through time/state
- follow a relationship
- inspect provenance
- switch perspective

Interaction without one of these functions is mostly presentation.

### Finding 3 — Operational surfaces need stronger epistemic boundaries

The closer a surface gets to “what should I do now?”, the more important these become:
- SOURCE / EVIDENCE
- OBSERVED / DERIVED
- KNOWN / UNKNOWN
- CURRENT / HISTORICAL
- CANDIDATE / REVIEWED / DECIDED
- HUMAN DECISION REQUIRED

### Finding 4 — Progressive disclosure beats one giant dashboard

Funding Intelligence demonstrates both the power and the failure mode of generative interfaces: cheap code makes it easy to keep adding views.

A universal surface generator should therefore prefer:
1. one clear default question,
2. one primary representation,
3. secondary detail on demand,
4. provenance one click away,
5. advanced modes only when they serve a distinct human task.

### Finding 5 — Presentation surfaces and inspection surfaces are different products

Two useful classes emerge:

**Explainer Surface**
- purpose: comprehension / communication
- narrative, diagrams, animation, simulation
- optimized for a guided mental model

**Inspection / Operational Surface**
- purpose: verify / compare / act
- filters, provenance, tables, state, next actions
- optimized for interrogation and review

A generated page may combine both, but it should know which is primary.

## Outcome

The candidate **Understanding Surface Pattern** survives this review.

Refined formulation:

> When linear prose forces the human to maintain too many relationships, states, comparisons or evidence dimensions mentally, generate a representation whose structure matches the problem and lets the human inspect complexity directly.

This remains a REVIEW / OUTCOME. It is not an architecture decision and does not modify FORMIKAT OS.

## Reusable primitives observed

- graph / node-edge map
- timeline
- state slider / morph
- comparison matrix
- evidence/provenance drawer
- status chips
- filters
- detail drill-down
- KPI summary
- flow / Sankey
- case workspace
- next-action queue
- UNKNOWN / uncertainty state
- source registry
- responsive mobile reduction
- guided explainer sections

## Recommendation for the next stage

Develop a reusable **Understanding Surface Generator Prompt** for Playground experiments.

It should choose the surface type from the content rather than always producing a dashboard, preserve epistemic boundaries, write only to an explicitly supplied Playground path, and verify the GitHub write by reading the result back.
