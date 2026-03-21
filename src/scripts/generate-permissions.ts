import { promises as fs } from 'node:fs'
import path from 'node:path'

import mongoose from 'mongoose'

import { env } from '../config/env'
import { logger } from '../config/logger'
import { PermissionModel } from '../modules/rbac/model'

type PermissionSeed = {
  key: string
  name: string
  module: string
}

const PROJECT_ROOT = path.resolve(__dirname, '..', '..')
const MODULES_DIR = path.resolve(PROJECT_ROOT, 'src', 'modules')
const PERMISSIONS_FILE = path.resolve(
  PROJECT_ROOT,
  'src',
  'common',
  'constants',
  'permissions.ts',
)

const ROUTER_FILE_PATTERNS = [/\.router\.ts$/, /router\.ts$/]
const PERMISSION_REGEX = /requirePermission\(\s*(['"])([^'"]+)\1\s*\)/g
const PERMISSION_REF_REGEX =
  /requirePermission\(\s*PERMISSIONS\.([A-Z0-9_]+)\s*\)/g
const PERMISSION_FORMAT_REGEX = /^[a-z]+\.[a-z]+$/

const isRouterFile = (fileName: string): boolean =>
  ROUTER_FILE_PATTERNS.some((pattern) => pattern.test(fileName))

const toPascalCase = (value: string): string =>
  value
    .split(/[-_.\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('')

const toConstKey = (permission: string): string =>
  permission.replace('.', '_').toUpperCase()

const toPermissionName = (permission: string): string => {
  const [module = '', action = ''] = permission.split('.')
  return `${toPascalCase(action)} ${toPascalCase(module)}`
}

const findRouterFiles = async (dirPath: string): Promise<string[]> => {
  const entries = await fs.readdir(dirPath, { withFileTypes: true })
  const files = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(dirPath, entry.name)

      if (entry.isDirectory()) {
        return findRouterFiles(fullPath)
      }

      if (entry.isFile() && isRouterFile(entry.name)) {
        return [fullPath]
      }

      return []
    }),
  )

  return files.flat()
}

const extractPermissionsFromFile = async (
  filePath: string,
): Promise<string[]> => {
  const content = await fs.readFile(filePath, 'utf8')
  const matches = [...content.matchAll(PERMISSION_REGEX)]

  return matches
    .map((match) => match[2])
    .filter((value): value is string => Boolean(value))
}

const extractPermissionRefsFromFile = async (
  filePath: string,
): Promise<string[]> => {
  const content = await fs.readFile(filePath, 'utf8')
  const matches = [...content.matchAll(PERMISSION_REF_REGEX)]

  return matches
    .map((match) => match[1])
    .filter((value): value is string => Boolean(value))
}

const permissionFromConstRef = (permissionRef: string): string | null => {
  const parts = permissionRef.toLowerCase().split('_')

  if (parts.length < 2) {
    return null
  }

  const action = parts.at(-1)
  const moduleName = parts.slice(0, -1).join('_')

  if (!action || !moduleName) {
    return null
  }

  const permission = `${moduleName}.${action}`
  return PERMISSION_FORMAT_REGEX.test(permission) ? permission : null
}

const buildPermissionConstantsSource = (permissions: string[]): string => {
  const grouped = permissions.reduce<Record<string, string[]>>(
    (acc, permission) => {
      const [module = ''] = permission.split('.')

      if (!module) {
        return acc
      }

      if (!acc[module]) {
        acc[module] = []
      }

      acc[module].push(permission)
      return acc
    },
    {},
  )

  const moduleNames = Object.keys(grouped).sort((a, b) => a.localeCompare(b))
  const permissionLines: string[] = []

  for (const moduleName of moduleNames) {
    permissionLines.push(`  // ${toPascalCase(moduleName)}`)

    const modulePermissions = [...(grouped[moduleName] ?? [])].sort((a, b) =>
      a.localeCompare(b),
    )

    for (const permission of modulePermissions) {
      const constantKey = toConstKey(permission)
      permissionLines.push(`  ${constantKey}: "${permission}",`)
    }

    permissionLines.push('')
  }

  if (permissionLines[permissionLines.length - 1] === '') {
    permissionLines.pop()
  }

  const permissionsBlock =
    permissionLines.length > 0
      ? permissionLines.join('\n')
      : '  // No permissions found'

  return `// THIS FILE IS AUTO-GENERATED
// Run: pnpm generate:permissions
// Do NOT edit manually

export const PERMISSIONS = {
${permissionsBlock}
} as const

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS]

export const ALL_PERMISSIONS = Object.values(PERMISSIONS) as PermissionKey[]

const _dupeCheck = new Set(ALL_PERMISSIONS)
if (_dupeCheck.size !== ALL_PERMISSIONS.length) {
  throw new Error('Duplicate permissions detected.')
}

export interface PermissionSeed {
  key: string
  name: string
  module: string
}

export const PERMISSION_SEEDS: PermissionSeed[] = ALL_PERMISSIONS.map((key) => {
  const [mod = '', action = ''] = key.split('.')

  return {
    key,
    name:
      action.charAt(0).toUpperCase() +
      action.slice(1) +
      ' ' +
      mod.charAt(0).toUpperCase() +
      mod.slice(1),
    module: mod,
  }
})
`
}

const run = async (): Promise<void> => {
  const routerFiles = await findRouterFiles(MODULES_DIR)
  const discoveredPermissions = new Set<string>()
  const invalidPermissions = new Set<string>()
  const fallbackRefPermissions = new Set<string>()

  for (const routerFile of routerFiles) {
    const extracted = await extractPermissionsFromFile(routerFile)

    for (const permission of extracted) {
      if (!PERMISSION_FORMAT_REGEX.test(permission)) {
        invalidPermissions.add(permission)
        continue
      }

      discoveredPermissions.add(permission)
    }

    if (extracted.length === 0) {
      const permissionRefs = await extractPermissionRefsFromFile(routerFile)

      for (const permissionRef of permissionRefs) {
        const permissionFromRef = permissionFromConstRef(permissionRef)

        if (!permissionFromRef) {
          invalidPermissions.add(permissionRef)
          continue
        }

        fallbackRefPermissions.add(permissionFromRef)
      }
    }
  }

  if (discoveredPermissions.size === 0 && fallbackRefPermissions.size > 0) {
    logger.warn(
      'No literal requirePermission("module.action") entries found; using PERMISSIONS.* references as fallback.',
    )

    for (const fallbackPermission of fallbackRefPermissions) {
      discoveredPermissions.add(fallbackPermission)
    }
  }

  for (const invalidPermission of invalidPermissions) {
    logger.warn(
      `Skipping invalid permission '${invalidPermission}'. Expected format: module.action`,
    )
  }

  const permissions = [...discoveredPermissions].sort((a, b) =>
    a.localeCompare(b),
  )
  const source = buildPermissionConstantsSource(permissions)

  await fs.writeFile(PERMISSIONS_FILE, source, 'utf8')

  await mongoose.connect(env.mongodbUri)

  try {
    const permissionSeeds: PermissionSeed[] = permissions.map((permission) => {
      const [module = ''] = permission.split('.')

      return {
        key: permission,
        name: toPermissionName(permission),
        module,
      }
    })

    await Promise.all(
      permissionSeeds.map((permission) =>
        PermissionModel.updateOne(
          { key: permission.key },
          { $set: permission },
          { upsert: true },
        ),
      ),
    )

    const moduleCount = new Set(
      permissions.map((permission) => permission.split('.')[0]),
    ).size

    logger.info(
      `Generated ${permissions.length} permissions across ${moduleCount} modules`,
    )
  } finally {
    await mongoose.disconnect()
  }
}

void run().catch((error) => {
  logger.error('Permission generation failed.', {
    error:
      error instanceof Error ? (error.stack ?? error.message) : String(error),
  })
  process.exit(1)
})
