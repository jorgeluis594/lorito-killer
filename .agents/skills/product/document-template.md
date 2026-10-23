# Product document template

The document is a draft in `docs/drafts/<concept>.md`, written in Spanish following the [Documentation](../documentation/SKILL.md) skill, and describes only the current product-level design. Sections marked as constant always go in; optional ones only when the feature needs them. No content is invented to fill a section: if it does not apply, it is omitted.

It contains no construction decisions: no data structure, no technical contracts, no code organization, no executable tests. Those are defined in the next phase with the [Architecture](../architecture/SKILL.md) skill, taking this document as the behavior definition.

## Style

- Title with the pattern "<Tema>: definición de producto".
- Below the title, one **Estado** line with the date, what already exists, which document it complements or replaces and the source task.
- Impersonal voice, declarative present, no first or second person. Subjects by role, using the names the interface uses: "el mozo", "el cajero", "cocina", "el administrador", "el dueño", "la pantalla", "Lorito Killer".
- Each rule asserts and closes the alternative: "El pedido se bloquea si falta stock. El stock no se reserva al tomar el pedido."
- Always concrete values: quantities, times, ranges, the business time zone (America/Lima). An example with real data wherever there is ambiguity: S/ 120.00, «Mesa 4», «Comanda #1001», 28/09/2026.
- Angle quotes «» for text visible in the interface, in Spanish; bold for controls and actions (**Enviar a cocina**).
- Two-column tables for rules (`| Aspecto | Comportamiento |`), numbered lists for flows, `text` blocks for diagrams.
- Decisions are asserted without a marker. Assumptions are marked: "Supuesto: …". What depends on the founder goes in the questions block, never disguised as a decision.
- No history of discarded decisions nor "se había decidido antes". Reorganizing never loses detail.

## Skeleton

```markdown
# <Tema>: definición de producto

**Estado:** <definición lista para implementar | borrador con preguntas abiertas>. <What already exists, source document, source task, date>.

## Problema y situación                (constant)
## Objetivo                            (constant)
## Roles y superficies                 (constant when there is more than one role or device)
## Alcance de la primera versión       (constant)
## Fuera de esta versión               (constant)
## Flujo                               (constant in features with an interface)
## Pantallas                           (constant in features with an interface)
## Reglas                              (constant)
## Estados                             (when there is a lifecycle)
## Cuando algo falla                   (constant)
## Quién ve y hace qué                 (when there is more than one role or sensitive data)
## Información que se guarda           (when the order, the shift, the company or the device stores something new)
## Vocabulario                         (when a new term appears, or two that get confused)
## Decisiones cerradas                 (constant)
## Criterios de aceptación             (constant)
## Pendientes y preguntas              (only while they exist; removed when closed)
## Preguntas decididas por la revisión (only when a review gate answered the questions)
```

## Section guide

### Problema y situación
One paragraph. What the role does today without this feature, when it happens (in the middle of service with the kitchen full, at the register with a queue, at closing time counting the shift), what they solve it with today (paper comanda, shouting to the kitchen, a notebook, Excel, memory) and what goes wrong. A concrete story, not a category.

### Objetivo
One or two sentences with what the user will be able to do when done. If there is an outcome hypothesis (fewer wrong comandas, faster table turnover, cash shifts that close without difference), write it as a hypothesis and say how it would show.

### Roles y superficies
Table `| Rol | Necesidad | Superficie |`. Roles by situation, not demographics: "mozo tomando el pedido de la mesa 4 desde el celular con la bandeja en la otra mano", "cocina viendo las comandas en la pantalla fija", "dueño revisando las ventas del día desde su casa". Surfaces are the device and its context: phone or tablet in hand, fixed kitchen display, cash register desktop with the printer, owner's phone or laptop.

### Alcance de la primera versión
List of what goes in, bounded by types, roles, devices and business types (restaurant, bar, store) rather than by reliability. State what belongs to another task and which meeting point is left defined so that task only adds. If there are several slices, their order.

### Fuera de esta versión
List of what is deferred, each item with its trigger: "cuando exista división de cuenta por comensal", "cuando haya más de un local por empresa". Anything with real risk is flagged so the founder can decide whether to create a task; if one exists, it is linked.

### Flujo
Numbered list of the usual end-to-end path, with the main action of each step and the default values. Then the alternative paths that matter (rejection, uncertain outcome, abandoning midway, the table changes hands) as short sublists.

### Pantallas
One entry per screen, with the name in bold followed by a colon and:
- Route or entry point (Dashboard → Mesas → Mesa 4) and which roles reach it.
- Main action and controls (**Cargar más**, **Guardar**).
- States: no data yet, loading, no results for these filters, load error, too many. Each state with its visible text in «».
- Button texts and messages the user sees, with the remedy in every error.
- What is kept when navigating (search, list, position) and what asks for confirmation on discard.
- Shared components and `DESIGN.md` patterns reused; anything that departs from them says why.

### Reglas
Table `| Aspecto | Comportamiento |`. Each rule with concrete values and, when not obvious, an example with real data.

### Estados
Table `| Estado | Significado | Qué lo dispara | Qué se puede hacer | Qué ve cada rol |` (drop columns that do not apply), plus a list of allowed transitions. State what happens to records that existed before this state.

### Cuando algo falla
Table `| Situación | Qué ve el usuario | Qué puede hacer |` that distinguishes the four outcomes of every action with effect: success, known rejection (returns to correct with work intact and the affected element marked), not sent (retry), uncertain outcome (verified before repeating; never presented as success). What is blocked while an action is in doubt. What happens if the user abandons midway and comes back. Failures of external pieces (printer, Print Gateway, SUNAT/electronic invoicing, realtime connection) have their own row.

### Quién ve y hace qué
Table `| Rol | Puede ver | Puede hacer | No puede |` for ADMIN, CASHIER, SELLER, WAITER, KITCHEN and BARTENDER as they apply, consistent with `src/authorization/permissions.ts` and `docs/product-roles-usuario.md`. For each protection layer, the concrete risk it closes. Which data a role must not see (amounts for kitchen, other shifts' cash for a cashier).

### Información que se guarda
What is copied into the order, document or shift and stays fixed (what was agreed or charged), what is always shown current (instructions to act now), what is a device preference and what is company data, what is not stored because it is ephemeral, and what happens to what already existed. No data structure: only which information, whose, and until when.

### Vocabulario
List `término: definición` for each new concept or pair of terms that get confused (comanda and pedido, ronda and orden, precuenta and comprobante), with the text the user sees in «».

### Decisiones cerradas
Table `| Decisión | Por qué |` with this feature's decisions that must not be reopened, one line each. No history or alternatives: only what is current and its reason. It exists so a future agent does not re-propose what was discarded.

### Criterios de aceptación
Numbered list of concrete scenarios: situation with data and observable result. Each must be convertible into a test in the next phase, but here neither the type nor the location is stated. Cover the usual path, each known rejection, the uncertain outcome and abandoning midway.

### Pendientes y preguntas
Only while they exist. The questions block follows Step 12 of the product guide: numbered, recommended option first with its reason, consequence of each alternative, and separately the "Decidido salvo objeción" list. When the founder answers, the document is updated and the resolved questions disappear from this section.

### Preguntas decididas por la revisión
Only when the questions were answered by a review gate of the implement-task skill. Each question with its answer, who decided it, the reason and the discarded alternatives. It stays until the founder approves the final pull request and is not promoted into the permanent doc.
