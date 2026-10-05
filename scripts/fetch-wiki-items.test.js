import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { isAvailableAtCap, parseItem } from './fetch-wiki-items.mjs'

describe('wiki item normalization', () => {
  it('extracts slots, classes, stats, and lore from Itempage wikitext', () => {
    const parsed = parseItem('Dragoon Dirk', `{{Classic Era}}\n{{Itempage\n|statsblock = MAGIC ITEM LORE ITEM<br>\nSlot: RANGE PRIMARY SECONDARY<br>\nAC: 2 DEX: +2<br>\nSV MAGIC: +3<br>\nClass: WAR RNG WIZ<br>\nRace: ALL<br>\n|dropsfrom =\n[[West Commonlands]]\n* [[Dragoon Zytl]]\n|relatedquests =\n* [[Leatherfoot Raiders]] ([[Rivervale]])\n}}`)
    assert.deepEqual(parsed.slots, ['RANGE', 'PRIMARY', 'SECONDARY'])
    assert.deepEqual(parsed.classes, ['WAR', 'RNG', 'WIZ'])
    assert.deepEqual(parsed.stats, { AC: 2, DEX: 2, 'SV MAGIC': 3 })
    assert.equal(parsed.lore, true)
    assert.equal(parsed.era, 'Classic')
    assert.equal(parsed.requiredLevel, null)
    assert.deepEqual(parsed.sources, [
      { type: 'Drop', name: 'Dragoon Zytl', url: 'https://eqlwiki.com/Dragoon_Zytl', zone: 'West Commonlands', zoneUrl: 'https://eqlwiki.com/West_Commonlands' },
      { type: 'Quest', name: 'Leatherfoot Raiders', url: 'https://eqlwiki.com/Leatherfoot_Raiders', zone: 'Rivervale', zoneUrl: 'https://eqlwiki.com/Rivervale' },
    ])
  })

  it('rejects post-Classic and above-cap equipment', () => {
    const velious = parseItem('Ancient Wurm Hide Greaves', `{{Velious Era}}\n{{Itempage\n|statsblock = Slot: LEGS<br>AC: 46<br>Class: ALL<br>\n}}`)
    const level51 = parseItem('Too High', `{{Classic Era}}\n{{Itempage\n|statsblock = Slot: FEET<br>AC: 20<br>Required level of 51.<br>Class: ALL<br>\n}}`)
    assert.equal(velious.era, 'Velious')
    assert.equal(level51.requiredLevel, 51)
    assert.equal(isAvailableAtCap(velious, 50), false)
    assert.equal(isAvailableAtCap(level51, 50), false)
  })

  it('rejects an incorrect Classic tag when the source is post-Classic', () => {
    const mislabeled = parseItem('Cold Steel Bracelet', `{{Classic Era}}\n{{Itempage\n|statsblock = Slot: WRIST<br>AC: 14<br>Class: WAR CLR PAL SHD BRD<br>\n|dropsfrom =\n[[Velketor's Labyrinth]]\n* [[Ular Icepaw]]\n}}`)
    assert.equal(isAvailableAtCap(mislabeled, 50), false)
  })
})
