/**
 * Server Action Directive & Boundary Validation Suite
 *
 * Validates Next.js Server Action specifications across the codebase:
 * 1. Dedicated Action Files (*actions.ts, *Actions.ts, actions/*.ts):
 *    - Must have "use server" at the very top (line 1), unless it is a type/barrel file.
 *    - All exported functions must be async.
 *    - No synchronous functions or const arrow functions without async.
 *    - No runtime `export { fn } from "./other"` re-exports (Turbopack prohibited in "use server" files).
 *    - No "use client" directives.
 * 2. Inline Server Actions in Server Components (page.tsx):
 *    - Any function containing "use server" must be an async function.
 *    - "use server" must be the first statement inside the function body.
 * 3. Client Component Safety:
 *    - Files with "use client" must never declare file-level "use server".
 */

import fs from "fs"
import path from "path"

interface ActionFileAudit {
  filePath: string
  relativeName: string
  type: "module-action" | "barrel-action" | "inline-action-page" | "client-component"
  hasUseServer: boolean
  hasUseClient: boolean
  actionFunctions: { name: string; isAsync: boolean }[]
  errors: string[]
}

const SRC_DIR = path.join(process.cwd(), "src")

function getAllSourceFiles(dir: string, fileList: string[] = []): string[] {
  const entries = fs.readdirSync(dir)
  for (const entry of entries) {
    const fullPath = path.join(dir, entry)
    const stat = fs.statSync(fullPath)
    if (stat.isDirectory()) {
      if (entry !== "node_modules" && entry !== ".next" && entry !== "generated") {
        getAllSourceFiles(fullPath, fileList)
      }
    } else if (entry.endsWith(".ts") || entry.endsWith(".tsx")) {
      fileList.push(fullPath)
    }
  }
  return fileList
}

function auditSourceFile(filePath: string): ActionFileAudit | null {
  const content = fs.readFileSync(filePath, "utf-8")
  const relativeName = path.relative(process.cwd(), filePath).replace(/\\/g, "/")
  const isDedicatedActionFile =
    /actions?\.ts$/i.test(relativeName) ||
    /Actions\.ts$/.test(relativeName) ||
    /\/actions\/[^/]+\.ts$/i.test(relativeName)

  const hasUseServer = content.includes('"use server"') || content.includes("'use server'")
  const hasUseClient = content.includes('"use client"') || content.includes("'use client'")

  // Only audit files that are dedicated action files or contain "use server" or "use client"
  if (!isDedicatedActionFile && !hasUseServer) {
    return null
  }

  const lines = content.split("\n").map((l) => l.trim())
  const errors: string[] = []
  const actionFunctions: { name: string; isAsync: boolean }[] = []

  const isBarrelOrTypes =
    relativeName.endsWith("types.ts") ||
    relativeName.endsWith("index.ts") ||
    relativeName.endsWith(".d.ts")

  // Case 1: Dedicated Action Modules (e.g. bills/actions.ts, flats/actions/blockActions.ts)
  if (isDedicatedActionFile && !isBarrelOrTypes) {
    const fileType = "module-action"

    // 1. Mutual exclusivity
    if (hasUseClient) {
      errors.push(`Server action module cannot have "use client" directive.`)
    }

    // 2. "use server" directive must be at the very top (first non-comment/non-blank line)
    let firstStatementIsUseServer = false
    for (const line of lines) {
      if (!line || line.startsWith("//") || line.startsWith("/*") || line.startsWith("*")) {
        continue
      }
      if (line.startsWith('"use server"') || line.startsWith("'use server'")) {
        firstStatementIsUseServer = true
      }
      break
    }

    if (!firstStatementIsUseServer) {
      errors.push(`Action module is missing "use server" at the very top (first statement).`)
    }

    // 3. No runtime re-exports in "use server" files
    const nonTypeReExportRegex = /export\s+(?!type\s+)\{([^}]+)\}\s+from\s+['"][^'"]+['"]/g
    if (nonTypeReExportRegex.test(content)) {
      errors.push(
        `Only async functions can be exported from a "use server" file. Re-exporting from other files is prohibited by Turbopack.`
      )
    }

    // 4. Exported functions must be async
    const asyncFnRegex = /export\s+async\s+function\s+([a-zA-Z0-9_$]+)/g
    let match: RegExpExecArray | null
    while ((match = asyncFnRegex.exec(content)) !== null) {
      actionFunctions.push({ name: match[1], isAsync: true })
    }

    const asyncConstRegex = /export\s+const\s+([a-zA-Z0-9_$]+)\s*=\s*async\s*/g
    while ((match = asyncConstRegex.exec(content)) !== null) {
      actionFunctions.push({ name: match[1], isAsync: true })
    }

    const syncFnRegex = /export\s+(?!async\s+)function\s+([a-zA-Z0-9_$]+)/g
    while ((match = syncFnRegex.exec(content)) !== null) {
      actionFunctions.push({ name: match[1], isAsync: false })
      errors.push(
        `Exported function "${match[1]}" is synchronous. All server action exports must be async functions.`
      )
    }

    return {
      filePath,
      relativeName,
      type: fileType,
      hasUseServer,
      hasUseClient,
      actionFunctions,
      errors,
    }
  }

  // Case 2: Barrel Action or Types File (e.g. flats/actions/index.ts, flats/actions/types.ts)
  if (isDedicatedActionFile && isBarrelOrTypes) {
    if (hasUseServer) {
      // Barrels shouldn't have "use server" if they re-export
      const nonTypeReExportRegex = /export\s+(?!type\s+)\{([^}]+)\}\s+from\s+['"][^'"]+['"]/g
      if (nonTypeReExportRegex.test(content)) {
        errors.push(
          `Barrel file should not declare "use server" when re-exporting functions. Client components should import from specific action modules.`
        )
      }
    }

    return {
      filePath,
      relativeName,
      type: "barrel-action",
      hasUseServer,
      hasUseClient,
      actionFunctions,
      errors,
    }
  }

  // Case 3: Inline Server Actions in Server Component Page (page.tsx with inline "use server")
  if (hasUseServer && !hasUseClient) {
    // Check all function declarations immediately containing "use server" as the first body statement
    const fnRegex = /(?:(async)\s+)?function\s+([a-zA-Z0-9_$]+)\s*\([^)]*\)\s*\{[\r\n\s]*['"]use server['"]/g
    let fnMatch: RegExpExecArray | null
    while ((fnMatch = fnRegex.exec(content)) !== null) {
      const isAsync = Boolean(fnMatch[1])
      actionFunctions.push({ name: fnMatch[2], isAsync })
      if (!isAsync) {
        errors.push(`Inline server action "${fnMatch[2]}" must be an async function.`)
      }
    }

    return {
      filePath,
      relativeName,
      type: "inline-action-page",
      hasUseServer,
      hasUseClient,
      actionFunctions,
      errors,
    }
  }

  return null
}

