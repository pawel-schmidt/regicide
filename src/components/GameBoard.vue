<script setup lang="ts">
import { ref } from 'vue'
import { useGameStore } from '../stores/gameStore'
import EnemyDisplay from './EnemyDisplay.vue'
import PlayerHand from './PlayerHand.vue'
import GameStats from './GameStats.vue'
import LogComponent from './LogComponent.vue'
import GameOverScreen from './GameOverScreen.vue'
import DefeatedEnemies from './DefeatedEnemies.vue'
import ToastNotification from './ToastNotification.vue'

const game = useGameStore()
const showDefeated = ref(false)
</script>

<template>
  <div class="min-h-dvh flex flex-col max-w-lg mx-auto px-3 py-3 gap-2.5 sm:py-4 sm:gap-3">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <h1 class="text-base font-bold text-text-primary tracking-tight">
        Regicide
      </h1>
      <div class="flex items-center gap-1.5">
        <!-- Undo button -->
        <button
          v-if="game.canUndo"
          @click="game.undo()"
          class="text-[10px] text-text-muted hover:text-accent transition-colors
                 px-2 py-0.5 rounded border border-border/50 hover:border-accent/50
                 flex items-center gap-1"
          title="Undo last action"
        >
          <span class="text-xs">↩</span>
          Undo
        </button>
        <!-- Menu button -->
        <button
          @click="game.returnToMenu()"
          class="text-[10px] text-text-muted hover:text-text-secondary transition-colors
                 px-2 py-0.5 rounded border border-border/50 hover:border-text-muted/50"
        >
          Menu
        </button>
      </div>
    </div>

    <!-- Deck Stats -->
    <GameStats />

    <!-- Enemy -->
    <EnemyDisplay />

    <!-- Defeated enemies toggle + grid -->
    <div>
      <button
        @click="showDefeated = !showDefeated"
        class="w-full text-[10px] text-text-muted hover:text-text-secondary transition-colors
               py-1 flex items-center justify-center gap-1"
      >
        <span>{{ game.enemiesDefeated }}/12 Defeated</span>
        <span class="text-[8px]">{{ showDefeated ? '▲' : '▼' }}</span>
      </button>
      <Transition name="expand">
        <DefeatedEnemies v-if="showDefeated" />
      </Transition>
    </div>

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

    <!-- Toast Notification -->
    <ToastNotification />

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

.expand-enter-active,
.expand-leave-active {
  transition: all 0.25s ease;
  overflow: hidden;
}
.expand-enter-from,
.expand-leave-to {
  opacity: 0;
  max-height: 0;
}
.expand-enter-to,
.expand-leave-from {
  opacity: 1;
  max-height: 500px;
}
</style>
