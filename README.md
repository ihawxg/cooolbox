# Company Search & Filter App

React Native (Expo) app for searching, sorting, and filtering an in-memory dataset of companies. No API, no backend — everything runs locally with a custom-built search engine.

## Setup

```bash
npm install
npx expo start
```

`i` for iOS sim, `a` for Android. For a dev build on a physical device: `npx expo run:ios --device`.

Tests: `npm test` — 84 tests across 7 suites.

---

## Architecture

I split the codebase into layers with a hard rule: business logic cannot import React. Everything in `utils/` is plain TypeScript — the search engine, filter predicates, sort comparators. This means I can test all the algorithmic stuff with basic Jest assertions, no component rendering, no mocking React Native modules. The hook layer (`hooks/`) is the bridge — it takes raw state from context, debounces, runs the pipeline through `useMemo`, and hands results to screens.

Screens are thin. They compose components and connect hooks. No logic in there.

```
app/                    screens — just composition, no logic
components/             UI — split between "smart" (reads context) and "dumb" (props only)
hooks/                  glue between state and UI
context/                global state via useReducer
utils/                  pure functions — search, filter, sort
types/                  TypeScript interfaces
constants/              colors, spacing, industry palette
data/                   24 company records with related entities
__tests__/              mirrors utils/ structure
```

I went with Context + `useReducer` instead of pulling in Redux or Zustand. The app has one domain — search/filter/sort. One global state shape. `useReducer` gives typed actions with discriminated unions so every state change is explicit. When you hit "Clear All" it dispatches one action that resets query, filters, and sort atomically — no intermediate states from multiple `setState` calls landing at different times.

The context value gets memoized so consumers don't re-render when the parent does. The filter sheet's BottomSheet ref also lives in context because the sheet renders at root level (needs to overlay the tab bar) but the open button is inside the Search tab — context bridges that without prop drilling through the navigator.

In a real app with actual APIs, I'd separate server state from UI state. Search results and company data would go through TanStack Query (caching, background refetch, stale-while-revalidate), while local things like "which filters are open" would stay in a lightweight store — Context or Zustand. The search query would hit an Elasticsearch endpoint for example instead of running locally. Pagination would be cursor-based with `onEndReached` on the FlatList. Debouncing stays client-side either way.

---

## Search Engine

The assignment says don't just use `.filter()` and `.includes()`, so I built a tokenizer → parser → scorer pipeline. It's modeled after how search engines work internally — you analyze the input, match against an index, score the results, then rank them.

When you type something like `"Goldman Sachs" industry:Finance revenue>50000000000 bank`, the tokenizer splits it into typed tokens:

- `"Goldman Sachs"` → exact match (quoted phrase, treated as one unit)
- `industry:Finance` → field match (searches only the industry field)
- `revenue>50000000000` → range query (numeric comparison on revenue)
- `bank` → free text (scored against every searchable field)

The tokenizer handles edge cases — unclosed quotes fall back to free text, range operators are checked longest-first so `>=` gets matched before `>`, unknown field names in `field:value` syntax just become free text instead of throwing errors.

The parser validates tokens against a whitelist of known fields (name, country, industry, revenue, etc.) and drops anything it doesn't recognize. Then the scorer runs each company against all tokens with AND logic — every token must match or the company scores 0.

Scoring is tiered. For free text, the scorer checks strategies from best to worst and exits early when it finds one:

- Exact value match → 100 points
- Prefix (field starts with term) → 75
- Word-level prefix (any word starts with term, so "Sachs" matches "Goldman Sachs") → 70
- Substring → 50
- Fuzzy match (edit distance) → 25

The fuzzy matching uses edit distance — how many single-character changes (insert, delete, replace) it takes to turn one string into another. So "Amazom" → "Amazon" is distance 1 (one substitution), which is close enough to match. The implementation is space-optimized (two rows instead of the full matrix, shorter string in the inner loop). The distance threshold scales with term length: 3-5 character terms only allow distance 1 (tight — prevents short terms from matching unrelated words), 6-12 characters allow distance 2 (catches real typos), anything shorter or longer skips fuzzy entirely. There's also a pre-filter that checks length difference before running the computation — if two strings differ in length by more than the max allowed distance, it can't possibly pass, so we skip it.

