export const CLASSES = [
  ['WAR', 'Warrior'], ['CLR', 'Cleric'], ['PAL', 'Paladin'], ['RNG', 'Ranger'],
  ['SHD', 'Shadow Knight'], ['DRU', 'Druid'], ['MNK', 'Monk'], ['BRD', 'Bard'],
  ['ROG', 'Rogue'], ['SHM', 'Shaman'], ['NEC', 'Necromancer'], ['WIZ', 'Wizard'],
  ['MAG', 'Magician'], ['ENC', 'Enchanter'], ['BST', 'Beastlord'], ['BER', 'Berserker'],
]

export const STATS = ['AC', 'HP', 'MANA', 'STR', 'STA', 'DEX', 'AGI', 'INT', 'WIS', 'CHA', 'SV FIRE', 'SV COLD', 'SV MAGIC', 'SV DISEASE', 'SV POISON']

export const EQUIPMENT_SLOTS = [
  ['EAR 1', 'EAR'], ['HEAD', 'HEAD'], ['FACE', 'FACE'], ['EAR 2', 'EAR'],
  ['NECK', 'NECK'], ['SHOULDERS', 'SHOULDERS'], ['ARMS', 'ARMS'], ['BACK', 'BACK'],
  ['WRIST 1', 'WRIST'], ['WRIST 2', 'WRIST'], ['RANGE', 'RANGE'], ['HANDS', 'HANDS'],
  ['PRIMARY', 'PRIMARY'], ['SECONDARY', 'SECONDARY'], ['FINGER 1', 'FINGERS'], ['FINGER 2', 'FINGERS'],
  ['CHEST', 'CHEST'], ['LEGS', 'LEGS'], ['FEET', 'FEET'], ['WAIST', 'WAIST'],
  ['ANY 1', 'ANY'], ['ANY 2', 'ANY'],
]

export function isEquipable(item, trio) {
  return item.classes.includes('ALL') || trio.some((classCode) => item.classes.includes(classCode))
}

export function scoreItem(item, weights) {
  return Object.entries(weights).reduce((sum, [stat, weight]) => sum + (item.stats[stat] || 0) * weight, 0)
}

export function optimize(items, trio, weights) {
  const equipable = items.filter((item) => isEquipable(item, trio) && scoreItem(item, weights) > 0)
  let beam = [{ score: 0, gear: [], lore: new Set() }]

  for (const [label, slot] of EQUIPMENT_SLOTS) {
    const candidates = equipable
      .filter((item) => slot === 'ANY' || item.slots.includes(slot))
      .sort((a, b) => scoreItem(b, weights) - scoreItem(a, weights))
      .slice(0, 35)
    const choices = [null, ...candidates]
    const next = []
    for (const state of beam) {
      for (const item of choices) {
        if (item?.lore && state.lore.has(item.name)) continue
        const lore = new Set(state.lore)
        if (item?.lore) lore.add(item.name)
        next.push({
          score: state.score + (item ? scoreItem(item, weights) : 0),
          gear: [...state.gear, { label, item }],
          lore,
        })
      }
    }
    beam = next.sort((a, b) => b.score - a.score).slice(0, 500)
  }
  return beam[0] || { score: 0, gear: [], lore: new Set() }
}

export function totalStats(gear) {
  return gear.reduce((totals, { item }) => {
    if (!item) return totals
    for (const [stat, value] of Object.entries(item.stats)) totals[stat] = (totals[stat] || 0) + value
    return totals
  }, {})
}
