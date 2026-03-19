import { defineStore } from 'pinia'
import type {
  GamePhase, TurnStep, Card, EnemyCard, JesterCard,
  PlayedCards, LogEntry, Suit,
} from '../types'
import { HAND_SIZES } from '../types'
import {
  createTavernDeck, createCastleDeck, createJesters,
  dealCards, drawCards, shuffle, resetCardIdCounter,
} from '../utils/deck'
import {
  isValidPlay, buildPlayedCards, calculateHeartsHeal,
  calculateDiamondsDraw, calculateSpadesShield,
  getActiveSuits, applyDamage, isEnemyDefeated, isExactKill,
  getEffectiveAttack, isValidDamageDiscard, canSurviveAttack,
  isGameWon, canYield,
} from '../utils/rules'

interface GameStoreState {
  phase: GamePhase
  turnStep: TurnStep
  playerCount: number

  castleDeck: EnemyCard[]
  tavernDeck: Card[]
  discardPile: Card[]

  currentEnemy: EnemyCard | null
  playerHand: Card[]
  jesterHand: JesterCard[]

  currentPlay: PlayedCards | null
  shieldTotal: number
  immunityBroken: boolean

  log: LogEntry[]
  logCounter: number

  heartsHealAmount: number

  // UI selection state (not persisted game logic, but helpful)
  selectedCardIds: string[]
  selectedJester: boolean
}

