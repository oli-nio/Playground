# FORMIKAT Opportunity Radar — External Review Request for Grok

**Date:** 2026-09-26  
**Review type:** adversarial product / intelligence-system review  
**Exchange channel:** GitHub  
**Primary prototype:** `oli-nio/Playground/formikat-funding-opportunity-radar.html`

## 1. Why this review exists

FORMIKAT is developing an Opportunity Radar that should become an operational intelligence tool for a small design / exhibition / product / media company — not merely a funding database or an attractive dashboard.

The prototype has grown substantially. Before adding more architecture, we want an external critical review of whether the current direction can actually create business advantage for FORMIKAT.

Please treat the current website as a **prototype to challenge**, not as a design to defend.

## 2. North-star goal

The system should help FORMIKAT answer, earlier and with less manual work:

1. **DIRECT FUNDING** — Where can FORMIKAT itself obtain funding for investments, AI transformation / FORMIKAT OS, qualification, R&D, hardware, prototyping or related company development?
2. **DOWNSTREAM OPPORTUNITIES** — Which externally funded public/cultural/tourism/science projects are likely to create future demand for FORMIKAT services?
3. **TENDER TRANSITION** — When does a funded project move toward planning, procurement and an actual tender?
4. **ACTION** — What should FORMIKAT do now: prepare documents, research a project owner, contact someone, watch a milestone, partner, or hand a case to the Tender Loop?
5. **LEARNING** — Which early signals actually resulted in contacts, tenders, GO decisions, proposals, wins, losses or no opportunity?

The desired loop is:

```
discover
→ understand
→ match to FORMIKAT
→ prioritize
→ act
→ observe outcome
→ learn
```

A longer public-money lineage may exist underneath:

```
POLICY
→ BUDGET
→ FUND / PROGRAM
→ GRANT / FUNDING AWARD
→ PROJECT
→ PLANNING
→ PROCUREMENT
→ TENDER
→ FORMIKAT GO / NO-GO
→ PROPOSAL
→ CONTRACT
→ OUTCOME
```

The product is successful only if this chain produces **useful lead time, funding, tenders, revenue opportunities or materially reduced research effort**.

## 3. What exists in the prototype

The current prototype includes, among other things:

- compact top-level navigation around Today, Funding, Projects, Money Flow, Tender, FORMIKAT and Outcomes;
- direct-funding candidates and action queue;
- public-money flow / Sankey-style view;
- Parallel Sets pattern view;
- distinction between budget, allocation, program, award, project, procurement and contract states;
- funded-project / downstream-opportunity registry;
- stable opportunity IDs;
- organization entities;
- evidence / provenance statements and historical values;
- watchlist;
- transparent FORMIKAT-fit scoring;
- capability and reference profile;
- Tender Gap / Money Ahead concept;
- persistent local outcome states;
- daily brief / action-oriented dashboard.

Some of this is intentionally prototype-level and manually populated.

## 4. Important design principle

Do **not** optimize for maximal financial-forensics sophistication for its own sake.

We recently recognized a risk: the project could become a fascinating public-money research system without becoming materially more useful to FORMIKAT.

Evidence and provenance matter because decisions must be trustworthy, but they are infrastructure. The user-facing goal is:

> **What should FORMIKAT know or do now?**

We currently believe the largest missing operational capability may be **Project Intelligence**:

For a high-fit funded project, automatically determine where possible:

- project owner / beneficiary;
- operator;
- responsible people / contacts;
- architect / general planner;
- project manager;
- current project phase;
- construction / planning milestones;
- expected opening;
- contracting authority;
- already awarded contracts;
- procurement notices;
- still-unassigned FORMIKAT-relevant scopes;
- next observable trigger.

But please challenge this assumption.

## 5. FORMIKAT relevance

FORMIKAT's relevant service space includes, among other things:

- exhibition design / exhibition architecture;
- scenography and communication in space;
- interior / spatial design;
- product development;
- custom builds / exhibition construction;
- implementation planning and coordination;
- interactive exhibits;
- media technology;
- graphics / communication;
- models, mock-ups, prototyping and digital fabrication;
- visitor / educational / interpretive experiences.

Typical downstream projects of interest therefore include museums, exhibitions, visitor centres, science communication, industrial heritage, cultural institutions, tourism / experience centres and related public projects.

## 6. What we want you to review

Please review the live repository file, not this request alone:

`oli-nio/Playground/formikat-funding-opportunity-radar.html`

### A. Product usefulness

