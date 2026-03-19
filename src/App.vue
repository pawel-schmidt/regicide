<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { useGameStore } from './stores/gameStore'
import SetupScreen from './components/SetupScreen.vue'
import GameBoard from './components/GameBoard.vue'

const game = useGameStore()
const showResume = ref(false)
const loaded = ref(false)

onMounted(() => {
  // Check if there's a persisted in-progress game
  if (game.phase === 'playing') {
    showResume.value = true
  }
  loaded.value = true
})

function resumeGame() {
  showResume.value = false
  // Game state is already loaded from persistence, just play
}

function newGame() {
  showResume.value = false
  game.startNewGame(1)
}

function startFresh() {
  game.startNewGame(1)
}

const showSetup = computed(() => {
  if (!loaded.value) return false
  return game.phase === 'setup' || showResume.value
})
</script>

<template>
  <div v-if="loaded" class="min-h-dvh bg-bg-primary">
    <!-- Setup / Resume Screen -->
    <template v-if="showSetup">
      <div class="min-h-dvh flex items-center justify-center p-4">
        <div class="max-w-md w-full text-center space-y-8">
          <div>
            <h1 class="text-5xl font-bold text-text-primary tracking-tight">Regicide</h1>
            <p class="text-text-secondary mt-2 text-lg">
              A cooperative card game against the royals
            </p>
          </div>

          <div class="text-6xl">👑</div>

          <!-- Resume existing game -->
          <div v-if="showResume" class="space-y-3">
            <p class="text-text-secondary text-sm">
              You have an unfinished game ({{ game.enemiesDefeated }}/12 defeated)
            </p>
            <button
              @click="resumeGame"
              class="w-full py-3 px-6 bg-accent text-bg-primary font-semibold rounded-lg
                     hover:bg-accent/90 transition-colors text-lg"
            >
              Resume Game
            </button>
            <button
              @click="newGame"
              class="w-full py-3 px-6 bg-bg-card text-text-primary font-semibold rounded-lg
                     border border-border hover:bg-bg-hover transition-colors"
            >
              New Game
            </button>
          </div>

          <!-- Fresh start -->
          <div v-else class="space-y-3">
            <button
              @click="startFresh"
              class="w-full py-3 px-6 bg-accent text-bg-primary font-semibold rounded-lg
                     hover:bg-accent/90 transition-colors text-lg"
            >
              Start Solo Game
            </button>
          </div>

          <div class="text-text-muted text-sm space-y-1">
            <p>Defeat all 12 royals: 4 Jacks, 4 Queens, 4 Kings</p>
            <p>Use suit powers wisely to survive their counterattacks</p>
          </div>
        </div>
      </div>
    </template>

    <!-- Game Board -->
    <template v-else>
      <GameBoard />
    </template>
  </div>
</template>
