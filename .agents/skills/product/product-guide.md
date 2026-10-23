# Guide for defining product in Lorito Killer

This guide describes how a feature is defined at the product level: what problem it solves, what it does, what each role sees, what rules govern it, what happens when something fails and what is left out. It does not describe how it is built or what the product looks like today. The technical side is defined later, with the [Architecture](../architecture/SKILL.md) skill. The current state of the product (what exists, what was decided, which values were fixed, which constraints are not up for discussion) comes from `PRODUCT.md`, `DESIGN.md`, the repository memory and the current documents in `docs/`, never from this guide.

It is used by walking through the steps in order. Each step has rules with an example and, when it helps, what is not done. The examples are illustrative: they show the shape of the decision in a restaurant or bar during service. They do not describe how Lorito Killer works nor are they decisions already made.

Stable context: Lorito Killer is a multi-tenant web POS for restaurants and bars in Peru, isolated per company. The owner wants a trustworthy view of the business; administrators, cashiers, waiters, kitchen and bar staff each complete the tasks of their role, often under time pressure, with noise, occupied hands and shared or fixed devices. Everything else is verified.

---

## Step 1. Understand the problem and who it happens to

**1.1 Start from a concrete situation, not a category.**
Before proposing anything, write what the role does today without the feature, when it happens and what goes wrong. If a concrete story cannot be told, the problem is not understood yet.
- Example: "On a Friday at 9 pm the waiter takes the order for table 6 on paper, walks it to the kitchen and the bar separately, and the pisco sour never arrives because the bar's slip fell behind the counter. At closing, the cashier charges table 6 without the drink and nobody knows whether it was served."
- Do not: "Restaurants need to manage their orders."

**1.2 The user is defined by the situation they are in, not by who they are.**
For each feature, name each role by what they are doing at that moment.
- Example: "waiter adding a second round to table 4 from the phone while standing at the table", "cook marking a dish ready on the kitchen display with wet hands", "cashier closing the shift with a queue at the register", "owner checking today's sales from home".

**1.3 Identify which part of the problem is already solved by talking.**
Staff talk to each other and to customers on the floor. Before designing a step, ask whether that step already happens in a conversation. If it happens there, the product records the result and does not replace it.
- Example: a customer asks for the dish without onion. The waiter writes a note on the item; the product does not design a negotiation between the waiter and the kitchen about substitutions.

**1.4 The expected outcome is written as a hypothesis.**
What changes in the owner's or staff's behavior if the feature works, and how it would show. Improvements that will not be observed are not promised.
- Example: "If it works, the waiter stops walking comandas to the bar; it would show as rounds sent from the device instead of items added by the cashier at payment time."

---

## Step 2. Bound the first version

**2.1 The first version covers the usual case end to end and nothing more.**
Design what the business does every service, complete. Rare cases are resolved with a clear notice and a manual way out, not with additional mechanisms.
- Example: a first version of printed comandas prints each round at its station's printer. If the printer is offline, the screen notifies and offers **Reimprimir**. No queue rebalancing between printers is designed.
- Do not: design for the scenario the business would not run in practice.

**2.2 Cut by visible dimensions, never by reliability.**
To keep the first version small, limit business types, roles, devices or document types. What goes in goes in complete and reliable.
- Example: payments can start with cash and wallets (Yape, Plin) only. But none of the payments that do go in may be lost or counted twice in the shift.
- Do not: accept more payment methods "with occasional mismatch" to show more scope.

**2.3 Extend what exists before creating something new.**
If there is already a screen, a list, a flow or a concept that covers the case, extend it. A new concept needs a sentence explaining why an existing one does not work; if there is none, it is not created.
- Example: a delivery order does not need a separate kind of sale if orders already have fulfillment types: it can be an order of type «Delivery» in the same list.
- Do not: a new entity with its own screen for something that only changes the state of another.

