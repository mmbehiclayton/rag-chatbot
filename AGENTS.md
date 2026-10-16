<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Elimu UI rules (teacher MVP)

Users are Kenyan teachers on Android phones and paid mobile data. The UI is minimal, mobile-first and light-only.

- Colours come from the tokens in `src/app/globals.css` (`primary`, `muted`, `success`, `warning`, `info`, `destructive`). Don't use raw hue classes like `text-indigo-500`.
- Type scale is `text-xs` to `text-2xl`. No `text-[Npx]`, no `font-black`, no `uppercase tracking-widest` labels. Headings use `font-semibold`.
- Radii: `rounded-md` for controls and `rounded-xl` for cards. No arbitrary `rounded-[..]`.
- No blur blobs, `backdrop-blur` glass, glow shadows, gradient text, `hover:scale`, or `motion` entrance animations.
- Use the primitives in `src/components/ui/` (Button, Card, Badge, Tabs, Table, Input) and `src/components/shared/` (PageHeader, EmptyState, StatusBadge) rather than hand-styled divs.
- Touch targets are at least 44px. Every icon-only button has an `aria-label`. Use Lucide icons.
- Copy is plain Kenyan English in the Brand.md voice. Avoid jargon ("synthesize", "provision", "pipeline"). Don't claim content is "CBC compliant": generated content is a draft the teacher reviews.
