# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

The primary user is the restaurant or bar owner, who needs a clear understanding of how the business is operating. Administrators, cashiers, waiters, and kitchen staff are also direct users, each completing the tasks of their role.

## Product Purpose

Lorito Killer is a multi-tenant POS for restaurants and bars. It connects day-to-day operations—from tables and orders through kitchen preparation, payment, receipts, cash shifts, and reporting—so owners can understand their business and staff can execute their work simply.

Success means owners have a reliable view of operations while every role can complete frequent tasks quickly and with few errors.

## Positioning

A meaningfully differentiated market position has not yet been established. Simplicity of execution is the intended direction, but its specific mechanism and claim remain open decisions.

## Operating Context

The product is used during live restaurant and bar service in Peru. Owners and administrators monitor the business; waiters take table orders from tablets or phones; kitchen staff manage incoming preparations on a dedicated display; and cashiers collect payment, issue receipts, and manage cash shifts. Use often happens under time pressure, with noise, occupied hands, and shared or fixed devices.

## Capabilities and Constraints

- Multi-tenant operation with company data isolated by `companyId`.
- Role-specific access and workflows for administrators, cashiers, waiters, and kitchen staff.
- Restaurant operations including tables, orders, kitchen preparation, payments, receipts, cash shifts, products, customers, stock, and sales reports.
- Existing integration with Peruvian electronic invoicing and SUNAT-related workflows.
- Existing responsive web implementation used across desktop, tablet, and mobile devices.
- No additional product constraints were established during initialization.

## Brand Commitments

The existing product name is Lorito Killer. No additional voice or identity commitments were established during initialization.

## Evidence on Hand

- Restaurant MVP definition: `docs/product-mvp-restaurante.md`.
- Restaurant workflows and operating conditions: `docs/ux-flows-restaurante.md`.
- User roles and permissions: `docs/product-roles-usuario.md`.
- The repository contains implemented routes and feature modules for orders, tables, products, customers, cash shifts, documents, stock, users, and sales reporting.
- No approved testimonials, customer claims, benchmarks, or market proof were identified; future work must not fabricate them.

## Product Principles

1. Give owners a clear, trustworthy understanding of business operations.
2. Make frequent operational tasks simple to execute for every role.
3. Show each user only the information and actions relevant to their work.
4. Preserve accuracy and traceability across orders, payments, receipts, and reports.
