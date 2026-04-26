---
name: Meituan Health AI
colors:
  surface: '#fff8f0'
  surface-dim: '#e2d9c7'
  surface-bright: '#fff8f0'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#fcf3e0'
  surface-container: '#f6eddb'
  surface-container-high: '#f1e7d5'
  surface-container-highest: '#ebe2cf'
  on-surface: '#1f1b10'
  on-surface-variant: '#4e4632'
  inverse-surface: '#353024'
  inverse-on-surface: '#f9f0dd'
  outline: '#7f765f'
  outline-variant: '#d1c6ab'
  surface-tint: '#725c00'
  primary: '#725c00'
  on-primary: '#ffffff'
  primary-container: '#ffd000'
  on-primary-container: '#6f5a00'
  inverse-primary: '#eec200'
  secondary: '#0051d6'
  on-secondary: '#ffffff'
  secondary-container: '#326bf1'
  on-secondary-container: '#fefcff'
  tertiary: '#984800'
  on-tertiary: '#ffffff'
  tertiary-container: '#ffcaab'
  on-tertiary-container: '#944600'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffe082'
  primary-fixed-dim: '#eec200'
  on-primary-fixed: '#231b00'
  on-primary-fixed-variant: '#564500'
  secondary-fixed: '#dbe1ff'
  secondary-fixed-dim: '#b4c5ff'
  on-secondary-fixed: '#00174b'
  on-secondary-fixed-variant: '#003ea8'
  tertiary-fixed: '#ffdbc8'
  tertiary-fixed-dim: '#ffb689'
  on-tertiary-fixed: '#311300'
  on-tertiary-fixed-variant: '#743500'
  background: '#fff8f0'
  on-background: '#1f1b10'
  surface-variant: '#ebe2cf'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
  headline-md:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  body-base:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  label-bold:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
  data-num:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '700'
    lineHeight: 24px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  container-padding: 16px
  card-gap: 12px
  section-margin: 24px
  element-padding-sm: 8px
  element-padding-md: 12px
---

## Brand & Style

This design system is engineered to bridge the gap between the vibrant, consumer-facing energy of the Meituan ecosystem and the rigorous, dependable nature of healthcare management. The brand personality is **Reliable, Efficient, and Human-centric**. It targets individuals managing chronic conditions who require high-density information presented with absolute clarity.

The aesthetic follows a **Corporate Modern** style, utilizing the "Super App" logic of the parent brand: high-contrast interaction points, structured information modules, and a "function-first" layout. It evokes a sense of professional medical oversight powered by intelligent automation, ensuring users feel both cared for and in control.

## Colors

The palette is anchored by **Meituan Yellow**, used strategically for high-level brand touchpoints and primary category indicators. For functional utility, we introduce a structured hierarchy of status colors:

- **Primary Action (Blue):** Dedicated to "Actions" (e.g., logging medication, starting a consultation) to ensure a professional, medical-grade feel.
- **Alert/Urgent (Red/Orange):** Reserved for low-stock warnings, missed doses, and health alerts.
- **Neutral Scale:** Uses a soft gray background (`#F7F8FA`) to allow white cards to pop, creating a clear "layered" interface typical of modern utility apps.

## Typography

The design system utilizes **Inter** as its primary typeface to ensure maximum legibility across dense medical data. The typographic scale is optimized for high-density information displays.

Key emphasis is placed on **numerical data** (dosages, times, stock counts), which use a heavier weight to stand out within card layouts. Labels are kept concise and often use a slightly muted color or bold weight to distinguish between "Title" and "Value" in medication specs.

## Layout & Spacing

This design system uses a **Fluid Grid** model with a focus on vertical stacking. Elements are organized into logical "Modules" or "Cards" that stretch to fill the container width, following a strict 4px/8px rhythm.

- **Margins:** Standard 16px side margins for mobile/tablet views.
- **Gutters:** 12px spacing between cards to maintain a tight, efficient information density without feeling cluttered.
- **Vertical Rhythm:** Sections are separated by 24px margins to allow the eye to rest between different functional areas (e.g., "Overview" vs. "Timeline").

## Elevation & Depth

Hierarchy is established through **Tonal Layers** rather than heavy shadows. The base of the app is a light neutral gray, while active content lives on white cards.

- **Level 0 (Background):** `#F7F8FA`
- **Level 1 (Cards/Containers):** Pure white with a very subtle, 1px border (`#EEEEEE`) or an extremely soft ambient shadow (4px blur, 2% opacity).
- **Level 2 (Modals/Overlays):** 12px blur ambient shadow to indicate temporary focus.
- **AI Sidebar/Agent:** Uses a slightly tinted background (soft green or blue) to distinguish "Assistant" areas from "User Data" areas.

## Shapes

The shape language is defined by **Rounded (8px-12px)** corners, striking a balance between the friendliness of consumer apps and the precision of medical tools.

- **Standard Cards:** 12px radius.
- **Buttons & Chips:** 8px radius or fully pill-shaped for high-frequency actions.
- **Inner Elements (Input fields/Status tags):** 6px-8px radius to create a nested "squircle" harmony.

## Components

### Buttons
- **Primary:** Meituan Yellow background with black text for high-level navigation.
- **Action:** Solid Blue (`#0052D9`) for medical tasks like "Log Dose."
- **Secondary:** Ghost style with 1px gray border for "Follow Up" or "Edit."

### Cards
Medication cards must include a "Header" (Name/Dose) and a "Grid" (Details like remaining stock, frequency). Use 2-column small-grid layouts within cards for dosage specs.

### AI Agent Interface
The AI assistant component should use a distinct background tint (e.g., soft mint or sky blue) and include "Quick Action" chips at the bottom of its chat bubble to guide the user's next step.

### Status Indicators
Small, high-contrast badges (e.g., "Short Stock" in red) should be placed in the top-right corner of cards to act as immediate visual flags.

### Input Fields
Clean, 1px bordered boxes with 12px internal padding. Labels should be placed above the field or integrated as floating labels to save vertical space.