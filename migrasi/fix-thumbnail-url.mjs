/**
 * fix-thumbnail-url.mjs
 * Strips the leading `markets/` prefix from thumbnail_url in product_markets.
 * Run: node migrasi/fix-thumbnail-url.mjs
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const envPath = join(__dirname, '..', '.env')

const env = Object.fromEntries(
  readFileSync(envPath, 'utf-8')
    .split('\n')
    .filter(l => l.trim() && !l.trim().startsWith('#') && l.includes('='))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] })
)

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false }
})

// Fetch all records with thumbnail_url starting with 'markets/'
const { data, error } = await supabase
  .from('product_markets')
  .select('id, thumbnail_url')
  .like('thumbnail_url', 'markets/%')

if (error) {
  console.error('❌  Failed to fetch records:', error.message)
  process.exit(1)
}

if (!data || data.length === 0) {
  console.log('✅  No records need fixing (no thumbnail_url starts with markets/).')
  process.exit(0)
}

console.log(`🔍  Found ${data.length} records to fix:\n`)

let fixed = 0, failed = 0

for (const row of data) {
  const newUrl = row.thumbnail_url.replace(/^markets\//, '')
  console.log(`  ${row.id}`)
  console.log(`    before: ${row.thumbnail_url}`)
  console.log(`    after : ${newUrl}`)

  const { error: updateError } = await supabase
    .from('product_markets')
    .update({ thumbnail_url: newUrl })
    .eq('id', row.id)

  if (updateError) {
    console.error(`    ❌  FAILED: ${updateError.message}`)
    failed++
  } else {
    console.log(`    ✅  Updated`)
    fixed++
  }
}

console.log('\n─────────────────────────────────────────')
console.log(`📋  Summary:  ✅ Fixed: ${fixed}   ❌ Failed: ${failed}`)
if (failed === 0) {
  console.log('\n🎉  All thumbnail_url values have been fixed!')
  console.log('    Images should now display correctly in the app.')
}
