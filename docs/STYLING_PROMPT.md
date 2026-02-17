# UI Styling Prompt - Enterprise AI Chat Interface

Use this prompt when building new apps to maintain consistent styling with the Fund Intelligence platform.

---

## PROMPT START

Build a **premium enterprise AI chat interface** using the "Obsidian Ledger" (dark) and "Ivory Ledger" (light) design system. The aesthetic is inspired by Bloomberg Terminal meets modern fintech - professional, data-dense, but approachable.

### Tech Stack Required

```json
{
  "dependencies": {
    "next": "^15.0.0",
    "react": "^19.0.0",
    "tailwindcss": "^3.4.0",
    "@radix-ui/react-dialog": "^1.1.0",
    "@radix-ui/react-tooltip": "^1.1.0",
    "@radix-ui/react-scroll-area": "^1.2.0",
    "@radix-ui/react-avatar": "^1.1.0",
    "@radix-ui/react-separator": "^1.1.0",
    "framer-motion": "^11.0.0",
    "next-themes": "^0.4.0",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.6.0",
    "lucide-react": "^0.468.0",
    "react-markdown": "^9.0.0",
    "remark-gfm": "^4.0.0"
  }
}
```

### Color System

#### Dark Theme (Obsidian Ledger - Default)

```css
:root.dark {
  --background: 225 15% 8%;        /* Deep charcoal #121418 */
  --foreground: 40 10% 92%;        /* Warm off-white */
  --card: 225 12% 11%;             /* Elevated surface */
  --border: 225 8% 20%;            /* Subtle borders */
  --primary: 43 60% 55%;           /* Gold accent #C9A227 */
  --muted: 225 10% 18%;            /* Subdued backgrounds */
  --muted-foreground: 40 5% 55%;   /* Secondary text */
  --gold: 43 60% 45%;              /* Primary accent */
  --destructive: 0 62% 45%;        /* Red for errors */
  --surface-1: 225 12% 11%;        /* Base elevation */
  --surface-2: 225 10% 14%;        /* Mid elevation */
  --surface-3: 225 8% 17%;         /* High elevation */
}
```

#### Light Theme (Ivory Ledger)

```css
:root {
  --background: 40 20% 98%;        /* Warm ivory */
  --foreground: 220 20% 10%;       /* Near black */
  --card: 40 15% 96%;              /* Cream surface */
  --border: 220 10% 88%;           /* Light borders */
  --primary: 220 15% 20%;          /* Dark emphasis */
  --accent: 43 74% 49%;            /* Brighter gold */
  --surface-1: 40 15% 96%;
  --surface-2: 40 12% 94%;
  --surface-3: 40 10% 91%;
}
```

### Component Patterns

#### 1. Chat Message Bubbles

```tsx
// User message (gold tint)
<div className="bg-gold/10 text-foreground border border-gold/20 rounded-xl px-4 py-3">
  <p className="text-sm">{message}</p>
</div>

// Assistant message (neutral surface)
<div className="bg-surface-2 border border-border rounded-xl px-4 py-3">
  <div className="markdown-content text-sm">{content}</div>
</div>
```

#### 2. Avatars

```tsx
// User avatar (gold accent)
<Avatar className="h-8 w-8 bg-gold/20">
  <AvatarFallback className="bg-gold/20 text-gold">
    <User className="h-4 w-4" />
  </AvatarFallback>
</Avatar>

// Bot avatar (neutral)
<Avatar className="h-8 w-8">
  <AvatarFallback className="bg-surface-3 text-muted-foreground">
    <Bot className="h-4 w-4" />
  </AvatarFallback>
</Avatar>
```

#### 3. Status Badges

