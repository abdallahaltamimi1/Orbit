---
name: The Learning Orbit
description: Three recognizable educational experiences in one blue learning universe
colors:
  midnight: "#142b4a"
  learning-blue: "#3b82f6"
  action: "#2563eb"
  student-turquoise: "#22c7a9"
  student-yellow: "#ffd166"
  student-coral: "#ff7a70"
  teacher-teal: "#0f9d91"
  teacher-action: "#08786f"
  school-indigo: "#4355a5"
  ink: "#17243a"
  muted: "#64748b"
  border: "#dce4ef"
  surface: "#fff"
  canvas: "#f6f8fc"
  soft: "#eaf1ff"
  error: "#b4233b"
  student-soft: "#e2f7f3"
  teacher-soft: "#e4f4f1"
  school-soft: "#edf0fc"
  dark-ink: "#edf4ff"
  dark-muted: "#b4c3d8"
  dark-border: "#304763"
  dark-surface: "#162b43"
  dark-canvas: "#0d1d30"
  dark-soft: "#203b59"
  dark-space: "#0b192a"
  dark-accent: "#9ac3ff"
  dark-error: "#ffacb5"
  dark-teacher-accent: "#7cdecf"
  dark-teacher-soft: "#173d41"
  dark-school-accent: "#b8c5ff"
  dark-school-soft: "#283955"
  dark-student-soft: "#123b3b"
typography:
  display:
    fontFamily: "Segoe UI, Tahoma, Arial, sans-serif"
    fontSize: "clamp(36px,4vw,60px)"
    lineHeight: 1.18
    letterSpacing: "-.03em"
  headline:
    fontFamily: "Segoe UI, Tahoma, Arial, sans-serif"
    fontSize: "clamp(28px,3vw,38px)"
    fontWeight: 700
  body:
    fontFamily: "Segoe UI, Tahoma, Arial, sans-serif"
    fontSize: "15px"
    lineHeight: 1.65
  label:
    fontFamily: "Segoe UI, Tahoma, Arial, sans-serif"
    fontSize: "13px"
    fontWeight: 600
    lineHeight: 1.6
  control:
    fontFamily: "Segoe UI, Tahoma, Arial, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.55
  navigation:
    fontFamily: "Segoe UI, Tahoma, Arial, sans-serif"
    fontSize: "13px"
rounded:
  control: "10px"
  login-field: "12px"
  panel: "14px"
  feature: "16px"
  destination: "18px"
  profile: "20px"
  continue: "22px"
  student-hero: "24px"
spacing:
  unit: "8px"
  control-gap: "10px"
  compact: "16px"
  panel: "24px"
  generous: "32px"
  registration-gap: "40px"
components:
  button-primary:
    backgroundColor: "{colors.action}"
    textColor: "{colors.surface}"
    rounded: "{rounded.control}"
    padding: "11px 17px"
  button-soft:
    backgroundColor: "{colors.soft}"
    textColor: "{colors.action}"
    rounded: "{rounded.control}"
    padding: "11px 17px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.panel}"
    padding: "12px 14px"
    typography: "{typography.control}"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.panel}"
    padding: "24px"
  chip:
    backgroundColor: "{colors.soft}"
    textColor: "{colors.action}"
    rounded: "{rounded.profile}"
    padding: "6px 10px"
---

# Design System: The Learning Orbit

## Overview

**Creative North Star: "One learning universe, three recognizable experiences"**

The user-pinned blue direction replaces the former violet platform identity. This is a code-led system extracted from shared tokens, role themes, cinematic presentation and registration source; no randomized concept seed or approved image composition exists.

Students explore colorful learning destinations, teachers work in a calm publishing studio, and schools use structured discovery and management surfaces. Neutral reading regions keep forms and real educational data legible. The protected homepage space hero retains its existing composition, renderer and local art palette; translations do not redesign its artwork.

**Key Characteristics:**
- Blue foundations and purposeful role accents.
- Readable Arabic and English with native controls.
- Quiet workspaces beside selected scientific imagery.
- Finite motion and graceful decorative fallbacks.

## Colors

The frontmatter captures the actual semantic palette from `shared/tokens.css` and `shared/role-themes.css`; these CSS files remain implementation authority.

### Primary
- **Midnight:** scene foundations, student welcome panel and professional cover.
- **Learning Blue:** expressive science and learning accent.
- **Action Blue:** public/student white-label primary actions and light-theme focus.

### Secondary
- **Student Turquoise, Yellow and Coral:** playful destinations and supported learning indicators. Pale destination backgrounds carry midnight text; the yellow hero action also carries midnight text.
- **Teacher Teal:** expressive teacher identity; Teacher Action is the darker white-label action shade.

### Tertiary
- **School Indigo:** organized school identity, primary actions and light-theme focus.

### Neutral
- **Canvas / Surface / Soft:** page foundations, readable cards and quiet secondary regions.
- **Ink / Muted / Border:** text hierarchy and structural separation.
- **Error:** actual invalid states and validation messages.
- **Dark variants:** body theme switches text, border, surfaces, focus and errors. Teacher/school dark accents lighten text and focus while their darker action colors remain in place with white labels. Student dark soft surfaces deepen. Some student destination tiles deliberately retain pale backgrounds and midnight text.

**The Action Contrast Rule.** Bright learning blue, turquoise and teacher teal are expressive accents; white-label actions use the darker action tokens. Do not substitute bright accents into action backgrounds without checking contrast.

## Typography

**Display Font:** Segoe UI, Tahoma, Arial, sans-serif.
**Body Font:** the same functional bilingual stack; no new font dependency.

