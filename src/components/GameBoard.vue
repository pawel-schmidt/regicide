<script setup lang="ts">
import { useGameStore } from '../stores/gameStore'
import EnemyDisplay from './EnemyDisplay.vue'
import PlayerHand from './PlayerHand.vue'
import GameStats from './GameStats.vue'
import LogComponent from './LogComponent.vue'
import GameOverScreen from './GameOverScreen.vue'

const game = useGameStore()
</script>

<template>
  <div class="min-h-dvh flex flex-col max-w-lg mx-auto px-3 py-3 gap-2.5 sm:py-4 sm:gap-3">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <h1 class="text-base font-bold text-text-primary tracking-tight">
        Regicide
      </h1>
      <button
        @click="game.resetGame()"
        class="text-[10px] text-text-muted hover:text-text-secondary transition-colors
               px-2 py-0.5 rounded border border-border/50 hover:border-text-muted/50"
      >
        Menu
      </button>
    </div>

    <!-- Deck Stats -->
    <GameStats />

    <!-- Enemy -->
    <EnemyDisplay />

    <!-- Turn Status -->
    <div class="text-center">
      <span
        v-if="game.turnStep === 'play_cards'"
        class="inline-block px-3 py-1 bg-accent/15 text-accent text-[11px] font-semibold
               rounded-full border border-accent/20 animate-pulse-glow"
      >
        Your Turn
      </span>
      <span
        v-else-if="game.turnStep === 'suffer_damage'"
        class="inline-block px-3 py-1 bg-suit-hearts/15 text-suit-hearts text-[11px] font-semibold
               rounded-full border border-suit-hearts/20"
      >
        Enemy Attacks!
      </span>
    </div>

    <!-- Player Hand (grows to fill space) -->
    <div class="flex-1 flex flex-col justify-end min-h-0">
      <PlayerHand />
    </div>

    <!-- Log -->
    <LogComponent />

    <!-- Game Over Overlay -->
    <Transition name="fade">
      <GameOverScreen v-if="game.phase === 'won' || game.phase === 'lost'" />
    </Transition>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
