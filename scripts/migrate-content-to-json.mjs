/**
 * One-time migration: src/content/*.ts → public/content.json
 * Run: npx tsx scripts/migrate-content-to-json.mjs
 */
import { writeFileSync, mkdirSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath, pathToFileURL } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

const contentUrl = pathToFileURL(join(root, 'src/content/index.ts')).href
const { ALL_CONTENT } = await import(contentUrl)

const out = {
  version: 1,
  updatedAt: new Date().toISOString().slice(0, 10),
  items: ALL_CONTENT,
}

const outPath = join(root, 'public', 'content.json')
mkdirSync(dirname(outPath), { recursive: true })
writeFileSync(outPath, JSON.stringify(out, null, 2), 'utf-8')
console.log(`Wrote ${ALL_CONTENT.length} items to public/content.json`)
