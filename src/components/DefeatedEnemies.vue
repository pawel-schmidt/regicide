<script setup lang="ts">
import { ref, computed } from 'vue'
import { useGameStore } from '../stores/gameStore'
import { SUITS, SUIT_SYMBOLS, SUIT_NAMES } from '../types'
import type { Suit, FaceRank, DefeatedEnemy } from '../types'

const game = useGameStore()

const selectedEnemy = ref<DefeatedEnemy | null>(null)

const ranks: FaceRank[] = ['J', 'Q', 'K']

function rankTitle(rank: FaceRank): string {
  switch (rank) {
    case 'J': return 'Jacks'
    case 'Q': return 'Queens'
    case 'K': return 'Kings'
  }
}

function rankSingular(rank: FaceRank): string {
  switch (rank) {
    case 'J': return 'Jack'
    case 'Q': return 'Queen'
    case 'K': return 'King'
  }
}

function suitColor(suit: Suit): string {
  switch (suit) {
    case 'hearts': return 'text-suit-hearts'
    case 'diamonds': return 'text-suit-diamonds'
    case 'clubs': return 'text-suit-clubs'
    case 'spades': return 'text-suit-spades'
  }
}

function suitBorder(suit: Suit): string {
  switch (suit) {
    case 'hearts': return 'border-suit-hearts/50'
    case 'diamonds': return 'border-suit-diamonds/50'
    case 'clubs': return 'border-suit-clubs/50'
    case 'spades': return 'border-suit-spades/50'
  }
}

function suitBg(suit: Suit): string {
  switch (suit) {
    case 'hearts': return 'bg-suit-hearts/10'
    case 'diamonds': return 'bg-suit-diamonds/10'
    case 'clubs': return 'bg-suit-clubs/10'
    case 'spades': return 'bg-suit-spades/10'
  }
}

function findDefeated(rank: FaceRank, suit: Suit): DefeatedEnemy | undefined {
  return game.defeatedEnemies.find(
    d => d.enemy.rank === rank && d.enemy.suit === suit
  )
}

function isCurrentEnemy(rank: FaceRank, suit: Suit): boolean {
  return game.currentEnemy?.rank === rank && game.currentEnemy?.suit === suit
}

function selectEnemy(rank: FaceRank, suit: Suit) {
  const defeated = findDefeated(rank, suit)
  if (defeated) {
    selectedEnemy.value = selectedEnemy.value === defeated ? null : defeated
  }
}

const totalDefeated = computed(() => game.defeatedEnemies.length)
const totalCaptured = computed(() => game.defeatedEnemies.filter(d => d.captured).length)
</script>

<template>
  <div class="bg-bg-card rounded-xl border border-border overflow-hidden">
    <!-- Header -->
    <div class="px-3 py-2 bg-bg-secondary border-b border-border flex items-center justify-between">
      <h3 class="text-[10px] font-semibold text-text-muted uppercase tracking-wider">
        Enemies Defeated
      </h3>
      <div class="flex items-center gap-2 text-[10px]">
        <span class="text-accent font-bold">{{ totalDefeated }}/12</span>
        <span v-if="totalCaptured > 0" class="text-gold">{{ totalCaptured }} captured</span>
      </div>
    </div>

    <!-- Grid: 3 rows (J, Q, K) x 4 cols (suits) -->
    <div class="p-2 space-y-1.5">
      <div v-for="rank in ranks" :key="rank" class="flex items-center gap-1.5">
        <!-- Row label -->
        <div class="w-7 text-[10px] text-text-muted font-semibold text-right flex-shrink-0">
          {{ rank }}
        </div>

        <!-- Suit cells -->
        <div class="flex gap-1 flex-1">
          <button
            v-for="suit in SUITS"
            :key="`${rank}-${suit}`"
            @click="selectEnemy(rank, suit)"
            :class="[
              'flex-1 h-8 rounded-md border flex items-center justify-center text-sm',
              'transition-all duration-200',
              findDefeated(rank, suit)
                ? [
                    suitBorder(suit),
                    suitBg(suit),
                    'cursor-pointer hover:brightness-125',
                    selectedEnemy?.enemy.rank === rank && selectedEnemy?.enemy.suit === suit
                      ? 'ring-1 ring-accent scale-105'
                      : '',
                  ]
                : isCurrentEnemy(rank, suit)
                  ? 'border-accent/40 bg-accent/5 animate-pulse-glow'
                  : 'border-border/30 bg-bg-secondary/50 cursor-default',
            ]"
          >
            <template v-if="findDefeated(rank, suit)">
              <span :class="suitColor(suit)" class="font-bold">
                {{ SUIT_SYMBOLS[suit] }}
              </span>
              <span
                v-if="findDefeated(rank, suit)?.captured"
                class="text-[8px] text-gold ml-0.5"
              >
                ★
              </span>
            </template>
            <template v-else-if="isCurrentEnemy(rank, suit)">
              <span class="text-accent text-xs">⚔</span>
            </template>
            <template v-else>
              <span class="text-text-muted/30 text-xs">{{ SUIT_SYMBOLS[suit] }}</span>
            </template>
          </button>
        </div>
      </div>
    </div>

    <!-- Selected enemy stats popup -->
    <Transition name="stats">
      <div
        v-if="selectedEnemy"
        class="px-3 py-2 bg-bg-secondary border-t border-border animate-slide-in"
      >
        <div class="flex items-center justify-between mb-1.5">
          <div class="flex items-center gap-1.5">
            <span :class="suitColor(selectedEnemy.enemy.suit)" class="text-base font-bold">
              {{ SUIT_SYMBOLS[selectedEnemy.enemy.suit] }}
            </span>
            <span class="text-xs font-semibold text-text-primary">
              {{ rankSingular(selectedEnemy.enemy.rank) }} of {{ SUIT_NAMES[selectedEnemy.enemy.suit] }}
            </span>
            <span
              v-if="selectedEnemy.captured"
              class="text-[9px] bg-gold/20 text-gold px-1.5 py-0.5 rounded-full font-semibold"
            >
              Captured
            </span>
          </div>
          <button
            @click="selectedEnemy = null"
            class="text-text-muted hover:text-text-secondary text-xs px-1"
          >
            ✕
          </button>
        </div>
        <div class="grid grid-cols-3 gap-1.5 text-center">
          <div class="bg-bg-card rounded p-1.5 border border-border/30">
            <div class="text-[9px] text-text-muted uppercase">Damage</div>
            <div class="text-sm font-bold text-suit-hearts">{{ selectedEnemy.totalDamageDealt }}</div>
          </div>
          <div class="bg-bg-card rounded p-1.5 border border-border/30">
            <div class="text-[9px] text-text-muted uppercase">Shield</div>
            <div class="text-sm font-bold text-shield">{{ selectedEnemy.totalShieldUsed }}</div>
          </div>
          <div class="bg-bg-card rounded p-1.5 border border-border/30">
            <div class="text-[9px] text-text-muted uppercase">Turns</div>
            <div class="text-sm font-bold text-accent">{{ selectedEnemy.turnsToDefeat }}</div>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.stats-enter-active,
.stats-leave-active {
  transition: all 0.2s ease;
}
.stats-enter-from,
.stats-leave-to {
  opacity: 0;
  max-height: 0;
  padding-top: 0;
  padding-bottom: 0;
}
.stats-enter-to,
.stats-leave-from {
  opacity: 1;
  max-height: 200px;
}
</style>
