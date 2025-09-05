# Markdown Section CRUD Toolkit (TypeScript) — POC Guide

**Goal:** Build a small, deterministic toolkit to **list**, **view**, **create**, **update/rename**, and **delete** Markdown sections addressed by **heading slugs**, with strict duplicate-heading prevention and safe section boundaries (heading → next same-or-higher depth).

---

## Package Summary (what each is for, and how you’ll use it)

* **`unified` + `remark-parse`** — Parse Markdown into the **MDAST** (typed Markdown AST).
  *Use to turn `.md` text into a tree you can traverse/edit safely.*

* **`mdast-util-to-markdown`** — Serialize the modified AST back to Markdown.
  *Use to write changes back to disk without brittle string hacks.*

* **`mdast-util-heading-range`** — Treat a heading as a **range** (start at this heading, stop at the next heading of ≤ current depth).
  *Use to read/replace a section body deterministically.*

* **`mdast-util-to-string`** — Get the plain text of a heading node.
  *Use to compute titles for slugs.*

* **`github-slugger`** — Compute **deterministic, human-readable slugs** from heading titles.
  *Use for stable section addressing (e.g., `#get-orders-id`).*

* **`unist-util-visit-parents`** — Traverse the AST **with parent stack**.
  *Use to find a heading’s parent context and enforce **duplicate-heading** rules among siblings. (Prefer this over `unist-util-visit` for CRUD where parent context matters.)*

* **`zod`** (optional but recommended) — Input validation for your helper functions/CLI.
  *Use to enforce contracts in examples and tests.*

---

## Install

Pick one:

```bash
# npm
npm i unified remark-parse mdast-util-to-markdown mdast-util-to-string \
      mdast-util-heading-range unist-util-visit-parents github-slugger zod

# or yarn
yarn add unified remark-parse mdast-util-to-markdown mdast-util-to-string \
         mdast-util-heading-range unist-util-visit-parents github-slugger zod

# or pnpm
pnpm add unified remark-parse mdast-util-to-markdown mdast-util-to-string \
         mdast-util-heading-range unist-util-visit-parents github-slugger zod
```

Add type deps if you prefer stricter TS:

```bash
npm i -D @types/node
```

---

## Project scaffold

```
markdown-crud/
├─ src/
│  ├─ fsio.ts              # file I/O helpers (read/write with mtime checks)
│  ├─ slug.ts              # slug policy (strict, no auto-dup suffixes)
│  ├─ parse.ts             # parse → AST, list headings, build TOC
│  ├─ sections.ts          # read/create/update/rename/delete sections by slug
│  └─ demo.ts              # end-to-end demo script
├─ package.json
├─ tsconfig.json
└─ README.md
```

---

## Slug policy (strict & human-readable)

* **Derived from title** (lowercase, spaces→`-`, strip diacritics/punct).
* **No automatic `-1`, `-2` suffixes.**
* If a **sibling** heading would collide, **reject** the operation (caller must rename or update).

```ts
// src/slug.ts
import GithubSlugger from 'github-slugger';

export function titleToSlug(title: string): string {
  // Use static transform (no internal counters) for pure title→slug determinism.
  return GithubSlugger.slug(title);
}
```

---

## File I/O helpers

```ts
// src/fsio.ts
import { promises as fs } from 'node:fs';

export type FileSnapshot = { content: string; mtimeMs: number };

export async function readFileSnapshot(path: string): Promise<FileSnapshot> {
  const [st, buf] = await Promise.all([fs.stat(path), fs.readFile(path)]);
  return { content: buf.toString('utf8'), mtimeMs: st.mtimeMs };
}

export async function writeFileIfUnchanged(path: string, prevMtimeMs: number, nextContent: string) {
  const st = await fs.stat(path);
  if (st.mtimeMs !== prevMtimeMs) {
    throw Object.assign(new Error('Precondition failed: file changed on disk'), { code: 'PRECONDITION_FAILED' });
  }
  await fs.writeFile(path, nextContent, 'utf8');
}
```

---

## Parse & list headings / TOC

