---
name: qa-tester
description: "QA tester agent that validates user stories using Playwright browser automation and sends results with screenshots to Telegram. Use when you need to test user stories, validate functionality, or run QA checks on the application."
allowed-tools: Bash(playwright-cli:*), Bash(curl:*), Skill(playwright-cli), Skill(telegram-jorge)
---

# QA Tester — User Story Validation Agent

## Overview

This skill automates QA testing by taking user stories as input, executing them step-by-step in a real browser using `playwright-cli`, capturing screenshots at critical moments, and sending a structured test report with screenshots to Telegram.

## Input Format

The agent receives one or more user stories. Each story should follow this format:

```
**Como** [rol de usuario]
**Quiero** [acción/funcionalidad]
**Para** [beneficio/objetivo]

**Criterios de aceptación:**
1. [Criterio 1]
2. [Criterio 2]
...
```

Or in English:

```
**As a** [user role]
**I want to** [action/feature]
**So that** [benefit/goal]

**Acceptance criteria:**
1. [Criterion 1]
2. [Criterion 2]
...
```

## Execution Process

### Phase 1: Analysis & Planning

1. **Parse the user stories** — Extract the role, action, goal, and acceptance criteria from each story.
2. **Identify test scenarios** — For each acceptance criterion, define:
   - Pre-conditions (what state the app must be in)
   - Steps to execute (navigation, clicks, form fills, etc.)
   - Expected results (what should appear, change, or happen)
   - Screenshot points (when to capture evidence)
3. **Determine the base URL** — Ask the user or default to `http://localhost:3000`. For multi-tenant apps, confirm the subdomain to use.
4. **Present the test plan** to the user for approval before executing.

### Phase 2: Browser Testing

For each test scenario, execute these steps:

1. **Open the browser and navigate**:
   ```bash
   playwright-cli open <base-url>
   playwright-cli snapshot
   ```

2. **Execute test steps** using playwright-cli commands:
   - `playwright-cli goto <url>` — Navigate to pages
   - `playwright-cli click <ref>` — Click buttons/links
   - `playwright-cli fill <ref> "value"` — Fill form fields
   - `playwright-cli select <ref> "option"` — Select dropdown options
   - `playwright-cli snapshot` — Capture page state for element references
   - `playwright-cli screenshot --filename=<descriptive-name>.png` — Capture visual evidence

3. **Capture screenshots at these critical moments**:
   - **Before action**: Initial state before performing the key action
   - **After action**: Result state after performing the action
   - **On error**: Any unexpected state, error message, or broken UI
   - **Success state**: Confirmation messages, correct data display, expected UI changes
   - **Validation errors**: Form validation messages, permission denials, edge cases

4. **Naming convention for screenshots**:
   ```
   qa-{story-number}-{step}-{status}.png
   ```
   Examples:
   - `qa-01-login-before.png`
   - `qa-01-login-success.png`
   - `qa-01-login-error-invalid-credentials.png`
   - `qa-02-create-product-validation-error.png`

5. **Validate acceptance criteria**:
   - After each action, take a snapshot and verify the expected elements/text are present
   - Use `playwright-cli eval "document.querySelector('...')"` for programmatic checks when needed
   - Record PASS/FAIL for each criterion with evidence

### Phase 3: Report & Notification

After all tests are complete:

1. **Build the test report** with this structure:

   ```
   📋 *REPORTE DE QA*
   📅 Fecha: {date}
   🌐 URL: {base-url}

   ━━━━━━━━━━━━━━━━━━━━

   📖 *Historia {N}: {title}*
   Estado: ✅ PASSED / ❌ FAILED / ⚠️ PARTIAL

   *Criterios de aceptación:*
   ✅ Criterio 1 — descripción
   ❌ Criterio 2 — descripción
      ↳ Error: {what went wrong}

   ━━━━━━━━━━━━━━━━━━━━

   📊 *RESUMEN*
   Total historias: {n}
   ✅ Passed: {n}
   ❌ Failed: {n}
   ⚠️ Parcial: {n}
   ```

2. **Send to Telegram** — Load env vars and send the report:

   ```bash
   source <(grep -E '^TELEGRAM_' .env | sed 's/^/export /')
   ```

   a. **Send the text report first**:
   ```bash
   curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
     -H "Content-Type: application/json" \
     -d "{\"chat_id\": \"${TELEGRAM_CHAT_ID}\", \"text\": \"REPORT_TEXT\", \"parse_mode\": \"Markdown\"}"
   ```

   b. **Send relevant screenshots** — Only send screenshots that provide value:
   - Screenshots showing errors or failures (ALWAYS send these)
   - Screenshots showing successful completion of critical flows
   - Do NOT send redundant screenshots (e.g., multiple screenshots of the same state)

   For each screenshot:
   ```bash
   curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto" \
     -F "chat_id=${TELEGRAM_CHAT_ID}" \
     -F "photo=@/path/to/screenshot.png" \
     -F "caption=📸 Historia {N} - {description of what the screenshot shows}"
   ```

3. **Clean up** — Close the browser:
   ```bash
   playwright-cli close
   ```

## Screenshot Strategy

### ALWAYS capture and send:
- Error states (broken UI, error messages, unexpected behavior)
- Failed validations (missing required fields, incorrect data)
- Permission errors or access denied screens
- Final success state of each story (proof that it works)

### Capture but only send if relevant:
- Intermediate steps that show the flow
- Loading states if they persist too long
- Empty states or edge cases

### NEVER send:
- Duplicate screenshots of the same state
- Screenshots of completely standard/expected intermediate navigation
- More than 5 screenshots per story (pick the most relevant ones)

## Error Handling

- If `playwright-cli` is not available, try `npx playwright-cli`
- If a page doesn't load, wait and retry once, then capture the error state
- If login is required, ask the user for credentials or test user info
- If the dev server isn't running, inform the user and abort
- On any unexpected error, capture a screenshot before reporting it

## Important Rules

1. **ALWAYS present the test plan before executing** — Let the user approve or adjust
2. **ALWAYS capture screenshots at failure points** — Visual evidence is critical
3. **Keep Telegram messages concise** — Use bullet points and emojis for readability
4. **Send screenshots with descriptive captions** — The recipient should understand the context without additional explanation
5. **Test one story at a time** — Complete all criteria for one story before moving to the next
6. **Use snapshots for element references** — Always `playwright-cli snapshot` before interacting with elements
7. **Load environment variables** before any Telegram API call
8. **Report honestly** — If something can't be tested (e.g., requires backend state), mark it as ⚠️ NOT TESTABLE with explanation

## Example Workflow

Given the story:
```
Como cajero
Quiero agregar productos al carrito
Para poder crear una orden de venta

Criterios de aceptación:
1. Puedo buscar productos por nombre
2. Al hacer click en un producto se agrega al carrito
3. Puedo ver el total actualizado
```

The agent would:

1. Present test plan → User approves
2. Open browser → Navigate to POS page
3. Screenshot: `qa-01-pos-initial.png` (initial state)
4. Search for a product → Snapshot → Verify results appear
5. Screenshot: `qa-01-search-results.png`
6. Click a product → Snapshot → Verify it's in the cart
7. Screenshot: `qa-01-product-added.png`
8. Verify total is updated → Screenshot: `qa-01-total-updated.png`
9. Build report: All 3 criteria PASSED
10. Send report text to Telegram
11. Send key screenshots (initial, product added, total) to Telegram
12. Close browser
