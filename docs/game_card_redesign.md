# Game Card Redesign Documentation

## Overview

The GameResultsCard component has been completely redesigned to follow a two-speed interaction model that reduces decision fatigue while providing clear pathways for both casual interest and intentional organization.

---

## Design Principles

### Two-Speed Interaction Model

**1. Low Commitment → Save (Bookmark)**
- **Icon**: Bookmark (not heart)
- **Action**: Instant toggle, no modal
- **Meaning**: "I'm interested, save this for later"
- **Backend**: Auto-saves to a dedicated "Saved" or "Liked" board
- **Feedback**: Tooltip + visual state change (outline → filled)
- **Color**: Amber/gold when saved

**2. High Commitment → Add to Board**
- **Button**: Primary CTA with "+ Add to Board" label
- **Action**: Opens AddToBoardDialog modal
- **Meaning**: "I want to organize this intentionally"
- **User Chooses**:
  - Which board (Library, Wishlist, custom boards)
  - Status (WISHLIST, PLAYING, OWNED, COMPLETED)
  - Optional platform
- **Feedback**: Shows state badge after addition

---

## Component API

### New Props

```typescript
type Props = {
  game: Game;                          // Game data
  reason?: string;                     // AI recommendation reason (optional)
  saveState: SaveState;                // Bookmark/save state
  onSave: () => void;                  // Handler for saving
  onRemove: () => void;                // Handler for removing save
  onBoardAdded?: (boardName: string) => void;  // Callback after board addition
  boardMemberships?: BoardMembership[]; // Existing board memberships
};

// Save state (simplified from previous multi-board state)
type SaveState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "saved" }
  | { status: "error"; message: string };

// Board membership for state badges
type BoardMembership = {
  boardId: string;
  boardName: string;
  status: GameStatus;  // WISHLIST | PLAYING | OWNED | COMPLETED
};
```

### Removed Props

The following props from the old API are **removed**:
- `quickAddState: QuickAddSnapshot` (replaced with simpler `saveState`)
- `onQuickAdd: (boardKey: BoardKey) => void` (replaced with `onSave`)
- `onDialogAdded` (replaced with `onBoardAdded`)

The old three-board quick-add model (liked, wishlist, library) is replaced with:
- **Save** (bookmark icon) for low-commitment interest
- **Add to Board** (button + dialog) for high-commitment organization

---

## Visual Hierarchy

### Layout Structure

```
┌─────────────────────────────────────────────────────┐
│                                    [Bookmark Icon]   │  ← Top right: Save action
│                                                       │
│  ┌──────┐  Game Title                                │
│  │Cover │  Description text...                       │  ← Game info (clickable link)
│  │ Art  │  [Platform] [Genre]                        │
│  └──────┘  Release Date • Metacritic: 85             │
│                                                       │
│  ┌─────────────────────────────────────────────────┐ │
│  │ Why: AI recommendation reason...                │ │  ← Optional AI reason
│  └─────────────────────────────────────────────────┘ │
│                                                       │
│  [● In Library] [● Playing]  [+ Add to Board]        │  ← State badges + primary action
└─────────────────────────────────────────────────────┘
```

### Interaction States

#### Untouched Game
- Bookmark: Outline, white/60 opacity
- Actions: "Add to Board" button visible
- State badges: None

#### After Save (Bookmark)
- Bookmark: Filled amber, slight scale increase
- Tooltip: "Saved"
- Actions: "Add to Board" still available
- State badges: None (save is separate from board organization)

#### After Add to Board
- Bookmark: May be saved or unsaved (independent)
- Actions: "Add to Board" remains (can add to multiple boards)
- State badges: Show up to 2 badges with status (e.g., "In Library", "Wishlist", "Playing")
- If 3+ boards: Shows "+N more" badge

#### Error State
- Shows inline error badge with AlertCircle icon
- Red color scheme
- ARIA live region for accessibility

---

## Color System

### Bookmark (Save)
- **Unsaved**: `text-white/60`, `border-white/20`
- **Saved**: `text-amber-400`, `border-amber-400/50`, `fill-amber-400`
- **Hover (unsaved)**: `text-white`, `border-white/40`
- **Hover (saved)**: `text-amber-300`, `border-amber-300`

### Add to Board Button
- **Background**: `from-indigo-500 to-purple-500` gradient
- **Shadow**: `shadow-indigo-900/30`
- **Hover**: Brightness increase + shadow intensify

### State Badges
- **In Board/Playing/Owned**: Emerald (`emerald-500/10` bg, `emerald-500/30` border, `emerald-200` text)
- **Additional boards**: Slate gray (`slate-500/10` bg)
- **Visual indicator**: Small green dot (1.5px) for active status

