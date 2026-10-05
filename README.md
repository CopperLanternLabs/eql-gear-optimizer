# EQL Gear Optimizer

A static, browser-based gear planner for **EverQuest Legends** three-class characters. Choose any three classes, pick a target stat, and get a best-in-slot loadout using OR equipability across the trio—including both EQL ANY slots. Results are limited to the currently available Classic era and level-50 cap, with comparison at item upgrade tiers +0 through +10.

## How it works

- React and Vite provide the static interface.
- `scripts/fetch-wiki-items.mjs` reads equipment pages from the EQL Wiki MediaWiki API, excludes post-Classic and above-cap gear, and normalizes item slots, allowed classes, stats, lore status, and linked drop/quest/vendor sources.
- The optimizer runs entirely in the browser; there is no application server.
- Players can import one or more tab-separated EQL `/outputfile inventory` exports. The browser matches recommended gear against equipped items, bags, banks, Dragon's Hoard, and other exported storage locations without transmitting or retaining inventory data.
- GitHub Actions refreshes the dataset, tests, builds, and deploys to GitHub Pages on pushes, manual runs, and once daily.

## Inventory matching

At a banker, open the Bank, Dragon's Hoard, and Tradeskill Depot, then run `/outputfile inventory` in game. Import the resulting `*-Inventory.txt` file in step 04. Multiple character files can be selected together; repeated shared-bank rows are counted once.

## Local development

```sh
npm install
npm run dev
```

Refresh the full dataset with `npm run data:refresh`. Set `EQL_ITEM_LIMIT=200` for a quick development sample.

## Data attribution

Item data is derived from the community-run [EverQuest Legends Wiki](https://eqlwiki.com/) and is redistributed with attribution under [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/). Each normalized item retains a link to its source page. This project is an unofficial community tool and is not affiliated with Daybreak Game Company, Game Jawn, or the EQL Wiki.