```ts
// src/parse.ts
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import { toString } from 'mdast-util-to-string';
import { visitParents } from 'unist-util-visit-parents';
import type { Content, Heading as MdHeading, Root } from 'mdast';
import { titleToSlug } from './slug';

export type Heading = {
  index: number;        // preorder index among headings
  depth: 1|2|3|4|5|6;
  title: string;
  slug: string;
  // For hierarchy:
  parentIndex: number | null; // index of nearest ancestor heading, else null for top-level
};

export function parseMarkdown(markdown: string): Root {
  return unified().use(remarkParse).parse(markdown) as Root;
}

export function listHeadings(markdown: string): Heading[] {
  const tree = parseMarkdown(markdown);
  const out: Heading[] = [];
  const stack: number[] = []; // stack of heading indexes (ancestors)
  let counter = -1;

  visitParents(tree as any, 'heading', (node: MdHeading, parents) => {
    counter++;
    const title = toString(node).trim();
    const slug = titleToSlug(title);
    const depth = Math.max(1, Math.min(6, node.depth)) as 1|2|3|4|5|6;

    // compute parentIndex: nearest heading with smaller depth
    let parentIndex: number | null = null;
    for (let i = parents.length - 1; i >= 0; i--) {
      const p = parents[i] as any as MdHeading;
      if (p.type === 'heading' && p.depth < depth) {
        // find its index in out (walk backwards)
        for (let j = out.length - 1; j >= 0; j--) {
          if (out[j].title === toString(p).trim() && out[j].depth === p.depth) {
            parentIndex = j;
            break;
          }
        }
        break;
      }
    }

    out.push({ index: counter, depth, title, slug, parentIndex });
  });

  return out;
}

// Optional: build a nested TOC tree
export type TocNode = { title: string; slug: string; depth: number; children: TocNode[] };

export function buildToc(markdown: string): TocNode[] {
  const hs = listHeadings(markdown);
  const nodes: TocNode[] = [];
  const byIndex = hs.map(h => ({ title: h.title, slug: h.slug, depth: h.depth, children: [] as TocNode[] }));

  // attach children to nearest ancestor
  byIndex.forEach((n, i) => {
    const h = hs[i];
    if (h.parentIndex == null) nodes.push(n);
    else byIndex[h.parentIndex].children.push(n);
  });
  return nodes;
}
```

---

## Section range ops (read/replace/insert/delete/rename)