**2.4 What is solved by talking does not become a flow.**
If a step happens on the floor (agreeing on a discount with a regular, asking the kitchen how long a dish takes, settling who pays which part of the bill), the product does not mediate it. What was agreed is recorded and, when needed, it is stated that the adjustment is resolved outside the app.
- Do not: internal messaging, approval chains or notifications for situations a conversation resolves.

**2.5 Typed data is enough to start.**
Delivery addresses, references and notes are typed by hand. Maps, product-maintained catalogs and pickers are deferred until usage shows they are needed.
- Example: a delivery address with street, district and reference as text, without a map.

**2.6 Each role's daily operation works on the device that role actually uses.**
Lorito Killer is one responsive web application. A feature is defined for the surfaces its roles use: the waiter's phone or tablet, the fixed kitchen or bar display, the cashier's terminal with its printer, the owner's phone or laptop. The behavior and rules are the same on every surface; only the layout adapts.
- Do not: "desktop only" as the first version of something the waiter does at the table.

**2.7 Build in vertical slices.**
The first slice is the simplest complete case: configuration, usage, what each role sees. The next ones add cases. Do not build all the configuration before anyone can use anything.
- Example: kitchen stations are defined first with a single «Cocina» station complete (configure it, route items to it, see and mark them on the display, print the comanda), then a «Barra» station, then per-product routing.

**2.8 Respect the cut between features.**
Each feature is defined in its own task. What belongs to another does not go in, even if it is close, but the design leaves the meeting point clear so the other only adds.
- Example: if split payments is another task, table payment is defined with a single payer and it is stated that split payments will add payers to that same payment screen.

---

## Step 3. Design the flow and the screens

**3.1 The usual path takes the fewest taps.**
Identify the action the role does almost always and make it the main action, with the defaults loaded and what is already known prefilled. Exceptions live in settings or secondary actions, not in a dialog that appears every time.
- Example: when a waiter finishes adding items to a table, the main action is **Enviar a cocina** and routes each item to its station; choosing a station by hand is a secondary action.
- Do not: mandatory empty fields when the usual value is known; a configuration step in every operation.

**3.2 Layout follows the device; behavior is the same everywhere.**
On a phone a list uses «Cargar más» and sheets for filters; on a desktop, tables, pagination and side panels. What does not change between devices are the results, the order, the rules and the texts.
- Do not: invent a different rule on the phone under the excuse of the phone layout.

**3.3 The user's work is never lost without their permission.**
On returning to a screen, the search, the loaded list and the position are kept. Leaving a form with changes asks for confirmation. A rejection returns to the screen with what was typed intact and the affected element marked.
- Example: the waiter builds a round with four items and sends it; one product has no stock. The round stays on the table screen with the four items and the missing one marked.
- Do not: reset the table on return, empty a form because of an error, silently overwrite a change made from another device.

**3.4 Every screen defines its states and the text for each.**
What is shown when there is nothing yet, when loading, when there are no results for these filters, when loading failed and when there are too many items. They are different states with different texts.
- Example: «Aún no hay ventas. Registra la primera desde Nueva venta» versus «No hay ventas entre el 1 y el 7 de octubre» versus «No se pudo cargar el historial» with **Reintentar**.
- Do not: one empty list for all three cases; show an empty list when what happened is that there was no connection.

**3.5 While an operation is in doubt, another of the same kind is not started.**
If an action with effect got no response, the screen shows it, offers to verify or redo, and blocks starting another of the same type until it is resolved.
- Example: a table payment got no response; **Cobrar** stays blocked for that table until the screen confirms whether the payment was recorded.

**3.6 A business identifier is shown complete or not at all.**
A document number (B001-00001234), an order number or a wallet operation code is never truncated with an ellipsis: two different items would look the same. If it does not fit, another presentation is used or a notice is shown, without blocking the main operation.

**3.7 Actions say what they do and confirmations name the result.**
«Cobrar S/ 85.00», not «Aceptar». «Anular pedido» and «Conservar pedido», not «Sí» and «No».

