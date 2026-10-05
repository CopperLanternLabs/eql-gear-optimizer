import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { annotateGearOwnership, mergeInventory, normalizeItemName, parseInventoryText } from './inventory.js'

describe('EQL inventory import', () => {
  it('parses the tab-separated game export and normalizes upgrade ranks', () => {
    const records = parseInventoryText('Location\tName\tID\tCount\tSlots\nBank1\tFlowing Black Silk Sash +7\t123\t1\t0\nGeneral1\tEmpty\t0\t0\t0\n', 'Ayla-Inventory.txt')
    assert.deepEqual(records, [{ name: 'Flowing Black Silk Sash', key: 'flowing black silk sash', id: '123', count: 1, rank: 7, location: 'Bank1', fileName: 'Ayla-Inventory.txt' }])
    assert.equal(normalizeItemName('  Flowing  Black Silk Sash +10 '), 'flowing black silk sash')
  })

  it('merges characters without double-counting their shared bank', () => {
    const first = parseInventoryText('Location\tName\tID\tCount\tSlots\nSharedBank1\tGolden Efreeti Boots\t456\t1\t0\nBank1\tGolden Efreeti Boots\t456\t1\t0\n', 'Ayla.txt')
    const second = parseInventoryText('Location\tName\tID\tCount\tSlots\nSharedBank1\tGolden Efreeti Boots\t456\t1\t0\n', 'Borin.txt')
    const owned = mergeInventory([...first, ...second]).get('golden efreeti boots')
    assert.equal(owned.count, 2)
    assert.equal(owned.locations.length, 2)
  })

  it('uses owned quantities when the loadout recommends multiple copies', () => {
    const ownership = mergeInventory(parseInventoryText('Location\tName\tID\tCount\tSlots\nBank1\tPlatinum Fire Wedding Ring\t789\t1\t0\n', 'Ayla.txt'))
    const item = { name: 'Platinum Fire Wedding Ring' }
    const gear = annotateGearOwnership([{ label: 'FINGER 1', item }, { label: 'FINGER 2', item }], ownership)
    assert.equal(gear[0].ownership.owned, true)
    assert.equal(gear[1].ownership.owned, false)
  })
})

