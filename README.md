<div align="center">
  <h3 align="center">CSV Match Cards</h3>

  <p align="center">
    A minimal, no-build, single-page matching game for language learning.
    <br />
    Import a CSV → generate cards → drag & drop to match rows.
    <br /><br />
    <a href="https://kamelotmarmot.github.io/CardMatch/"><strong>View Demo »</strong></a>
    ·
    <a href="https://github.com/KaMeLoTmArMoT/CardMatch/issues">Report Bug</a>
    ·
    <a href="https://github.com/KaMeLoTmArMoT/CardMatch/issues">Request Feature</a>
  </p>
</div>

## About The Project

CSV Match Cards is a tiny browser-only game that turns CSV rows into draggable cards.
The goal is to build correct groups: each group must contain cards from the same CSV row, respecting the chosen column order.

<p align="center">
   <img src="assets/card_game_example.png" width="720" alt="Main UI">
</p>

### Key Features

- CSV import with preview (first 5 rows).
- Configurable delimiter and header row detection.
- Choose rows per round (K) and columns (2–6).
- Drag & drop on desktop and mobile (touch).
- “?” hint highlights sibling cards from the same CSV row for 1 second.
- Shuffle unsolved cards.

### Built With

- Vanilla JavaScript (no build step).
- HTML + CSS.
- PapaParse for CSV parsing.
- Material Web Components (Material Design 3) via CDN import map.

## Getting Started

### Prerequisites

- A modern browser (Chrome/Firefox/Safari).
- CSV exported as **UTF-8** (recommended).

### Installation

1. Clone the repo:
   ```bash
   git clone https://github.com/KaMeLoTmArMoT/CardMatch.git
   cd CardMatch
   ```

2. Run a local static server (recommended):
   ```bash
   python3 -m http.server 8000 --bind 0.0.0.0
   ```

3. Open in browser:
   - Desktop: http://localhost:8000/
   - Phone (same Wi‑Fi): http://<YOUR_PC_LAN_IP>:8000/

## Usage

1. Open the app (demo or local).
2. Click **Import CSV** (or drop the file into the import dropzone).

<p align="center">
   <img src="assets/card_game_import.png" width="360" alt="Main UI">
</p>

3. Enable “First row contains column names” if your CSV has headers.
4. Pick delimiter if needed, then click **Apply**.
5. Select columns (2–6), set **Rows per round (K)**, and click **Start / Restart round**.
6. Drag cards into group slots:
   - Green = correct group (same row + correct column order)
   - Red = incorrect group (fix by moving cards)

### CSV Format

Any rectangular CSV works. Each selected column becomes one card.
Example (2 columns):
```csv
de,en
Haus,house
Baum,tree
```

Example (3 columns):
```csv
present,past,future
go,went,will go
```

### Sample CSV

- [Unregelmäßige Verben (4 columns)](examples/irregular_verbs_de.csv)

Headers:
`Infinitiv | Präteritum | Perfekt | Переклад`

## Roadmap

- Move solved groups to the bottom with a short success animation.
- Improve mobile layout for many columns (4–6).
- Optional “tap to place” mode (non-drag alternative).
- Export/import round state (optional).

See the [open issues](https://github.com/KaMeLoTmArMoT/CardMatch/issues).

## Contributing

Contributions are welcome:
1. Fork the repo
2. Create a feature branch
3. Open a PR

For bug reports, please include:
- Device + browser
- Steps to reproduce
- A small CSV sample (or screenshot)

## License

This project is licensed under the MIT License — see [`LICENSE`](https://github.com/KaMeLoTmArMoT/CardMatch/blob/master/LICENSE).


## Acknowledgments

- README structure inspired by Best-README-Template.
- Built with assistance from a generative AI tools for ideation and code suggestions; all changes were reviewed and tested by the author.
