// Keeps the shared header of the unscoped alias package's README in step with
// the main README, so the promo block, docs links and star ask are written once.
//
// The two files are NOT copies: the alias has its own badges above the shared
// region and its own "this is an alias" body below it. Only the region between
// the markers is synced.
//
// Usage: node scripts/sync-alias-readme.mjs <source> <target> [--check]

import { readFileSync, writeFileSync } from 'node:fs'

const START = '<!-- shared-header:start -->'
const END = '<!-- shared-header:end -->'

const [source, target] = process.argv.slice(2)
const check = process.argv.includes('--check')

if (!source || !target) {
  console.error('usage: node scripts/sync-alias-readme.mjs <source> <target> [--check]')
  process.exit(2)
}

/** The text between the markers, markers excluded. */
function region (text, file) {
  const from = text.indexOf(START)
  const to = text.indexOf(END)
  if (from === -1 || to === -1) throw new Error(`${file} is missing ${from === -1 ? START : END}`)
  if (to < from) throw new Error(`${file} has ${END} before ${START}`)
  return text.slice(from + START.length, to)
}

const sourceText = readFileSync(source, 'utf8')
const targetText = readFileSync(target, 'utf8')

const shared = region(sourceText, source)
const current = region(targetText, target)

if (shared === current) {
  console.log(`${target} is already in step with ${source}`)
  process.exit(0)
}

if (check) {
  console.error(`${target} is out of step with ${source}. Run: node scripts/sync-alias-readme.mjs ${source} ${target}`)
  process.exit(1)
}

const from = targetText.indexOf(START)
const to = targetText.indexOf(END)
writeFileSync(target, targetText.slice(0, from + START.length) + shared + targetText.slice(to))
console.log(`updated ${target} from ${source}`)
