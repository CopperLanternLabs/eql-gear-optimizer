export function normalizeItemName(name = '') {
  return name
    .normalize('NFKC')
    .replace(/[‘’]/g, "'")
    .replace(/\s+\+(\d{1,2})\s*$/i, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

export function parseInventoryText(text, fileName = 'Inventory.txt') {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter((line) => line.trim())
  if (!lines.length) throw new Error(`${fileName} is empty`)
  const header = lines[0].split('\t').map((value) => value.trim().toLowerCase())
  const locationIndex = header.indexOf('location')
  const nameIndex = header.indexOf('name')
  const idIndex = header.indexOf('id')
  const countIndex = header.indexOf('count')
  if (locationIndex < 0 || nameIndex < 0) throw new Error(`${fileName} is not an EQL inventory export`)

  return lines.slice(1).flatMap((line) => {
    const fields = line.split('\t')
    const name = fields[nameIndex]?.trim()
    const location = fields[locationIndex]?.trim()
    if (!name || !location || /^empty$/i.test(name)) return []
    const rank = Number(name.match(/\s\+(\d{1,2})\s*$/)?.[1] || 0)
    const count = Math.max(1, Number.parseInt(fields[countIndex], 10) || 1)
    return [{
      name: name.replace(/\s+\+\d{1,2}\s*$/, ''),
      key: normalizeItemName(name),
      id: fields[idIndex]?.trim() || null,
      count,
      rank,
      location,
      fileName,
    }]
  })
}

export function mergeInventory(records) {
  const ownership = new Map()
  const sharedBankRows = new Set()
  for (const record of records) {
    const sharedKey = /shared\s*bank/i.test(record.location)
      ? `${record.location.toLowerCase()}|${record.id || record.key}`
      : null
    if (sharedKey && sharedBankRows.has(sharedKey)) continue
    if (sharedKey) sharedBankRows.add(sharedKey)

    const current = ownership.get(record.key) || { count: 0, highestRank: 0, locations: [] }
    current.count += record.count
    current.highestRank = Math.max(current.highestRank, record.rank)
    const location = `${record.fileName}: ${record.location}`
    if (!current.locations.includes(location)) current.locations.push(location)
    ownership.set(record.key, current)
  }
  return ownership
}

export function annotateGearOwnership(gear, ownership) {
  const used = new Map()
  return gear.map((entry) => {
    if (!entry.item || !ownership) return { ...entry, ownership: null }
    const key = normalizeItemName(entry.item.name)
    const copy = (used.get(key) || 0) + 1
    used.set(key, copy)
    const inventory = ownership.get(key)
    return {
      ...entry,
      ownership: inventory ? { ...inventory, copy, owned: copy <= inventory.count } : { count: 0, highestRank: 0, locations: [], copy, owned: false },
    }
  })
}