---

## Step 4. Fix the business rules

**4.1 For each piece of data, define who is the source that counts.**
What one role declares is a notice; what the responsible role verifies is what counts. The document says, for each piece of data with consequences (amounts, prices, totals, stock, cash counted), who sets it and who can only notify.
- Example: a waiter can tell the cashier the customer paid by Yape, but the payment that closes the table is recorded by the cashier after seeing it arrive.
- Do not: accept as fact a piece of data the interested party declares without verification.

**4.2 Identify processes with their own cycle and do not chain them.**
Money (payments, documents, cash shift), preparation (comandas, stations) and stock are distinct processes: each with its states and its corrections. Changing one does not touch the others unless the document explicitly says why.
- Example: voiding a payment recorded by mistake does not mark the dishes as not served nor return stock.
- Do not: prevent a correction in one process because another process moved forward.

**4.3 What was agreed is edited freely until it is executed; then it freezes.**
While an action has not been executed in the real world, its data can be corrected. Once executed, that data describes what happened and stays fixed; later errors are resolved with a note or a separate correction.
- Example: an item can be changed freely while the round is a draft; once sent to the kitchen it is only cancelled, with its reason. An electronic document accepted by SUNAT is not edited; it is corrected with a credit note.

**4.4 Record even if data is missing; gaps are shown and required only when an action needs them.**
A missing piece of data is a presentation («Sin cliente»), not a new state or a block. It is required in the action that needs it.
- Example: a sale is recorded without identifying the customer; issuing a factura does require a RUC.
- Do not: reject creation because of fields completed later; invent a "without X" state.

**4.5 Days are interpreted in the business's time.**
A «ventas de hoy» filter spans from 00:00 to 23:59 in America/Lima. A service that crosses midnight belongs to the cash shift it was charged in, not to the calendar day, when the document says so. Whether that holds is verified in the repository memory and current docs.

**4.6 Each process has a purpose and does not complete another by accident.**
Two processes that share a mechanism (for example, the precuenta and the comanda both print on a thermal printer) each have their own trigger, content and effect. Printing one does not complete the other.

**4.7 When what was agreed changes in substance, it is a new agreement.**
If the essence of an order changes (moving the items to another table, splitting a bill), define whether that is an edit or a new order, and write the rule. In general, a visible identifier must keep describing the same thing that was agreed.

---

## Step 5. Define states and what can change when

**5.1 Each state has a name, a meaning for the user and allowed transitions.**
For everything with a lifecycle, list each state with what it means, what triggers it, what can be done in it and what each role sees. A state is defined by what the user needs to distinguish.
- Example: a kitchen item can be «Pendiente» (sent, not started), «Listo» (prepared, waiting for the waiter) or «Servido» (on the table), plus «Anulado» (cancelled with its reason, kept). The allowed transitions are listed and which ones are final.
- Do not: loose flags ("has error", "is printing") without a closed set of states.

**5.2 A state exists only if someone queries it or acts on it; the rest is presentation.**
If nobody filters, counts or decides by a condition, it is not a state: it is a way of showing data that already exists.
- Example: «Mesa libre» is how a table without an open session is shown. «Atrasado» for a delivery is a presentation over the dispatch time unless someone filters by it.
- Do not: states that exist to wait for another feature.

**5.3 What already existed does not inherit new states or invented data.**
When a state or piece of data is introduced, previous records remain as "without that data", explicitly.
- Example: when kitchen stations are launched, orders sent before do not appear on any station's display.

**5.4 Records with effect are corrected by voiding and creating another, not by editing.**
Voiding keeps the original, who voided, when and why. Voiding does not mean refunding money.
- Example: a payment of S/ 150.00 was recorded when S/ 115.00 arrived: the 150 one is voided and one of 115 is recorded; the shift reflects both movements.

**5.5 No states or steps are created to wait for another feature.**
The current one is defined complete without that something; the integration happens when it arrives.

