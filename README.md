# OAS Facturation - Frontend

This is the frontend application for the OAS Facturation system, built with Angular 19.

## Architecture & Technology Stack

- **Framework:** Angular 19 (using standalone components)
- **Styling:** Tailwind CSS 3.4
- **Icons:** Lucide Angular
- **State/Reactivity:** RxJS
- **Authentication:** JWT Decode
- **Build Tool:** Angular CLI with Vite builder (via `@tailwindcss/vite`)

## Project Structure

The application is modularized by feature within `src/app/`:

- **Core & Shared:**
  - `core/`: Core services, interceptors (e.g., JWT interceptor), and guards.
  - `shared/`: Reusable UI components, directives, and pipes.
  - `services/`: API communication services.
  - `layout/`: Main application layout components (Sidebar, Header).
- **Features:**
  - `auth/`: Login and authentication.
  - `dashboard/`: Main application dashboard.
  - `factures`, `devis-previsionnels`, `proformas`, `avoirs-ht`, `avoirs-ttc`: Core billing and accounting.
  - `bons-commande`, `bons-reception`, `bons-de-sortie`: Inventory and order tracking.
  - `fiches-atelier`, `vehicules`, `mecaniciens`, `main-doeuvre`, `pieces-detachees`: Garage and repair management.
  - `clients`, `fournisseurs`: Contact management.
  - `stock`, `inventaire`: Inventory management.

## Setup and Installation

1. **Prerequisites:** Node.js (v18+ recommended) and npm.
2. **Install dependencies:**
   ```bash
   npm install
   ```

## Development Server

Run the following command to start the development server:
```bash
npm start
```
Or:
```bash
ng serve
```
Navigate to `http://localhost:4200/`. The application will automatically reload if you change any of the source files.

## Build

Run the following command to build the project for production:
```bash
npm run build
```
The build artifacts will be stored in the `dist/` directory.

## Linting and Testing

- **Tests:** Run `npm run test` to execute the unit tests via Karma.