export const useGameStore = defineStore('game', {
  state: (): GameStoreState => ({
    phase: 'setup',
    turnStep: 'play_cards',
    playerCount: 1,

    castleDeck: [],
    tavernDeck: [],
    discardPile: [],

    currentEnemy: null,
    playerHand: [],
    jesterHand: [],

    currentPlay: null,
    shieldTotal: 0,
    immunityBroken: false,

    log: [],
    logCounter: 0,

    heartsHealAmount: 0,

    selectedCardIds: [],
    selectedJester: false,
  }),

  getters: {
    effectiveEnemyAttack(state): number {
      if (!state.currentEnemy) return 0
      return getEffectiveAttack(state.currentEnemy, state.shieldTotal)
    },

    canPlayerYield(state): boolean {
      return canYield(state.tavernDeck.length, state.playerHand)
    },

    canPlayerSurvive(state): boolean {
      if (!state.currentEnemy) return true
      const effectiveAtk = getEffectiveAttack(state.currentEnemy, this.shieldTotal)
      return canSurviveAttack(state.playerHand, effectiveAtk)
    },

    selectedCards(state): Card[] {
      return state.playerHand.filter(c => state.selectedCardIds.includes(c.id))
    },

    isSelectionValid(): boolean {
      const cards = this.selectedCards as Card[]
      const jester = this.selectedJester ? (this.jesterHand[0] ?? null) : null
      return isValidPlay(cards, jester)
    },

    enemiesRemaining(state): number {
      return state.castleDeck.length + (state.currentEnemy ? 1 : 0)
    },

    enemiesDefeated(state): number {
      return 12 - state.castleDeck.length - (state.currentEnemy ? 1 : 0)
    },
  },

  actions: {
    // === Logging ===

    addLog(message: string, type: LogEntry['type'] = 'action') {
      this.logCounter++
      this.log.unshift({
        id: this.logCounter,
        message,
        type,
        timestamp: Date.now(),
      })
      // Keep last 50 entries
      if (this.log.length > 50) {
        this.log = this.log.slice(0, 50)
      }
    },

    // === Game Setup ===

    startNewGame(playerCount: number = 1) {
      resetCardIdCounter()

      this.playerCount = playerCount
      this.phase = 'playing'
      this.turnStep = 'play_cards'
      this.shieldTotal = 0
      this.immunityBroken = false
      this.currentPlay = null
      this.heartsHealAmount = 0
      this.selectedCardIds = []
      this.selectedJester = false
      this.log = []
      this.logCounter = 0

      // Create decks
      this.tavernDeck = createTavernDeck()
      this.castleDeck = createCastleDeck()
      this.discardPile = []
      this.jesterHand = createJesters(playerCount)

      // Deal hand
      const handSize = HAND_SIZES[playerCount] ?? 8
      const [hand, remaining] = dealCards(this.tavernDeck, handSize)
      this.playerHand = hand
      this.tavernDeck = remaining

      // Reveal first enemy
      this.revealNextEnemy()

      this.addLog(`Game started! Hand size: ${handSize}`, 'system')
    },

    revealNextEnemy() {
      if (this.castleDeck.length === 0) {
        this.currentEnemy = null
        // Check win
        if (isGameWon(this.castleDeck, this.currentEnemy)) {
          this.phase = 'won'
          this.addLog('All enemies defeated! You win!', 'system')
        }
        return
      }

      this.currentEnemy = this.castleDeck[0]
      this.castleDeck = this.castleDeck.slice(1)
      this.shieldTotal = 0
      this.immunityBroken = false

      const enemy = this.currentEnemy
      this.addLog(
        `A ${enemy.rank} of ${enemy.suit} appears! (${enemy.health}HP, ${enemy.attack}ATK)`,
        'enemy'
      )
    },

    // === Card Selection ===

    toggleCardSelection(cardId: string) {
      const idx = this.selectedCardIds.indexOf(cardId)
      if (idx >= 0) {
        this.selectedCardIds.splice(idx, 1)
      } else {
        this.selectedCardIds.push(cardId)
      }
    },

    toggleJesterSelection() {
      this.selectedJester = !this.selectedJester
    },

    clearSelection() {
      this.selectedCardIds = []
      this.selectedJester = false
    },

    // === Step 1: Play Cards ===

    playSelectedCards() {
      if (!this.currentEnemy) return
      if (this.turnStep !== 'play_cards') return

      const cards = this.selectedCards
      const jester = this.selectedJester ? (this.jesterHand[0] ?? null) : null

      if (!isValidPlay(cards, jester)) return

      // Handle Jester play
      if (jester && cards.length === 0) {
        this.jesterHand = this.jesterHand.filter(j => j.id !== jester.id)
        this.immunityBroken = true
        this.currentPlay = {
          cards: [],
          jester,
          totalAttack: 0,
          suits: [],
          isCombo: false,
        }
        this.addLog('Jester played! Enemy immunity broken.', 'action')
        this.clearSelection()

        // Jester does 0 damage, skip to suffer damage
        // But first check if enemy attack is 0 (fully shielded)
        this.turnStep = 'suffer_damage'
        this.checkAutoSufferDamage()
        return
      }

      // Build play info
      const play = buildPlayedCards(cards, jester, this.currentEnemy, this.immunityBroken)
      this.currentPlay = play

      // Remove cards from hand
      const playedIds = new Set(cards.map(c => c.id))
      this.playerHand = this.playerHand.filter(c => !playedIds.has(c.id))

      // NOTE: Do NOT add played cards to discard yet.
      // Hearts healing should not be able to recover just-played cards.
      // We store them temporarily and add to discard after suit powers resolve.

      const cardDesc = cards.map(c => `${c.rank}${suitSymbol(c.suit)}`).join(' + ')
      this.addLog(`Played ${cardDesc} (Attack: ${play.totalAttack})`, 'action')

      this.clearSelection()

      // Move to suit power activation
      this.turnStep = 'activate_power'
      this.activateSuitPowers()

      // Now move played cards to discard pile (after suit powers resolved)
      this.discardPile.push(...cards)
    },

    // === Step 2: Activate Suit Powers ===

    activateSuitPowers() {
      if (!this.currentEnemy || !this.currentPlay) return

      const activeSuits = getActiveSuits(
        this.currentPlay.suits,
        this.currentEnemy,
        this.immunityBroken
      )

      // Process each active suit power
      for (const suit of activeSuits) {
        switch (suit) {
          case 'diamonds':
            this.activateDiamonds()
            break
          case 'spades':
            this.activateSpades()
            break
          case 'clubs':
            // Clubs doubling is already applied in calculateAttack
            this.addLog('Clubs: Attack damage doubled!', 'action')
            break
          case 'hearts':
            this.activateHearts()
            break
        }
      }

      // Report immune suits
      const immuneSuits = this.currentPlay.suits.filter(
        s => !activeSuits.includes(s)
      )
      for (const suit of immuneSuits) {
        this.addLog(`${suitSymbol(suit)} power blocked by immunity!`, 'system')
      }

      // If hearts needs player input, we stay in activate_power
      // Otherwise move to deal damage
      if (this.heartsHealAmount > 0 && this.discardPile.length > 0) {
        // Hearts healing is auto in solo - just heal the max amount
        this.autoHealHearts()
      }

      this.turnStep = 'deal_damage'
      this.dealDamage()
    },

    activateDiamonds() {
      if (!this.currentPlay) return
      const drawAmount = calculateDiamondsDraw(this.currentPlay.cards)
      const handLimit = HAND_SIZES[this.playerCount] ?? 8
      const canDraw = Math.min(drawAmount, handLimit - this.playerHand.length)
      const actualDraw = Math.max(0, canDraw)

      if (actualDraw > 0 && this.tavernDeck.length > 0) {
        const [drawn, remaining] = drawCards(this.tavernDeck, actualDraw)
        this.playerHand.push(...drawn)
        this.tavernDeck = remaining
        this.addLog(`Diamonds: Drew ${drawn.length} card(s)`, 'draw')
      } else if (actualDraw === 0) {
        this.addLog('Diamonds: Hand is full, no cards drawn', 'draw')
      }
    },

    activateSpades() {
      if (!this.currentPlay) return
      const shieldAmount = calculateSpadesShield(this.currentPlay.cards)
      this.shieldTotal += shieldAmount
      this.addLog(`Spades: Shield +${shieldAmount} (Total: ${this.shieldTotal})`, 'shield')
    },

    activateHearts() {
      if (!this.currentPlay) return
      const healAmount = calculateHeartsHeal(this.currentPlay.cards)
      this.heartsHealAmount = healAmount
    },

    autoHealHearts() {
      if (this.heartsHealAmount <= 0) return

      const healCount = Math.min(this.heartsHealAmount, this.discardPile.length)
      if (healCount > 0) {
        // Take from end of discard pile (most recently discarded, before this turn's cards)
        const healed = this.discardPile.splice(-healCount, healCount)
        // Shuffle the healed cards before placing at bottom of tavern deck
        shuffle(healed)
        this.tavernDeck.push(...healed)
        this.addLog(`Hearts: Returned ${healCount} card(s) to tavern deck`, 'heal')
      }
      this.heartsHealAmount = 0
    },

    // === Step 3: Deal Damage ===

    dealDamage() {
      if (!this.currentEnemy || !this.currentPlay) return

      const damage = this.currentPlay.totalAttack
      if (damage > 0) {
        this.currentEnemy = applyDamage(this.currentEnemy, damage)
        this.addLog(
          `Dealt ${damage} damage! Enemy health: ${Math.max(0, this.currentEnemy.health)}/${this.currentEnemy.maxHealth}`,
          'damage'
        )
      }

      // Check if enemy is defeated
      if (isEnemyDefeated(this.currentEnemy)) {
        if (isExactKill(this.currentEnemy)) {
          // Captured! Enemy goes on top of tavern deck as a playable card
          this.addLog(
            `Exact kill! ${this.currentEnemy.rank} of ${this.currentEnemy.suit} captured!`,
            'enemy'
          )
          // Convert enemy to a high-value card and add to tavern top
          const capturedCard = enemyToCard(this.currentEnemy)
          this.tavernDeck.unshift(capturedCard)
        } else {
          this.addLog(
            `${this.currentEnemy.rank} of ${this.currentEnemy.suit} defeated!`,
            'enemy'
          )
        }

        this.currentEnemy = null
        this.currentPlay = null
        this.turnStep = 'play_cards'

        // Reveal next enemy
        this.revealNextEnemy()

        // Check win
        if (this.phase === 'won') return

        return
      }

      // Enemy survived, move to suffer damage
      this.turnStep = 'suffer_damage'
      this.checkAutoSufferDamage()
    },

    // === Step 4: Suffer Damage ===

    checkAutoSufferDamage() {
      if (!this.currentEnemy) return

      const effectiveAtk = getEffectiveAttack(this.currentEnemy, this.shieldTotal)

      if (effectiveAtk <= 0) {
        this.addLog('Enemy attack fully shielded! No damage taken.', 'shield')
        this.finishTurn()
        return
      }

      // Check if player can survive
      if (!canSurviveAttack(this.playerHand, effectiveAtk)) {
        this.addLog(
          `Cannot survive ${effectiveAtk} damage! Game Over.`,
          'damage'
        )
        this.phase = 'lost'
        return
      }

      // Player needs to select cards to discard
      // The UI will handle this
      this.addLog(
        `Must discard cards totaling ${effectiveAtk}+ to survive!`,
        'damage'
      )
    },

    sufferDamage(discardedCardIds: string[]) {
      if (!this.currentEnemy) return
      if (this.turnStep !== 'suffer_damage') return

      const effectiveAtk = getEffectiveAttack(this.currentEnemy, this.shieldTotal)
      const discardedCards = this.playerHand.filter(c => discardedCardIds.includes(c.id))

      if (!isValidDamageDiscard(discardedCards, effectiveAtk)) {
        return // Invalid discard, UI should prevent this
      }

      // Remove discarded cards from hand
      const discardedSet = new Set(discardedCardIds)
      this.playerHand = this.playerHand.filter(c => !discardedSet.has(c.id))
      this.discardPile.push(...discardedCards)

      const total = discardedCards.reduce((acc, c) => acc + c.value, 0)
      this.addLog(
        `Discarded ${discardedCards.length} card(s) (value: ${total}) to survive ${effectiveAtk} damage`,
        'damage'
      )

      this.finishTurn()
    },

    // === Yield ===

    yieldTurn() {
      if (this.turnStep !== 'play_cards') return
      if (!this.currentEnemy) return
      if (!canYield(this.tavernDeck.length, this.playerHand)) return

      // In solo, yielding means you draw a card from tavern if possible,
      // then suffer enemy attack
      const handLimit = HAND_SIZES[this.playerCount] ?? 8
      if (this.tavernDeck.length > 0 && this.playerHand.length < handLimit) {
        const [drawn, remaining] = drawCards(this.tavernDeck, 1)
        this.playerHand.push(...drawn)
        this.tavernDeck = remaining
        this.addLog('Yielded turn. Drew 1 card from tavern.', 'action')
      } else {
        this.addLog('Yielded turn. No cards to draw.', 'action')
      }

      this.currentPlay = null
      this.turnStep = 'suffer_damage'
      this.checkAutoSufferDamage()
    },

    // === Turn Finish ===

    finishTurn() {
      this.currentPlay = null
      this.turnStep = 'play_cards'
      // Jester immunity break only lasts for the turn it was played
      this.immunityBroken = false

      // Check if player has no cards and tavern is empty
      if (this.playerHand.length === 0 && this.tavernDeck.length === 0 && this.jesterHand.length === 0) {
        this.addLog('No cards left! Game Over.', 'system')
        this.phase = 'lost'
        return
      }
    },

    // === Reset ===

    resetGame() {
      this.$reset()
    },
  },

  persist: true,
})

// === Helpers ===

function suitSymbol(suit: Suit): string {
  const symbols: Record<Suit, string> = {
    hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠',
  }
  return symbols[suit]
}

/**
 * Convert a defeated enemy card to a playable card for the tavern deck.
 * J=10, Q=15, K=20 attack value when played.
 */
function enemyToCard(enemy: EnemyCard): Card {
  return {
    id: `captured-${enemy.id}`,
    suit: enemy.suit,
    rank: enemy.rank,
    value: enemy.baseAttack,
    captured: true,
  }
}
