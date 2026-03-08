# Jurutani Admin Dashboard

[![Nuxt UI](https://img.shields.io/badge/Made%20with-Nuxt%20UI-00DC82?logo=nuxt&labelColor=020420)](https://ui.nuxt.com)

Dashboard admin untuk platform Jurutani, dibangun dengan Nuxt 4, Nuxt UI 4, Supabase, dan dilengkapi dengan MCP Server untuk GitHub Copilot.

## 🚀 Tech Stack

- **Nuxt 4** (v4.3.1) - Full-stack Vue framework
- **Nuxt UI 4** (v4.5.1) - Component library berbasis Tailwind CSS v4
- **Supabase** - Backend as a Service (Database, Auth, Storage)
- **Zod** (v4.3.6) - TypeScript-first schema validation
- **TypeScript** - Static type checking
- **pnpm** - Package manager

## 📖 Documentation

- [MCP Setup Guide](./MCP_SETUP.md) - Setup MCP Server untuk GitHub Copilot
- [Supabase Setup Guide](./SUPABASE_SETUP.md) - Setup Supabase database
- [Copilot Instructions](./copilot-instructions.md) - Coding standards dan best practices

<a href="https://dashboard-template.nuxt.dev/" target="_blank">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://ui.nuxt.com/assets/templates/nuxt/dashboard-dark.png">
    <source media="(prefers-color-scheme: light)" srcset="https://ui.nuxt.com/assets/templates/nuxt/dashboard-light.png">
    <img alt="Nuxt Dashboard Template" src="https://ui.nuxt.com/assets/templates/nuxt/dashboard-light.png">
  </picture>
</a>

> The dashboard template for Vue is on https://github.com/nuxt-ui-templates/dashboard-vue.

## Quick Start

```bash [Terminal]
npm create nuxt@latest -- -t github:nuxt-ui-templates/dashboard
```

## Deploy your own

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-name=dashboard&repository-url=https%3A%2F%2Fgithub.com%2Fnuxt-ui-templates%2Fdashboard&demo-image=https%3A%2F%2Fui.nuxt.com%2Fassets%2Ftemplates%2Fnuxt%2Fdashboard-dark.png&demo-url=https%3A%2F%2Fdashboard-template.nuxt.dev%2F&demo-title=Nuxt%20Dashboard%20Template&demo-description=A%20dashboard%20template%20with%20multi-column%20layout%20for%20building%20sophisticated%20admin%20interfaces.)

## Setup

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Setup Environment Variables

```bash
cp .env.example .env
# Edit .env dengan credentials Supabase Anda
```

Required variables:
```env
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_anon_key
SUPABASE_SERVICE_KEY=your_supabase_service_key
```

### 3. Generate Supabase Types

```bash
pnpm types:generate
```

### 4. Setup MCP Server (Optional - untuk GitHub Copilot)

```bash
cd mcp-server
pnpm install
cd ..
```

Restart VS Code setelah setup MCP Server. Lihat [MCP_SETUP.md](./MCP_SETUP.md) untuk detail.

## Development Server

Start the development server on `http://localhost:3000`:

```bash
pnpm dev
```

## Production

Build the application for production:

```bash
pnpm build
```

Locally preview production build:

```bash
pnpm preview
```

Check out the [deployment documentation](https://nuxt.com/docs/getting-started/deployment) for more information.

## Renovate integration

Install [Renovate GitHub app](https://github.com/apps/renovate/installations/select_target) on your repository and you are good to go.
