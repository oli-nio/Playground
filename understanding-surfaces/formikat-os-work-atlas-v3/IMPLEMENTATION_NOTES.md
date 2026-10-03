# FORMIKAT Work Atlas V3 — Implementation Notes

Status: **Design prototype / ready for user review**, not a FORMIKAT-OS capability promotion. The implementation is confined to the research prototype context. It performs no source retrieval, API invocation, capture, persistence, authorization, delivery or business action at runtime.

## Run

Open `index.html` directly in a current browser. All styles, scripts and the selected source snapshot are embedded; no build, backend, external font, CDN or network access is needed for the experience. Source links intentionally lead to commit-pinned GitHub documents.

For a local HTTP preview: `npm run dev -- --host 0.0.0.0 --port 4173 --strictPort`. The small native Node server is a development convenience, not part of FORMIKAT OS. No npm dependencies are needed. `index.html` is the standalone deliverable.

## Design authority and translation

Primary specification: `ASTRA_V3_DESIGN_REVIEW.md`, commit `4be9ab9750c625c6ab1b0da19b321082a104e71b`, blob `c10c7092c292c7ab321e0fb3510c7231336b34ea`. The seven files in the V3 research directory were read completely through the connected GitHub access. The live directory inventory contained those seven files and no previous prototype, so no existing prototype was overwritten.

The selected direction remains **Begehbares Arbeitsgedächtnis / Work Atlas**. Projects are stable places, maintained traces explain re-entry, and intelligence is a detachable analysis instrument. The prototype does not reproduce the V1 graph or V2 universal machine.

The supplied reference is a 3.666667-second, 512 × 650 px recording at 30 fps. Its entire available time span was examined chronologically in contact frames, with original-resolution endpoints. Actual observations: fixed composition, restrained local signals, changing counters/logs, stable outlines. No camera flight, zoom, drill-down or semantic transition is visible in this clip. These V3 interactions come from Astra's review, not invented reference observations. This upload's SHA-256 is `c79c39130821561334604b05feb66a69ebf4f073264852a5e393524cadec2f00`; it differs from the file hash in Astra's review, and byte identity is not claimed.

## Technology and scene architecture

SVG supplies the exact spatial information graphics; HTML supplies navigation, captions and frontal evidence inspection. Native JavaScript coordinates the view, six layout functions and one requestAnimationFrame clock. A JS camera tween can pause in place rather than snapping to a CSS transition endpoint. CSS handles typography, hierarchy, light, contours, progressive local disclosure and responsive arrangement. No force layout, WebGL or 3D asset is needed.

`index.html` keeps the following responsibilities logically separated:

- embedded `sourcepack`: versioned source identity and locally readable source texts;
- `C` / `CLAIMS`: stable entity/claim IDs, source references and separate evidence, time, readiness, authority and runtime fields;
- `REL`: typed, source-linked relationships; hard roadmap prerequisites only where the canonical roadmap states them;
- `purposeScene`, `systemScene`, `loopsScene`, `flowsScene`, `realityScene`, `roadmapScene`: six different compositions of shared identities;
- `detailScene`: semantic level compositions with retained subject identity;
- `state`: navigation, camera, selection, model demo and story state;
- `STORY`, `renderMotion`, `cameraStep`: explanatory time, motion and camera;
- `inspect`, `sourceHTML`, `textView`: readable evidence and equivalent text navigation.

Spatial position carries the declared relation in the selected mode. It is not a maturity score, calendar time, geographic location or unproven dependency. Distance is not a capability rating. Plane depth exposes information kind, not increasing truth.

## Interaction model

Three initial paths: 80-second explanation, project exploration and direct Reality inspection. A click/tap selects an identity and opens its evidence strip. `Vertiefen`/Enter reveals a different question and representation. Escape/back/breadcrumb returns toward the overview. Browser back and commit-free URL hash links restore mode, semantic level, selected stable identity and camera framing.

Pan uses pointer drag with bounds. Pinch and explicit ± controls change optical scale. Scroll is reserved for reading; it does not move the camera. Optical zoom and semantic drill-down are intentionally separate, so scaling alone never pretends to reveal a new evidence layer.

Purpose chooses one effect in the same stable world. Loops chooses Improvement, Experience Capture, Capability Compound or Opportunity. Flows follows eight individually selectable stations of the T4 case's non-sensitive report. Reality provides evidence/readiness filters, readable scopes and a status grammar. Roadmap exposes A–F and the canonical conditional/dormant boundaries.

