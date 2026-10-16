# Typography investigation and validation

## Observed sources of conflict
The prior project attached the shared rail to `.sidebar`, `.brand` and `.active`, classes also controlled by page styles. Legacy `nav a.active` selectors in achievements, quiz, result, teacher directory and teacher profile changed font weight to 700. Student `.nav-item.active` changed it to 600. Each page used a different font stack and some loaded remote fonts with swap.

The prior workaround added many `!important` typography declarations. It hid the legacy sidebar only below `#app`, while the teacher dashboard uses `#teacher-app`. Therefore that dashboard retained a second navigation component with its own sizing and inherited styles. Render wrappers queried generic `.sidebar nav`, allowing ownership of navigation selectors to depend on document order.

Static inspection found no button handler directly changing font-size or a shared font variable. Animation code changes motion properties, while language, theme and mood handlers intentionally change preferences.

## Maintainable fix
- One visible navigation component, `.orbit-rail`, with `.orbit-nav-link` and `.is-current`. No legacy sidebar/brand/active class on the shared rail.
- Page selectors confined to `#orbit-page`. Shared content CSS similarly scoped. Root/body rules retain only intentional page background/theme/layout behavior; typography comes from shared tokens.
- Removed obsolete sidebar style rules and font changes from interaction-state rules. Legacy markup retained hidden and inert where old rendering code still reads it, preserving working behavior during migration.
- Shared typography tokens in tokens.css; shared form styles in forms.css. No !important declarations for rail typography. The hidden invariant retains an explicit display rule to keep hidden wizard panels out of layout and accessibility navigation.
- Local system font stack eliminates late font swapping. Focus, hover, active and selected styles alter color, outlines and backgrounds rather than typography. Busy indicators sit outside text layout.

## Validation
Automated Edge checks compare font-family, font-size, font-weight, line-height and letter-spacing of controls, headings, labels and rail items during hover, focus and pointer-down states. Desktop and mobile cover Student, Teacher and School routes. Actual workflows additionally cover registration, multi-step Back/Continue/Review, profile editing, preview/save/cancel, persistence failure, account ownership, job posting, applications, original submission preservation, exchange sale/lending, lesson preparation and publishing.

The run also checks JavaScript syntax, missing local assets, console errors, legacy-sidebar visibility, mobile overflow, and consistent rail typography. It does not claim certification of every browser or every possible data combination.

## Final recorded checks
- Desktop: 613 visible controls, 1,839 hover/focus/pointer-down typography checks across 29 role routes.
- Mobile: 288 visible controls, 864 equivalent checks at 390 × 844.
- Functional flows passed after final changes: Student/Teacher/School registration and login, profile save/photo and live references, guided planning and publishing, jobs/applications, sale/lending exchange, persistence failure and ownership rejection.
- Separate migration check preserved legacy photo, XP and channel data; stale revisions and stale account edits were rejected.
- JavaScript syntax and local asset checks passed; no new page errors were recorded during the tested workflows.
- Browser coverage: Chromium-based Microsoft Edge. These checks do not imply exhaustive coverage of every possible interaction, browser or data combination.