### Metacritic Score
- **≥75**: Green (`green-500/20` bg, `green-300` text)
- **50-74**: Yellow (`yellow-500/20` bg, `yellow-300` text)
- **<50**: Red (`red-500/20` bg, `red-300` text)

---

## Accessibility

### ARIA Labels
- Bookmark button: `"Save for later"` / `"Remove from saved"`
- Add to Board button: Implicit via text content
- Error messages: `role="alert"`, `aria-live="assertive"`

### Keyboard Navigation
- All interactive elements are keyboard accessible
- Focus visible states with indigo outline
- Tooltips delay: 300ms

### Screen Readers
- State badges use semantic HTML
- Loading states announce via spinners
- Error states use ARIA live regions

---

## Responsive Behavior

### Desktop (≥640px)
- Bookmark icon: Icon-only with tooltip
- Full layout as designed
- Two-column metadata tags

### Mobile (<640px)
- Bookmark icon: Same (icon-only)
- Stack state badges vertically if needed
- "Add to Board" button remains full-width in flex container
- Reduced padding: `p-4` instead of `p-5`

**Note**: Consider adding mobile-specific optimizations in parent grid/container (e.g., `grid-cols-1` on mobile).

---

## Migration Guide

### For Pages Using GameResultsCard

You need to update your page logic to match the new API. Here's what changed:

#### Old Pattern (3-board quick add)
```typescript
const [quickAddState, setQuickAddState] = useState<QuickAddSnapshot>({
  liked: { status: "idle" },
  wishlist: { status: "idle" },
  library: { status: "idle" },
});

const handleQuickAdd = async (boardKey: BoardKey) => {
  // Handle quick add to liked/wishlist/library
};
```

#### New Pattern (Save + board memberships)
```typescript
const [saveState, setSaveState] = useState<SaveState>({ status: "idle" });
const [boardMemberships, setBoardMemberships] = useState<BoardMembership[]>([]);

const handleSave = async () => {
  setSaveState({ status: "loading" });
  try {
    // Add to "Saved" board via API
    await addBoardGameClient({
      boardId: savedBoardId, // ID of dedicated "Saved" board
      gameId: game.id,
      status: "OWNED", // or whatever default status
    });
    setSaveState({ status: "saved" });
  } catch (error) {
    setSaveState({
      status: "error",
      message: error.message
    });
  }
};

const handleRemove = async () => {
  // Remove from "Saved" board
  setSaveState({ status: "idle" });
};

const handleBoardAdded = (boardName: string) => {
  // Refresh board memberships or show toast
  toast.success(`Added to ${boardName}`);
};
```

#### Fetching Board Memberships

You'll need to fetch which boards already contain this game. Example:

```typescript
// On component mount or when game changes
useEffect(() => {
  const fetchMemberships = async () => {
    // Fetch all user's boards
    const boards = await fetchBoards({ limit: 100 });

    // For each board, check if game is in it
    const memberships: BoardMembership[] = [];
    for (const board of boards.items) {
      const boardGames = await fetchBoardGames(board.id, { limit: 100 });
      const membership = boardGames.items.find(bg => bg.gameId === game.id);
      if (membership) {
        memberships.push({
          boardId: board.id,
          boardName: board.name,
          status: membership.status,
        });
      }
    }

    setBoardMemberships(memberships);

    // Check if in "Saved" board
    const inSaved = memberships.some(m => m.boardId === savedBoardId);
    if (inSaved) {
      setSaveState({ status: "saved" });
    }
  };

  fetchMemberships();
}, [game.id]);
```

**Performance Note**: This is N+1 queries. Consider adding a backend endpoint like `GET /api/games/:id/memberships` that returns all boards containing a specific game.

---

## Implementation Checklist

- [x] Redesigned GameResultsCard component
- [x] Updated prop types (SaveState, BoardMembership)
- [x] Replaced Heart with Bookmark icon
- [x] Added tooltip for bookmark
- [x] Removed separate Library/Wishlist buttons
- [x] Made "Add to Board" the primary action
- [x] Added state badges for board memberships
- [x] Improved visual hierarchy and spacing
- [x] Enhanced accessibility (ARIA labels, keyboard nav)
- [x] Color-coded Metacritic scores
- [ ] Update pages that use GameResultsCard:
  - [ ] `/games/search`
  - [ ] `/games` (list view)
  - [ ] `/ai/recommendations`
  - [ ] Any other search/browse pages
- [ ] Create backend endpoint for fetching game memberships
- [ ] Create or identify dedicated "Saved" board
- [ ] Add toast notifications for successful actions
- [ ] Test keyboard navigation
- [ ] Test screen reader compatibility
- [ ] Test mobile responsiveness