Search requires at least 3 characters before activating. Below that the scorer produces too many low-quality matches.

Results are ranked by total score (descending), with ties broken by name (ascending) for stable ordering.

---

## Filtering and Sorting

The processing pipeline runs in a specific order that matters:

1. Search engine scores all companies (if query is 3+ chars, otherwise everything passes with score 0)
2. Filter predicates are applied — AND logic across all active filters
3. Sort is applied based on the selected field

The default sort is "Relevance" — when there's an active search, it preserves the search engine's ranking (best match first). When there's no search, it keeps dataset order. If the user switches to any explicit sort like Revenue or Name, that sort always applies regardless of whether there's an active search or not. This way the user is always in control — we never silently override their sort choice, but the default behavior during search is what you'd expect (best matches first).

Each filter is a factory function that returns a predicate closure. `filterByIndustry(['Tech', 'Finance'])` builds a Set internally and returns a function that checks membership in O(1). When a filter has no selections it returns `() => true` which costs basically nothing in the filter loop. Adding a new filter type is one function plus one line in the pipeline — no switch statements, no growing if-else chains.

Filters and search constraints are AND'd together and they never override each other. If you set Industry to "Technology" in the filter sheet and then type `industry:Health` in the search bar, you get 0 results. Both constraints show up as removable chips so the conflict is visible and the user can fix it. I deliberately avoided any "magic" where one input silently overrides another — that's confusing.

Sort comparators are typed per field. Relevance is a no-op (returns 0, preserving existing order). String fields use `localeCompare`, numeric fields use subtraction, and size uses an ordinal mapping (Small=0, Medium=1, Large=2) so "ascending" puts the smallest first. Direction is handled with a multiplier — 1 for asc, -1 for desc. Tapping the same sort field twice flips direction, which is standard table behavior. The sort always shallow-copies before mutating so the source data stays untouched.

---

## UI

Components are split into smart and dumb. Smart ones like `FilterSheet`, `ActiveFiltersBar`, and the screen components read from context directly. Dumb ones like `CheckboxGroup`, `RadioGroup`, `ChipSelector`, `CompanyCard` only take props — they don't know about the app's state, which makes them reusable. Haptic feedback lives in the action handlers (the smart layer), not in the UI controls — so the same checkbox component could have different feedback in different contexts.

There's no prop drilling. The deepest chain is `SearchScreen → CompanyList → CompanyCard` which is just standard list rendering.

### Scroll animations

The search screen header collapses when you scroll down and expands when you scroll up because space is tight and the header should get out of the way when browsing but come back instantly when the user wants to search again.

The filter button morphs between a 52px circle and a 130px pill depending on scroll state, with width, padding, and text opacity all interpolating independently. It shows a badge with the active filter count.

### Filter sheet

Built with `@gorhom/bottom-sheet` because swipe-to-dismiss feels more native than a modal. On iOS it needs `FullWindowOverlay` from `react-native-screens` to render above the tab bar — Android doesn't have this issue. Had to set `enableDynamicSizing={false}` because v5 defaults to sizing by content which ignores snap points.

The sheet header shows a live result count (e.g. "12/24") that updates as you toggle filters, computed directly from the pipeline without debouncing so it's instant. The footer has Reset and Apply buttons, with Apply showing the active filter count.

### Revenue range slider

Used `@ptomasroos/react-native-multi-slider` for the dual-thumb slider. I tried building a custom one with gesture handler and reanimated but ran into gesture tracking issues — `translationX` accumulation bugs and unreliable thumb constraints at the boundaries. The library handles all the edge cases (thumb overlap prevention, snapping, track bounds) and I styled the thumbs with platform-specific shadows to match the design.