```ts
// src/sections.ts
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import { toMarkdown } from 'mdast-util-to-markdown';
import { toString } from 'mdast-util-to-string';
import { headingRange } from 'mdast-util-heading-range';
import type { Root, Heading as MdHeading, Content, Paragraph } from 'mdast';
import { visitParents } from 'unist-util-visit-parents';
import { titleToSlug } from './slug';

// ---------- helpers ----------
function parse(md: string): Root {
  return unified().use(remarkParse).parse(md) as Root;
}

function matchHeadingBySlug(slug: string) {
  return (node: MdHeading) => titleToSlug(toString(node).trim()) === slug;
}

type InsertMode = 'insert_before' | 'insert_after' | 'append_child';

// Returns index of nearest ancestor heading (smaller depth) or null if top-level
function parentHeadingIndex(tree: Root, slug: string): number | null {
  const hs: { node: MdHeading; idx: number }[] = [];
  let counter = -1;
  visitParents(tree as any, 'heading', (node: MdHeading, parents) => {
    counter++;
    hs.push({ node, idx: counter });
  });
  const self = hs.find(h => titleToSlug(toString(h.node).trim()) === slug);
  if (!self) return null;
  // find previous heading with smaller depth
  for (let i = self.idx - 1; i >= 0; i--) {
    if (hs[i].node.depth < self.node.depth) return i;
  }
  return null;
}

// Ensure uniqueness among siblings (no duplicate slugs at same sibling scope)
function ensureUniqueAmongSiblings(tree: Root, parentIdx: number | null, depth: number, newTitle: string) {
  const targetSlug = titleToSlug(newTitle);
  // collect siblings: headings whose parent is parentIdx
  const hs: { node: MdHeading; idx: number }[] = [];
  let counter = -1;
  visitParents(tree as any, 'heading', (node: MdHeading, parents) => {
    counter++;
    hs.push({ node, idx: counter });
  });

  function parentIdxOf(i: number): number | null {
    for (let j = i - 1; j >= 0; j--) {
      if (hs[j].node.depth < hs[i].node.depth) return j;
    }
    return null;
  }

  for (let i = 0; i < hs.length; i++) {
    const pIdx = parentIdxOf(i);
    if (pIdx === parentIdx && hs[i].node.depth === depth) {
      const slug = titleToSlug(toString(hs[i].node).trim());
      if (slug === targetSlug) {
        throw Object.assign(new Error(`Duplicate heading at depth ${depth}: "${newTitle}" (slug: ${targetSlug})`),
                            { code: 'DUPLICATE_HEADING' });
      }
    }
  }
}

// ---------- CRUD ----------

// READ: return section markdown for a heading slug
export function readSection(md: string, slug: string): string | null {
  let captured: string | null = null;
  const tree = parse(md);
  headingRange(tree as any, matchHeadingBySlug(slug), (start, nodes, end) => {
    // Re-serialize only the captured nodes, including the heading line
    const partial: Root = { type: 'root', children: [start, ...nodes, end] as Content[] };
    captured = toMarkdown(partial);
    return [start, ...nodes, end]; // no change
  });
  return captured;
}

// UPDATE (replace body only): keep heading line, replace inner nodes with `newBodyMarkdown`
// `newBodyMarkdown` can include multiple blocks, not just a paragraph.
export function replaceSectionBody(md: string, slug: string, newBodyMarkdown: string): string {
  const tree = parse(md);
  const newBodyTree = parse(newBodyMarkdown);
  // remove leading heading if user accidentally included one
  const sanitizedChildren = (newBodyTree.children ?? []).filter(n => n.type !== 'heading');

  headingRange(tree as any, matchHeadingBySlug(slug), (start, _nodes, end) => {
    return [start, ...sanitizedChildren, end];
  });
  return toMarkdown(tree);
}

// CREATE: insert a new heading (and optional body) relative to an existing slug
export function insertRelative(md: string, refSlug: string, mode: InsertMode, newDepth: 1|2|3|4|5|6, newTitle: string, bodyMarkdown = ''): string {
  const tree = parse(md);

  // Uniqueness among siblings
  const parentIdx = mode === 'append_child'
    ? ((): number | null => {
        // parent is the reference heading itself
        const hs: { node: MdHeading; idx: number }[] = [];
        let c = -1; visitParents(tree as any, 'heading', (node: MdHeading) => { c++; hs.push({ node, idx: c }); });
        const self = hs.find(h => titleToSlug(toString(h.node).trim()) === refSlug);
        return self ? self.idx : null;
      })()
    : ((): number | null => parentHeadingIndex(tree, refSlug))();

  ensureUniqueAmongSiblings(tree, parentIdx, mode === 'append_child' ? (((): number => {
    // child depth = ref.depth + 1
    const hs: { node: MdHeading; idx: number }[] = []; let c=-1;
    visitParents(tree as any, 'heading', (node: MdHeading) => { c++; hs.push({ node, idx: c }); });
    const self = hs.find(h => titleToSlug(toString(h.node).trim()) === refSlug);
    if (!self) throw new Error(`Reference slug not found: ${refSlug}`);
    return Math.min(6, (self.node.depth + 1)) as 1|2|3|4|5|6;
  })()) : newDepth, newTitle);

  const bodyTree = parse(bodyMarkdown);
  const bodyChildren = bodyTree.children.filter(n => n.type !== 'heading');

  const headingNode: MdHeading = {
    type: 'heading',
    depth: mode === 'append_child'
      ? ((): 1|2|3|4|5|6 => {
          // derive child depth = ref.depth + 1
          const hs: { node: MdHeading; idx: number }[] = []; let c=-1;
          visitParents(tree as any, 'heading', (node: MdHeading) => { c++; hs.push({ node, idx: c }); });
          const self = hs.find(h => titleToSlug(toString(h.node).trim()) === refSlug);
          if (!self) throw new Error(`Reference slug not found: ${refSlug}`);
          return Math.min(6, (self.node.depth + 1)) as 1|2|3|4|5|6;
        })()
      : newDepth,
    children: [{ type: 'text', value: newTitle }]
  };

  const insertNodes: Content[] = [headingNode, ...bodyChildren];

  const result = parse(md); // fresh tree for mutation
  headingRange(result as any, matchHeadingBySlug(refSlug), (start, nodes, end) => {
    if (mode === 'insert_before') return [...insertNodes, start, ...nodes, end];
    if (mode === 'insert_after')  return [start, ...nodes, end, ...insertNodes];
    // append_child: put at the *end* of the section body (just before `end`)
    return [start, ...nodes, ...insertNodes, end];
  });
  return toMarkdown(result);
}

// RENAME: change a heading’s title (and implicitly its slug). Prevent sibling collisions.
export function renameHeading(md: string, slug: string, newTitle: string): string {
  const tree = parse(md);
  // compute parentIdx + depth for uniqueness check
  let target: MdHeading | null = null;
  let targetIdx = -1;
  const hs: { node: MdHeading; idx: number }[] = [];
  let c=-1;
  visitParents(tree as any, 'heading', (node: MdHeading) => { c++; hs.push({ node, idx: c }); });
  for (const h of hs) {
    if (titleToSlug(toString(h.node).trim()) === slug) { target = h.node; targetIdx = h.idx; break; }
  }
  if (!target) throw new Error(`Heading not found: ${slug}`);

  // find parent of target
  let parentIdx: number | null = null;
  for (let i = targetIdx - 1; i >= 0; i--) {
    if (hs[i].node.depth < target.depth) { parentIdx = i; break; }
  }

  ensureUniqueAmongSiblings(tree, parentIdx, target.depth as 1|2|3|4|5|6, newTitle);

  // mutate the heading’s text node(s)
  target.children = [{ type: 'text', value: newTitle }];

  return toMarkdown(tree);
}

// DELETE: remove an entire section (heading + its body)
export function deleteSection(md: string, slug: string): string {
  const tree = parse(md);
  headingRange(tree as any, matchHeadingBySlug(slug), (_start, _nodes, _end) => {
    // return empty array to drop the whole range
    return [];
  });
  return toMarkdown(tree);
}
```

