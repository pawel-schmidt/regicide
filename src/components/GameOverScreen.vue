<script setup lang="ts">
import { useGameStore } from '../stores/gameStore'

const game = useGameStore()

const isWin = game.phase === 'won'
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
      <div class="grid grid-cols-3 gap-2 text-center">
        <div class="bg-bg-secondary rounded-lg p-2 border border-border/30">
          <div class="text-[10px] text-text-muted uppercase">Defeated</div>
          <div class="text-lg font-bold text-accent">{{ game.enemiesDefeated }}</div>
        </div>
        <div class="bg-bg-secondary rounded-lg p-2 border border-border/30">
          <div class="text-[10px] text-text-muted uppercase">Hand</div>
          <div class="text-lg font-bold text-text-primary">{{ game.playerHand.length }}</div>
        </div>
        <div class="bg-bg-secondary rounded-lg p-2 border border-border/30">
          <div class="text-[10px] text-text-muted uppercase">Tavern</div>
          <div class="text-lg font-bold text-text-secondary">{{ game.tavernDeck.length }}</div>
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
