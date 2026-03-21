<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '../stores/gameStore'

const game = useGameStore()

const isWin = computed(() => game.phase === 'won')

const totalCaptured = computed(() => game.defeatedEnemies.filter(d => d.captured).length)
const totalTurns = computed(() =>
  game.defeatedEnemies.reduce((acc, d) => acc + d.turnsToDefeat, 0)
)
</script>

<template>
  <div class="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
    <div class="bg-bg-card rounded-2xl border border-border p-6 sm:p-8 max-w-sm w-full text-center space-y-5">
      <!-- Result -->
      <div>
        <div class="text-5xl mb-2">{{ isWin ? '👑' : '💀' }}</div>
        <h2 class="text-2xl font-bold" :class="isWin ? 'text-gold' : 'text-danger'">
          {{ isWin ? 'Victory!' : 'Defeat' }}
        </h2>
        <p class="text-text-secondary text-sm mt-2">
          <template v-if="isWin">
            All 12 royals have been vanquished!
          </template>
          <template v-else>
            The royals prevail. {{ game.enemiesDefeated }}/12 defeated.
          </template>
        </p>
      </div>

      <!-- Stats -->
      <div class="grid grid-cols-2 gap-2 text-center">
        <div class="bg-bg-secondary rounded-lg p-2 border border-border/30">
          <div class="text-[10px] text-text-muted uppercase">Defeated</div>
          <div class="text-lg font-bold text-accent">{{ game.enemiesDefeated }}/12</div>
        </div>
        <div class="bg-bg-secondary rounded-lg p-2 border border-border/30">
          <div class="text-[10px] text-text-muted uppercase">Captured</div>
          <div class="text-lg font-bold text-gold">{{ totalCaptured }}</div>
        </div>
        <div class="bg-bg-secondary rounded-lg p-2 border border-border/30">
          <div class="text-[10px] text-text-muted uppercase">Total Turns</div>
          <div class="text-lg font-bold text-text-primary">{{ totalTurns }}</div>
        </div>
        <div class="bg-bg-secondary rounded-lg p-2 border border-border/30">
          <div class="text-[10px] text-text-muted uppercase">Cards Left</div>
          <div class="text-lg font-bold text-text-secondary">{{ game.playerHand.length }}</div>
        </div>
      </div>

      <!-- Actions -->
      <div class="space-y-2">
        <button
          @click="game.startNewGame(game.playerCount)"
          class="w-full py-2.5 px-6 bg-accent text-bg-primary font-semibold rounded-lg
                 hover:bg-accent/90 transition-all active:scale-95"
        >
          Play Again
        </button>
        <button
          @click="game.resetGame()"
          class="w-full py-2 px-6 bg-bg-secondary text-text-secondary rounded-lg
                 border border-border hover:bg-bg-hover transition-all active:scale-95 text-sm"
        >
          Main Menu
        </button>
      </div>
    </div>
  </div>
</template>