---

## End-to-end demo (list, view, create, update, rename, delete)

```ts
// src/demo.ts
import path from 'node:path';
import { readFileSnapshot, writeFileIfUnchanged } from './fsio';
import { listHeadings, buildToc } from './parse';
import { readSection, replaceSectionBody, insertRelative, renameHeading, deleteSection } from './sections';

// Adjust this to your test file
const FILE = path.resolve(process.cwd(), 'example.md');

async function main() {
  // 1) Read + list headings
  let snap = await readFileSnapshot(FILE);
  console.log('TOC:', JSON.stringify(buildToc(snap.content), null, 2));
  console.log('HEADINGS:', listHeadings(snap.content));

  // 2) View a section by slug
  const viewSlug = 'overview'; // e.g., from your file's H2 "Overview"
  const section = readSection(snap.content, viewSlug);
  console.log(`\n=== VIEW: ${viewSlug} ===\n${section}`);

  // 3) Create: append a child under "overview"
  let next = insertRelative(snap.content, viewSlug, 'append_child', 3, 'Key Assumptions', '- Assumption A\n- Assumption B\n');
  await writeFileIfUnchanged(FILE, snap.mtimeMs, next);
  snap = await readFileSnapshot(FILE);

  // 4) Update: replace body of that new child
  const childSlug = 'key-assumptions';
  next = replaceSectionBody(snap.content, childSlug, '1. A revised assumption\n2. Another point\n');
  await writeFileIfUnchanged(FILE, snap.mtimeMs, next);
  snap = await readFileSnapshot(FILE);

  // 5) Rename heading (slug will change due to title change)
  next = renameHeading(snap.content, childSlug, 'Assumptions & Constraints');
  await writeFileIfUnchanged(FILE, snap.mtimeMs, next);
  snap = await readFileSnapshot(FILE);

  // 6) Delete the section
  const newSlug = 'assumptions-constraints';
  next = deleteSection(snap.content, newSlug);
  await writeFileIfUnchanged(FILE, snap.mtimeMs, next);

  console.log('\nDone. Inspect file for changes.');
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
```

**Sample `example.md` to test against:**

```md
# Project Alpha

## Overview
This project does X.

## Endpoints
### GET /items
Return a list of items.

### POST /items
Create an item.
```

Run:

```bash
ts-node src/demo.ts
# or compile with tsc and run node
```

---

## Behavioral guarantees & notes

* **Deterministic boundaries:** Section scope is **from heading line to the next heading** of depth ≤ current (or EOF).
* **Strict no-duplicate siblings:** Operations that would create duplicate slugs **throw** with code `DUPLICATE_HEADING`.
* **Title changes ⇒ new slug:** By default, renaming a heading changes its derived slug.

  * If you want stable IDs independent of title, support an explicit ID syntax (e.g., `## Title {#stable-id}`) and prefer that over derived slugs in your own code.
* **Precondition on write:** `writeFileIfUnchanged` ensures you don’t clobber concurrent edits; re-read and retry if you get `PRECONDITION_FAILED`.
* **Safety:** Insert/update functions sanitize user bodies to avoid accidental nested headings unless intended.

---

## What you can do now (quick checklist)

* [x] Install packages
* [x] Drop the `src/*.ts` files above
* [x] Create an `example.md`
* [x] Run `demo.ts` to exercise **list → view → create → update → rename → delete**
* [x] Adapt the helpers into your app or wrap them behind your own API

This POC is intentionally **index-free** and **real-time**: it parses on demand, enforces sibling uniqueness, and serializes back to Markdown with predictable, LLM-friendly structure.
