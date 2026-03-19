<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '../stores/gameStore'
import { calculateAttack } from '../utils/rules'
import CardComponent from './CardComponent.vue'

const game = useGameStore()

const isPlayPhase = computed(() => game.turnStep === 'play_cards')
const isSufferPhase = computed(() => game.turnStep === 'suffer_damage')

const sortedHand = computed(() => {
  return [...game.playerHand].sort((a, b) => {
    const suitOrder: Record<string, number> = { hearts: 0, diamonds: 1, clubs: 2, spades: 3 }
    const suitDiff = (suitOrder[a.suit] ?? 0) - (suitOrder[b.suit] ?? 0)
    if (suitDiff !== 0) return suitDiff
    return a.value - b.value
  })
})

const selectedTotal = computed(() => {
  return game.selectedCards.reduce((acc: number, c: { value: number }) => acc + c.value, 0)
})

/** Attack preview accounting for clubs doubling and enemy immunity */
const attackPreview = computed(() => {
  const cards = game.selectedCards
  if (cards.length === 0 || !game.currentEnemy) return selectedTotal.value
  const { totalAttack } = calculateAttack(cards, null, game.currentEnemy, game.immunityBroken)
  return totalAttack
})

const discardRequired = computed(() => game.effectiveEnemyAttack)

function toggleCard(cardId: string) {
  game.toggleCardSelection(cardId)
}

function playCards() {
  game.playSelectedCards()
}

function discardCards() {
  game.sufferDamage(game.selectedCardIds)
}

function yieldTurn() {
  game.yieldTurn()
}
</script>

<template>
  <div class="space-y-2">
    <!-- Suit power reference -->
    <div class="flex justify-center gap-3 text-[10px] text-text-muted">
      <span><span class="text-suit-hearts">♥</span> Heal</span>
      <span><span class="text-suit-diamonds">♦</span> Draw</span>
      <span><span class="text-suit-clubs">♣</span> x2 Dmg</span>
      <span><span class="text-suit-spades">♠</span> Shield</span>
    </div>

    <!-- Action bar -->
    <div class="flex items-center justify-between gap-2">
      <div class="text-sm text-text-secondary min-w-0">
        <span v-if="isPlayPhase">
          <span class="text-text-muted">Play cards</span>
          <span v-if="game.selectedCardIds.length > 0" class="text-accent font-semibold ml-1">
            {{ attackPreview }} atk
          </span>
        </span>
        <span v-else-if="isSufferPhase" class="text-suit-hearts">
          Discard <span class="font-bold">{{ discardRequired }}+</span>
          <span v-if="game.selectedCardIds.length > 0" class="text-accent font-semibold ml-1">
            ({{ selectedTotal }})
          </span>
        </span>
      </div>

      <div class="flex gap-1.5 flex-shrink-0">
        <button
          v-if="isPlayPhase"
          @click="playCards"
          :disabled="!game.isSelectionValid"
          :class="[
            'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150',
            game.isSelectionValid
              ? 'bg-accent text-bg-primary hover:bg-accent/90 active:scale-95'
              : 'bg-bg-hover text-text-muted cursor-not-allowed',
          ]"
        >
          Play
        </button>

        <button
          v-if="isPlayPhase"
          @click="yieldTurn"
          :disabled="!game.canPlayerYield"
          :class="[
            'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150',
            game.canPlayerYield
              ? 'bg-bg-card border border-border text-text-secondary hover:bg-bg-hover active:scale-95'
              : 'bg-bg-hover text-text-muted cursor-not-allowed',
          ]"
        >
          Yield
        </button>

        <button
          v-if="isSufferPhase"
          @click="discardCards"
          :disabled="selectedTotal < discardRequired"
          :class="[
            'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150',
            selectedTotal >= discardRequired
              ? 'bg-suit-hearts text-white hover:bg-suit-hearts/90 active:scale-95'
              : 'bg-bg-hover text-text-muted cursor-not-allowed',
          ]"
        >
          Discard
        </button>
      </div>
    </div>

    <!-- Jester -->
    <div v-if="game.jesterHand.length > 0 && isPlayPhase" class="flex justify-center gap-2">
      <button
        v-for="jester in game.jesterHand"
        :key="jester.id"
        @click="game.toggleJesterSelection()"
        :class="[
          'w-14 h-20 sm:w-16 sm:h-23 rounded-lg border-2 flex flex-col items-center justify-center',
          'transition-all duration-150 select-none cursor-pointer',
          game.selectedJester
            ? 'border-accent shadow-[0_0_10px_rgba(192,132,252,0.3)] -translate-y-3 scale-105 bg-accent/10'
            : 'border-border/60 bg-bg-card hover:border-text-muted/60 hover:-translate-y-1',
        ]"
      >
        <div class="text-xl sm:text-2xl">🃏</div>
        <div class="text-[10px] text-text-secondary mt-0.5">Jester</div>
      </button>
    </div>

    <!-- Cards -->
    <div class="flex flex-wrap gap-1 sm:gap-1.5 justify-center">
      <CardComponent
        v-for="card in sortedHand"
        :key="card.id"
        :card="card"
        :selected="game.selectedCardIds.includes(card.id)"
        @click="toggleCard(card.id)"
      />
    </div>

    <!-- Hand count -->
    <div class="text-[10px] text-text-muted text-center">
      {{ game.playerHand.length }} cards in hand
    </div>
  </div>
</template>
