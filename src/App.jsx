import { useEffect, useMemo, useState } from 'react'
import { CLASSES, STATS, optimize, totalStats, upgradeStats } from './optimizer.js'
import { annotateGearOwnership, mergeInventory, normalizeItemName, parseInventoryText } from './inventory.js'

const DATA_URL = `${import.meta.env.BASE_URL}data/items.json`

function decodeInventoryFile(buffer) {
  const bytes = new Uint8Array(buffer)
  if (bytes[0] === 0xff && bytes[1] === 0xfe) return new TextDecoder('utf-16le').decode(bytes)
  if (bytes[0] === 0xfe && bytes[1] === 0xff) return new TextDecoder('utf-16be').decode(bytes)
  const looksUtf16 = bytes.slice(0, 100).filter((byte, index) => index % 2 === 1 && byte === 0).length > 10
  return new TextDecoder(looksUtf16 ? 'utf-16le' : 'utf-8').decode(bytes)
}

function ClassPicker({ trio, onChange }) {
  const toggle = (code) => {
    if (trio.includes(code)) onChange(trio.filter((value) => value !== code))
    else if (trio.length < 3) onChange([...trio, code])
  }
  return <div className="class-grid">
    {CLASSES.map(([code, name]) => <button key={code} className={trio.includes(code) ? 'class-chip active' : 'class-chip'} onClick={() => toggle(code)} disabled={!trio.includes(code) && trio.length === 3}>
      <span>{code}</span>{name}
    </button>)}
  </div>
}

function StatPicker({ selected, setSelected }) {
  return <div className="stat-grid">
    {STATS.map((stat) => <button key={stat} className={selected === stat ? 'stat active' : 'stat'} onClick={() => setSelected(stat)}>{stat}</button>)}
  </div>
}

function Source({ source }) {
  return <div className="source-row">
    <span>{source.type}</span>
    {source.zone && <>{source.zoneUrl ? <a href={source.zoneUrl} target="_blank" rel="noreferrer">{source.zone}</a> : <b>{source.zone}</b>}<i>→</i></>}
    {source.url ? <a href={source.url} target="_blank" rel="noreferrer">{source.name}</a> : <b>{source.name}</b>}
  </div>
}

function Sources({ sources = [] }) {
  if (!sources.length) return <div className="source-missing">Source not listed on the wiki</div>
  if (sources.length === 1) return <div className="sources"><Source source={sources[0]} /></div>
  return <div className="sources"><Source source={sources[0]} /><details><summary>+{sources.length - 1} more {sources.length === 2 ? 'source' : 'sources'}</summary><div>{sources.slice(1).map((source, index) => <Source key={`${source.type}-${source.name}-${index}`} source={source} />)}</div></details></div>
}

