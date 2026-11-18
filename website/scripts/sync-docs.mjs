// Generates the Docusaurus docs from the markdown that already lives in the
// repository root, so README.md stays the single
// source of truth and the site can never drift away from them.
//
// Run via `yarn sync` (also runs automatically before `start` and `build`).

import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, '..', '..')
const OUT = join(HERE, '..', 'docs')

const REPO = 'https://github.com/kesha-antonov/react-native-action-cable'
const BRANCH = 'master'

/**
 * Canonical key for a heading or a link anchor.
 *
 * GitHub and Docusaurus slugify headings slightly differently (emoji and
 * variation selectors are the painful part), so instead of reimplementing
 * either algorithm we reduce both sides to letters and digits only. That is
 * stable enough to match `#-features` against `## ✨ Features`, and we then
 * emit explicit `{#key}` anchors so the generated site uses these keys too.
 */
const key = (text) => text.toLowerCase().replace(/[^a-z0-9]/g, '')

/** Pages, in sidebar order. `from` is either README sections or a whole file. */
const PAGES = [
  {
    id: "intro",
    slug: "/",
    title: "React Native ActionCable",
    sidebarLabel: "Introduction",
    description:
      "Use Rails ActionCable channels from React Native over WebSocket, with AppState-driven reconnects and no window or document polyfills.",
    keywords: ["rails actioncable react native", "react native websocket rails"],
    sections: ["✨ Features"],
    headTitle: "Rails ActionCable for React Native - WebSocket Channels",
    lead: true,
    install: "📦 Installation",
  },
  {
    id: "installation",
    title: "Installation",
    sidebarLabel: "Installation",
    description:
      "Install @kesha-antonov/react-native-action-cable with Yarn or npm. The unscoped react-native-action-cable package is an alias that re-exports it in full.",
    keywords: ["react-native-action-cable install"],
    sections: ["📦 Installation"],
    excerpts: [{ section: "🚀 Quick Start", heading: "1. Create a consumer", title: "Create a consumer", next: "quick-start" }],
  },
  {
    id: "quick-start",
    title: "Quick start",
    sidebarLabel: "Quick start",
    description:
      "Connect React Native to Rails ActionCable in four steps: create a consumer, subscribe to a channel, send messages with perform and unsubscribe on cleanup.",
    keywords: ["actioncable subscribe react native"],
    sections: ["🚀 Quick Start"],
  },
  {
    id: "api",
    title: "API reference",
    sidebarLabel: "API reference",
    description:
      "API reference for React Native ActionCable: createConsumer and getOrCreateConsumer, consumer and Cable methods, Channel events, perform and unsubscribe.",
    keywords: ["actioncable api react native"],
    sections: ["📚 API Reference"],
  },
  {
    id: "advanced",
    title: "Advanced usage",
    sidebarLabel: "Advanced usage",
    description:
      "Authentication headers, reusing one connection across hot reloads, error handling, a React hook, Rails style channel mixins and custom action events.",
    keywords: ["actioncable auth headers", "actioncable reconnect"],
    sections: ["⚙️ Advanced Usage"],
  },
  {
    id: "testing",
    title: "Testing",
    sidebarLabel: "Testing",
    description:
      "Mock @kesha-antonov/react-native-action-cable in Jest to test components without a live Rails server, and run the library's own Jest suite and type check.",
    keywords: ["actioncable testing react native"],
    sections: ["🧪 Testing"],
  },
  {
    id: "examples",
    title: "Examples",
    sidebarLabel: "Examples",
    description:
      "Example projects for React Native ActionCable: a complete chat app with a Rails backend, Apollo GraphQL subscriptions, and Jest mocks and testing patterns.",
    keywords: ["actioncable example"],
    sections: ["📂 Examples"],
    exampleReadmes: ["examples/complete-chat-app", "examples/apollo-graphql", "examples/testing"],
  },
  {
    id: "contributing",
    title: "Contributing and credits",
    sidebarLabel: "Contributing",
    description:
      "How to contribute to React Native ActionCable with a pull request, and its origins in action-cable-react and the Rails ActionCable JavaScript client.",
    keywords: ["contributing"],
    sections: ["🤝 Contributing", "👏 Credits"],
  },
]