---

## Step 6. Define what happens when something fails

Every action with effect (send a round, charge, issue a document, print, close a shift) is defined with four possible outcomes, and the document says what the user sees in each:

| Outcome | What happened | What the user sees |
|---|---|---|
| Success | The action completed | Confirmation that names what is actually guaranteed |
| Known rejection | The product said no (missing stock, amount does not cover the total, table already charged, shift closed) | Returns to the screen with their work intact and the reason next to the affected element, with the remedy |
| Not sent | It never left (no connection, local validation) | Notice and the option to retry without risk |
| In doubt | It left but no response arrived | Notice that it may have completed; verified before repeating |

**6.1 An outcome in doubt is never presented as success nor repeated automatically.**
It is verified before offering to repeat, and repeating never creates two payments, two documents or two comandas.
- Example: a comanda is sent to the printer and the wait times out. «Puede que se haya impreso; revisa la impresora antes de repetir», with **Reimprimir**.
- Do not: show «Guardado» without confirmation; retry in a loop.

**6.2 Repeating out of doubt does not create duplicates.**
If the user repeats an action that already completed, the product recognizes it and says so: «Esta mesa ya fue cobrada», with a link to its document.

**6.3 The main effect is not undone because the secondary one fails.**
If an action has a main effect and a secondary one, failure of the secondary does not delete or repeat the main one. A notice is shown and only the secondary is offered for retry.
- Example: **Cobrar** records the payment and the document, then the receipt printer fails: the payment stays recorded and **Reimprimir comprobante** is offered. If sending the document to SUNAT fails, the sale stands and the document shows its pending dispatch.

**6.4 A known rejection is corrected in place.**
The user returns to the screen with everything they typed, the affected element marked and the remedy in the message.
- Example: «El total cambió a S/ 95.00. Revisa y vuelve a cobrar», with the payment form intact.
- Do not: «Ocurrió un error» without saying which or where.

**6.5 Messages speak the user's language and name the real guarantee.**
No technical names or internal codes. «Enviado a la impresora» is not «impreso»; «enviado a SUNAT» is not «aceptado por SUNAT».

**6.6 Never continue as if something was saved when it was not.**
If saving fails, the app says so and stops what depended on it. "No data" and "could not read" are different situations and are shown differently.

**6.7 A late response, or one from another device, does not change what is on screen without notice.**
Only the response to the visible attempt updates the user's work. A change made from another device (another waiter on the same table, the cashier charging it) is shown as such, not silently merged into an open form.

---

## Step 7. Define who sees and does what

**7.1 Each role has its own access, and access opens exactly what it is.**
Each user signs in to their company's subdomain and sees only that company's data, filtered by what their role (ADMIN, CASHIER, SELLER, WAITER, KITCHEN, BARTENDER) allows. Knowing a URL, an order id or another company's subdomain opens nothing else.
- Example: a waiter can open and add to tables but cannot void a charged document; kitchen sees what to prepare, not amounts.

**7.2 Protection is the minimum that closes the real risk, and the risk is named.**
Before adding a layer (supervisor approval, PIN, extra confirmation), write which concrete risk it closes. If there is no nameable risk, it is not added.
- Example: if the risk is a waiter cancelling a served item to pocket the cash, cancelling a served item requires the cashier or admin; cancelling a draft item does not.

**7.3 Responses do not reveal what they should not.**
Signing in with an unknown email responds the same as a wrong password. Another company's resource responds as if it did not exist.

**7.4 Each role sees the minimum it needs.**
Kitchen does not see prices or payments. A cashier sees their shift, not other cashiers' cash. The owner sees everything about their business.

**7.5 Non-negotiable constraints recorded in `PRODUCT.md`, the repository memory or current documents are not discussed or rephrased.**
They are consulted before designing. If an idea brushes against them, it is discarded without proposing variants.

---

## Step 8. Decide what information is kept

