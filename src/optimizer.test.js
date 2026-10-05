import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { isEquipable, optimize } from './optimizer.js'

const item = (name, slots, classes, ac, lore = false) => ({ name, slots, classes, stats: { AC: ac }, lore, wikiUrl: '#' })

describe('trio equipability', () => {
  it('uses OR semantics across the three selected classes', () => {
    assert.equal(isEquipable(item('Robe', ['CHEST'], ['WIZ'], 5), ['WAR', 'CLR', 'WIZ']), true)
    assert.equal(isEquipable(item('Tunic', ['CHEST'], ['MNK'], 5), ['WAR', 'CLR', 'WIZ']), false)
    assert.equal(isEquipable(item('Band', ['FINGERS'], ['ALL'], 5), ['WAR', 'CLR', 'WIZ']), true)
  })
})

describe('optimizer', () => {
  it('fills both EQL ANY slots from all equippable gear', () => {
    const result = optimize([item('Cap', ['HEAD'], ['WAR'], 10)], ['WAR', 'CLR', 'WIZ'], { AC: 1 })
    assert.equal(result.gear.find((slot) => slot.label === 'ANY 1').item.name, 'Cap')
    assert.equal(result.gear.find((slot) => slot.label === 'ANY 2').item.name, 'Cap')
  })

  it('does not duplicate lore items', () => {
    const result = optimize([item('Lore Cap', ['HEAD'], ['WAR'], 10, true)], ['WAR'], { AC: 1 })
    assert.equal(result.gear.filter((slot) => slot.item?.name === 'Lore Cap').length, 1)
  })
})
