<div align="center">

# PV Casa Catalog

Catálogo web de cama, mesa, banho e decoração, com painel administrativo.

[![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](LICENSE)

</div>

## Overview

PV Casa is a static, dependency-free web catalog backed by Firebase. Customers browse the public catalog and start a WhatsApp conversation about a product; the store manages the catalog through an authenticated admin panel.

Code, filenames, and identifiers are in English. The user interface is in Brazilian Portuguese.

## Features

**Catalog (`/client`)**
- Products loaded from Firestore, out-of-stock items hidden
- Accent-insensitive multi-word search, category and price filters, sorting, pagination
- Order cart persisted in localStorage: multiple products with quantities (capped at stock) sent as a single WhatsApp message
- Loading, empty, and error states; responsive layout with a mobile filter drawer

**Admin (`/admin`)**
- Email/password authentication with a route guard on the dashboard
- Create, edit, and delete products, including multi-image upload to Firebase Storage
- Stock, barcode, base price, and discount management with live final-price preview

## Tech Stack

HTML, CSS, JavaScript (ES modules, no build step), Firebase Authentication, Cloud Firestore, Firebase Storage.

## Project Structure

```
admin/     authentication and product management
client/    public catalog
shared/    Firebase initialization and catalog helpers
img/       brand assets and product placeholder
```

## Data Model

Collection `products`, document ID is the barcode:

| Field | Type | Notes |
| --- | --- | --- |
| `name` | string | Product name |
| `barcode` | string | EAN, required — also used as the document ID |
| `category` | string | `cama`, `mesa`, `banho`, `decoracao` |
| `basePrice` | number | Price before discount |
| `discount` | number | Percentage, 0–99 |
| `finalPrice` | number | Derived from `basePrice` and `discount` |
| `stock` | number | Items with `0` are hidden from the catalog |
| `images` | string[] | Firebase Storage download URLs |
| `createdAt` / `updatedAt` | number | Epoch milliseconds |

Products without images fall back to `img/product-placeholder.svg`.

## Setup

1. Serve the repository root over HTTP (all paths are relative, so any static server or subpath works; ES modules do not run from `file://`):
   ```bash
   npx serve .
   ```
   The root redirects to the catalog at `/client/`; the admin panel is at `/admin/auth/`.
2. In the Firebase console, add the serving domain to **Authentication → Settings → Authorized domains** and create an admin user under **Authentication → Users**.
3. Configure the Firestore and Storage security rules in the Firebase console: allow public reads of `products` and restrict all writes to authorized admin users.
4. Sign in to the admin panel to manage the catalog.

## Deployment

The project is a set of static files. Serve the repository root with any static host or reverse proxy (nginx). Enforce HTTPS and keep `/admin` excluded from search indexing — both admin pages already send `noindex`.

## License

MIT — see [LICENSE](LICENSE).

## Author

**Elyon Oliveira dos Santos** — Software Developer
