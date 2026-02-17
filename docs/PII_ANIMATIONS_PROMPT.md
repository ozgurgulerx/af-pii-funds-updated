# PII Check Animation System - Implementation Prompt

Use this prompt to replicate the PII (Personal Identifiable Information) security check animations in a new project.

---

## PROMPT START

Implement a **4-state PII security check animation system** for a message input component. When users submit a message, it goes through a PII check with visual feedback showing: Idle → Scanning → Passed/Blocked.

### Required Dependencies

```json
{
  "framer-motion": "^11.0.0",
  "lucide-react": "^0.468.0"
}
```

### State Machine

```typescript
type PiiStatus = "idle" | "checking" | "passed" | "blocked";
```

State transitions:
- **idle** → user types, default state
- **checking** → user submits, API call in progress
- **passed** → API returns clean, show green flash (auto-return to idle after 3s)
- **blocked** → API returns PII detected, stay blocked until user edits

---

## Animation Specifications

### 1. IDLE STATE (Default)

```tsx
// Neutral badge inside textarea
<div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold
                bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
  <Shield className="h-3.5 w-3.5" />
  <span>PII Protected</span>
</div>

// Submit button
<Button className="bg-primary hover:bg-primary/90">
  <Send className="h-5 w-5 text-white" />
</Button>
```

---

### 2. SCANNING STATE (Amber/Yellow)

**Full-width overlay with animated scanning line:**

```tsx
<AnimatePresence>
  {piiStatus === "checking" && (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-30 pointer-events-none"
    >
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-r from-amber-500/5 via-amber-500/10 to-amber-500/5" />

      {/* Scanning line animation - moves top to bottom */}
      <motion.div
        className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-amber-500 to-transparent"
        initial={{ top: 0 }}
        animate={{ top: ["0%", "100%", "0%"] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Pulsing border */}
      <motion.div
        className="absolute inset-0 border-2 border-amber-500/50 rounded-lg"
        animate={{
          borderColor: ["rgba(245, 158, 11, 0.3)", "rgba(245, 158, 11, 0.7)", "rgba(245, 158, 11, 0.3)"],
        }}
        transition={{ duration: 1, repeat: Infinity }}
      />
    </motion.div>
  )}
</AnimatePresence>
```

**Status badge (rotating scan icon):**

```tsx
<motion.div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold
                       bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400">
  <motion.div
    animate={{ rotate: 360 }}
    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
  >
    <Scan className="h-3.5 w-3.5" />
  </motion.div>
  <span>Scanning...</span>
</motion.div>
```

**Input field styling:**

```tsx
<Textarea className="border-amber-500/60 focus-visible:ring-amber-500/50 bg-amber-500/5" />
```

**Submit button:**

```tsx
<Button className="bg-amber-500 hover:bg-amber-600 shadow-lg shadow-amber-500/30">
  <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
    <Scan className="h-5 w-5 text-white" />
  </motion.div>
</Button>
```

---

### 3. PASSED STATE (Green Flash)

**Full overlay green flash effect:**

```tsx
<AnimatePresence>
  {piiStatus === "passed" && (
    <>
      {/* Green flash overlay */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 1, 0.5] }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.5 }}
        className="absolute inset-0 z-30 pointer-events-none"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/20 via-emerald-500/30 to-emerald-500/20" />
        <motion.div
          className="absolute inset-0 border-2 border-emerald-500 rounded-lg"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 0.6] }}
          transition={{ duration: 0.4 }}
        />
      </motion.div>

      {/* Corner checkmark badge */}
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0, opacity: 0 }}
        transition={{ type: "spring", stiffness: 500, damping: 20 }}
        className="absolute top-2 right-2 z-40"
      >
        <div className="bg-emerald-500 rounded-full p-1.5 shadow-lg shadow-emerald-500/50">
          <CheckCircle2 className="h-4 w-4 text-white" />
        </div>
      </motion.div>
    </>
  )}
</AnimatePresence>
```

**Success banner (slides down, auto-hides after 2s):**

