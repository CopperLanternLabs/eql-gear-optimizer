import { useEffect, useMemo, useState } from 'react'
import { CLASSES, STATS, optimize, totalStats } from './optimizer.js'

const DATA_URL = `${import.meta.env.BASE_URL}data/items.json`

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
  const [query, setQuery] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    fetch(DATA_URL).then((res) => {
      if (!res.ok) throw new Error(`Dataset returned ${res.status}`)
      return res.json()
    }).then((data) => { setItems(data.items); setMeta(data.meta) }).catch((err) => setError(err.message))
  }, [])

  const result = useMemo(() => optimize(items, trio, { [target]: 1 }), [items, trio, target])
  const totals = useMemo(() => totalStats(result.gear), [result])
  const visibleGear = result.gear.filter(({ item, label }) => !query || `${label} ${item?.name || ''}`.toLowerCase().includes(query.toLowerCase()))

  return <>
    <header className="hero">
      <div className="hero-top"><span className="eyebrow">A community planning tool</span><span className="rune">✦</span></div>
      <h1>EQL <em>Gear</em> Optimizer</h1>
      <p>Build the strongest kit for your three-class character. Pick a trio, choose the stat that matters, and let the archive do the sorting.</p>
      <div className="data-badge"><i /> {items.length ? `${items.length.toLocaleString()} items indexed` : 'Loading the archive…'}</div>
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

      <section className="results">
        <div className="results-head">
          <div><span className="eyebrow">Optimized loadout</span><h2>{target} above all</h2></div>
          <div className="score"><span>Combined {target}</span><strong>{result.score > 0 ? `+${result.score}` : '—'}</strong></div>
        </div>
        <div className="trio-line">{trio.map((code) => <span key={code}>{code}</span>)}<small>OR equipability</small></div>
        <div className="totals">{Object.entries(totals).sort((a,b) => b[1]-a[1]).slice(0,8).map(([stat, value]) => <div key={stat}><span>{stat}</span><b>{value > 0 ? '+' : ''}{value}</b></div>)}</div>
        <div className="gear-toolbar"><h3>Best in slot</h3><input aria-label="Filter loadout" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Filter the loadout" /></div>
        {error && <p className="error">Could not load the dataset: {error}</p>}
        <div className="gear-grid">
          {visibleGear.map(({ label, item }) => <article key={label} className={label.startsWith('ANY') ? 'gear-card any' : 'gear-card'}>
            <div className="slot"><span>{label.startsWith('ANY') ? '✦' : '◇'}</span>{label}</div>
            {item ? <><a href={item.wikiUrl} target="_blank" rel="noreferrer">{item.name}</a><div className="item-stats">{Object.entries(item.stats).filter(([,value]) => value).slice(0,5).map(([stat,value]) => <span key={stat} className={stat === target ? 'target' : ''}>{stat} {value > 0 ? '+' : ''}{value}</span>)}</div><small>{item.classes.includes('ALL') ? 'All classes' : item.classes.join(' · ')}</small><Sources sources={item.sources} /></> : <><b className="empty">No matching item</b><small>Try another target or trio</small></>}
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
