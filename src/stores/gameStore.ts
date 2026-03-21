import { defineStore } from 'pinia'
import { toRaw } from 'vue'
import type {
  GamePhase, TurnStep, Card, EnemyCard, JesterCard,
  PlayedCards, LogEntry, Suit, DefeatedEnemy, ToastData, GameSnapshot,
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

const MAX_UNDO_STACK = 20

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

  // Defeated enemies tracking
  defeatedEnemies: DefeatedEnemy[]
  turnsAgainstCurrentEnemy: number
  damageToCurrentEnemy: number

  // Undo history (persisted)
  undoStack: GameSnapshot[]

  // Toast notification (transient UI state)
  toast: ToastData

  // UI selection state
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

    defeatedEnemies: [],
    turnsAgainstCurrentEnemy: 0,
    damageToCurrentEnemy: 0,

    undoStack: [],

    toast: { message: '', type: 'info', visible: false },

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
      return state.defeatedEnemies.length
    },

    canUndo(state): boolean {
      return state.undoStack.length > 0 && state.phase === 'playing'
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

    // === Toast ===

    showToast(message: string, type: ToastData['type'] = 'info') {
      this.toast = { message, type, visible: true }
    },

    hideToast() {
      this.toast.visible = false
    },

    // === Undo System ===

    /** Take a snapshot of current game state and push to undo stack */
    pushSnapshot() {
      // Deep clone reactive state using JSON round-trip (toRaw unwraps Vue proxies)
      const clone = <T>(val: T): T => JSON.parse(JSON.stringify(toRaw(val)))

      const snapshot: GameSnapshot = {
        phase: this.phase,
        turnStep: this.turnStep,
        castleDeck: clone(this.castleDeck),
        tavernDeck: clone(this.tavernDeck),
        discardPile: clone(this.discardPile),
        currentEnemy: this.currentEnemy ? clone(this.currentEnemy) : null,
        playerHand: clone(this.playerHand),
        jesterHand: clone(this.jesterHand),
        currentPlay: this.currentPlay ? clone(this.currentPlay) : null,
        shieldTotal: this.shieldTotal,
        immunityBroken: this.immunityBroken,
        log: clone(this.log),
        logCounter: this.logCounter,
        heartsHealAmount: this.heartsHealAmount,
        defeatedEnemies: clone(this.defeatedEnemies),
        turnsAgainstCurrentEnemy: this.turnsAgainstCurrentEnemy,
        damageToCurrentEnemy: this.damageToCurrentEnemy,
      }

      this.undoStack.push(snapshot)

      // Cap the stack size
      if (this.undoStack.length > MAX_UNDO_STACK) {
        this.undoStack = this.undoStack.slice(-MAX_UNDO_STACK)
      }
    },

    /** Restore state from the last snapshot */
    undo() {
      if (this.undoStack.length === 0) return

      const snapshot = this.undoStack.pop()!

      this.phase = snapshot.phase
      this.turnStep = snapshot.turnStep
      this.castleDeck = snapshot.castleDeck
      this.tavernDeck = snapshot.tavernDeck
      this.discardPile = snapshot.discardPile
      this.currentEnemy = snapshot.currentEnemy
      this.playerHand = snapshot.playerHand
      this.jesterHand = snapshot.jesterHand
      this.currentPlay = snapshot.currentPlay
      this.shieldTotal = snapshot.shieldTotal
      this.immunityBroken = snapshot.immunityBroken
      this.log = snapshot.log
      this.logCounter = snapshot.logCounter
      this.heartsHealAmount = snapshot.heartsHealAmount
      this.defeatedEnemies = snapshot.defeatedEnemies
      this.turnsAgainstCurrentEnemy = snapshot.turnsAgainstCurrentEnemy
      this.damageToCurrentEnemy = snapshot.damageToCurrentEnemy

      this.clearSelection()
      this.addLog('Action undone.', 'system')
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
      this.defeatedEnemies = []
      this.turnsAgainstCurrentEnemy = 0
      this.damageToCurrentEnemy = 0
      this.undoStack = []
      this.toast = { message: '', type: 'info', visible: false }

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
      this.turnsAgainstCurrentEnemy = 0
      this.damageToCurrentEnemy = 0

      const enemy = this.currentEnemy
      this.addLog(
        `A ${rankTitle(enemy.rank)} of ${enemy.suit} appears! (${enemy.health}HP, ${enemy.attack}ATK)`,
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

      // Snapshot before any state changes
      this.pushSnapshot()

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
        this.turnsAgainstCurrentEnemy++

        // Jester does 0 damage, skip to suffer damage
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

      const cardDesc = cards.map(c => `${c.rank}${suitSymbol(c.suit)}`).join(' + ')
      this.addLog(`Played ${cardDesc} (Attack: ${play.totalAttack})`, 'action')

      this.clearSelection()
      this.turnsAgainstCurrentEnemy++

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

      if (this.heartsHealAmount > 0 && this.discardPile.length > 0) {
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
        const healed = this.discardPile.splice(-healCount, healCount)
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
        this.damageToCurrentEnemy += damage
        this.addLog(
          `Dealt ${damage} damage! Enemy health: ${Math.max(0, this.currentEnemy.health)}/${this.currentEnemy.maxHealth}`,
          'damage'
        )
      }

      // Check if enemy is defeated
      if (isEnemyDefeated(this.currentEnemy)) {
        const captured = isExactKill(this.currentEnemy)

        // Record defeated enemy with stats
        const defeated: DefeatedEnemy = {
          enemy: JSON.parse(JSON.stringify(toRaw(this.currentEnemy))),
          captured,
          totalDamageDealt: this.damageToCurrentEnemy,
          totalShieldUsed: this.shieldTotal,
          turnsToDefeat: this.turnsAgainstCurrentEnemy,
        }
        // Set health to 0 for display consistency
        defeated.enemy.health = 0
        this.defeatedEnemies.push(defeated)

        if (captured) {
          this.addLog(
            `Exact kill! ${rankTitle(this.currentEnemy.rank)} of ${this.currentEnemy.suit} captured!`,
            'enemy'
          )
          const capturedCard = enemyToCard(this.currentEnemy)
          this.tavernDeck.unshift(capturedCard)
          this.showToast(
            `${rankTitle(this.currentEnemy.rank)} ${suitSymbol(this.currentEnemy.suit)} Captured!`,
            'capture'
          )
        } else {
          this.addLog(
            `${rankTitle(this.currentEnemy.rank)} of ${this.currentEnemy.suit} defeated!`,
            'enemy'
          )
          this.showToast(
            `${rankTitle(this.currentEnemy.rank)} ${suitSymbol(this.currentEnemy.suit)} Defeated!`,
            'defeat'
          )
        }

        this.currentEnemy = null
        this.currentPlay = null
        this.turnStep = 'play_cards'

        // Reveal next enemy
        this.revealNextEnemy()

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

      if (!canSurviveAttack(this.playerHand, effectiveAtk)) {
        this.addLog(
          `Cannot survive ${effectiveAtk} damage! Game Over.`,
          'damage'
        )
        this.phase = 'lost'
        return
      }

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
        return
      }

      // Snapshot before discard (allows undoing the discard selection)
      this.pushSnapshot()

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

      // Snapshot before yield
      this.pushSnapshot()

      const handLimit = HAND_SIZES[this.playerCount] ?? 8
      if (this.tavernDeck.length > 0 && this.playerHand.length < handLimit) {
        const [drawn, remaining] = drawCards(this.tavernDeck, 1)
        this.playerHand.push(...drawn)
        this.tavernDeck = remaining
        this.addLog('Yielded turn. Drew 1 card from tavern.', 'action')
      } else {
        this.addLog('Yielded turn. No cards to draw.', 'action')
      }

      this.turnsAgainstCurrentEnemy++
      this.currentPlay = null
      this.turnStep = 'suffer_damage'
      this.checkAutoSufferDamage()
    },

    // === Turn Finish ===

    finishTurn() {
      this.currentPlay = null
      this.turnStep = 'play_cards'
      this.immunityBroken = false

      if (this.playerHand.length === 0 && this.tavernDeck.length === 0 && this.jesterHand.length === 0) {
        this.addLog('No cards left! Game Over.', 'system')
        this.phase = 'lost'
        return
      }
    },

    // === Navigation ===

    /** Save current game and return to menu. Game data is preserved for resume. */
    returnToMenu() {
      this.phase = 'setup'
      this.clearSelection()
    },

    // === Reset ===

    resetGame() {
      this.$reset()
    },
  },

  persist: {
    pick: [
      'phase', 'turnStep', 'playerCount',
      'castleDeck', 'tavernDeck', 'discardPile',
      'currentEnemy', 'playerHand', 'jesterHand',
      'currentPlay', 'shieldTotal', 'immunityBroken',
      'log', 'logCounter', 'heartsHealAmount',
      'defeatedEnemies', 'turnsAgainstCurrentEnemy', 'damageToCurrentEnemy',
      'undoStack',
    ],
  },
})

// === Helpers ===

function suitSymbol(suit: Suit): string {
  const symbols: Record<Suit, string> = {
    hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠',
  }
  return symbols[suit]
}

function rankTitle(rank: string): string {
  switch (rank) {
    case 'J': return 'Jack'
    case 'Q': return 'Queen'
    case 'K': return 'King'
    default: return rank
  }
}

function enemyToCard(enemy: EnemyCard): Card {
  return {
    id: `captured-${enemy.id}`,
    suit: enemy.suit,
    rank: enemy.rank,
    value: enemy.baseAttack,
    captured: true,
  }
}
