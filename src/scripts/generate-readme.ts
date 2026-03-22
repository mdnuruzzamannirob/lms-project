import { promises as fs } from 'node:fs'
import path from 'node:path'

type PackageJson = {
  name?: string
  version?: string
  description?: string
  author?: string
  license?: string
  packageManager?: string
  scripts?: Record<string, string>
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
}

type EnvSection = {
  title: string
  keys: string[]
}

type JobInfo = {
  name: string
  schedule: string
}

type WorkerInfo = {
  name: string
  type: string
}

const projectRoot = path.resolve(__dirname, '..', '..')
const packageJsonPath = path.join(projectRoot, 'package.json')
const readmePath = path.join(projectRoot, 'README.md')
const modulesPath = path.join(projectRoot, 'src', 'modules')
const scriptsPath = path.join(projectRoot, 'src', 'scripts')
const jobsPath = path.join(projectRoot, 'src', 'jobs')
const workersPath = path.join(projectRoot, 'src', 'workers')
const envExamplePath = path.join(projectRoot, '.env.example')

const extractModuleMetadata = async (
  modulePath: string,
  moduleName: string,
): Promise<string> => {
  try {
    const routerPath = path.join(modulePath, 'router.ts')
    if (!(await fs.stat(routerPath).catch(() => null))) {
      return `Handles ${moduleName} domain logic and operations`
    }

    const content = await fs.readFile(routerPath, 'utf8')
    const docMatch = content.match(/\/\*\*[\s\S]*?\*\//)
    if (docMatch) {
      return docMatch[0]
        .replace(/\/\*\*\s*|\s*\*\//g, '')
        .replace(/\n\s*\*\s*/g, ' ')
        .trim()
    }

    return `Complete ${moduleName} module with API endpoints and business logic`
  } catch {
    return `Comprehensive ${moduleName} module`
  }
}

const extractJobs = async (): Promise<JobInfo[]> => {
  try {
    const indexPath = path.join(jobsPath, 'index.ts')
    const content = await fs.readFile(indexPath, 'utf8')
    const jobMatches = content.matchAll(/(?:import|from)\s+['"]\.\/([^'"]+)\.job/gi)
    const jobs: JobInfo[] = []
    const seen = new Set<string>()

    for (const match of jobMatches) {
      const name = match[1]
        ?.replace(/([A-Z])/g, ' $1')
        .trim()
        .toUpperCase()
      if (name && !seen.has(name)) {
        jobs.push({ name, schedule: 'See jobs/' })
        seen.add(name)
      }
    }

    return jobs
  } catch {
    return []
  }
}

const extractWorkers = async (): Promise<WorkerInfo[]> => {
  try {
    const indexPath = path.join(workersPath, 'index.ts')
    const content = await fs.readFile(indexPath, 'utf8')
    const workerMatches = content.matchAll(
      /(?:export|worker)\s+.*?['"]([^'"]+worker[^'"]*)['"]/gi,
    )
    const workers: WorkerInfo[] = []
    const seen = new Set<string>()

    for (const match of workerMatches) {
      const name = match[1]
      if (name && !seen.has(name)) {
        workers.push({ name, type: 'background' })
        seen.add(name)
      }
    }

    return workers.sort((a, b) => a.name.localeCompare(b.name))
  } catch {
    return []
  }
}

const getVersion = (
  source: Record<string, string> | undefined,
  dependencyName: string,
): string => {
  const rawVersion = source?.[dependencyName]
  if (!rawVersion) return 'N/A'
  return rawVersion.replace(/^[~^]/, '')
}

const escapeCell = (value: string): string => value.replace(/\|/g, '\\|')

const buildTable = (headers: string[], rows: string[][]): string => {
  const headerLine = `| ${headers.map(escapeCell).join(' | ')} |`
  const separatorLine = `| ${headers.map(() => '---').join(' | ')} |`
  const bodyLines = rows.map((row) => `| ${row.map(escapeCell).join(' | ')} |`)
  return [headerLine, separatorLine, ...bodyLines].join('\n')
}

const parseEnvSections = (envText: string): EnvSection[] => {
  const lines = envText.split(/\r?\n/)
  const sections: EnvSection[] = []
  let currentSection: EnvSection = { title: 'General', keys: [] }

  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed.startsWith('#') && trimmed.endsWith('#')) {
      if (currentSection.keys.length > 0) {
        sections.push(currentSection)
      }
      currentSection = {
        title: trimmed.replace(/#/g, '').trim(),
        keys: [],
      }
    } else if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const keyPart = trimmed.split('=')[0]
      if (keyPart) {
        const key = keyPart.trim()
        if (key) currentSection.keys.push(key)
      }
    }
  }

  if (currentSection.keys.length > 0) {
    sections.push(currentSection)
  }

  return sections
}

const classifyScript = (name: string): string => {
  if (name.includes('dev')) return 'Development'
  if (name.includes('build')) return 'Build & Compilation'
  if (name.includes('test')) return 'Testing'
  if (name.includes('generate')) return 'Code Generation'
  if (name.includes('check') || name.includes('lint')) return 'Code Quality'
  if (name.includes('start') || name.includes('migrate')) return 'Database & Migration'
  if (name.includes('seed')) return 'Database & Migration'
  return 'Utilities'
}

export const run = async () => {
  try {
    const packageJson = JSON.parse(
      await fs.readFile(packageJsonPath, 'utf8'),
    ) as PackageJson
    const { dependencies = {}, devDependencies = {} } = packageJson

    // Get environment sections
    const envContent = await fs.readFile(envExamplePath, 'utf8')
    const envSections = parseEnvSections(envContent)

    // Discover modules
    const moduleDirs = await fs.readdir(modulesPath)
    const modulesWithMeta: Array<{ name: string; desc: string }> = []
    for (const dir of moduleDirs) {
      const modulePath = path.join(modulesPath, dir)
      const stat = await fs.stat(modulePath)
      if (stat.isDirectory()) {
        const desc = await extractModuleMetadata(modulePath, dir)
        modulesWithMeta.push({ name: dir, desc })
      }
    }

    // Extract jobs and workers
    const jobs = await extractJobs()
    const workers = await extractWorkers()

    // Process scripts
    const scripts = packageJson.scripts ?? {}
    const scriptsByGroup: Record<string, Array<[string, string]>> = {}
    for (const [name, command] of Object.entries(scripts)) {
      const group = classifyScript(name)
      if (!scriptsByGroup[group]) scriptsByGroup[group] = []
      scriptsByGroup[group].push([name, command])
    }

    const sortedGroups = [
      'Development',
      'Build & Compilation',
      'Code Generation',
      'Testing',
      'Code Quality',
      'Database & Migration',
      'Utilities',
    ]
    const sortedScriptGroups = sortedGroups.filter((g) => scriptsByGroup[g])

    // Build sections
    const runtimeRows = [
      ['Node.js', '22.x', 'Modern async runtime with native ES modules support'],
      ['TypeScript', getVersion(devDependencies, 'typescript'), 'Strict typing for large modular backends'],
      ['Express', getVersion(dependencies, 'express'), 'Lightweight HTTP framework with middleware ecosystem'],
      ['Mongoose', getVersion(dependencies, 'mongoose'), 'MongoDB ODM with schema validation and hooks'],
      ['Zod', getVersion(dependencies, 'zod'), 'Runtime schema validation with TypeScript inference'],
      ['Winston', getVersion(dependencies, 'winston'), 'Structured logging with rotation and archival'],
      ['Vitest', getVersion(devDependencies, 'vitest'), 'Fast unit and integration test framework'],
      ['pnpm', packageJson.packageManager?.split('@')[1] ?? 'N/A', 'Fast deterministic package management'],
    ]

    const scriptsSection = sortedScriptGroups
      .map((group) => {
        const groupScripts = scriptsByGroup[group] ?? []
        const rows = groupScripts.map(([scriptName, scriptCommand]) => [
          `pnpm ${scriptName}`,
          scriptCommand,
        ])
        return `### ${group}\n\n${buildTable(['Command', 'Description'], rows)}`
      })
      .join('\n\n')

    const apiVersion = process.env.API_VERSION ?? 'v1'
    const generatedDate = new Date().toLocaleString()

    const tableOfContents = `## Table of Contents

- [Overview](#overview)
- [Core Information](#core-information)
- [Architecture](#architecture)
- [Module Directory](#module-directory)
- [Technology Stack](#technology-stack)
- [API Communication](#api-communication)
- [Quick Start](#quick-start)
- [Development Guide](#development-guide)
- [Available Commands](#available-commands)
- [Database](#database)
- [API Documentation](#api-documentation)
- [Testing](#testing)
- [Performance](#performance)
- [Security](#security)
- [Deployment](#deployment)
- [FAQ](#faq)
- [Contributing](#contributing)`

    const architectureSection = `## Architecture

### Modular Monolithic Pattern

A single deployable unit structured as independent domain modules:

\`\`\`
API Router
    ↓
Auth Middleware
    ↓
24 Domain Modules (auth, books, users, payments, etc.)
    ↓
Shared Services (Database, Cache, Email, Storage)
    ↓
MongoDB + Redis + External APIs
\`\`\`

### Module Structure

Each module follows a consistent pattern:
- **router.ts** - HTTP routes and middleware
- **controller.ts** - Request handlers
- **service.ts** - Business logic
- **model.ts** - MongoDB schema
- **validation.ts** - Input validation with Zod
- **interface.ts** - TypeScript types
- **index.ts** - Module exports`

    const apiSection = `## API Communication

### Request/Response Flow

All API responses follow a standard format:

\`\`\`json
{
  "success": true,
  "message": "Operation successful",
  "data": {...},
  "meta": {
    "timestamp": "2026-03-22T10:30:00Z",
    "requestId": "req_123"
  }
}
\`\`\`

### Status Codes

- **200** - OK (GET, PATCH success)
- **201** - Created (POST success)
- **400** - Bad Request (validation error)
- **401** - Unauthorized (missing/invalid token)
- **403** - Forbidden (insufficient permissions)
- **404** - Not Found
- **429** - Rate Limited
- **500** - Server Error`

    const developmentGuideSection = `## Development Guide

### Adding a New Module

1. Create folder in \`src/modules/MODULE_NAME/\`
2. Create standard files: router.ts, controller.ts, service.ts, model.ts, validation.ts, interface.ts
3. Define Zod validation schemas
4. Implement service with business logic
5. Add thin controller handlers
6. Define routes with middleware
7. Export router in index.ts
8. Import router in src/app/routes.ts

### Code Organization

- Controllers stay thin - delegate to services
- Services contain all business logic
- Models define schema and methods
- Validation at request boundaries with Zod
- Custom error classes for consistency
- Comprehensive TypeScript typing`

    const performanceSection = `## Performance

### Database Optimization

- Use indexes on frequently queried fields
- Implement pagination for large datasets
- Use \`.lean()\` for read-only queries
- Use field projection to limit data transfer
- Add full-text search indexes for text fields

### Caching Strategy

- Redis for session and frequently accessed data
- HTTP caching headers for static resources
- Query result caching for expensive operations
- TTL-based auto-expiration

### Rate Limiting

- Auth endpoints: 60 req/min per IP
- API endpoints: 200 req/15min per user
- Payment webhooks: 1000 req/min`

    const securitySection = `## Security

### Authentication

- JWT tokens for user sessions (24hr expiry)
- Staff 2FA with TOTP apps
- OAuth integration (Google, Facebook)
- Token refresh mechanism

### Data Protection

- Passwords hashed with Bcrypt (12 rounds)
- Sensitive fields encrypted at rest
- No credentials in logs or responses
- Environment variables for all secrets

### API Security

- CORS restricted to whitelisted origins
- Input validation with Zod
- No raw SQL/NoSQL queries
- Rate limiting on all endpoints
- Security headers (CSP, X-Frame-Options, etc.)

### Compliance

- PII encrypted
- Audit logging for admin actions
- GDPR compliance framework
- Payment PCI DSS standards`

    const deploymentSection = `## Deployment

### Environment Setup

Set required environment variables:
- \`MONGODB_URI\` - Database connection
- \`JWT_USER_SECRET\` - Token signing (48+ chars)
- \`JWT_STAFF_SECRET\` - Staff token key
- \`GMAIL_USER\` / \`GMAIL_PASS\` - Email SMTP
- Payment keys: STRIPE_SECRET_KEY, PAYPAL_CLIENT_ID, etc.

### Docker Deployment

\`\`\`bash
docker compose up --build -d
\`\`\`

### PM2 Production

\`\`\`bash
pnpm build
pm2 start ecosystem.config.cjs --env production
\`\`\`

### Pre-deployment Checks

- All tests pass: \`pnpm test\`
- Type checking clean: \`pnpm typecheck\`
- Build successful: \`pnpm build\`
- Environment variables configured
- Database backups enabled
- Monitoring configured`

    const faqSection = `## FAQ

**Q: How do I add a new API endpoint?**
A: Create route in module router.ts, implement controller handler, add Zod validation, import router in routes.ts.

**Q: How does authentication work?**
A: Users get JWT token on login (24hr expiry). Token included in Authorization header. Server validates signature and expiry.

**Q: How do I handle file uploads?**
A: Use Cloudinary integration. Client uploads → controller → service → Cloudinary → URL stored in DB.

**Q: Why are queries slow?**
A: Check .explain() output, ensure indexes exist, use projection, add pagination, consider caching.

**Q: How do permissions work?**
A: RBAC system with 30+ permissions. Auto-generated from route definitions. Use @requirePermission decorator.

**Q: How do I run background jobs?**
A: Add .job.ts file in src/jobs/, register in jobs/index.ts, backend worker process executes on schedule.

**Q: How do I add a payment gateway?**
A: Create payment processor in src/modules/payments/, implement webhook handlers, add to payment service.`

    // Build complete README
    const readme = `# ${packageJson.name}

![Node.js](https://img.shields.io/badge/Node.js-22.x-339933?logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-${getVersion(dependencies, 'express')}-000000?logo=express&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-${getVersion(devDependencies, 'typescript')}-3178C6?logo=typescript&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-7+-47A248?logo=mongodb&logoColor=white)

${tableOfContents}

---

## Overview

Production-grade Node.js backend for a subscription-based digital e-book platform with advanced reading features, payment processing, and content management.

**Key Capabilities:**
- Multi-tier authentication (OAuth, 2FA, JWT)
- Payment processing (Stripe, PayPal, SSLCommerz)
- Advanced reading platform with progress tracking and annotations
- Flexible subscription management
- Comprehensive admin dashboard
- Full-text search with recommendations
- Real-time notifications
- Role-based access control (RBAC)

---

## Core Information

| Property | Value |
| --- | --- |
| **Project** | ${packageJson.name} |
| **Version** | ${packageJson.version} |
| **License** | ${packageJson.license} |
| **API Version** | ${apiVersion} |
| **Modules** | ${modulesWithMeta.length} |
| **Status** | Production-Ready ✅ |

---

${architectureSection}

---

## Module Directory (${modulesWithMeta.length} Modules)

${modulesWithMeta.map((m) => `- **${m.name}** - ${m.desc}`).join('\n')}

---

## Technology Stack

${buildTable(['Technology', 'Version', 'Purpose'], runtimeRows)}

---

${apiSection}

---

## Quick Start

**Prerequisites:**
- Node.js 22.x
- pnpm 10.x
- MongoDB 7.x
- Git

**Installation:**

\`\`\`bash
git clone https://github.com/mdnuruzzamannirob/stackread-backend.git
cd stackread-backend
pnpm install

# Setup environment
cp .env.example .env
nano .env

# Database setup
pnpm migrate
pnpm seed:all

# Start
pnpm dev          # Terminal 1: API server
pnpm dev:worker   # Terminal 2: Background worker
\`\`\`

**API Documentation:**
- Interactive: http://localhost:5000/api/docs
- OpenAPI: documentation/OpenAPI_v1.json

---

${developmentGuideSection}

---

## Available Commands

${scriptsSection}

---

## Database

**Collections:**
- Users (reader accounts)
- Staff (admin/manager accounts)
- Books (content catalog)
- Subscriptions (active subscriptions)
- Payments (transaction records)
- ReadingProgress (user activity)
- Notifications (user messages)
- Reports (generated outputs)
- AuditLog (administrative events)

**Indexes:** All critical fields indexed. TTL indexes auto-expire tokens (1hr password reset, 24hr email verification).

---

## API Documentation

**Interactive Docs:** http://localhost:5000/api/docs
- 170+ endpoints
- Try-it-out interface
- Code snippets (cURL, JS, Python)
- Full search

**Postman Collection:** documentation/Postman_Collection_v1.json

---

## Testing

\`\`\`bash
pnpm test               # Run all tests
pnpm test:watch        # Watch mode
pnpm test:unit         # Unit tests only
pnpm test:integration  # Integration tests
pnpm test -- --coverage
\`\`\`

---

${performanceSection}

---

${securitySection}

---

${deploymentSection}

---

## Troubleshooting

**MongoDB Connection:** Verify MONGODB_URI, check MongoDB Atlas IP whitelist
**Port in Use:** Kill existing process or use different port: PORT=8000 pnpm dev
**Worker Not Running:** Ensure WORKER_ENABLED=true, check logs
**Type Errors:** Run pnpm typecheck, fix errors
**Validation Errors:** Check request format against Zod schemas

---

${faqSection}

---

## Contributing

**Code Standards:**
- TypeScript strict mode
- Zod schemas for all inputs
- Services for business logic
- Comprehensive error handling
- Unit + integration tests

**Workflow:**
1. Create feature branch
2. Make changes and test locally
3. Run \`pnpm typecheck\` and \`pnpm test\`
4. Commit with conventional format: \`feat(module): description\`
5. Push and open PR

---

## Resources

- **API Reference:** http://localhost:5000/api/docs
- **Repository:** https://github.com/mdnuruzzamannirob/stackread-backend
- **Issues:** Report bugs or request features on GitHub

---

**Last Generated:** ${generatedDate}

Built with ❤️ using Node.js • Express • TypeScript • MongoDB
`

    await fs.writeFile(readmePath, readme, 'utf8')
    process.stdout.write(`✓ Comprehensive README generated\n`)
  } catch (error) {
    process.stderr.write(
      `✗ Failed: ${error instanceof Error ? error.message : String(error)}\n`,
    )
    process.exit(1)
  }
}

run()