The Intelligence Swap demo separates three states: A, empty socket, B with adapter/contract/evaluation open. The optional hypothetical compatibility branch changes only the instrument connection. It does **not** open the Human Authority boundary. A separately labeled hypothetical human-decision branch shows one scoped passage. Neither is an effective approval.

## Semantic zoom

| Level | Representation |
|---|---|
| 0 — Work World | Project place, retained traces, conditional opportunity, dormant field, continuous Human Authority boundary |
| 1 — Effects | Continuity, Leverage, Compound and Anticipate as selected effects of the same work world |
| 2 — Return / Capabilities | Capture, Review/Outcome and Library/Seed objects; candidate classification remains visible |
| 3 — Mechanisms | Context + Harness + Model; Runner and Human Authority stay separate |
| 4 — Realization | Known host/version/case/component identities, or an explicit missing-evidence endpoint |
| 5 — Evidence | Frontal claim, separate status dimensions, exact source anchor, date, scope, limitations and receipt hashes where actually reported |

Project exploration can traverse all six levels. Other objects may enter at the relevant semantic level rather than acquiring six artificial parents. The evidence drawer is available early; more runtime detail is disclosed at L4/L5. There are no guessed hosts or receipts. A missing L4 realization is a legitimate ending.

## Motion grammar

| Motion | Implemented meaning |
|---|---|
| Idle / ambient | Stable world; no invented live-system traffic or health pulse |
| Trace | A selected observation leaves a separately labeled illustrative source-linked mark |
| Retrieval | Existing trace is highlighted and re-bound to the unchanged project place |
| Context formation | Selected references converge in a bounded opening; originals remain |
| Intelligence | Side instrument frames that scope; replacement begins unconnected |
| Deterministic processing | Equal, discrete positions on a straight working path |
| Human boundary | A proposed fragment halts before the threshold, with no automatic release |
| Human decision | Only a separately labeled hypothetical branch opens one passage |
| Persistence | An illustrative outcome remains in the scene; the effect is never a write receipt |
| Reuse | Evidence, review and decision precede a reference to a generic later work place |
| Anticipation | One illustrative source-horizon signal waits for relevance/business review |
| Unknown / blocked | Visible gap or barrier; no token jumps over it |
| Dormant | Remains readable and stationary, including during autoplay |

Camera reframing takes approximately 800 ms. Locally revealed fragments use a brief fade. Pause stops the common explanatory clock and camera tween. Reduced motion removes camera travel and local reveal animation; equivalent static captions and states retain the meaning. The help dialog also offers a manual reduced-motion toggle.

## Story

The optional story follows Astra's actual ten time intervals: 0–7, 7–14, 14–22, 22–30, 30–38, 38–47, 47–55, 55–64, 64–72 and 72–80 seconds. The review describes ten intervals, despite one prose reference to nine stills; this implementation preserves all ten specified intervals.

The story is permanently labeled **Erklärsequenz — kein Live-Betrieb**. Decision, outcome and reuse branches are expressly hypothetical. There is no automatically restarting loop. Pause/resume, restart, scrubbing, direct chapter selection and exit to exploration are available. Exploration pauses a running story; choosing another mode or a specific principle demo exits the autoplay timeline. Story and demo never change claim evidence or source state. Elapsed monotonic time drives the 80-second story independently of camera frame-step limits; explicit pause/resume resets the time origin.

## Source grounding

Canonical snapshot pinned to `oli-nio/Formikat-OS` commit `b345ec754921c12b87e5f3a191e2b7cbc0ae2762`. `current_state.json` is dated **2026-10-02**; live retrieval does not make its runtime observations current telemetry.

Read order: README → GOALS → ROADMAP → R0 matrix → current_state → selected task-specific evidence. The four read-order documents were also checked at the pinned canonical commit; blob identities matched the original live reads.

