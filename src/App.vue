<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { useGameStore } from './stores/gameStore'
import GameBoard from './components/GameBoard.vue'

const game = useGameStore()
const loaded = ref(false)

onMounted(() => {
  loaded.value = true
})

function continueGame() {
  // Game state is already loaded from persistence
  game.phase = 'playing'
}

function newGame() {
  game.startNewGame(1)
}

const hasActiveGame = computed(() => {
  // There's an active game if we have a current enemy or defeated enemies and aren't in setup
  return (
    game.currentEnemy !== null ||
    game.defeatedEnemies.length > 0 ||
    game.playerHand.length > 0
  )
})

const showMenu = computed(() => {
  if (!loaded.value) return false
  return game.phase === 'setup'
})
</script>

<template>
  <div v-if="loaded" class="min-h-dvh bg-bg-primary">
    <!-- Menu Screen -->
    <template v-if="showMenu">
      <div class="min-h-dvh flex items-center justify-center p-4">
        <div class="max-w-md w-full text-center space-y-8">
          <div>
            <h1 class="text-5xl font-bold text-text-primary tracking-tight">Regicide</h1>
            <p class="text-text-secondary mt-2 text-lg">
              A cooperative card game against the royals
            </p>
          </div>

          <div class="text-6xl">👑</div>

          <div class="space-y-3">
            <!-- Continue existing game -->
            <div v-if="hasActiveGame">
              <p class="text-text-secondary text-sm mb-3">
                Game in progress ({{ game.defeatedEnemies.length }}/12 defeated)
              </p>
              <button
                @click="continueGame"
                class="w-full py-3 px-6 bg-accent text-bg-primary font-semibold rounded-lg
                       hover:bg-accent/90 transition-colors text-lg"
              >
                Continue Game
              </button>
            </div>

            <!-- New game -->
            <button
              @click="newGame"
              :class="[
                'w-full py-3 px-6 font-semibold rounded-lg transition-colors',
                hasActiveGame
                  ? 'bg-bg-card text-text-primary border border-border hover:bg-bg-hover'
                  : 'bg-accent text-bg-primary hover:bg-accent/90 text-lg',
              ]"
            >
              {{ hasActiveGame ? 'New Game' : 'Start Solo Game' }}
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
