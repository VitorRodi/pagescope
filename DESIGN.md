# RIVO PageScope — design direction

A workbench for developers investigating page weight. Its single job is to make a Lighthouse report understandable enough to decide what to inspect next.

## RIVO identity

- Black `#0A0A0A`, white `#FFFFFF`, graphite `#2A2A2A`, silver `#C0C0C6`.
- Inter for headings and body, bundled locally; Consolas/ui-monospace for data. No remote font service.
- Official RIVO custom wordmark as an unmodified image. Product name sits alongside it, separated by a quiet rule. The favicon uses the original app icon.
- Dark canvas and restrained panels. White primary action, silver supporting text, visible white keyboard focus. Error color has semantic use only.
- Resource categories use neutral shades from white to graphite. Every category also has a text label; color alone never identifies a resource.

## Composition

Quiet masthead → left-aligned purpose → compact audit form → asymmetric workbench with resource anatomy and metric rail → full-width request timeline.

The segmented weight strip remains the signature: its widths encode transferred bytes and the same shades follow each resource into the waterfall. The redesign changes the original blue dashboard into RIVO's monochrome product family, without changing how reports are measured.

The PNG export uses the same palette, locally loaded Inter, and original wordmark. Its example label and measurement boundaries remain visible.

Mobile stacks panels and keeps values readable. Visible focus, labeled inputs, reduced-motion support, real loading/cancel/error states, and unknown data are preserved. No decorative neon, generated logos, or claims of measured results from synthetic data.
