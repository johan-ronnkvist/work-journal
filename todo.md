# WeekKey to WeekIdentifier Migration

## Overview
Migrating from string-based `WeekKey` to object-based `WeekIdentifier` type with separate year/week integers.

**Goal:** Simplify codebase by removing string parsing/formatting from application layer while keeping IndexedDB string keys in repository layer.

## Progress

### Phase 1: Type Definitions & Utilities ✅
- [x] Create WeekIdentifier type and core interfaces in WeeklyData.ts
- [x] Add WeekIdentifier utility functions to WeekKey.utils.ts

### Phase 2: Repository Layer ✅
- [x] Update IndexedDBRepository to use WeekIdentifier in public API
- [x] Update IWeeklyDataRepository interface

### Phase 3: Component Updates ✅
- [x] Update NotesView to use WeekIdentifier
- [x] Update WeekHeader component to use WeekIdentifier props
- [x] Update WeekStatusField component to use WeekIdentifier props
- [x] Update WeekTextField component to use WeekIdentifier props
- [x] Update WeekDeleteButton component to use WeekIdentifier props
- [x] Update WeekPicker component to use WeekIdentifier

### Phase 4: Testing ✅ (Unit Tests) / 🚧 (Integration Tests)
- [x] Update WeekKey.utils.spec.ts tests for WeekIdentifier functions (not needed - tests still pass)
- [x] Update IndexedDBRepository unit tests (all 26 tests passing)
- [ ] Update NotesViewWorkflow integration tests (22 tests need updating)
- [x] Run unit tests to verify migration (97/97 passing)

## Key Changes Made

### Simplified Component Props
**Before:** Components received `year` and `week` separately, then reconstructed string key
```typescript
// 5 components had this pattern
const weekKey = computed(() => createWeekKey(props.year, props.week))
```

**After:** Components receive single `WeekIdentifier` object
```typescript
const props = defineProps<{ weekId: WeekIdentifier }>()
// Direct access: props.weekId.year, props.weekId.week
```

### Repository Layer Encapsulation
- Public API uses `WeekIdentifier`
- Internal conversion to/from string keys for IndexedDB
- `getWeeksWithData()` now returns `Set<number>` instead of `Set<WeekKey>`

### Eliminated Redundant Operations
- Removed ~60 string operations per page load
- No parsing in application layer
- Zero `createWeekKey()` / `parseWeekKey()` calls in components

## Notes
- IndexedDB continues to use string keys internally (YYYY-Wnn format)
- Repository layer handles conversion between WeekIdentifier and string keys
- Application layer (components, views) only uses WeekIdentifier
- WeekKey type marked as `@deprecated` for repository-only use
