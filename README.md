# Elevatus One — Widgets

Embeddable education widgets for Milemarker pages. Hosted on GitHub Pages at
`https://da-elevatus.github.io/elevatusone-widgets/`.

The design is: **one reusable engine per widget type, content per topic as JSON.**
Adding a new page never means new JavaScript — you write JSON and drop a
`<div>` + `<script>` on the page.

```
elevatusone-widgets/
├── engine/                     one file per widget TYPE, reused by every page
│   ├── tiles-widget.js         tabs + tile grid + click-to-open modal
│   ├── quiz-widget.js          question flow + per-question feedback + score
│   └── takeaways-widget.js     "key takeaways" checklist card
├── topics/
│   └── <topic>/
│       ├── tiles.json          content for the tiles widget on this page
│       ├── quiz.json           content for the quiz widget (omit if unused)
│       ├── takeaways.json      content for the takeaways widget (omit if unused)
│       └── preview.html        local preview harness for this topic
└── images/
    └── <topic>/                images referenced by that topic's JSON
```

A topic folder only contains the JSON for the widgets that page actually uses.
No `quiz.json` → that page just has no quiz.

## Embedding a widget on a page

Each widget is a mount `<div>` plus one `<script>`. `data-topic` tells the
widget which folder under `topics/` to load its JSON from.

```html
<div id="elv-tiles" data-topic="private-markets"></div>
<script src="https://da-elevatus.github.io/elevatusone-widgets/engine/tiles-widget.js"></script>

<div id="elv-quiz" data-topic="private-markets"></div>
<script src="https://da-elevatus.github.io/elevatusone-widgets/engine/quiz-widget.js"></script>

<div id="elv-takeaways" data-topic="private-markets"></div>
<script src="https://da-elevatus.github.io/elevatusone-widgets/engine/takeaways-widget.js"></script>
```

Mount attributes:

| attribute    | meaning |
|--------------|---------|
| `data-topic` | folder name under `topics/` — widget loads `topics/<topic>/<widget>.json` |
| `data-src`   | explicit JSON URL; overrides `data-topic` (for reuse or local files) |

To run more than one of the same widget on a page, use
`<div data-elv-widget="tiles" data-topic="...">` instead of the `id`.

### `window.ELV_BASE`

Every widget resolves JSON and images against a base URL. Default is the
GitHub Pages host. Set `window.ELV_BASE` **before** the widget script to point
somewhere else — the topic `preview.html` files use `"../.."` to load local
copies.

## Adding a new topic page

1. `mkdir topics/<topic>` and `mkdir images/<topic>`.
2. Add the JSON for the widgets that page needs (see shapes below).
3. Drop images in `images/<topic>/`; reference them by bare filename in JSON.
4. Copy an existing `preview.html` into `topics/<topic>/`, change `data-topic`.
5. Right-click `preview.html` → **Open with Live Server** to check it.
6. Commit and push. GitHub Pages serves it within a minute.
7. Paste the mount `<div>` + `<script>` tags into the Milemarker page.

## JSON shapes

### `tiles.json`

```jsonc
{
  "header": { "kicker": "PRIVATE MARKETS", "title": "Advisor Education Resource", "intro": "…" }, // optional
  "tabs": [
    {
      "key": "essentials",
      "label": "Private Markets",
      "tiles": [
        {
          "title": "…",
          "summary": "…",
          "body": [
            "a paragraph",
            { "text": "another paragraph" },
            { "type": "image", "src": "chart.jpeg", "alt": "…", "caption": "…" },
            { "type": "video", "src": "clip.mp4", "poster": "…", "caption": "…" },
            { "type": "embed", "src": "https://youtube.com/watch?v=…", "caption": "…" }
          ]
        }
      ]
    }
  ]
}
```

- One tab → the tab bar is hidden. A bare array or `{ "tiles": [...] }` also works.
- `body` items render in order. A bare string is always text; media must be an object.
- `type` is auto-detected from the URL when omitted.
- Image `src` with no `://` resolves to `images/<topic>/<src>`.

### `quiz.json`

```jsonc
{
  "title": "Quick Confidence Check",
  "questions": [
    {
      "question": "…",
      "options": ["…", "…", "…", "…"],
      "correctIndex": 1,
      "explanation": "shown after answering (optional)"
    }
  ]
}
```

### `takeaways.json`

```jsonc
{
  "title": "Key Takeaways",
  "intro": "optional sentence under the title",
  "points": [
    "a plain takeaway",
    { "lead": "Diversification", "text": "a takeaway with a bold lead-in" }
  ]
}
```
