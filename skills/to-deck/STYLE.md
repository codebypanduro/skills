# Default look (no design system)

The look of the first deck the user approved. Apply it as is so decks stay consistent.

## Faces

`deck.json` `faces`:

```json
"space-grotesk": {"family":"Space Grotesk","href":"https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&display=swap"},
"ibm-plex-sans": {"family":"IBM Plex Sans","href":"https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;600;700&display=swap"},
"jetbrains-mono": {"family":"JetBrains Mono","href":"https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400&display=swap"}
```

Headings use Space Grotesk 700, body text IBM Plex Sans, and code panels JetBrains Mono.

## Palette

| Role | Hex |
|---|---|
| Ink / dark slide background | `#16202A` |
| Light background | `#F5F3EE` |
| Second light background, muted card | `#ECE9E1` |
| Card fill | `#FCFBF8`, border `1px solid #DAD6CC` |
| Body text on light | `#4A5560` / `#3A4450` |
| Body text on dark | `#C9D2DA`, dark card `#22303D` |
| Footer text | `#5B6570` (light) / `#9AA6B1` (dark) |
| Accent: configured, links, eyebrows | blue `#2F6DB5` |
| Accent: per-run objects, highlight, statement slide | amber `#E9A23B` (dark text on it), text variant `#B5761A`, soft `#F5E3C4` |
| Money | green `#3C7A4E` |
| Old or legacy | dashed `2px #8A939C` on `#ECE9E1` |

Use dark backgrounds for the cover, the journey overview and the "settled" slide, and amber for the gates slide. Every other slide is light.

## Scale

Sizes are cover 140, statement 72, heading 64, card title 32–36, body 26–30, labels and footer 24.

## Repeated markup

The section for a light content slide:

```html
<section id="x" data-transition="fade" style="background:#F5F3EE;color:#16202A;font-family:'IBM Plex Sans', Arial, sans-serif;padding:128px 128px 160px;display:flex;flex-direction:column;gap:48px">
<div style="display:flex;flex-direction:column;gap:12px">
<p style="font-size:24px;font-weight:600;letter-spacing:3px;text-transform:uppercase;color:#2F6DB5">B · Send</p>
<h2 style="font-family:'Space Grotesk', Arial, sans-serif;font-size:64px;font-weight:700;line-height:1.1;color:#16202A">Heading as a short claim</h2>
</div>
…
<p style="position:absolute;left:128px;bottom:64px;width:1664px;font-size:24px;color:#5B6570">Footer: source, legend or "illustrative"</p>
<aside>Caveats and open questions.</aside>
</section>
```

- **Journey row**: flex row of `flex:1` cards, separated by `<x-connector style="width:40px;border-width:3px;align-self:center">`. Each card holds a letter label, a title and one line of text. The last card is filled amber.
- **Highlight bar**: a `<p>` with `background:#E9A23B;padding:20px 28px;border-radius:12px`, holding the "pass →" outcome.
- **Tables**: the header row has `background:#16202A` with light `th` text. Body rows alternate `#FCFBF8` and `#ECE9E1`, and a gated row uses `#F5E3C4`.
- **Code panel**: a `#16202A` div with a mono `<p>`. Indent with `&#160;` and break lines with `<br>`.
