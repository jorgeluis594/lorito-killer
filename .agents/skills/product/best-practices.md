# Product best practices applicable to Lorito Killer

Synthesis of external frameworks (October 2026) filtered by what complements the Lorito Killer product guide. The guide wins when there is a conflict, and `PRODUCT.md` wins over both on users, purpose and principles; these practices cover the user's problem, the usage situation, the states of each screen, the texts and the metrics.

## Principles the frameworks share

1. Start from the problem, with a concrete story of why the status quo fails (Shape Up, Intercom, Torres).
2. Describe the user by situation and by the job they want done, not by demographics (Jobs To Be Done, Intercom).
3. Measure by customer behavior, not by features shipped (Cagan, Torres, Wodtke).
4. Declare what is not done: non-goals, no-gos, "not doing" (Google design docs, Square, Shape Up, Atlassian).
5. Describe the solution at the flow level, not the pixel level (Shape Up: breadboards and fat marker sketches).
6. Fix a time appetite and cut scope to fit, instead of estimating (Shape Up, Linear).
7. Test the biggest risk in the cheapest way before building; the four risks are value, usability, feasibility and viability (Cagan, Patton).
8. Name the rabbit holes with the decision already made (Shape Up).
9. Record closed decisions with their reason, so the debate is not repeated (Google design docs). In Lorito Killer only what is current is recorded, without a history of alternatives.
10. Ship small and often; shipping is the start of learning (Intercom, Linear).

## Usability checklist per screen or flow

Apply when writing the «Pantallas» section of the document, together with `DESIGN.md`.

1. There is a single main action, visible without scrolling and, on a phone or tablet, within thumb reach.
2. Within five seconds it is clear where you are and what you can do, even glancing at the screen in the middle of service.
3. The states are defined: nothing yet, loading, no results for these filters, load error, too many items, correct, done.
4. The empty state says what will appear here and offers the button to create it.
5. Every error sits next to its field, in plain language, with the remedy, and keeps what was typed.
6. Every destructive action has undo or, if irreversible, a confirmation whose buttons name the result («Anular pedido» / «Conservar pedido»), never «Sí» / «No».
7. Every action gives feedback within 400 ms or shows progress.
8. Typing is minimized: defaults, search, recent items, preloading what is already known (the table, the open shift, the usual printer).
9. On a slow or dropped connection the state is kept and can be resumed; a network failure is never presented as an empty list or as success.
10. Buttons say what will happen («Enviar a cocina», not «Enviar»). Half the words are removed.
11. The conventions staff already know from the floor are kept: table numbers, comanda, precuenta, «para llevar», the way the kitchen calls out orders.
12. Fewer than seven visible options per decision, grouped.
13. Sufficient contrast, a label on every field, touch targets of at least 44 px, never relying on color alone; readable at arm's length on the kitchen display.
14. Define what a business with 500 orders in a day sees and what one with a single order sees: search, filter, pagination.
15. Define what happens if the user abandons midway and comes back, and if another device changed the same table meanwhile.
16. Flexible inputs are accepted (phone with or without +51, amounts with comma or period, DNI or RUC) and strict outputs are emitted.
17. Each role sees only what its work needs (`PRODUCT.md`, principle 3).

## Questions the agent asks itself before writing

These are questions to answer with the context read, not to ask the founder. If one cannot be answered from the context and it changes scope, money, data or priorities, it moves to the document's questions block.

Problem
- When was the last time this was a real problem for an owner, cashier, waiter or the kitchen? What exactly happened?
- How do they solve it today? Paper, shouting to the kitchen, a notebook, Excel, memory, another app?
- What happens if it is not built?
- Is there more than one way to solve it? If not, a solution is being described, not a problem.

User
- In what situation does it happen? In the middle of service, at the register with a queue, at closing time, at home reviewing the day?
- Which device and in what conditions? Phone in one hand, fixed display, shared terminal, noise, wet or occupied hands.
- What makes them anxious about changing their current way? What habit holds them back?
- Who pays and who uses? The owner decides; staff operate.

Scope
- What is the walking skeleton: the minimum end to end that is already useful?
- What is left out on purpose and what unblocks it?
- What belongs to another branch or task?

Solution
- What are the places, controls and connections of the flow?
- What alternatives were considered and why not? (Used to decide; only the decision stays in the document.)
- Which part of the flow is the most uncertain and what is decided now about it at the product level?

