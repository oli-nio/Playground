# Understanding Surfaces — Playground Evidence Note

**Status:** Evidence synthesis + Candidate proposal  
**Repository role:** Playground / presentation / experiment — non-canonical  
**Date:** 2026-10-03

## Question

When did FORMIKAT already move from chat/text into web interfaces because the subject became too complex to understand or operate comfortably as prose?

This note compares existing Playground artifacts. It does **not** change FORMIKAT OS architecture, rules, authority, or baseline.

## Evidence reviewed

### 1. FORMIKAT OS visual system map
Source: `formikat-os/index.html`

The prototype represents the system as a spatial network with zones, nodes, edges, zoom/pan, filters and state. The interface externalizes relationships that would be difficult to retain as a linear explanation.

**Complexity trigger:** many interacting components and dependencies.  
**UI response:** graph / spatial map.  
**Human task improved:** orienting, tracing relationships, seeing system structure.

### 2. Funding Intelligence
Source: `formikat-funding-opportunity-radar.html`

The prototype combines funding programs, budgets, projects, evidence, provenance, timelines, status, matching, money-flow views, matrices, filters and drill-down workspaces. It explicitly preserves distinctions such as current vs historical amounts and evidence/source relationships.

**Complexity trigger:** heterogeneous evidence + money + time + provenance + uncertainty.  
**UI response:** dashboard with coordinated views, tables, flow visualizations, filters and detail overlays.  
**Human task improved:** comparing evidence, following money, inspecting provenance, finding gaps and actionable project context.

### 3. Opportunity Radar V1
Source: `formikat-opportunity-radar-v1.html`

The later prototype narrows the opportunity system into operational views: “Was tun — heute”, cases, accounts, direct opportunities, tenders, FORMIKAT matching and outcomes. It separates Fit from Readiness and keeps UNKNOWN explicit.

**Complexity trigger:** research became operationally difficult to convert into next actions.  
**UI response:** task-oriented operational surface.  
**Human task improved:** deciding what to inspect or do next without rereading the whole research corpus.

### 4. Playground repository role
Source: `README.md`

Playground is explicitly defined as a **PRESENTATION / DEMO / EXPERIMENT — NON-CANONICAL** surface. A demo does not prove implementation and must not silently redefine FORMIKAT OS.

This separation is important for the pattern below: an Understanding Surface can be generated freely without becoming decision authority.

## Cross-case pattern

The three examples show a recurring transformation:

```
linear information
      ↓
too many relationships / states / evidence dimensions
      ↓
representation problem
      ↓
purpose-built interactive surface
      ↓
faster human orientation / inspection / decision
```

The surface type changes with the dominant complexity:

| Dominant complexity | Useful surface |
|---|---|
| relationships / architecture | graph, map |
| evidence / provenance | evidence browser, linked detail view |
| money / flows | Sankey, flow map, tables |
| time / state change | timeline |
| comparison | matrix |
| operational next steps | queue / dashboard / case workspace |
| spatial or physical process | diagram / simulation / interactive model |

## Connection to the supplied Karpathy statement

The supplied Karpathy statement proposes moving beyond prose toward diagrams, interactive HTML and bespoke explainer artifacts as model-generated code becomes cheap.

The Playground evidence suggests FORMIKAT has already independently used this direction: web artifacts appear when prose becomes a poor interface to complexity.

The useful abstraction is therefore not “build more websites”. It is:

> **Choose or generate the representation that minimizes the human effort required to understand the current evidence, state, relationships and next actions.**

## Candidate: Understanding Surface Pattern

**Candidate only — not an accepted FORMIKAT rule.**

A system may produce a disposable or persistent **Understanding Surface** when linear text is no longer the clearest representation of the underlying state.

Conceptual pipeline:

```
Evidence / State
      ↓
Structured intermediate representation
      ↓
Presentation compiler
      ↓
Understanding Surface
      ↓
Human review / action
```

Possible surfaces include prose, controlled language, diagrams, graphs, timelines, matrices, dashboards, interactive HTML, simulations and explainer media.

### Important boundary

```
Understanding Surface ≠ Evidence
Understanding Surface ≠ Decision
Understanding Surface ≠ Canonical system state
```

The surface is a view over underlying material. It should preserve provenance and uncertainty and must not gain authority merely because it is visually persuasive.

## Candidate trigger questions

Before generating a larger text report, the system could ask internally:

1. Is the user trying to understand relationships rather than individual facts?
2. Are there multiple evidence dimensions that must be compared simultaneously?
3. Does time, money, spatial structure or state transition matter?
4. Would the user repeatedly need to navigate back and forth through prose?
5. Is there an actionable workflow that benefits from persistent state or filtering?
6. Can the visual representation preserve provenance and UNKNOWN states?

If several answers are yes, a non-linear surface may be more useful than another long answer.

## Next review question

The candidate should be tested against more Playground artifacts before any architectural decision:

- Which surfaces genuinely reduced cognitive load?
- Which were merely attractive presentations?
- Which preserved evidence/provenance correctly?
- Which accidentally made speculative content look authoritative?
- Which UI primitives recur often enough to become reusable presentation components?

Only after that review should the pattern be considered for a FORMIKAT OS decision.
