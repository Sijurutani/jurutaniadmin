/**
 * migrate-storage.mjs
 *
 * Copies all files from bucket `markets-attachments/markets/*`
 * to bucket `markets/*` (stripping the leading `markets/` prefix from the path).
 *
 * Usage:
 *   node migrasi/migrate-storage.mjs           # dry-run (preview only)
 *   node migrasi/migrate-storage.mjs --execute  # actually copy files
 *   node migrasi/migrate-storage.mjs --execute --delete-src  # copy + delete source
 *
 * Requires: .env file with SUPABASE_URL and SUPABASE_SERVICE_KEY
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

// ─── Read .env ────────────────────────────────────────────────────────────────
const __dirname = dirname(fileURLToPath(import.meta.url))
const envPath = join(__dirname, '..', '.env')

function parseEnv(filePath) {
  try {
    return Object.fromEntries(
      readFileSync(filePath, 'utf-8')
        .split('\n')
        .filter(line => line.trim() && !line.trim().startsWith('#') && line.includes('='))
        .map(line => {
          const idx = line.indexOf('=')
          return [line.slice(0, idx).trim(), line.slice(idx + 1).trim()]
        })
    )
  } catch {
    return {}
  }
}

const env = { ...parseEnv(envPath), ...process.env }

const SUPABASE_URL = env.SUPABASE_URL
const SERVICE_KEY = env.SUPABASE_SERVICE_KEY

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌  SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in .env')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false }
})

const SRC_BUCKET = 'markets-attachments'
const DST_BUCKET = 'markets'
const SRC_FOLDER = 'markets' // the sub-folder inside markets-attachments to migrate

const DRY_RUN = !process.argv.includes('--execute')
const DELETE_SRC = process.argv.includes('--delete-src')

if (DRY_RUN) {
  console.log('🔍  DRY-RUN mode — no files will be written. Pass --execute to apply.\n')
} else {
  console.log('🚀  EXECUTE mode — files will be copied.\n')
  if (DELETE_SRC) console.log('🗑   DELETE SOURCE mode — source files will be removed after copy.\n')
}

// ─── List all files recursively ───────────────────────────────────────────────
async function listFilesRecursive(bucket, prefix, depth = 0) {
  if (depth > 5) return [] // safety guard
  const { data, error } = await supabase.storage
    .from(bucket)
    .list(prefix, { limit: 1000, offset: 0, sortBy: { column: 'name', order: 'asc' } })

  if (error) throw new Error(`list(${bucket}/${prefix}): ${error.message}`)

  const files = []
  for (const item of data ?? []) {
    const fullPath = `${prefix}/${item.name}`
    if (item.id) {
      // It's a file (has an ID) — skip empty placeholder files
      if (item.name === '.emptyFolderPlaceholder') continue
      files.push({ path: fullPath, size: item.metadata?.size ?? 0, mime: item.metadata?.mimetype ?? 'application/octet-stream' })
    } else {
      // It's a folder — recurse
      const sub = await listFilesRecursive(bucket, fullPath, depth + 1)
      files.push(...sub)
    }
  }
  return files
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  // Ensure destination bucket exists
  if (!DRY_RUN) {
    const { data: buckets } = await supabase.storage.listBuckets()
    const exists = (buckets ?? []).some(b => b.name === DST_BUCKET)
    if (!exists) {
      console.log(`📦  Creating bucket [${DST_BUCKET}] (public) ...`)
      const { error } = await supabase.storage.createBucket(DST_BUCKET, { public: true })
      if (error) {
        console.error(`❌  Failed to create bucket: ${error.message}`)
        process.exit(1)
      }
      console.log(`✅  Bucket [${DST_BUCKET}] created.\n`)
    } else {
      console.log(`✅  Bucket [${DST_BUCKET}] already exists.\n`)
    }
  }

  console.log(`📦  Listing files in  [${SRC_BUCKET}/${SRC_FOLDER}] ...`)
  const sourceFiles = await listFilesRecursive(SRC_BUCKET, SRC_FOLDER)

  if (sourceFiles.length === 0) {
    console.log('⚠️   No files found. Nothing to migrate.')
    return
  }

  console.log(`✅  Found ${sourceFiles.length} file(s).\n`)

  let copied = 0, skipped = 0, failed = 0
  const srcToDelete = []

  for (const file of sourceFiles) {
    // Strip the leading `markets/` prefix for the destination path
    const destPath = file.path.replace(/^markets\//, '')
    const srcPath = file.path

    const srcUrl = `${SUPABASE_URL}/storage/v1/object/public/${SRC_BUCKET}/${srcPath}`
    console.log(`  ${DRY_RUN ? '[DRY]' : '→'} ${srcPath}`)
    console.log(`       → [${DST_BUCKET}] ${destPath}  (${(file.size / 1024).toFixed(1)} KB)`)

    if (DRY_RUN) {
      skipped++
      continue
    }

    try {
      // Download from source using public URL (bucket is public)
      const response = await fetch(srcUrl)
      if (!response.ok) throw new Error(`HTTP ${response.status} – ${srcUrl}`)
      const blob = await response.arrayBuffer()

      // Upload to destination
      const { error: uploadErr } = await supabase.storage
        .from(DST_BUCKET)
        .upload(destPath, blob, {
          contentType: file.mime,
          upsert: true
        })

      if (uploadErr) throw new Error(`upload error: ${uploadErr.message}`)

      console.log(`       ✅  Copied`)
      copied++
      srcToDelete.push(srcPath)
    } catch (err) {
      console.error(`       ❌  FAILED: ${err.message}`)
      failed++
    }
  }

  // Delete source files if requested and all copies succeeded
  if (DELETE_SRC && srcToDelete.length > 0 && failed === 0) {
    console.log(`\n🗑   Deleting ${srcToDelete.length} source file(s) from [${SRC_BUCKET}] ...`)
    const CHUNK = 100
    for (let i = 0; i < srcToDelete.length; i += CHUNK) {
      const chunk = srcToDelete.slice(i, i + CHUNK)
      const { error } = await supabase.storage.from(SRC_BUCKET).remove(chunk)
      if (error) console.error(`  ❌  Delete batch failed: ${error.message}`)
      else console.log(`  ✅  Deleted ${chunk.length} files`)
    }
  } else if (DELETE_SRC && failed > 0) {
    console.warn('\n⚠️   Skipped source deletion because some copies failed.')
  }

  console.log('\n─────────────────────────────────────────')
  if (DRY_RUN) {
    console.log(`📋  DRY-RUN summary: ${sourceFiles.length} files would be copied.`)
    console.log(`    Run with --execute to apply.`)
  } else {
    console.log(`📋  Migration summary:`)
    console.log(`    ✅  Copied : ${copied}`)
    console.log(`    ❌  Failed : ${failed}`)
    if (failed === 0) {
      console.log('\n🎉  Storage migration complete!')
      console.log('    Next step: run the SQL migration to fix thumbnail_url in product_markets.')
      console.log('    File: supabase/migrations/20260308000002_fix_markets_thumbnail_url.sql')
    }
  }
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