```tsx
<AnimatePresence>
  {showPassedBanner && (
    <motion.div
      initial={{ opacity: 0, y: -30, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className="mb-4 relative z-40"
    >
      <div className="flex items-center justify-center gap-3 p-3 rounded-xl
                      bg-gradient-to-r from-emerald-500/20 via-emerald-500/25 to-emerald-500/20
                      border-2 border-emerald-500/50 shadow-lg shadow-emerald-500/20">
        {/* Spinning shield icon */}
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 15, delay: 0.1 }}
        >
          <div className="bg-emerald-500 rounded-full p-2">
            <ShieldCheck className="h-5 w-5 text-white" />
          </div>
        </motion.div>

        {/* Text content */}
        <div className="flex flex-col">
          <motion.span
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 }}
            className="text-emerald-600 dark:text-emerald-400 font-semibold text-sm"
          >
            Security Check Passed
          </motion.span>
          <motion.span
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="text-emerald-600/80 dark:text-emerald-400/80 text-xs"
          >
            No personal information detected
          </motion.span>
        </div>

        {/* Lock icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: [0, 1.2, 1] }}
          transition={{ delay: 0.25, duration: 0.3 }}
        >
          <Lock className="h-4 w-4 text-emerald-500" />
        </motion.div>
      </div>
    </motion.div>
  )}
</AnimatePresence>
```

**Status badge:**

```tsx
<motion.div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold
                       bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400">
  <motion.div initial={{ scale: 0 }} animate={{ scale: [0, 1.3, 1] }} transition={{ duration: 0.3 }}>
    <ShieldCheck className="h-3.5 w-3.5" />
  </motion.div>
  <span>Secure</span>
  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.1, type: "spring" }}>
    <CheckCircle2 className="h-3.5 w-3.5" />
  </motion.div>
</motion.div>
```

**Submit button:**

```tsx
<Button className="bg-emerald-500 hover:bg-emerald-600 shadow-lg shadow-emerald-500/30">
  <motion.div
    initial={{ scale: 0, rotate: -180 }}
    animate={{ scale: 1, rotate: 0 }}
    transition={{ type: "spring", stiffness: 400, damping: 15 }}
  >
    <CheckCircle2 className="h-5 w-5 text-white" />
  </motion.div>
</Button>
```

**Input field:**

```tsx
<Textarea className="border-emerald-500/60 focus-visible:ring-emerald-500/50 bg-emerald-500/5" />
```

---

### 4. BLOCKED STATE (Red with Shake)

**Full overlay red flash with glow:**

```tsx
<AnimatePresence>
  {piiStatus === "blocked" && (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 z-30 pointer-events-none"
      >
        {/* Red gradient background */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-red-500/15 via-red-500/25 to-red-500/15"
          animate={{ opacity: [0.5, 1, 0.7] }}
          transition={{ duration: 0.3 }}
        />
        {/* Border with expanding glow */}
        <motion.div
          className="absolute inset-0 border-2 border-red-500 rounded-lg"
          animate={{
            boxShadow: [
              "0 0 0 0 rgba(239, 68, 68, 0)",
              "0 0 30px 5px rgba(239, 68, 68, 0.4)",
              "0 0 15px 2px rgba(239, 68, 68, 0.3)"
            ]
          }}
          transition={{ duration: 0.5 }}
        />
      </motion.div>

      {/* Corner X mark with shake */}
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0, opacity: 0 }}
        transition={{ type: "spring", stiffness: 500, damping: 20 }}
        className="absolute top-2 right-2 z-40"
      >
        <motion.div
          className="bg-red-500 rounded-full p-1.5 shadow-lg shadow-red-500/50"
          animate={{ rotate: [0, -10, 10, -10, 10, 0] }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <XCircle className="h-4 w-4 text-white" />
        </motion.div>
      </motion.div>
    </>
  )}
</AnimatePresence>
```

**Error banner (with shake animation):**

```tsx
<AnimatePresence>
  {piiError && (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      className="mb-4 relative z-40"
    >
      <motion.div
        className="p-4 rounded-xl bg-gradient-to-r from-red-500/15 via-red-500/20 to-red-500/15
                   border-2 border-red-500/50 shadow-lg shadow-red-500/20"
        animate={{ x: [0, -8, 8, -8, 8, 0] }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <div className="flex items-start gap-3">
          {/* Shield X icon */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 500, damping: 15 }}
          >
            <div className="bg-red-500 rounded-full p-2 mt-0.5">
              <ShieldX className="h-5 w-5 text-white" />
            </div>
          </motion.div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }}>
              <h4 className="text-red-600 dark:text-red-400 font-bold text-base flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Message Blocked - PII Detected
              </h4>
            </motion.div>

            <motion.p
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="text-red-600/90 dark:text-red-400/90 text-sm mt-1"
            >
              {piiError}
            </motion.p>

            {/* Detected category pills */}
            {detectedCategories.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="flex flex-wrap gap-2 mt-3"
              >
                {detectedCategories.map((category, idx) => (
                  <motion.span
                    key={category}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.35 + idx * 0.1 }}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full
                               bg-red-500/20 border border-red-500/40
                               text-red-600 dark:text-red-400 text-xs font-medium"
                  >
                    <Fingerprint className="h-3 w-3" />
                    {formatCategory(category)}
                  </motion.span>
                ))}
              </motion.div>
            )}

            {/* Restore button */}
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              onClick={handleRestoreMessage}
              className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg
                         bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700
                         text-slate-700 dark:text-slate-300 text-xs font-medium
                         transition-colors border border-slate-300 dark:border-slate-600"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Restore message to edit
            </motion.button>
          </div>

          {/* Pulsing warning indicator */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
            className="flex-shrink-0 self-start"
          >
            <motion.div
              className="relative"
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
              <div className="absolute inset-0 bg-red-500 rounded-full blur-md opacity-40" />
              <motion.div
                className="relative bg-red-500 rounded-full p-2"
                animate={{
                  boxShadow: [
                    "0 0 0 0 rgba(239, 68, 68, 0)",
                    "0 0 0 8px rgba(239, 68, 68, 0.3)",
                    "0 0 0 0 rgba(239, 68, 68, 0)"
                  ]
                }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <AlertTriangle className="h-5 w-5 text-white" />
              </motion.div>
            </motion.div>
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  )}
</AnimatePresence>
```

