# EQL Gear Optimizer

A static, browser-based gear planner for **EverQuest Legends** three-class characters. Choose any three classes, pick a target stat, and get a best-in-slot loadout using OR equipability across the trio—including both EQL ANY slots.

## How it works

- React and Vite provide the static interface.
- `scripts/fetch-wiki-items.mjs` reads equipment pages from the EQL Wiki MediaWiki API and normalizes item slots, allowed classes, stats, and lore status.
- The optimizer runs entirely in the browser; there is no application server.
- GitHub Actions refreshes the dataset, tests, builds, and deploys to GitHub Pages on pushes, manual runs, and once daily.

## Local development

```sh
npm install
npm run dev
```

Refresh the full dataset with `npm run data:refresh`. Set `EQL_ITEM_LIMIT=200` for a quick development sample.

## Data attribution

Item data is derived from the community-run [EverQuest Legends Wiki](https://eqlwiki.com/) and is redistributed with attribution under [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/). Each normalized item retains a link to its source page. This project is an unofficial community tool and is not affiliated with Daybreak Game Company, Game Jawn, or the EQL Wiki.
