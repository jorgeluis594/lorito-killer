---
name: create-user
description: "Creates a new user in Lorito Killer POS via browser automation. Logs in as admin, opens the user creation modal, fills email/password/role and submits. Usage: /create-user email=user@test.com password=test1234 role=CASHIER"
allowed-tools: Bash(playwright-cli:*), Read
---

# Create User — Browser Automation Skill

## Overview

Automates user creation in Lorito Killer POS by navigating the UI with `playwright-cli`. Logs in as admin, goes to company settings, opens the "Agregar usuario" modal, fills the form with the provided email, password and role, and submits.

## Input

The skill receives 3 arguments as a single string. Parse them from the args:

- `email` — The new user's email address
- `password` — The new user's password
- `role` — One of: ADMIN, CASHIER, WAITER, KITCHEN, BARTENDER

Example invocation:
```
/create-user email=cajero@test.com password=secret123 role=CASHIER
```

If arguments are provided without `key=value` format, assume the order is: email, password, role.

## Role Mapping

The role selector in the UI shows Spanish labels. Map the role argument to the correct label for selection:

| Input     | UI Label       |
|-----------|----------------|
| ADMIN     | Administrador  |
| CASHIER   | Cajero         |
| WAITER    | Mozo           |
| KITCHEN   | Cocinero       |
| BARTENDER | Bartender      |

## Admin Credentials

Read from `.env` if available, otherwise use these defaults:
- Email: `jorg3.594@gmail.com`
- Password: `123456`

## Execution Steps

### Step 1: Parse arguments

Extract `email`, `password`, and `role` from the input args string.
Validate that all 3 are present. If any is missing, report the error and stop.

### Step 2: Open browser and login

```bash
playwright-cli open http://localhost:3000/login
playwright-cli snapshot
```

Find the email input, password input, and login button from the snapshot:
```bash
playwright-cli fill <email-ref> "jorg3.594@gmail.com"
playwright-cli fill <password-ref> "123456"
playwright-cli click <login-button-ref>
```

Wait for redirect to dashboard:
```bash
playwright-cli snapshot
```

### Step 3: Navigate to company settings

```bash
playwright-cli goto http://localhost:3000/dashboard/settings/company
playwright-cli snapshot
```

### Step 4: Open the user creation modal

Find the "Agregar usuario" button in the snapshot and click it:
```bash
playwright-cli click <agregar-usuario-ref>
playwright-cli snapshot
```

### Step 5: Fill the form

From the modal snapshot, fill in the fields:

```bash
# Fill email
playwright-cli fill <email-field-ref> "<new-user-email>"

# Select role - click the role trigger, then select the correct option
playwright-cli click <role-trigger-ref>
playwright-cli snapshot
# Find the role option matching the mapped label
playwright-cli click <role-option-ref>

# Fill password
playwright-cli fill <password-field-ref> "<new-user-password>"

# Fill repeat password
playwright-cli fill <repeat-password-field-ref> "<new-user-password>"
```

### Step 6: Submit

```bash
playwright-cli click <registrar-button-ref>
playwright-cli snapshot
```

### Step 7: Verify and report

Take a snapshot after submission. Check for:
- Success toast: "Usuario creado como {RoleLabel}" → Report SUCCESS
- Error message: Report the error text

### Step 8: Close browser

```bash
playwright-cli close
```

### Step 9: Report result

Report to the user:
- If SUCCESS: "User {email} created with role {role}"
- If FAILED: "Failed to create user: {error details}"

Do NOT take screenshots unless the user explicitly asks for them.

## Error Handling

- If login fails, report "Login failed — check admin credentials"
- If the modal doesn't open, take a screenshot and report the page state
- If form submission fails with validation error, report the specific validation message
- If user already exists, report "User already exists" error from the form
- Always close the browser at the end, even on error

## Important Rules

1. Always take a snapshot before interacting with elements to get current refs
2. The role selector is a Radix UI Select component — click the trigger first, then snapshot to see options, then click the option
3. Do NOT skip the repeat password field — both password fields must be filled
4. The app runs at http://localhost:3000 with PREVIEW=true (fantastidog subdomain)
5. Always close the browser when done
6. Do NOT take screenshots unless the user explicitly requests them