```tsx
// Verified (green)
<Badge className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-xs gap-1">
  <CheckCircle2 className="h-3 w-3" />
  Verified
</Badge>

// Warning (amber)
<Badge className="bg-amber-500/10 text-amber-500 border border-amber-500/20 text-xs gap-1">
  <AlertCircle className="h-3 w-3" />
  Unverified
</Badge>

// Error/Blocked (red)
<Badge className="bg-red-500/10 text-red-500 border border-red-500/20 text-xs gap-1">
  <ShieldX className="h-3 w-3" />
  Blocked
</Badge>

// Count badge (gold)
<Badge className="bg-gold/10 text-gold border border-gold/30 text-xs">
  5 sources
</Badge>
```

#### 4. Cards & Panels

```tsx
// Default card
<div className="p-4 rounded-lg border border-border bg-surface-2 hover:bg-surface-3 transition-all">

// Active/Selected card
<div className="p-4 rounded-lg border-gold/50 bg-gold/5 ring-1 ring-gold/20">

// Citation card
<button className="w-full text-left p-3 rounded-lg border border-border bg-surface-2 hover:bg-surface-3 transition-all">
```

#### 5. Input Fields

```tsx
<textarea
  className="w-full bg-surface-2 border border-border rounded-xl px-4 py-3
             text-sm placeholder:text-muted-foreground resize-none
             focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold/50
             transition-all"
  placeholder="Ask about funds..."
/>
```

#### 6. Citation Chips (Inline References)

```css
.citation-chip {
  @apply inline-flex items-center justify-center h-5 min-w-[1.25rem] px-1
         text-xs font-medium bg-gold/20 text-gold border border-gold/30
         rounded cursor-pointer hover:bg-gold/30 transition-colors;
}
.citation-chip.active {
  @apply bg-gold text-background;
}
```

#### 7. Header Bar

```tsx
<header className="h-12 border-b border-border bg-surface-1 flex items-center justify-between px-4">
  {/* Logo with gradient */}
  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-gold/20 to-gold/5
                  border border-gold/20 flex items-center justify-center">
    <Building2 className="w-4 h-4 text-gold" />
  </div>
  <span className="font-semibold text-sm">App Title</span>
</header>
```

#### 8. Collapsible Side Panels

```tsx
<motion.aside
  animate={{ width: isCollapsed ? 56 : 320 }}
  transition={{ duration: 0.2, ease: "easeInOut" }}
  className="h-full border-l border-border bg-surface-1 flex flex-col"
>
  {/* Toggle button */}
  <Button
    variant="ghost"
    size="icon-sm"
    className="absolute -left-3 top-14 z-10 h-6 w-6 rounded-full
               border border-border bg-surface-2 shadow-subtle"
  >
    <ChevronLeft className="h-3 w-3" />
  </Button>
</motion.aside>
```

### Security/PII Feedback States

#### Scanning State (Amber)
```tsx
<div className="border-amber-500/50 bg-amber-500/5 relative overflow-hidden">
  <motion.div
    className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-amber-500 to-transparent"
    animate={{ top: ["0%", "100%", "0%"] }}
    transition={{ duration: 2, repeat: Infinity }}
  />
</div>
```

#### Success State (Green)
```tsx
<div className="border-emerald-500/50 bg-emerald-500/5">
  <CheckCircle2 className="text-emerald-500" />
  <span>Security Check Passed</span>
</div>
```

#### Blocked State (Red)
```tsx
<div className="border-red-500/50 bg-red-500/5">
  <ShieldX className="text-red-500" />
  <span>Message Blocked</span>
  <Badge className="bg-red-500/20 text-red-400">PII Detected</Badge>
</div>
```

### Animation Patterns (Framer Motion)

```tsx
// Message entry
initial={{ opacity: 0, y: 10 }}
animate={{ opacity: 1, y: 0 }}
transition={{ duration: 0.2 }}

// Panel collapse/expand
animate={{ width: isCollapsed ? 56 : 320 }}
transition={{ duration: 0.2, ease: "easeInOut" }}

// Content fade (AnimatePresence)
<AnimatePresence mode="wait">
  <motion.div
    key="content"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
  >
</AnimatePresence>
```

