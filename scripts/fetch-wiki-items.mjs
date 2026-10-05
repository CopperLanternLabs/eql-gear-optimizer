import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const API = 'https://eqlwiki.com/api.php'
const OUTPUT = path.resolve('public/data/items.json')
const USER_AGENT = 'eql-gear-optimizer/0.1 (https://github.com/johnfking/eql-gear-optimizer)'
const SLOT_CATEGORIES = ['Arms','Back','Chest','Ear','Face','Feet','Fingers','Hands','Head','Legs','Neck','Primary','Range','Secondary','Shoulders','Waist','Wrist']
const STAT_NAMES = ['AC','HP','MANA','STR','STA','DEX','AGI','INT','WIS','CHA','SV FIRE','SV COLD','SV MAGIC','SV DISEASE','SV POISON']
const CLASS_CODES = ['WAR','CLR','PAL','RNG','SHD','DRU','MNK','BRD','ROG','SHM','NEC','WIZ','MAG','ENC','BST','BER']
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

function wikiUrl(title) {
  return `https://eqlwiki.com/${encodeURIComponent(title.replaceAll(' ', '_'))}`
}

function fieldValue(text, name) {
  return text.match(new RegExp(`\\|${name}\\s*=([\\s\\S]*?)(?=\\n\\s*\\|[\\w_]+\\s*=|\\n\\s*}})`, 'i'))?.[1]?.trim() || ''
}

function wikiLinks(line) {
  return [...line.matchAll(/\[\[:?([^\]|#]+)(?:#[^\]|]+)?(?:\|([^\]]+))?\]\]/g)].map((match) => ({
    title: match[1].trim(),
    name: (match[2] || match[1]).trim(),
    url: wikiUrl(match[1].trim()),
  }))
}

function plainText(value) {
  return value
    .replace(/\{\{[^}]+}}/g, '')
    .replace(/\[https?:\/\/\S+\s+([^\]]+)]/g, '$1')
    .replace(/\[\[:?([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_match, title, label) => label || title)
    .replace(/'{2,}/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\([^)]*(?:rare|always|chance|classic)[^)]*\)/ig, '')
    .trim()
}

function parseSources(value, type) {
  if (!value) return []
  const sources = []
  let zone = null
  for (const rawLine of value.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line) continue
    const links = wikiLinks(line)
    const isListItem = /^\*+/.test(line)
    if (!isListItem && links.length) {
      zone = links[0]
      continue
    }
    if (!isListItem) continue
    const primary = links[0]
    const inlineZone = type === 'Quest' ? links[1] : null
    const fallbackName = plainText(line.replace(/^\*+\s*/, ''))
    if (!primary && !fallbackName) continue
    sources.push({
      type,
      name: primary?.name || fallbackName,
      url: primary?.url || null,
      zone: inlineZone?.name || zone?.name || null,
      zoneUrl: inlineZone?.url || zone?.url || null,
    })
  }
  return sources
}

async function api(params) {
  const url = new URL(API)
  for (const [key, value] of Object.entries({ ...params, format: 'json', formatversion: '2', origin: '*' })) url.searchParams.set(key, value)
  for (let attempt = 0; attempt < 4; attempt++) {
    const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT } })
    if (response.ok) return response.json()
    if (response.status !== 429 && response.status < 500) throw new Error(`Wiki API ${response.status}: ${await response.text()}`)
    await delay(800 * (attempt + 1))
  }
  throw new Error('Wiki API remained unavailable after retries')
}

export function parseItem(title, text) {
  const block = fieldValue(text, 'statsblock')
  if (!block) return null
  const clean = block.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, ' ').replace(/&nbsp;|\u00a0/g, ' ')
  const slotLine = clean.match(/(?:^|\n)\s*Slots?\s*:\s*([^\n]+)/i)?.[1]
  const classLine = clean.match(/(?:^|\n)\s*Class(?:es)?\s*:\s*([^\n]+)/i)?.[1]
  if (!slotLine || !classLine) return null
  const slots = [...new Set(slotLine.toUpperCase().replace(/FINGER\b/g, 'FINGERS').match(/ARMS|BACK|CHEST|EAR|FACE|FEET|FINGERS|HANDS|HEAD|LEGS|NECK|PRIMARY|RANGE|SECONDARY|SHOULDERS|WAIST|WRIST/g) || [])]
  const classes = /\bALL\b/i.test(classLine) ? ['ALL'] : CLASS_CODES.filter((code) => new RegExp(`\\b${code}\\b`).test(classLine.toUpperCase()))
  if (!slots.length || !classes.length) return null
  const stats = {}
  for (const stat of STAT_NAMES) {
    const escaped = stat.replace(' ', '\\s*')
    const match = clean.match(new RegExp(`(?:^|[\\s])${escaped}\\s*:\\s*([+-]?\\d+)`, 'i'))
    if (match) stats[stat] = Number(match[1])
  }
  if (!Object.keys(stats).length) return null
  const sources = [
    ...parseSources(fieldValue(text, 'dropsfrom'), 'Drop'),
    ...parseSources(fieldValue(text, 'relatedquests'), 'Quest'),
    ...parseSources(fieldValue(text, 'soldby'), 'Vendor'),
    ...parseSources(fieldValue(text, 'playercrafted'), 'Crafted'),
  ]
  return {
    name: title,
    slots,
    classes,
    stats,
    lore: /\bLORE (?:ITEM|EQUIPPED)\b/i.test(clean),
    wikiUrl: wikiUrl(title),
    sources,
  }
}

async function categoryTitles(category) {
  const titles = []
  let cmcontinue
  do {
    const data = await api({ action: 'query', list: 'categorymembers', cmtitle: `Category:${category}`, cmnamespace: '0', cmtype: 'page', cmlimit: '500', ...(cmcontinue ? { cmcontinue } : {}) })
    titles.push(...data.query.categorymembers.map((page) => page.title))
    cmcontinue = data.continue?.cmcontinue
  } while (cmcontinue)
  return titles
}

async function fetchItems(titles) {
  const items = []
  for (let index = 0; index < titles.length; index += 50) {
    const batch = titles.slice(index, index + 50)
    const data = await api({ action: 'query', prop: 'revisions', rvprop: 'content', rvslots: 'main', titles: batch.join('|') })
    for (const page of data.query.pages) {
      const text = page.revisions?.[0]?.slots?.main?.content || ''
      const item = parseItem(page.title, text)
      if (item) items.push(item)
    }
    if ((index / 50) % 10 === 0) process.stdout.write(`Normalized ${Math.min(index + 50, titles.length)}/${titles.length} pages\n`)
    await delay(75)
  }
  return items
}

async function main() {
  const titleGroups = await Promise.all(SLOT_CATEGORIES.map(categoryTitles))
  let titles = [...new Set(titleGroups.flat())].sort((a, b) => a.localeCompare(b))
  const limit = Number(process.env.EQL_ITEM_LIMIT || 0)
  if (limit > 0) titles = titles.slice(0, limit)
  const items = await fetchItems(titles)
  const payload = {
    meta: { generatedAt: new Date().toISOString(), source: 'https://eqlwiki.com/', license: 'CC BY-SA 3.0', pagesScanned: titles.length },
    items: items.sort((a, b) => a.name.localeCompare(b.name)),
  }
  await fs.mkdir(path.dirname(OUTPUT), { recursive: true })
  await fs.writeFile(OUTPUT, `${JSON.stringify(payload, null, 2)}\n`)
  process.stdout.write(`Wrote ${items.length} equippable items to ${OUTPUT}\n`)
}

if (path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch((error) => { console.error(error); process.exitCode = 1 })