**8.1 Distinguish what was agreed or charged from what is an instruction to act now.**
What is part of a sale (products, prices, discounts, customer, document data) is copied and does not change even if the business changes its catalog or configuration. What is an instruction to act right now (which printer a station uses, which wallet number to show) is always shown current. For each piece of data, the document says which of the two it is.
- Example: an order keeps the price at which the dish was sold even if the menu price changes tomorrow; a reprinted comanda goes to the station's current printer.
- Example: what a cashier types as the customer's name in a document stays in that document; it does not modify the saved customer.

**8.2 Only the latest version of what was agreed is kept.**
Each change replaces the previous one. If it matters to know that something changed (who cancelled an item and why), it is noted; every version is not stored.

**8.3 The ephemeral is not stored.**
What does not survive the operation (a print job already confirmed, a loaded list, an unconfirmed filter) is not kept. The minimum to recover from an interruption is stored: what was left in doubt and how to verify it.
- Do not: recoverable drafts, job histories, local queues in a first version, unless the document names the risk they close (a table draft that must survive a waiter switching devices is one).

**8.4 Distinguish what belongs to the device from what belongs to the company or the user.**
A device preference (the station a kitchen display shows) survives signing out on that device. Company and user data is cleared on sign-out so the next person on a shared device cannot see it.

**8.5 What identifies something is stable; what is displayed can change.**
A table number, a station name or a printer's network address serve to display or locate, not to identify. The document says by what each thing is recognized.

**8.6 The device's storage belongs to the business.**
Shared and fixed devices are used by many people. Nothing personal is left in the browser after signing out, and files the product generates (exports, PDFs) go only where the user asked.

**8.7 Changes to existing data need a transition when businesses operate in production.**
Check in the repository memory and with the founder whether businesses operate in production. When they do, the document says what happens to existing orders, shifts and documents; electronic documents already sent to SUNAT are never rewritten.

---

## Step 9. Fix the vocabulary and the texts

**9.1 One name per concept, in the document and in the interface.**
One term is chosen for each thing and always used. If the interface shows a name different from the concept's, the document says so once and does not alternate.

**9.2 When two terms get confused, they are defined and the definition is written down.**
- Example: pedido is what the table ordered; ronda is each batch sent to the kitchen; comanda is the printed or displayed ticket a station prepares from; precuenta is the bill shown before charging; comprobante is the electronic document issued when charging.

**9.3 Things are named by what they do for the user, not by who provides them.**
«Imprimir comanda», not the gateway's name; «Emitir comprobante», not the invoicing provider's name.

**9.4 Visible texts are written in the document, in angle quotes, in Spanish.**
Buttons, titles, empty states, messages and confirmations with their exact text. They are trimmed: half the words are usually unnecessary.

---

## Step 10. Defer clearly

**10.1 What does not go in is named with its trigger.**
Each deferred item says what unblocks it. An explicit limit is worth more than a half solution.
- Example: "Closing the browser between sending a round and receiving the response leaves it in doubt; it is verified when the table is reopened. An offline mode waits until offline operation is defined."

**10.2 Deferred items with real risk are flagged to the founder.**
If what is left out can cause loss, duplication, a cash difference or a wrong document, the document marks it and the delivery lists it so the founder can ask for a task; the agent creates it only if asked, and the document links it. What is only an improvement is listed in the document.

**10.3 What was already discarded or deferred is not proposed again.**
What was discarded is recorded in the repository memory and in the documents' «Decisiones cerradas». It is not rephrased under another name. If there is a new reason, it is raised as a question in the final block, once, with the reason.

**10.4 Partial versions that later have to be undone are not built.**
Between "do it complete later" and "do half now", the first is chosen.

---

## Step 11. Decide what the agent decides and what it asks

The agent decides everything routine on its own and writes it down. It asks only what changes scope, money, what is kept, priorities between features or contradicts a previous decision. It asks with a recommendation.

### The agent decides and writes it down

