# Design direction

PageScope is a workbench for developers investigating page weight. Its single job is to make a Lighthouse report understandable enough to decide what to inspect next.

- Canvas: cool paper `#f3f6fa`; panels: white `#ffffff`; ink: deep slate `#182739`.
- Accent: instrument blue `#2459de`; images: turquoise `#188b89`; fonts: ochre `#b87916`; CSS: violet `#835dc5`; documents: slate `#64748b`.
- Display: Trebuchet MS (system fallback, characterful compact headings); body: Segoe UI/system; data: Consolas/ui-monospace. No external font requests.
- Layout: quiet masthead, large left-aligned purpose, compact audit form, then an asymmetric workbench with page-weight anatomy and a metric rail. Full-width request timeline below.
- Signature: a single segmented "weight strip" maps transferred bytes to resource categories; the same colors follow each request into the waterfall. Width always encodes bytes, never decoration.

The first idea was a generic score dashboard. Revised to lead with the page's actual resource anatomy: a score alone does not explain the problem. Avoid decorative gradients, glass panels, invented live activity, and success claims.

Mobile: stack panels, keep resource names and values readable, horizontally scroll only the timeline if needed. Visible focus, labeled inputs, reduced-motion support, real loading/cancel/error states, unknown data rendered as unavailable.
