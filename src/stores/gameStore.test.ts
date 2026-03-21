import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useGameStore } from './gameStore'

beforeEach(() => {
  setActivePinia(createPinia())
})

describe('gameStore', () => {
  describe('initial state', () => {
    it('should start in setup phase', () => {
      const store = useGameStore()
      expect(store.phase).toBe('setup')
      expect(store.turnStep).toBe('play_cards')
    })
  })

  describe('startNewGame', () => {
    it('should initialize game state for 1 player', () => {
      const store = useGameStore()
      store.startNewGame(1)

      expect(store.phase).toBe('playing')
      expect(store.turnStep).toBe('play_cards')
      expect(store.playerCount).toBe(1)
      expect(store.playerHand).toHaveLength(8)
      expect(store.tavernDeck).toHaveLength(32) // 40 - 8
      expect(store.castleDeck).toHaveLength(11) // 12 - 1 revealed
      expect(store.currentEnemy).not.toBeNull()
      expect(store.jesterHand).toHaveLength(0)
      expect(store.discardPile).toHaveLength(0)
      expect(store.shieldTotal).toBe(0)
    })

    it('should have a Jack as the first enemy', () => {
      const store = useGameStore()
      store.startNewGame(1)
      expect(store.currentEnemy?.rank).toBe('J')
    })

    it('should generate log entries', () => {
      const store = useGameStore()
      store.startNewGame(1)
      expect(store.log.length).toBeGreaterThan(0)
    })
  })

  describe('card selection', () => {
    it('should toggle card selection', () => {
      const store = useGameStore()
      store.startNewGame(1)
      const cardId = store.playerHand[0].id

      store.toggleCardSelection(cardId)
      expect(store.selectedCardIds).toContain(cardId)

      store.toggleCardSelection(cardId)
      expect(store.selectedCardIds).not.toContain(cardId)
    })

    it('should clear selection', () => {
      const store = useGameStore()
      store.startNewGame(1)
      store.toggleCardSelection(store.playerHand[0].id)
      store.toggleCardSelection(store.playerHand[1].id)

      store.clearSelection()
      expect(store.selectedCardIds).toHaveLength(0)
      expect(store.selectedJester).toBe(false)
    })
  })

  describe('playing cards', () => {
    it('should play a single card and deal damage', () => {
      const store = useGameStore()
      store.startNewGame(1)

      const card = store.playerHand[0]
      store.toggleCardSelection(card.id)
      const initialHealth = store.currentEnemy!.health

      store.playSelectedCards()

      // Card should be removed from hand
      expect(store.playerHand.find(c => c.id === card.id)).toBeUndefined()

      // The turn should progress (may end up on suffer_damage or play_cards if enemy defeated)
      expect(['play_cards', 'suffer_damage']).toContain(store.turnStep)
    })

    it('should reject play during wrong turn step', () => {
      const store = useGameStore()
      store.startNewGame(1)
      store.turnStep = 'suffer_damage'

      const card = store.playerHand[0]
      store.toggleCardSelection(card.id)
      const handSize = store.playerHand.length

      store.playSelectedCards()
      expect(store.playerHand).toHaveLength(handSize) // No change
    })
  })

  describe('yielding', () => {
    it('should draw a card when hand is below limit and move to suffer damage', () => {
      const store = useGameStore()
      store.startNewGame(1)

      // Remove a card from hand to make room (hand starts at 8 = limit)
      store.playerHand = store.playerHand.slice(1)
      const initialHandSize = store.playerHand.length // 7
      const initialTavernSize = store.tavernDeck.length

      store.yieldTurn()

      expect(store.playerHand).toHaveLength(initialHandSize + 1)
      expect(store.tavernDeck).toHaveLength(initialTavernSize - 1)
      // Should be in suffer_damage or lost
      expect(['suffer_damage', 'lost']).toContain(store.turnStep)
    })

    it('should not draw when hand is at limit', () => {
      const store = useGameStore()
      store.startNewGame(1)
      const initialHandSize = store.playerHand.length // 8 = limit
      const initialTavernSize = store.tavernDeck.length

      store.yieldTurn()

      expect(store.playerHand).toHaveLength(initialHandSize) // No draw
      expect(store.tavernDeck).toHaveLength(initialTavernSize) // Unchanged
      // Should still move to suffer_damage
      expect(['suffer_damage', 'lost']).toContain(store.turnStep)
    })
  })

  describe('suffer damage', () => {
    it('should discard cards to survive attack', () => {
      const store = useGameStore()
      store.startNewGame(1)

      // Manually set up a suffer damage scenario
      store.turnStep = 'suffer_damage'
      store.shieldTotal = 0
      // Enemy Jack has 10 attack

      // Find cards whose value sum >= 10
      const sortedHand = [...store.playerHand].sort((a, b) => b.value - a.value)
      const toDiscard: string[] = []
      let total = 0
      for (const card of sortedHand) {
        toDiscard.push(card.id)
        total += card.value
        if (total >= 10) break
      }

      const handBefore = store.playerHand.length
      store.sufferDamage(toDiscard)

      expect(store.playerHand.length).toBeLessThan(handBefore)
      expect(store.turnStep).toBe('play_cards')
    })
  })

  describe('game reset', () => {
    it('should reset to initial state', () => {
      const store = useGameStore()
      store.startNewGame(1)
      store.resetGame()

      expect(store.phase).toBe('setup')
      expect(store.playerHand).toHaveLength(0)
      expect(store.castleDeck).toHaveLength(0)
    })
  })

  describe('undo', () => {
    it('should start with empty undo stack', () => {
      const store = useGameStore()
      store.startNewGame(1)
      expect(store.undoStack).toHaveLength(0)
      expect(store.canUndo).toBe(false)
    })

    it('should save snapshot when playing a card', () => {
      const store = useGameStore()
      store.startNewGame(1)

      const card = store.playerHand[0]
      store.toggleCardSelection(card.id)
      store.playSelectedCards()

      expect(store.undoStack.length).toBeGreaterThan(0)
      expect(store.canUndo).toBe(true)
    })

    it('should restore state on undo after playing a card', () => {
      const store = useGameStore()
      store.startNewGame(1)

      const handBefore = [...store.playerHand.map(c => c.id)]
      const enemyHealthBefore = store.currentEnemy!.health

      const card = store.playerHand[0]
      store.toggleCardSelection(card.id)
      store.playSelectedCards()

      // State has changed
      expect(store.playerHand.map(c => c.id)).not.toEqual(handBefore)

      // Undo
      store.undo()

      // State should be restored
      expect(store.playerHand.map(c => c.id)).toEqual(handBefore)
      expect(store.currentEnemy!.health).toBe(enemyHealthBefore)
      expect(store.turnStep).toBe('play_cards')
    })

    it('should save snapshot when yielding', () => {
      const store = useGameStore()
      store.startNewGame(1)
      store.playerHand = store.playerHand.slice(1) // Make room

      store.yieldTurn()

      expect(store.undoStack.length).toBeGreaterThan(0)
    })

    it('should restore state on undo after yield', () => {
      const store = useGameStore()
      store.startNewGame(1)
      store.playerHand = store.playerHand.slice(1)
      const handBefore = store.playerHand.length

      store.yieldTurn()
      expect(store.playerHand.length).toBe(handBefore + 1)

      store.undo()
      expect(store.playerHand.length).toBe(handBefore)
      expect(store.turnStep).toBe('play_cards')
    })

    it('should cap undo stack at MAX_UNDO_STACK', () => {
      const store = useGameStore()
      store.startNewGame(1)

      // Push many snapshots
      for (let i = 0; i < 25; i++) {
        store.pushSnapshot()
      }

      expect(store.undoStack.length).toBeLessThanOrEqual(20)
    })

    it('should not allow undo when stack is empty', () => {
      const store = useGameStore()
      store.startNewGame(1)
      expect(store.canUndo).toBe(false)

      // Calling undo on empty stack should be a no-op
      const phaseBefore = store.phase
      store.undo()
      expect(store.phase).toBe(phaseBefore)
    })

    it('should clear undo stack on new game', () => {
      const store = useGameStore()
      store.startNewGame(1)

      const card = store.playerHand[0]
      store.toggleCardSelection(card.id)
      store.playSelectedCards()
      expect(store.undoStack.length).toBeGreaterThan(0)

      store.startNewGame(1)
      expect(store.undoStack).toHaveLength(0)
    })
  })

  describe('defeated enemies', () => {
    it('should start with empty defeated enemies list', () => {
      const store = useGameStore()
      store.startNewGame(1)
      expect(store.defeatedEnemies).toHaveLength(0)
    })

    it('should track defeated enemy with stats', () => {
      const store = useGameStore()
      store.startNewGame(1)

      // Set up enemy with 1 health so any card kills it
      store.currentEnemy = {
        ...store.currentEnemy!,
        health: 1,
        suit: 'diamonds', // Not same as card suit to avoid immunity issues
      }

      const card = store.playerHand.find(c => c.suit !== 'clubs') ?? store.playerHand[0]
      store.toggleCardSelection(card.id)
      store.playSelectedCards()

      expect(store.defeatedEnemies.length).toBeGreaterThanOrEqual(1)
      const last = store.defeatedEnemies[store.defeatedEnemies.length - 1]
      expect(last.enemy.rank).toBeTruthy()
      expect(last.totalDamageDealt).toBeGreaterThan(0)
      expect(last.turnsToDefeat).toBe(1)
    })

    it('should track captured enemy (exact kill)', () => {
      const store = useGameStore()
      store.startNewGame(1)

      // Set up exact kill scenario
      const card = store.playerHand.find(c => c.value === 5 && c.suit !== 'clubs')
      if (!card) return // Skip if no suitable card

      store.currentEnemy = {
        ...store.currentEnemy!,
        health: 5,
        suit: 'diamonds',
      }

      store.toggleCardSelection(card.id)
      store.playSelectedCards()

      const last = store.defeatedEnemies[store.defeatedEnemies.length - 1]
      expect(last).toBeDefined()
      expect(last.captured).toBe(true)
    })

    it('should clear defeated enemies on new game', () => {
      const store = useGameStore()
      store.startNewGame(1)

      // Defeat an enemy
      store.currentEnemy = { ...store.currentEnemy!, health: 1, suit: 'diamonds' }
      const card = store.playerHand.find(c => c.suit !== 'clubs') ?? store.playerHand[0]
      store.toggleCardSelection(card.id)
      store.playSelectedCards()
      expect(store.defeatedEnemies.length).toBeGreaterThan(0)

      store.startNewGame(1)
      expect(store.defeatedEnemies).toHaveLength(0)
    })

    it('should use defeatedEnemies.length for enemiesDefeated getter', () => {
      const store = useGameStore()
      store.startNewGame(1)
      expect(store.enemiesDefeated).toBe(0)

      store.currentEnemy = { ...store.currentEnemy!, health: 1, suit: 'diamonds' }
      const card = store.playerHand.find(c => c.suit !== 'clubs') ?? store.playerHand[0]
      store.toggleCardSelection(card.id)
      store.playSelectedCards()

      expect(store.enemiesDefeated).toBe(1)
    })
  })

  describe('toast', () => {
    it('should show toast on enemy defeat', () => {
      const store = useGameStore()
      store.startNewGame(1)

      store.currentEnemy = { ...store.currentEnemy!, health: 1, suit: 'diamonds' }
      const card = store.playerHand.find(c => c.suit !== 'clubs') ?? store.playerHand[0]
      store.toggleCardSelection(card.id)
      store.playSelectedCards()

      expect(store.toast.visible).toBe(true)
      expect(
        store.toast.message.includes('Defeated') || store.toast.message.includes('Captured')
      ).toBe(true)
    })

    it('should hide toast', () => {
      const store = useGameStore()
      store.startNewGame(1)
      store.showToast('Test', 'info')
      expect(store.toast.visible).toBe(true)

      store.hideToast()
      expect(store.toast.visible).toBe(false)
    })
  })
})
