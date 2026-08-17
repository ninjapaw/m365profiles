# Contributing

## Before You Start

This project is an independent community helper. Contributions must not imply
Microsoft endorsement and must preserve the site's independent-project notice.
Do not submit tenant data, customer data, credentials, access tokens, or other
sensitive material.

## Changes to Licensing Guidance

Keep every decision-tree rule grounded in a primary source. When changing
[`src/data/tree.js`](src/data/tree.js), include the relevant Microsoft Learn,
Product Terms, or service documentation link and explain the affected identity
profile or entitlement.

## Local Validation

```bash
npm ci
npm run check
npm run test
npm run build
```

`npm run validate-tree` verifies every decision-tree edge and reachability.
`npm run build` also verifies generated site links.

## Pull Requests

Keep pull requests focused. Describe the user-visible change, update related
sources and explainers, and call out licensing assumptions or date-sensitive
information. Do not commit generated output, `.env` files, Azure credentials,
or environment-specific deployment values.