- **Standard interface patterns per device**, following `DESIGN.md` and existing screens: list versus detail, «Cargar más» versus pages, sheets or dialogs for filters and selection, two-step flows with review, transient notices.
- **Context preservation and discard confirmations.**
- **Screen states and texts:** empty, loading, no results, error, too many; texts of buttons, messages and confirmations.
- **Behavior on failure:** the four outcomes of Step 6 applied to each action.
- **Account security defaults:** session expiry, responses that do not reveal accounts.
- **What is copied and what is shown current,** following Step 8.
- **What is a device preference and what is company or user data.**
- **Which roles see and do what,** when it follows from `src/authorization/permissions.ts` and `docs/product-roles-usuario.md`.
- **Initial calibration values:** timeouts, items per page, maximum sizes, marked as "valor inicial, ajustable". If memory or a current document already fixed an analogous value, it is reused.
- **What is already recorded in `PRODUCT.md`, the repository memory or a current document.** If the task contradicts them, they prevail and it is noted.
- **Facts verifiable in the application:** whether a screen, a filter, a permission exists. It is verified, not asked.

### Requires the founder

- **Scope of the first version:** which business types, roles, devices, payment methods or document types go in; whether there is an offline mode; whether an edge case gets its own flow.
- **Real business facts that set defaults** and are not in memory: how often something happens, how many tables or stations a typical business has, what delay the kitchen tolerates.
- **Meaning of a visible action:** what a button means for staff or the customer; who can do something only with approval; whether something can be changed after sending or charging.
- **Visible business rules that cannot be deduced from context:** which data is shown current or copied when Step 8 does not resolve it; whether a report is by calendar day or by cash shift.
- **What is kept and who sees it** when Step 8 does not resolve it.
- **Anything that touches money, taxes or electronic documents** beyond what current documents settle.
- **Priorities and order between features:** what goes in this task and what in another; in what order the slices are built.
- **User-visible naming** that fixes a new concept.
- **Anything that contradicts a previous decision or a `PRODUCT.md` principle.** The contradiction is exposed and asked about; it is never reintroduced on the agent's own initiative.

---

## Step 12. Present the result

**12.1 The document is delivered complete, with routine decisions already made and visible.**
Neither a skeleton nor a list of options is delivered. Every decision the agent made about something the founder might want to change appears under "Decided unless objected".

**12.2 Acceptance criteria are concrete scenarios.**
Each criterion describes a situation with data and an observable result, not a category.
- Example: "The cashier charges table 4 for S/ 120.00 while a waiter adds a S/ 15.00 drink from another device: the cashier sees «El total cambió a S/ 135.00», the payment form keeps the method and amount typed, and nothing is charged until they confirm again."
- Do not: "Payment errors are validated."

**12.3 Questions go in a single block, numbered, with a recommendation.**
Each question carries the context in one line, the recommended option first with its reason, the alternatives and the consequence of each in scope, data or effort, so it can be answered with a number. Separately, the "Decided unless objected" list.

```
Questions (answer with the option number):

1. Who can cancel an item that the kitchen already marked «Listo»?
   (1) Cashier or admin only. Recommended: closes the risk of a waiter cancelling a served dish to keep the cash.
   (2) Any role that can edit the table. Faster on the floor; cancellations of prepared dishes are not controlled.

2. Is the daily sales report by calendar day or by cash shift?
   (1) By cash shift. Recommended: matches how the cashier closes and a service that crosses midnight stays in one report.
   (2) By calendar day. Simpler to read; a late service is split across two days.

Decided unless objected:
- The order history shows twenty items per page with «Cargar más».
- Leaving a table with an unsent round asks for confirmation; the draft is kept on the table.
```

**12.4 A founder question like "what is X for?" is an objection.**
Answer in two lines and offer the version without X. X is not defended.

**12.5 A short message with two readings is rephrased and the agent asks which one it is.**
It is the only question asked before writing the document.