**Status badge:**

```tsx
<motion.div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold
                       bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400">
  <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 0.5, repeat: Infinity }}>
    <ShieldX className="h-3.5 w-3.5" />
  </motion.div>
  <span>Blocked</span>
  <XCircle className="h-3.5 w-3.5" />
</motion.div>
```

**Submit button (with shake):**

```tsx
<motion.div animate={{ x: [0, -5, 5, -5, 5, 0] }} transition={{ duration: 0.4 }}>
  <Button className="bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/30">
    <motion.div animate={{ rotate: [0, -15, 15, -15, 15, 0] }} transition={{ duration: 0.5 }}>
      <XCircle className="h-5 w-5 text-white" />
    </motion.div>
  </Button>
</motion.div>
```

**Input field:**

```tsx
<Textarea className="border-red-500/60 focus-visible:ring-red-500/50 bg-red-500/5" />
```

---

## Timing Configuration

```typescript
// After passed state, hide banner after 2 seconds
bannerTimeoutRef.current = setTimeout(() => {
  setShowPassedBanner(false);
}, 2000);

// After passed state, return to idle after 3 seconds
passedTimeoutRef.current = setTimeout(() => {
  setPiiStatus("idle");
}, 3000);

// Blocked state persists until user edits the input
```

---

## Accessibility

```tsx
{/* Screen reader announcements */}
<div
  ref={liveRegionRef}
  role="status"
  aria-live="polite"
  aria-atomic="true"
  className="sr-only"
/>

// Update on status change:
if (piiStatus === "blocked") {
  liveRegionRef.current.textContent = `Message blocked. Personal information detected: ${categories}`;
} else if (piiStatus === "passed") {
  liveRegionRef.current.textContent = "Security check passed. No personal information detected.";
}
```

---

## Required Icons (Lucide)

```typescript
import {
  Send,
  Loader2,
  Shield,
  ShieldCheck,
  ShieldX,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Scan,
  Lock,
  Fingerprint,
  RotateCcw,
} from "lucide-react";
```

---

## Color Reference

| State | Background | Border | Text | Glow |
|-------|------------|--------|------|------|
| Idle | slate-100/800 | - | slate-500/400 | - |
| Checking | amber-500/5-10 | amber-500/50 | amber-600/400 | amber-500/30 |
| Passed | emerald-500/20-30 | emerald-500 | emerald-600/400 | emerald-500/50 |
| Blocked | red-500/15-25 | red-500 | red-600/400 | red-500/30-50 |

## PROMPT END

---

## Reference Files

| Purpose | Path |
|---------|------|
| **Main Component** | `src/components/chat/message-composer.tsx` |
| **PII Guidance Dialog** | `src/components/chat/pii-guidance-dialog.tsx` |
| **PII API Route** | `src/app/api/pii/route.ts` |
| **PII Detection Logic** | `src/lib/pii.ts` |
| **Toast Hook** | `src/hooks/use-toast.ts` |
| **UI Components** | `src/components/ui/button.tsx`, `textarea.tsx`, `dialog.tsx` |

## Quick Copy

```bash
# Copy PII animation components
cp src/components/chat/message-composer.tsx /new-project/src/components/chat/
cp src/components/chat/pii-guidance-dialog.tsx /new-project/src/components/chat/
cp src/app/api/pii/route.ts /new-project/src/app/api/pii/
cp src/lib/pii.ts /new-project/src/lib/
```

---

*PII Animation System v1.0*