- Is this becoming a tool FORMIKAT would actually use every day/week?
- Which current areas create real business leverage?
- Which parts are clever but low-value?
- Where are we overengineering?
- What should be removed, hidden or frozen?

### B. Missing capabilities

Identify the missing capabilities that would most increase:

- discovery lead time;
- opportunity quality;
- actionable intelligence;
- conversion into real tenders / business;
- research-time savings;
- learning from outcomes.

Do not simply produce a generic feature wishlist. Tie every recommendation to a concrete FORMIKAT use case.

### C. Project Intelligence pilot

Assess whether the next major pilot should indeed be a deep scan of ~10 real funded projects.

Candidate cases already in the prototype include examples such as:

- Süßer See visitor / information centre;
- Königspfalz Helfta;
- Museum Alte Münze Stolberg;
- ErlebnisZentrum Bergbau Röhrigschacht;
- Museum Brikettfabrik Herrmannschacht;
- NESt Kelbra;
- Wissenschaftskubus für (H)ALLE;
- Heinrich-Schütz-Haus Weißenfels;
- Königspfalz Tilleda;
- Schloss Mosigkau.

Question: **Can systematic project intelligence on these cases demonstrate whether Funding → Project → Tender provides useful advance warning?**

Propose a rigorous pilot method and success criteria.

### D. Automation architecture

What should eventually run automatically or semi-automatically?

Consider:

- source registry;
- scheduled discovery;
- change detection;
- entity resolution;
- project enrichment;
- tender matching;
- contact / organization intelligence;
- scoring;
- alerts;
- action generation;
- outcome feedback.

Separate what should be automated **now**, **later**, and **not at all**.

### E. Data / source strategy

What public data sources or source classes would provide the strongest early signals?

We are interested not only in published tenders, but earlier evidence such as:

- political decisions;
- budgets;
- funding calls;
- grant awards;
- project announcements;
- council decisions;
- planning approvals;
- architecture competitions;
- project websites;
- job postings;
- planning appointments;
- procurement forecasts / prior information notices;
- contract awards.

Assess which of these are likely to provide useful lead time for FORMIKAT.

### F. Integration with Tender Loop

The Funding / Project Radar and Tender Loop should not become two isolated databases.

Recommend the minimum canonical object / ID / lifecycle needed so that one real-world project can move through:

`funding signal → project → procurement → tender → decision → outcome`

without duplication or loss of evidence.

### G. UX / information architecture

Review whether the newly compacted seven-area navigation is appropriate.

The interface should optimize for:

1. what changed;
2. what matters;
3. what to do next;
4. why the system believes that;
5. deeper evidence only when requested.

Please identify remaining duplicated or unnecessary views.

## 7. Requested adversarial questions

Please explicitly challenge these assumptions:

- Is public funding actually a sufficiently strong precursor to FORMIKAT-relevant procurement?
- Are we looking too far upstream?
- Would tracking planners, museums, municipalities and project owners directly create more value than tracing money?
- Is the Money Flow primarily useful as discovery intelligence, explanation, or merely visualization?
- Is our opportunity score meaningful before we have outcome data?
- Which signals are likely to generate false positives?
- What would make this system fail operationally even if the data model is excellent?
- What is the smallest version that could prove or falsify the core hypothesis?

## 8. Desired output

Please produce a concise but deep review with:

1. **Executive assessment**
2. **What is genuinely strong**
3. **What is currently overbuilt / low-value**
4. **Critical missing capabilities**
5. **Recommended 10-project pilot**
6. **Success / failure metrics**
7. **Automation roadmap: NOW / NEXT / LATER**
8. **Recommended source strategy**
9. **UX / navigation critique**
10. **Top 5 next moves**
11. **Kill criteria / evidence that the concept is not working**
12. **Any alternative architecture you believe would outperform the current direction**

Be adversarial. We prefer discovering a flawed assumption now rather than polishing it for months.

## 9. Evidence / decision boundary

Your review is **external review evidence**, not an automatic decision.

Please distinguish:

- observed fact from the prototype;
- inference;
- recommendation;
- unresolved question.

Do not silently redefine the FORMIKAT baseline.

## 10. Write-back

Please write your review back to GitHub as:

`grok-review/FORMIKAT_OPPORTUNITY_RADAR_GROK_REVIEW_2026-09-26.md`

in repository:

`oli-nio/Playground`

If that path cannot be written, stop and report the problem rather than choosing another location.

After writing, read the file back and report the path, commit SHA and successful verification.
