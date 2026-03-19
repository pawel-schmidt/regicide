<script setup lang="ts">
import { useGameStore } from '../stores/gameStore'

const game = useGameStore()

function startGame() {
  game.startNewGame(1)
}

function resumeGame() {
  // State already loaded from localStorage, just continue
  // Nothing to do - the phase is already 'playing'
}

const hasExistingGame = game.phase === 'playing' || game.phase === 'won' || game.phase === 'lost'
</script>

<template>
  <div class="min-h-dvh flex items-center justify-center p-4">
    <div class="max-w-md w-full text-center space-y-8">
      <!-- Title -->
      <div>
        <h1 class="text-5xl font-bold text-text-primary tracking-tight">
          Regicide
        </h1>
        <p class="text-text-secondary mt-2 text-lg">
          A cooperative card game against the royals
        </p>
      </div>

      <!-- Crown Icon -->
      <div class="text-6xl">👑</div>

      <!-- Resume existing game -->
      <div v-if="hasExistingGame" class="space-y-3">
        <button
          @click="resumeGame"
          class="w-full py-3 px-6 bg-accent text-bg-primary font-semibold rounded-lg
                 hover:bg-accent/90 transition-colors text-lg"
        >
          Resume Game
        </button>
        <button
          @click="startGame"
          class="w-full py-3 px-6 bg-bg-card text-text-primary font-semibold rounded-lg
                 border border-border hover:bg-bg-hover transition-colors"
        >
          New Game
        </button>
      </div>

      <!-- New game -->
      <div v-else class="space-y-3">
        <button
          @click="startGame"
          class="w-full py-3 px-6 bg-accent text-bg-primary font-semibold rounded-lg
                 hover:bg-accent/90 transition-colors text-lg"
        >
          Start Solo Game
        </button>
      </div>

      <!-- Rules hint -->
      <div class="text-text-muted text-sm space-y-1">
        <p>Defeat all 12 royals: 4 Jacks, 4 Queens, 4 Kings</p>
        <p>Use suit powers wisely to survive their counterattacks</p>
      </div>
    </div>
  </div>
</template>