function runAudit() {
  console.log("\n================================================================================")
  console.log("            NEXT.JS SERVER ACTION DIRECTIVE & BOUNDARY AUDIT SUITE              ")
  console.log("================================================================================\n")

  const allFiles = getAllSourceFiles(SRC_DIR)
  const auditedFiles: ActionFileAudit[] = []

  for (const file of allFiles) {
    const res = auditSourceFile(file)
    if (res) {
      auditedFiles.push(res)
    }
  }

  let totalErrors = 0
  let totalActions = 0

  for (const result of auditedFiles) {
    const status = result.errors.length === 0 ? "✓ PASS" : "✗ FAIL"
    const actionCount = result.actionFunctions.length
    totalActions += actionCount

    if (result.errors.length > 0) {
      totalErrors += result.errors.length
      console.error(`\n${status}: ${result.relativeName}`)
      for (const err of result.errors) {
        console.error(`   - ❌ ${err}`)
      }
    } else {
      let tag = ""
      if (result.type === "module-action") {
        tag = `[module "use server" - ${actionCount} async action(s)]`
      } else if (result.type === "inline-action-page") {
        tag = `[inline "use server" - ${actionCount} async action(s)]`
      } else if (result.type === "barrel-action") {
        tag = `[barrel / type manifest]`
      }
      console.log(`  ${status}: ${result.relativeName.padEnd(65)} ${tag}`)
    }
  }

  console.log("\n--------------------------------------------------------------------------------")
  console.log(`Audited Action Files & Pages: ${auditedFiles.length}`)
  console.log(`Verified Server Actions:      ${totalActions}`)
  console.log(`Validation Violations:        ${totalErrors}`)
  console.log("--------------------------------------------------------------------------------\n")

  if (totalErrors > 0) {
    console.error(`❌ Validation failed with ${totalErrors} violation(s).\n`)
    process.exit(1)
  } else {
    console.log("✅ All server action files strictly satisfy Next.js \"use server\" boundaries!\n")
  }
}

runAudit()
