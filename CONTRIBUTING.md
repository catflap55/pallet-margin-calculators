# Contributing

Issues and pull requests are welcome for formula bugs, clearer labels, or CSV template fixes.

Please keep the three tools distinct:

- Margin calculator does not pack cartons.
- Euro pallet configurator does not price margin.
- Reverse-engineer does not ask for freight.

## Preview the widgets

You do not need Node.js for this. Use the Start file in the `Mac`, `Windows`, or `Linux` folder, or:

```bash
python3 scripts/serve-embed.py
```

Then open http://localhost:43141/preview.html (or http://127.0.0.1:43141/preview.html — same tools).

## Formula tests (optional)

Needs [Node.js](https://nodejs.org/) 18 or newer.

```bash
npm install
npm test
```

The official hosted product stays at https://palletmargincalculator.site