One thing I ran into: using the slider's `onValuesChange` callback (fires every frame during drag) caused an infinite render loop — state update → re-render → new props → callback fires again. Switched to `onValuesChangeFinish` which only fires when the user lifts their finger.


### Dark mode and theming

Every color goes through `useThemeColor()` which reads from two palettes with 20+ semantic tokens — text, textSecondary, textTertiary, background, backgroundSecondary, border, accent, chipBackground, and so on. The only hardcoded color is white for text on colored backgrounds where it needs to stay white regardless of theme. Spacing follows a 4px scale (4/8/12/16/24/32) and shadows are platform-specific (iOS shadow properties, Android elevation) defined once in constants.

### Haptic feedback

Haptics are in the action handlers, not the UI components. `selectionAsync` for toggles (checkboxes, radio buttons, sort options), `impactAsync(Light)` for clearing text and removing chips, `impactAsync(Medium)` for the Apply button, `notificationAsync(Warning)` for destructive stuff like Reset and Clear All.

### What I'd do differently with real data at scale

Switch from FlatList to `@shopify/flash-list` for cell recycling (matters above ~100 items). Add skeleton loading states instead of blank screens while data loads. Pull-to-refresh. Error boundaries around each section of the detail screen so one failed section doesn't take down the page. Proper accessibility labels on all interactive elements — right now it relies on platform defaults which isn't enough.

---

## Data

24 companies across 7 industries, 3 sizes, 2 types, 13 countries. Revenue ranges from $320M to $611.3B, founded years from 1849 to 2015. Some companies have negative net income (edge case for display and sorting), private companies have null stock_info (edge case for conditional rendering). I made the dataset diverse enough that different filter combinations actually produce interesting results — if everything was large US tech companies, most filters would return everything or nothing.

The bonus entities from the assignment (board members, stock info, offices) are implemented and displayed in the detail screen. They don't complicate the main search/filter logic — they're just additional data shown when you drill into a company.

In a real app the data would come from REST or GraphQL endpoints. I'd normalize nested entities into separate queries to avoid over-fetching. The detail screen would fetch on mount with loading states.

---

## Testing

All 84 tests target `utils/` — pure functions only. The tokenizer tests cover quoted strings, field syntax, range operators, mixed queries, unclosed quotes. The scorer tests hit every scoring tier plus edit distance edge cases. The pipeline test validates the full end-to-end flow: search + filter + sort combined, empty results, conflicting constraints, relevance sort preserving search ranking.

I didn't write component tests because the business logic is fully extracted into utils. The components are just rendering — there's nothing to test that isn't already covered by the pipeline integration tests. In production I'd add React Native Testing Library tests for critical user flows, E2E with Detox or Maestro, and API contract tests.

---

## Dependencies

- `expo` + `expo-router` — framework and file-based routing
- `react-native-reanimated` — scroll animations on the UI thread (can't hit 60fps with JS-driven animations)
- `@gorhom/bottom-sheet` — filter panel with swipe-to-dismiss
- `@ptomasroos/react-native-multi-slider` — revenue range slider
- `expo-haptics` — tactile feedback
- `react-native-screens` — native containers + FullWindowOverlay for the iOS bottom sheet

No state management library (Context + useReducer covers it), no search library (the custom pipeline is the point), no UI component library (everything built from scratch).

---

## Bonus features covered

- Advanced search syntax — `industry:Tech revenue>5000000 size:Large "Goldman Sachs"` with proper tokenization
- Related entities — board members, stock info, offices in the detail screen
- Debounced search — 300ms with `isSearching` loading state
- Unit tests — 84 tests across tokenizer, parser, scorer, engine, comparators, filters, pipeline
- Animations — scroll-driven header collapse, FAB morphing, staggered list entry, animated filter chips
- Haptics — contextual feedback on all interactions
- Dark mode — full support with semantic color tokens
- Fuzzy search — edit distance with scaled thresholds for typo tolerance
