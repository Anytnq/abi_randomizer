# Graph Report - .  (2026-07-16)

## Corpus Check
- Corpus is ~16,474 words - fits in a single context window. You may not need a graph.

## Summary
- 266 nodes · 655 edges · 12 communities (11 shown, 1 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 22 edges (avg confidence: 0.5)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Filter & category logic
- Weapon and UI data
- Spin/result generation
- Firebase & squad backend
- Gun game route builder
- Audio playback
- Decision/history UI
- Wheel rendering
- Squad storage tests
- Project documentation
- Responsive layout
- Service worker

## God Nodes (most connected - your core abstractions)
1. `initialize()` - 36 edges
2. `spinAll()` - 28 edges
3. `publishSquadEvent()` - 15 edges
4. `reloadMapOnly()` - 14 edges
5. `renderFilters()` - 13 edges
6. `runDebugAction()` - 12 edges
7. `playHeroSong()` - 10 edges
8. `render()` - 9 edges
9. `syncSquadResult()` - 9 edges
10. `setSelectedCategories()` - 9 edges

## Surprising Connections (you probably didn't know these)
- `createRouteEntry()` --calls--> `formatWeaponCategory()`  [EXTRACTED]
  assets/js/gungame/gungame.js → assets/js/randomizer/game.js
- `syncSquadResult()` --calls--> `publishResult()`  [EXTRACTED]
  assets/js/gungame/gungame.js → assets/js/randomizer/squad.js
- `loadHistory()` --calls--> `loadArray()`  [EXTRACTED]
  assets/js/muschel/app.js → assets/js/randomizer/storage.js
- `showDecision()` --calls--> `playmuschelDecisionSound()`  [EXTRACTED]
  assets/js/muschel/app.js → assets/js/randomizer/sound.js
- `renderFilters()` --calls--> `renderFilterButtons()`  [EXTRACTED]
  assets/js/randomizer/app.js → assets/js/randomizer/ui.js

## Import Cycles
- None detected.

## Communities (12 total, 1 thin omitted)

### Community 0 - "Filter & category logic"
Cohesion: 0.08
Nodes (58): allCategoryKeys, applyCacheHotfixOnce(), applyCompactMode(), applyStreamerMode(), arraysEqual(), canEditCategoryFilters(), CATEGORY_CONFIG, compactControlsHost (+50 more)

### Community 1 - "Weapon and UI data"
Cohesion: 0.09
Nodes (29): gungameWeapons, armoredChestRigs, armors, backpacks, baseWeapons, categoryOptions, categoryOptionsRow1, categoryOptionsRow2 (+21 more)

### Community 2 - "Spin/result generation"
Cohesion: 0.11
Nodes (30): buildResult(), buildSquadWheelValues(), createInitialStrips(), getSpinDuration(), handleDiedReroll(), handleSurvivedReroll(), isCategorySelected(), normalizeChanceValue() (+22 more)

### Community 3 - "Firebase & squad backend"
Cohesion: 0.14
Nodes (25): app, db, firebaseConfig, handleWheelSpinRequest(), cleanupInactivePlayers(), createPlayerRecord(), createSession(), generateCode() (+17 more)

### Community 4 - "Gun game route builder"
Cohesion: 0.18
Nodes (24): buildRoute(), completeRaid(), createRouteEntry(), elements, getCurrentResult(), getWeaponValue(), GUNGAME_SQUAD_CATEGORIES, initialize() (+16 more)

### Community 5 - "Audio playback"
Cohesion: 0.23
Nodes (20): applyHeroAudioVolume(), clampVolume(), connectGainToOutput(), ensureAudioContext(), getHeroTrackTargetVolume(), getMasterGainNode(), isHeroSongPlaying(), playClick() (+12 more)

### Community 6 - "Decision/history UI"
Cohesion: 0.20
Nodes (17): askmuschel(), clearHistory(), elements, initialize(), loadHistory(), renderHistory(), saveHistory(), showDecision() (+9 more)

### Community 7 - "Wheel rendering"
Cohesion: 0.15
Nodes (10): buildSpinPayload(), canEditManualList(), createNoopController(), drawSegmentText(), drawWheel(), getConfigSnapshot(), initializeWheelSpin(), pickColor() (+2 more)

### Community 8 - "Squad storage tests"
Cohesion: 0.41
Nodes (10): buildSquadStorageChecksum(), buildSquadStoragePayload(), getInactivePlayerIds(), getRecentEvents(), isSquadStoragePayloadValid(), assert(), runSquadUtilsTests(), testInactivePlayerDetection() (+2 more)

### Community 9 - "Project documentation"
Cohesion: 0.29
Nodes (6): ABI Randomizer, Deployment (GitHub Pages), Features, Local Development, Notes, Project Structure

### Community 10 - "Responsive layout"
Cohesion: 0.60
Nodes (5): applyDynamicCompactLayout(), clamp(), clearDynamicLayoutStyles(), clearStyleProps(), initializeResponsiveLayout()

## Knowledge Gaps
- **30 isolated node(s):** `firebaseConfig`, `app`, `GUNGAME_SQUAD_CATEGORIES`, `elements`, `state` (+25 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `publishResult()` connect `Firebase & squad backend` to `Filter & category logic`, `Spin/result generation`, `Gun game route builder`?**
  _High betweenness centrality (0.047) - this node is a cross-community bridge._
- **Why does `publishSpinning()` connect `Gun game route builder` to `Filter & category logic`, `Spin/result generation`, `Firebase & squad backend`?**
  _High betweenness centrality (0.042) - this node is a cross-community bridge._
- **Why does `createSquadUI()` connect `Gun game route builder` to `Filter & category logic`, `Firebase & squad backend`?**
  _High betweenness centrality (0.027) - this node is a cross-community bridge._
- **Are the 7 inferred relationships involving `initialize()` (e.g. with `app.js` and `handleDiedReroll()`) actually correct?**
  _`initialize()` has 7 INFERRED edges - model-reasoned connections that need verification._
- **Are the 7 inferred relationships involving `renderFilters()` (e.g. with `toggleArmorTier()` and `toggleCategory()`) actually correct?**
  _`renderFilters()` has 7 INFERRED edges - model-reasoned connections that need verification._
- **What connects `firebaseConfig`, `app`, `GUNGAME_SQUAD_CATEGORIES` to the rest of the system?**
  _30 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Filter & category logic` be split into smaller, more focused modules?**
  _Cohesion score 0.07814207650273224 - nodes in this community are weakly interconnected._