Login display and form headings use the frontmatter roles. Shared body, labels, controls and navigation retain their existing sizes. Content headings vary by surface rather than forcing one display scale onto every dashboard. Arabic headings use normal tracking and a 1.5 line height; English headings use modest negative tracking. Measurement outputs use tabular numerals. Lesson reading regions reach 75ch with a 1.9 line height.

Controls in shared forms become 16px below 620px. Preserve `lang`, `dir`, logical spacing and the single visible language control; translated labels must remain readable when they wrap.

## Layout

General experience wrappers are 1140px maximum with 40px 24px padding; registration extends to 1280px with 36px 24px 64px padding. Registration uses .9fr/1.1fr columns and a 40px gap, becomes .8fr/1.2fr with 24px gap below 900px, and stacks below 760px. Its desktop scene host is 340px high; the mobile reviewed scene is 88px wide and 104px high beside compact copy in an 88px/flexible grid with 12px gap and 16px story padding. The story heading is 30px on desktop and 20px with a 1.45 line height on mobile. The desktop story is sticky at 30px with 620px minimum height; mobile removes that minimum.

Login divides scenic/form regions 1.1fr/.9fr, with a 420px form maximum; the scenic panel hides below 760px. Settings uses a flexible form and 300px preview with a 28px gap, stacking below 900px. Shared three-column grids become two below 760px and one below 480px. Profile/settings panels tighten to 22px padding below 540px. Dense tables, publishing controls and instruments keep their working hierarchy.

## Elevation & Depth

Depth primarily comes from tonal surfaces, borders and selected scene imagery. Most channel, teacher, lesson and work cards are flat. The student welcome uses a restrained shadow (`0 20px 48px #142b4a18`); classroom board depth uses `0 8px 20px color-mix(in srgb,var(--orbit-space) 18.82%,transparent)`. Existing native dialogs use a dimmed backdrop with 5px blur. Keep scenic depth away from form controls.

## Shapes

Controls are gently rounded; shared form fields use the 14px panel radius, while registration fields and role choices use 10px and login fields 12px. Repeated content cards are generally 12–14px. Signature student destinations use 18px, continuation panels 22px and welcome panels 24px (20px on narrow screens). Profile overviews/editors, teacher covers and settings panels use 20px. The role stylesheet loads immediately after cinematic presentation on non-homepage pages, so its matching role declarations win; registration story/card radii remain 16px because the role stylesheet does not override them. Treat actual scoped CSS and cascade as authority rather than applying one radius globally.

## Components

### Buttons
Primary actions use role-aware action backgrounds and white labels; soft actions use soft surfaces and accent text. Basic buttons have 11px 17px padding and 10px corners. Registration submission is full width and at least 50px high. Preserve busy, disabled, validation and permission states. Cinematic states use 160ms transitions and .98 active scale; eligible fine-pointer cards lift 2px. Visible focus uses a 2px outline with contextual offset.

### Inputs / Fields
Shared forms use 12px 14px padding and semantic border/surface/ink tokens. Registration has at least 50px fields, invalid error borders and visible messages. Login fields are 56px high. Password eye buttons occupy 44px in a stable flex field, retain autocomplete, expose pressed state and an accessible label, and inherit keyboard focus. Do not remove useful browser password features globally.

### Chips
Channel tags use soft/accent colors, 6px 10px padding, 12px type and 20px corners. Registration role choices form three equal columns, have at least 48px height and use `aria-pressed` with selected accent border/text and soft fill.

### Cards / Containers
Use neutral surfaces for readable work; role-soft surfaces distinguish teacher studio and school summary regions. Student destinations use pale turquoise/yellow/coral/blue families with dark text. Data-driven progress, roster and achievement components must reflect actual stored data.

### Navigation
Shared navigation uses 13px type, wrapping links and logical direction. The student discovery link reaches the existing teacher directory; preserve profile and channel routes and permission behavior. Do not create a redundant generic teacher list.

### Scientific Registration Scene
The locally bundled Three scene depicts a metallic core, orbital tracks and open-page learning objects. It receives role, focus and status only, never form values. Its canvas is decorative and pointer-transparent; essential choices remain native buttons and inputs. Role/focus/state changes use finite updates (default 250ms), then stop scheduling frames. Pixel ratio caps at 1.5. Visibility/intersection changes suspend rendering; cleanup disposes geometries, materials, renderer and observers. Calm/reduced motion applies final states immediately. Failed WebGL/context loss displays the existing geometric fallback. It introduces no dependency or raster asset.

Selected primary regions enter once in 240ms using cubic-bezier(.23,1,.32,1); only login imagery settles in 640ms. Reduced motion, calm and print suppress decorative arrivals. Preserve independently controlled homepage, lesson and simulation rendering. The existing login `shared/assets/lunar-observatory.png` is a fictional generated illustration; its provenance remains in `ASSET-PROVENANCE.md`.

## Do's and Don'ts

### Do:
- **Do** use semantic tokens and the role-specific action shade.
- **Do** preserve bilingual layouts, keyboard focus and supported native behavior.
- **Do** show progress, profiles and empty states from actual application data.
- **Do** keep finite scene motion subordinate to readable forms.

### Don't:
- **Don't** restore a violet-heavy platform identity outside the protected homepage hero artwork.
- **Don't** invent ratings, activity, authentication flows or unsupported settings.
- **Don't** treat client-side permission checks as server authorization.
- **Don't** claim isolated-browser screenshots prove real-device GPU performance or production security.
