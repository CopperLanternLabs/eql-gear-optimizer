import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { parseItem } from './fetch-wiki-items.mjs'

describe('wiki item normalization', () => {
  it('extracts slots, classes, stats, and lore from Itempage wikitext', () => {
    const parsed = parseItem('Dragoon Dirk', `{{Itempage\n|statsblock = MAGIC ITEM LORE ITEM<br>\nSlot: RANGE PRIMARY SECONDARY<br>\nAC: 2 DEX: +2<br>\nSV MAGIC: +3<br>\nClass: WAR RNG WIZ<br>\nRace: ALL<br>\n|dropsfrom = x\n}}`)
    assert.deepEqual(parsed.slots, ['RANGE', 'PRIMARY', 'SECONDARY'])
    assert.deepEqual(parsed.classes, ['WAR', 'RNG', 'WIZ'])
    assert.deepEqual(parsed.stats, { AC: 2, DEX: 2, 'SV MAGIC': 3 })
    assert.equal(parsed.lore, true)
  })
})