### Layout Structure

```
┌─────────────────────────────────────────────────────────┐
│ Header (h-12, border-b, bg-surface-1)                   │
├────────────┬───────────────────────────┬────────────────┤
│ Sidebar    │ Main Chat Area            │ Sources Panel  │
│ (w-64)     │ (flex-1)                  │ (w-80)         │
│            │ ┌───────────────────────┐ │                │
│            │ │ Chat Thread           │ │                │
│            │ │ (ScrollArea, flex-1)  │ │                │
│            │ └───────────────────────┘ │                │
│            │ ┌───────────────────────┐ │                │
│            │ │ Message Composer      │ │                │
│            │ │ (sticky bottom)       │ │                │
│            │ └───────────────────────┘ │                │
├────────────┴───────────────────────────┴────────────────┤
│ Footer (h-8, border-t, text-xs text-muted-foreground)   │
└─────────────────────────────────────────────────────────┘
```

### Utility Classes

```css
/* Surface elevations */
.surface-1 { background-color: hsl(var(--surface-1)); }
.surface-2 { background-color: hsl(var(--surface-2)); }
.surface-3 { background-color: hsl(var(--surface-3)); }

/* Hairline border */
.border-hairline { border-width: 0.5px; }

/* Gold glow effect */
.glow-gold { box-shadow: 0 0 20px -5px hsl(43, 60%, 45%, 0.3); }

/* Text gradient */
.text-gold-gradient {
  background: linear-gradient(135deg, hsl(43, 60%, 55%) 0%, hsl(43, 40%, 45%) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
```

### Markdown Content Styling

```css
.markdown-content { @apply leading-relaxed; }
.markdown-content h1, h2, h3 { @apply font-semibold tracking-tight mt-6 mb-3; }
.markdown-content code { @apply font-mono text-sm bg-muted px-1.5 py-0.5 rounded; }
.markdown-content pre { @apply bg-muted p-4 rounded-lg overflow-x-auto; }
.markdown-content table { @apply w-full border-collapse; }
.markdown-content th { @apply bg-muted font-medium border border-border px-3 py-2 text-left text-sm; }
.markdown-content td { @apply border border-border px-3 py-2 text-sm; }
.markdown-content tr:nth-child(even) { @apply bg-muted/50; }
```

### Key Design Principles

1. **Gold Accent Economy:** Use gold sparingly for emphasis and interactivity
2. **Surface Elevation:** Use surface-1/2/3 for visual hierarchy
3. **Subtle Animations:** Smooth 0.2s transitions that don't distract
4. **Verification First:** Always show source provenance and confidence scores
5. **Data Density:** Show information without visual clutter
6. **Accessible Contrast:** WCAG AA compliance in both themes

## PROMPT END

---

## Reference Files in This Repository

| File | Path | Purpose |
|------|------|---------|
| Global CSS | `src/app/globals.css` | Theme variables, utilities |
| Tailwind Config | `src/tailwind.config.ts` | Theme extensions |
| Utils | `src/lib/utils.ts` | cn() helper function |
| Theme Provider | `src/components/providers/theme-provider.tsx` | next-themes wrapper |
| Chat Components | `src/components/chat/*.tsx` | Message, Composer, Thread |
| Layout Components | `src/components/layout/*.tsx` | Header, Sidebar, SourcesPanel |
| UI Primitives | `src/components/ui/*.tsx` | Button, Badge, Card, etc. |

## Quick Copy Commands

```bash
# Copy all styling files to a new project
cp src/app/globals.css /new-project/src/app/
cp src/tailwind.config.ts /new-project/src/
cp src/lib/utils.ts /new-project/src/lib/
cp -r src/components/ui /new-project/src/components/
cp -r src/components/providers /new-project/src/components/
```

---

*Design System: Obsidian Ledger / Ivory Ledger v1.0*