| File | Blob |
|---|---|
| `docs/FORMIKAT_OS_GOALS_V0_2026-10-02.md` | `1524a2b01ddf3ea58845b9168cceba7341b8426d` |
| `docs/FORMIKAT_OS_ROADMAP_V0_2026-10-02.md` | `c5e9acdd2086ab5f3e951a73acb42b7adcdcdbc6` |
| `docs/FORMIKAT_OS_R0_GOALS_ROADMAP_ALIGNMENT_MATRIX_2026-10-02.md` | `e097da98154929f6dac6cd9f9d2537267b71af87` |
| `state/current_state.json` | `15106666e48f26a5278f4bf4aa309ae4ddda6801` |
| `evidence/runtime/loopold-bounded-mail-drive-case-v1-2026-10-01/README.md` | `50dabce85ff995d4a63cd6808c7555bd61eb98b9` |
| `docs/EXECUTION_CONTEXT_MANIFEST_V0_1_OPERATIONALIZATION_DECISION_2026-09-18.md` | `c1be9a93e2ee92f12c11728b068d6e1366da7b56` |
| `docs/MAIL_INGESTION_RUNTIME_EVIDENCE_V0_CLOSE_2026-09-19.md` | `484121aca0a01bc54903bce7d22ce5172c7670e0` |
| `docs/IMPROVEMENT_LOOP_INSTITUTIONAL_STATE_RECONCILIATION_2026-09-17.md` | `1d3e122db7845fe59beb012833c04c1767670d14` |

Directly canonical-grounded: goals/invariants, A–F planning classifications, A's pending source scope, C's candidate list, D's real-opportunity trigger, E's reviewed-source bounds, F's prerequisites, the frozen reported Corpus classification, Capture Freeze/FAIL_BLIND, historical C10 REJECT, trigger UNKNOWN, the scoped Harness record, and the completed exact Mail+Drive T4 case and its delivery boundary.

The Harness controller's canonical-source/distribution existence is shown from its specific operationalization Decision. The long historical `state_note` contains an earlier implementation-stage statement that source location was not established; the later specific operationalization Decision and structured `harness_contract_diff_1` record explicitly establish that location. The prototype does not pretend that an earlier stage's boundary still describes the later Decision.

The Runner trajectory is represented conservatively as a **canonical repository state claim** with its exact case/job anchor. Its original trajectory bundle was not separately opened in this run, and no fresh Runner test is claimed. The LOOPOLD report is a repository artifact describing bounded local execution and hash identities; the original content-bearing packet/analysis/receipts remain local. The prototype identifies the report's scope rather than upgrading local bytes into a Git-hosted executable replay.

## Exemplary / illustrative material

The plane outlines, working-area shapes, spatial trace arrangement, time-shift animation, model A/B labels, hypothetical scoped passage, generic later project, reuse illustration and source-horizon signal are design examples. They are neither real project artifacts nor newly promoted claims. Layout snippets labeled Entwurfsarbeit / Quellen / Fragen show information kinds only.

Capability Seed objects remain candidates: electronics/base-board platform, audiostation principle and Viewer/GLB workflow. No fabricated successful second use, designation, version or test is introduced. The Atlas does not claim the Project Corpus is a proven live company memory.

## Accessibility / responsive behavior

All core interactions use native buttons or focusable SVG groups with role and readable names. Focus outlines, keyboard drill-down/back/zoom/pan, a help-dialog focus trap, state announcements, a searchable equivalent text view and frontal source text are provided. No essential action depends on hover or dragging.

Small viewports use a close frontal project crop and horizontally accessible place selectors, not a miniature desktop atlas. Details occupy a full readable overlay; modes, story chapters and explicit zoom remain available. Reduced-motion behavior can be selected without changing operating-system settings.

## Known prototype boundaries / deliberately absent

- Selected, bounded source snapshot; not all FORMIKAT repositories, projects or current company state.
- No live fetch, telemetry, model invocation, source scanning, cross-chat reading or capture channel.
- No actual business/creative decision, effective Approve, send, mutation or baseline change.
- No executable reproduction of private T4 packets or Windows runtime components.
- No universal model compatibility, universal schema or model router.
- No invented roadmapping dates, hard A→B→C dependency, maturity scores or success metrics.
- URL navigation encodes view state only. It does not store project material or user decisions.
- Local explanatory trace marks are scene state; they are not persistent institutional evidence.
- No full screen-reader audit across assistive technologies, native-device performance guarantee or completed five-second user test. The five-second interpretation remains a design hypothesis until tested with a new viewer.

## Verification and handoff

Browser results, tested viewports, remaining limitations and the explicit nine self-review questions are documented in `VERIFICATION.md`. The preview is kept open for inspection. Repository delivery is verified by read-back; committing this prototype does not alter `oli-nio/Formikat-OS`.