Experience
- What does the user see when there is nothing, when there is too much and when it fails?
- What exactly does the main button and the error message say?
- What happens without signal, if the browser is closed mid-order or if another device edits the same table?
- Which floor or kitchen convention is kept or broken?

Risks
- What is the riskiest assumption in value, usability, feasibility and viability?
- How is it tested in the cheapest way before building?
- Which external dependency (printer, Print Gateway, SUNAT/electronic invoicing provider, realtime connection, payment wallet) can block?

Success
- Which owner or staff behavior changes if it works and how would it show in the data?
- What must not get worse (time to send a comanda, payment errors, cash shift differences, report accuracy)?

## Common mistakes when defining product

1. Presenting a solution without a problem, or a problem that is a solution in disguise.
2. Omitting what is not done: silence is read as inclusion.
3. Output metrics (features shipped) instead of outcome, or none.
4. Vague requirements ("fast", "intuitive", "scalable") without a number or a test.
5. Over-specifying the interface and the technology, leaving no room for implementation.
6. Describing only the happy path: no empty states, errors, too much data or offline.
7. Defining the user by demographics and not by situation.
8. Judging feasibility without looking at what the application already does.
9. Not recording closed decisions; the debate repeats.
10. A long document without a summary that can be read in one sitting.

## How a mature product team works, reduced to a founder with agents

What no source delegates to the agent: talking to customers, choosing the problem, placing bets, saying no, reviewing what was deployed. What the agent absorbs: interview synthesis, prototypes, building, measurement and document maintenance.

Suggested minimal cycle:

| Phase | Output | Cadence | Who |
|---|---|---|---|
| Quarter outcome | One objective and three key results; one North Star metric with three inputs | Quarterly; confidence reviewed every week | Founder decides; agent prepares data |
| Discover | One-page interview sheet; opportunity tree | One interview or service observation per week with an active or lost business | Founder interviews; agent transcribes and extracts opportunities |
| Define and bet | Product document with scope, appetite, no-gos, success criterion and kill criterion with a date | At the start of each two-week cycle | Agent writes with this skill; founder answers the questions block |
| Test before building | Prototype or concierge tested with three to five businesses | First week of the cycle | Agent builds; founder tests |
| Build a slice | Complete vertical increment, behind a feature flag when it should be visible only to whoever tests it | Two-week cycle | Agent builds; founder reviews during a real service |
| Launch progressively | Beta with a few businesses, then everyone; changelog | During the cycle | Founder talks to the beta businesses |
| Measure and learn | Review at two and six weeks; scale, iterate or kill | At the close of the cycle | Agent prepares the report; founder decides |

Antipatterns to avoid: measuring by deliveries, research as a one-off project, asking "would you use it?", testing ideas by building production software, endless backlog, fine wireframes too early, objectives set and forgotten, long specs nobody reads, the single big launch.

## Sources

- Shape Up (Basecamp): https://basecamp.com/shapeup
- SVPG, four big risks: https://svpg.com/four-big-risks/ ; opportunity assessment: https://www.svpg.com/assessing-product-opportunities/
- Teresa Torres, opportunity solution tree: https://www.producttalk.org/2021/08/opportunity-solution-tree/
- Intercom, job stories: https://www.intercom.com/blog/using-job-stories-design-features-ui-ux/ ; principles: https://www.intercom.com/blog/intercom-product-principles/
- Google design docs: https://www.industrialempathy.com/posts/design-docs-at-google/
- Linear Method: https://linear.app/method
- Lenny Rachitsky, PRD templates: https://www.lennysnewsletter.com/p/my-favorite-templates-issue-37
- Example Mapping: https://cucumber.io/blog/bdd/example-mapping-introduction/
- Nielsen Norman Group: heuristics https://www.nngroup.com/articles/ten-usability-heuristics/ ; empty states https://www.nngroup.com/articles/empty-state-interface-design/ ; error messages https://www.nngroup.com/articles/error-message-guidelines/ ; confirmations https://www.nngroup.com/articles/confirmation-dialog/ ; mobile https://www.nngroup.com/articles/mobile-ux/
- Nine States of Design: https://css-tricks.com/?p=345062
- Laws of UX: https://lawsofux.com/
- WCAG: https://www.w3.org/WAI/fundamentals/accessibility-principles/
- The Mom Test (summary): https://mtlynch.io/book-reports/the-mom-test/
- Paul Graham, Do Things That Don't Scale: https://www.paulgraham.com/ds.html
- Thoughtworks on spec-driven development: https://www.thoughtworks.com/en-us/radar/techniques/spec-driven-development