---

## Future Enhancements

### Potential Improvements
1. **Optimistic UI**: Update UI before API responds
2. **Undo action**: Show "Undo" toast after removing bookmark
3. **Batch operations**: Multi-select games and bulk add to board
4. **Quick status change**: Right-click or long-press to change status without opening modal
5. **Drag to board**: Drag game card directly onto board in sidebar
6. **Recent boards**: Show "Recently used boards" in Add to Board dialog
7. **Keyboard shortcuts**:
   - `B` = Bookmark toggle
   - `A` = Add to board
   - `Enter` on card = View details

### Mobile Optimizations
- Swipe actions: Swipe right to save, swipe left for options
- Bottom sheet instead of modal for "Add to Board" on mobile
- Haptic feedback on save action (iOS/Android)

---

## Design Rationale

### Why Bookmark Instead of Heart?

- **Heart** semantically means "like" or "love" (affection)
- **Bookmark** semantically means "save for later" (utility)
- We want to communicate utility, not affection
- Hearts often imply public sharing or social features
- Bookmarks are universally understood as "come back to this"

### Why Separate Save from Add to Board?

**Mental Model Clarity**:
- Save = "I'm browsing, this looks interesting"
- Add to Board = "I'm organizing, this goes here with this status"

**Reduced Friction**:
- Users can quickly save during discovery
- Organization happens in a separate, intentional step
- No decision paralysis: "Should I add to Library or Wishlist?"

**Progressive Commitment**:
- Start with lightweight interest (save)
- Escalate to organization (add to board) when ready
- Matches natural user behavior: "I'll think about it" → "I'll do it"

### Why Show State Badges Instead of Buttons?

**Clear State Communication**:
- Users know at a glance what boards contain the game
- No ambiguity: "Is this in my Library?"

**Prevent Duplicate Actions**:
- Users won't re-add games already in boards
- Reduces backend load and user frustration

**Non-Clickable by Design**:
- Badges are **indicators**, not actions
- Actions happen via primary "Add to Board" button
- Clearer separation between state and actions

---

## Questions & Answers

**Q: What if a user wants to remove a game from a board?**
A: They can do this from the board detail page (`/boards/:id`). The card focuses on discovery/addition, not management.

**Q: Can users add to multiple boards?**
A: Yes! The "Add to Board" button is always visible. Users can add the same game to Library, a custom "RPGs" board, and Wishlist (as a status in another board).

**Q: What happens if I click Save and then Add to Board with Wishlist status?**
A: These are independent:
- Save → Game is in "Saved" board
- Add to Board with Wishlist status → Game is in chosen board with Wishlist status
- Both can coexist

**Q: How do users know what "Saved" means?**
A: Tooltip says "Save for later" on hover. After first save, consider showing a one-time toast: "Saved to your Saved board. View it anytime in the sidebar."

**Q: Should we allow removing from boards via the card?**
A: Not in this version. Keep the card focused on addition/discovery. Management happens in board views. Consider adding a "⋮" menu in the future for advanced actions.

---

## Testing Scenarios

### Manual Testing

1. **Bookmark toggle**:
   - [ ] Click bookmark on unsaved game → saves and fills icon
   - [ ] Click bookmark on saved game → unsaves and outlines icon
   - [ ] Hover shows correct tooltip
   - [ ] Loading state shows spinner

2. **Add to Board**:
   - [ ] Opens dialog with board selector
   - [ ] Can create new board inline
   - [ ] Can select status (including Wishlist as status)
   - [ ] Shows success and updates badges

3. **State badges**:
   - [ ] Show correct board names
   - [ ] Show correct status labels
   - [ ] Truncate after 2 boards, show "+N more"
   - [ ] Don't look clickable (no hover effects)

4. **Accessibility**:
   - [ ] Tab through all interactive elements
   - [ ] Screen reader announces states correctly
   - [ ] Focus visible on all elements

5. **Responsive**:
   - [ ] Works on mobile (375px width)
   - [ ] Works on tablet (768px width)
   - [ ] Works on desktop (1920px width)

---

## Summary

The redesigned GameResultsCard implements a clean two-speed interaction model:

1. **Save** (bookmark) for quick, low-commitment interest
2. **Add to Board** for intentional, high-commitment organization
3. **State badges** for clear visibility into existing memberships

This reduces decision fatigue, creates a learnable mental model, and scales across all discovery surfaces (search, recommendations, browse).

The component is production-ready and follows accessibility best practices, but **requires page-level updates** to migrate from the old API to the new simplified state management.