const read = (relative) => readFileSync(join(ROOT, relative), 'utf8')

/**
 * Splits a markdown document into top-level (`##`) sections, ignoring headings
 * that appear inside fenced code blocks.
 */
function splitSections (markdown) {
  const lines = markdown.split('\n')
  const sections = new Map()
  let current = null
  let fenced = false

  for (const line of lines) {
    if (/^\s*(```|~~~)/.test(line)) fenced = !fenced

    const heading = !fenced && /^## (.+?)\s*$/.exec(line)
    if (heading) {
      current = { title: heading[1], lines: [] }
      sections.set(current.title, current)
      continue
    }
    if (current) current.lines.push(line)
  }

  return sections
}

/** Collects every heading in a chunk of markdown, outside of code fences. */
function headingsIn (markdown) {
  const found = []
  let fenced = false
  for (const line of markdown.split('\n')) {
    if (/^\s*(```|~~~)/.test(line)) fenced = !fenced
    const m = !fenced && /^(#{1,6}) (.+?)\s*$/.exec(line)
    if (m) found.push(m[2])
  }
  return found
}

/** Drops a "## Table of Contents" section - Docusaurus renders its own. */
function stripTableOfContents (markdown) {
  return markdown.replace(/^##+ Table of Contents\s*$[\s\S]*?(?=^##? )/m, '')
}

/**
 * Promotes headings by one level and gives each an explicit `{#key}` anchor so
 * that generated links resolve to a slug we control rather than one inferred
 * from emoji.
 */
function normaliseHeadings (markdown, depth) {
  let fenced = false
  return markdown
    .split('\n')
    .map((line) => {
      if (/^\s*(```|~~~)/.test(line)) {
        fenced = !fenced
        return line
      }
      if (fenced) return line

      const m = /^(#{1,6}) (.+?)\s*$/.exec(line)
      if (!m) return line
      if (/\{#[^}]+\}\s*$/.test(m[2])) return line

      const level = Math.max(2, m[1].length - depth)
      return `${'#'.repeat(level)} ${m[2]} {#${key(m[2])}}`
    })
    .join('\n')
}

// Build the anchor -> page map before rendering, so cross-page links resolve.
const readme = read('README.md')
const readmeSections = splitSections(readme)
const anchorToPage = new Map()

for (const page of PAGES) {
  const bodies = page.sections
    ? page.sections.map((title) => {
        const section = readmeSections.get(title)
        if (!section) throw new Error(`README section not found: "${title}". Update website/scripts/sync-docs.mjs.`)
        return `## ${section.title}\n${section.lines.join('\n')}`
      })
    : [read(page.file)]

  page.raw = bodies.join('\n\n')

  // When a page is built from a single README section, that section's own
  // heading just repeats the page title, so it is dropped and its subheadings
  // are promoted one level. Links that pointed at it become links to the page.
  page.droppedHeading = page.sections?.length === 1 ? key(page.sections[0]) : null

  for (const heading of headingsIn(page.raw)) {
    if (!anchorToPage.has(key(heading))) anchorToPage.set(key(heading), page.id)
  }
}

/** Anchors that no longer exist because their heading became the page title. */
const droppedAnchors = new Map(
  PAGES.filter((page) => page.droppedHeading).map((page) => [page.droppedHeading, page.id])
)

/**
 * Resolves a canonical anchor key to a markdown link, or null if it is unknown.
 * Anchors whose heading was dropped resolve to the page itself.
 */
function linkTo (k, pageId) {
  const droppedOn = droppedAnchors.get(k)
  if (droppedOn) return `](./${droppedOn}.md)`

  const target = anchorToPage.get(k)
  if (!target) return null
  return target === pageId ? `](#${k})` : `](./${target}.md#${k})`
}

/** Rewrites README/GitHub-relative links to links between generated pages. */
function rewriteLinks (markdown, pageId) {
  const fileRoutes = []

  let out = markdown

  for (const [pattern, target] of fileRoutes) {
    out = out.replace(pattern, (_match, hash) => {
      const anchor = hash ? `#${key(hash.slice(1))}` : ''
      return `](./${target}.md${anchor})`
    })
  }

  // Links back into README.md from the standalone docs files.
  out = out.replace(/\]\(\.\.?\/?README\.md(#[^)]*)?\)/g, (_match, hash) => {
    if (!hash) return '](./intro.md)'
    return linkTo(key(hash.slice(1)), pageId) ?? '](./intro.md)'
  })

  // Plain in-page anchors, which may now live on a different page.
  out = out.replace(/\]\(#([^)]+)\)/g, (match, anchor) => linkTo(key(anchor), pageId) ?? match)

  // Repository files and folders that have no page of their own: point them at
  // GitHub instead of letting them resolve to a 404 inside the docs site.
  out = out.replace(/\]\(\.?\/?(LICENSE|CHANGELOG\.md|llms\.txt|[A-Z][A-Z_]+(?:\.[a-z]+)?)\)/g, `](${REPO}/blob/${BRANCH}/$1)`)
  out = out.replace(/\]\(\.?\/?(examples?|src|scripts|docs|__tests__)\/?\)/g, `](${REPO}/tree/${BRANCH}/$1)`)
  out = out.replace(/\]\(\.?\/?((?:examples?|src|scripts|docs|__tests__)\/[^)\s]+)\)/g, (_match, path) => {
    // A path without a file extension is a folder, which GitHub serves under tree/.
    const kind = /\.[A-Za-z0-9]+$/.test(path) ? 'blob' : 'tree'
    return `](${REPO}/${kind}/${BRANCH}/${path})`
  })

  // Root-level markdown with no page of its own (AGENTS.md, MIGRATION.md, ...).
  // Links the generator itself produced point at a page id and are left alone.
  out = out.replace(/\]\(\.?\/?([A-Za-z0-9_.-]+\.md)(#[^)]*)?\)/g, (match, file) => {
    const id = file.replace(/\.md$/, '')
    if (PAGES.some((page) => page.id === id)) return match
    return `](${REPO}/blob/${BRANCH}/${file})`
  })

  return out
}

function frontmatter (page, index) {
  const fields = [
    `title: ${JSON.stringify(page.title)}`,
    `sidebar_label: ${JSON.stringify(page.sidebarLabel)}`,
    `sidebar_position: ${index + 1}`,
    `description: ${JSON.stringify(page.description)}`,
  ]
  if (page.slug) fields.push(`slug: ${JSON.stringify(page.slug)}`)
  // A browser title that differs from the heading. The frontmatter title stays
  // the visible h1, and src/theme/MDXContent puts this one into <title>.
  if (page.headTitle) fields.push(`head_title: ${JSON.stringify(page.headTitle)}`)
  if (page.keywords?.length) fields.push(`keywords: [${page.keywords.map((k) => JSON.stringify(k)).join(', ')}]`)
  return `---\n${fields.join('\n')}\n---\n`
}

/** The one-sentence summary that sits under the title in the README header. */
function readmeLead (markdown) {
  const m = /<h1[^>]*>[^<]*<\/h1>\s*<p[^>]*>\s*([^<]+?)\s*<\/p>/.exec(markdown)
  if (!m) throw new Error('README summary paragraph not found. Update website/scripts/sync-docs.mjs.')
  return m[1].replace(/\s+/g, ' ')
}

function sectionLines (title) {
  const section = readmeSections.get(title)
  if (!section) throw new Error(`README section not found: "${title}". Update website/scripts/sync-docs.mjs.`)
  return section.lines
}

/** Fenced code blocks of a README section, each returned with its fences. */
function codeBlocksIn (title) {
  const blocks = []
  let block = null
  for (const line of sectionLines(title)) {
    const fence = /^\s*(```|~~~)/.test(line)
    if (fence && !block) {
      block = [line]
      continue
    }
    if (block) block.push(line)
    if (fence) {
      blocks.push(block.join('\n'))
      block = null
    }
  }
  return blocks
}

/** The body of one subsection of a README section, without its heading. */
function subsection (title, heading) {
  const found = []
  let inside = false
  let fenced = false
  for (const line of sectionLines(title)) {
    if (/^\s*(```|~~~)/.test(line)) fenced = !fenced
    const m = !fenced && /^#{3,6} (.+?)\s*$/.exec(line)
    if (m) {
      if (inside) break
      inside = m[1] === heading
      continue
    }
    if (inside) found.push(line)
  }
  if (!found.length) throw new Error(`README subsection not found: "${heading}". Update website/scripts/sync-docs.mjs.`)
  return found.join('\n').trim()
}

/**
 * Parts of the README that a page repeats from a section owned by another
 * page: the summary and install commands on the landing page, a first snippet
 * on the installation page. They are added after the anchor map is built, so
 * links keep pointing at the page that owns the section.
 */
function extras (page) {
  const before = []
  const after = []

  if (page.lead) before.push(readmeLead(readme))

  if (page.install) {
    const target = PAGES.find((other) => other.id === 'installation')
    after.push(`## ${target.title} {#install}\n\n${codeBlocksIn(page.install).join('\n\n')}\n\nMore in [${target.title}](./${target.id}.md).`)
  }

  for (const excerpt of page.excerpts ?? []) {
    const next = PAGES.find((other) => other.id === excerpt.next)
    const more = next ? `\n\nContinue with [${next.title}](./${next.id}.md).` : ''
    after.push(`## ${excerpt.title} {#${key(excerpt.title)}}\n\n${subsection(excerpt.section, excerpt.heading)}${more}`)
  }

  for (const dir of page.exampleReadmes ?? []) {
    const { title, summary } = exampleSummary(dir)
    after.push(`## ${title} {#${key(title)}}\n\n${summary}\n\n[\`${dir}\`](${REPO}/tree/${BRANCH}/${dir})`)
  }
  return { before, after }
}

/** The title and opening paragraph of an example's own README. */
function exampleSummary (dir) {
  const text = read(`${dir}/README.md`)
  const title = /^# (.+?)\s*$/m.exec(text)
  const summary = text
    .split(/\n\s*\n/)
    .map((chunk) => chunk.trim())
    .find((chunk) => chunk && !chunk.startsWith('#'))
  if (!title || !summary) throw new Error(`No title or opening paragraph in ${dir}/README.md.`)
  return { title: title[1], summary: summary.replace(/\s+/g, ' ') }
}
rmSync(OUT, { recursive: true, force: true })
mkdirSync(OUT, { recursive: true })

PAGES.forEach((page, index) => {
  let body = stripTableOfContents(page.raw)
  // Standalone files lead with an `# H1` that the frontmatter title replaces.
  body = body.replace(/^#\s+.+?\n/, '')

  // Same for a single README section: its `##` heading is the page title.
  let depth = 0
  if (page.droppedHeading) {
    body = body.replace(/^##\s+.+?\n/, '')
    depth = 1
  }

  body = normaliseHeadings(body, depth)

  const { before, after } = extras(page)
  // A README section can end with a horizontal rule, which would otherwise sit
  // between it and the parts added below.
  if (after.length) body = body.trim().replace(/\n---$/, '')
  body = [...before, body.trim(), ...after].join('\n\n')

  body = rewriteLinks(body, page.id)

  const source = page.file ?? 'README.md'
  const note = `<!-- Generated from ${source} by website/scripts/sync-docs.mjs - edit that file, not this one. -->\n`

  writeFileSync(join(OUT, `${page.id}.md`), `${frontmatter(page, index)}\n${note}\n${body.trim()}\n`)
})

console.log(`Generated ${PAGES.length} pages into website/docs from README.md`)