function App() {
  const [items, setItems] = useState([])
  const [meta, setMeta] = useState({})
  const [trio, setTrio] = useState(['WAR', 'CLR', 'WIZ'])
  const [target, setTarget] = useState('AC')
  const [upgradeLevel, setUpgradeLevel] = useState(0)
  const [query, setQuery] = useState('')
  const [inventory, setInventory] = useState(null)
  const [inventorySummary, setInventorySummary] = useState(null)
  const [inventoryError, setInventoryError] = useState('')
  const [ownershipFilter, setOwnershipFilter] = useState('all')
  const [error, setError] = useState('')

  useEffect(() => {
    fetch(DATA_URL).then((res) => {
      if (!res.ok) throw new Error(`Dataset returned ${res.status}`)
      return res.json()
    }).then((data) => { setItems(data.items); setMeta(data.meta) }).catch((err) => setError(err.message))
  }, [])

  const result = useMemo(() => optimize(items, trio, { [target]: 1 }, upgradeLevel), [items, trio, target, upgradeLevel])
  const totals = useMemo(() => totalStats(result.gear, upgradeLevel), [result, upgradeLevel])
  const annotatedGear = useMemo(() => annotateGearOwnership(result.gear, inventory), [result.gear, inventory])
  const ownedRecommendations = inventory ? annotatedGear.filter(({ ownership }) => ownership?.owned).length : 0
  const visibleGear = annotatedGear.filter(({ item, label, ownership }) => {
    const matchesQuery = !query || `${label} ${item?.name || ''}`.toLowerCase().includes(query.toLowerCase())
    const matchesOwnership = ownershipFilter === 'all' || (ownershipFilter === 'owned' ? ownership?.owned : !ownership?.owned)
    return matchesQuery && matchesOwnership
  })

  const importInventory = async (event) => {
    const files = [...event.target.files]
    if (!files.length) return
    try {
      const groups = await Promise.all(files.map(async (file) => parseInventoryText(decodeInventoryFile(await file.arrayBuffer()), file.name)))
      const records = groups.flat()
      const nextInventory = mergeInventory(records)
      const catalog = new Set(items.map((item) => normalizeItemName(item.name)))
      const matched = [...nextInventory.entries()].filter(([key]) => catalog.has(key))
      setInventory(nextInventory)
      setInventorySummary({ files: files.length, rows: records.length, distinct: nextInventory.size, matched: matched.length })
      setInventoryError('')
      setOwnershipFilter('all')
    } catch (err) {
      setInventoryError(err.message)
    } finally {
      event.target.value = ''
    }
  }

  const clearInventory = () => {
    setInventory(null)
    setInventorySummary(null)
    setInventoryError('')
    setOwnershipFilter('all')
  }

  return <>
    <header className="hero">
      <div className="hero-top"><span className="eyebrow">A community planning tool</span><span className="rune">✦</span></div>
      <h1>EQL <em>Gear</em> Optimizer</h1>
      <p>Build the strongest kit for your three-class character. Pick a trio, choose the stat that matters, and let the archive do the sorting.</p>
      <div className="badge-row"><div className="data-badge"><i /> {items.length ? `${items.length.toLocaleString()} items indexed` : 'Loading the archive…'}</div><div className="era-badge">Classic era · Level 50</div></div>
    </header>

    <main>
      <section className="panel setup">
        <div className="section-heading"><span>01</span><div><h2>Choose your trio</h2><p>An item qualifies when <strong>any one</strong> of your three classes can equip it.</p></div><b>{trio.length}/3</b></div>
        <ClassPicker trio={trio} onChange={setTrio} />
      </section>

      <section className="panel setup">
        <div className="section-heading"><span>02</span><div><h2>Name your priority</h2><p>Every slot is scored against this target stat.</p></div></div>
        <StatPicker selected={target} setSelected={setTarget} />
      </section>

      <section className="panel setup">
        <div className="section-heading"><span>03</span><div><h2>Set item potential</h2><p>Compare every candidate at the same EQL upgrade tier.</p></div><b className="tier-value">+{upgradeLevel}</b></div>
        <div className="tier-control"><input aria-label="Item upgrade tier" type="range" min="0" max="10" step="1" value={upgradeLevel} onChange={(event) => setUpgradeLevel(Number(event.target.value))} /><div className="tier-scale">{Array.from({ length: 11 }, (_, tier) => <button key={tier} className={tier === upgradeLevel ? 'active' : ''} onClick={() => setUpgradeLevel(tier)}>+{tier}</button>)}</div><p><strong>{upgradeLevel * 10}% cumulative scaling</strong> · Positive stats gain at least +1 per tier; displayed values are rounded down.</p></div>
      </section>

      <section className="panel setup">
        <div className="section-heading"><span>04</span><div><h2>Search your hoard</h2><p>See which recommended items you already have and exactly where they are stored.</p></div>{inventorySummary && <b>{inventorySummary.matched} matched</b>}</div>
        <div className="inventory-import">
          <div className="inventory-copy"><code>/outputfile inventory</code><p>At a banker, open your Bank, Dragon’s Hoard, and Tradeskill Depot first. Then run the command and select the resulting <strong>*-Inventory.txt</strong> file below.</p><small>Your inventory never leaves this browser. Select multiple character files to search across alts; shared-bank copies are counted only once.</small></div>
          <div className="inventory-actions">
            <label className="file-button"><input type="file" accept=".txt,text/plain" multiple onChange={importInventory} /><span>{inventory ? 'Replace inventory files' : 'Choose inventory files'}</span></label>
            {inventory && <button className="clear-button" onClick={clearInventory}>Clear</button>}
          </div>
          {inventorySummary && <div className="inventory-success"><strong>✓ Hoard indexed</strong><span>{inventorySummary.rows.toLocaleString()} rows across {inventorySummary.files} {inventorySummary.files === 1 ? 'file' : 'files'} · {inventorySummary.matched.toLocaleString()} gear names matched</span></div>}
          {inventoryError && <p className="inventory-error">{inventoryError}</p>}
        </div>
      </section>

      <section className="results">
        <div className="results-head">
          <div><span className="eyebrow">Optimized loadout</span><h2>{target} above all <small>at +{upgradeLevel}</small></h2></div>
          <div className="score"><span>Combined {target}</span><strong>{result.score > 0 ? `+${result.score}` : '—'}</strong></div>
        </div>
        <div className="trio-line">{trio.map((code) => <span key={code}>{code}</span>)}<small>OR equipability</small></div>
        <div className="totals">{Object.entries(totals).sort((a,b) => b[1]-a[1]).slice(0,8).map(([stat, value]) => <div key={stat}><span>{stat}</span><b>{value > 0 ? '+' : ''}{value}</b></div>)}</div>
        <div className="gear-toolbar"><div><h3>Best in slot</h3>{inventory && <span className="owned-summary">You already have {ownedRecommendations} of {annotatedGear.filter(({ item }) => item).length} recommended copies</span>}</div><div className="gear-tools">{inventory && <div className="ownership-filter" aria-label="Ownership filter">{[['all', 'All'], ['owned', 'Owned'], ['missing', 'Missing']].map(([value, label]) => <button key={value} className={ownershipFilter === value ? 'active' : ''} onClick={() => setOwnershipFilter(value)}>{label}</button>)}</div>}<input aria-label="Filter loadout" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Filter the loadout" /></div></div>
        {error && <p className="error">Could not load the dataset: {error}</p>}
        <div className="gear-grid">
          {visibleGear.map(({ label, item, ownership }) => <article key={label} className={`${label.startsWith('ANY') ? 'gear-card any' : 'gear-card'}${ownership?.owned ? ' owned' : ''}`}>
            <div className="slot"><span>{label.startsWith('ANY') ? '✦' : '◇'}</span>{label}</div>
            {item ? <><a href={item.wikiUrl} target="_blank" rel="noreferrer">{item.name}{upgradeLevel > 0 && <sup>+{upgradeLevel}</sup>}</a>{ownership && <div className={ownership.owned ? 'ownership owned' : 'ownership missing'}>{ownership.owned ? <><strong>✓ Already owned{ownership.count > 1 ? ` ×${ownership.count}` : ''}</strong><span>{ownership.highestRank > 0 && `Highest +${ownership.highestRank} · `}{ownership.locations.slice(0, 2).join(' · ')}</span></> : <><strong>{ownership.count ? `Need another copy · ${ownership.count} owned` : 'Not found in your hoard'}</strong></>}</div>}<div className="item-stats">{Object.entries(upgradeStats(item.stats, upgradeLevel)).filter(([,value]) => value).slice(0,5).map(([stat,value]) => <span key={stat} className={stat === target ? 'target' : ''}>{stat} {value > 0 ? '+' : ''}{value}</span>)}</div><small>{item.classes.includes('ALL') ? 'All classes' : item.classes.join(' · ')}</small><Sources sources={item.sources} /></> : <><b className="empty">No matching item</b><small>Try another target or trio</small></>}
          </article>)}
        </div>
      </section>
    </main>

    <footer>
      <div><strong>EQL Gear Optimizer</strong><span>Made for adventurers who enjoy a good spreadsheet.</span></div>
      <p>Item data is derived from the community-run <a href="https://eqlwiki.com/" target="_blank" rel="noreferrer">EverQuest Legends Wiki</a> and attributed under <a href="https://creativecommons.org/licenses/by-sa/3.0/" target="_blank" rel="noreferrer">CC BY-SA 3.0</a>. Last refresh: {meta.generatedAt ? new Date(meta.generatedAt).toLocaleDateString() : 'loading'}.</p>
    </footer>
  </>
}

export default App
