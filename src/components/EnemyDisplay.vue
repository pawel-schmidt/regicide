<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useGameStore } from '../stores/gameStore'
import { SUIT_SYMBOLS, SUIT_NAMES } from '../types'

const game = useGameStore()

const enemy = computed(() => game.currentEnemy)
const damageFlash = ref(false)

const healthPercent = computed(() => {
  if (!enemy.value) return 0
  return Math.max(0, (enemy.value.health / enemy.value.maxHealth) * 100)
})

const effectiveAttack = computed(() => game.effectiveEnemyAttack)

const shieldPercent = computed(() => {
  if (!enemy.value) return 0
  return Math.min(100, (game.shieldTotal / enemy.value.baseAttack) * 100)
})

// Flash on damage
watch(
  () => enemy.value?.health,
  (newH, oldH) => {
    if (oldH !== undefined && newH !== undefined && newH < oldH) {
      damageFlash.value = true
      setTimeout(() => { damageFlash.value = false }, 400)
    }
  }
)

function suitColor(suit: string): string {
  switch (suit) {
    case 'hearts': return 'text-suit-hearts'
    case 'diamonds': return 'text-suit-diamonds'
    case 'clubs': return 'text-suit-clubs'
    case 'spades': return 'text-suit-spades'
    default: return ''
  }
}

function suitBgGlow(suit: string): string {
  switch (suit) {
    case 'hearts': return 'shadow-[0_0_20px_rgba(239,68,68,0.15)]'
    case 'diamonds': return 'shadow-[0_0_20px_rgba(245,158,11,0.15)]'
    case 'clubs': return 'shadow-[0_0_20px_rgba(34,197,94,0.15)]'
    case 'spades': return 'shadow-[0_0_20px_rgba(59,130,246,0.15)]'
    default: return ''
  }
}

function rankTitle(rank: string): string {
  switch (rank) {
    case 'J': return 'Jack'
    case 'Q': return 'Queen'
    case 'K': return 'King'
    default: return rank
  }
}

function rankEmoji(rank: string): string {
  switch (rank) {
    case 'J': return '🤺'
    case 'Q': return '👸'
    case 'K': return '🤴'
    default: return '👑'
  }
}
</script>

<template>
  <div
    v-if="enemy"
    :class="[
      'bg-bg-card rounded-xl p-4 border border-border transition-all duration-300',
      suitBgGlow(enemy.suit),
      damageFlash ? 'animate-damage-flash' : '',
    ]"
  >
    <!-- Enemy Identity -->
    <div class="flex items-center justify-between mb-3">
      <div class="flex items-center gap-2">
        <div class="text-3xl">{{ rankEmoji(enemy.rank) }}</div>
        <div>
          <h2 class="text-lg font-bold text-text-primary leading-tight flex items-center gap-1.5">
            {{ rankTitle(enemy.rank) }}
            <span :class="suitColor(enemy.suit)">{{ SUIT_SYMBOLS[enemy.suit] }}</span>
            {{ SUIT_NAMES[enemy.suit] }}
          </h2>
          <p class="text-xs text-text-muted">
            Immune to <span :class="suitColor(enemy.suit)">{{ SUIT_SYMBOLS[enemy.suit] }}</span> powers
            <span v-if="game.immunityBroken" class="text-accent font-semibold ml-1">(BROKEN)</span>
          </p>
        </div>
      </div>
      <div class="text-right">
        <div class="text-xs text-text-muted">Progress</div>
        <div class="text-sm font-bold text-accent">{{ game.enemiesDefeated }}/12</div>
      </div>
    </div>

    <!-- Health Bar -->
    <div class="mb-3">
      <div class="flex justify-between text-xs mb-1">
        <span class="text-suit-hearts font-semibold flex items-center gap-1">
          <span>HP</span>
          <span>{{ Math.max(0, enemy.health) }}/{{ enemy.maxHealth }}</span>
        </span>
        <span class="text-text-muted">{{ Math.round(healthPercent) }}%</span>
      </div>
      <div class="h-3 bg-bg-secondary rounded-full overflow-hidden border border-border/50">
        <div
          class="h-full rounded-full transition-all duration-500 ease-out"
          :class="healthPercent > 50 ? 'bg-health-bar' : healthPercent > 25 ? 'bg-suit-diamonds' : 'bg-danger'"
          :style="{ width: `${healthPercent}%` }"
        />
      </div>
    </div>

    <!-- Attack & Shield -->
    <div class="grid grid-cols-2 gap-2">
      <div class="bg-bg-secondary rounded-lg p-2.5 text-center border border-border/30">
        <div class="text-[10px] text-text-muted uppercase tracking-wider mb-0.5">Attack</div>
        <div class="text-2xl font-bold text-suit-hearts leading-tight">
          {{ effectiveAttack }}
        </div>
        <div v-if="game.shieldTotal > 0" class="text-[10px] text-text-muted mt-0.5">
          base {{ enemy.baseAttack }}
        </div>
      </div>
      <div class="bg-bg-secondary rounded-lg p-2.5 text-center border border-border/30">
        <div class="text-[10px] text-text-muted uppercase tracking-wider mb-0.5">Shield</div>
        <div class="text-2xl font-bold text-shield leading-tight">
          {{ game.shieldTotal }}
        </div>
        <div v-if="game.shieldTotal > 0" class="h-1 bg-bg-primary rounded-full overflow-hidden mt-1.5">
          <div
            class="h-full bg-shield rounded-full transition-all duration-300"
            :style="{ width: `${Math.min(100, shieldPercent)}%` }"
          />
        </div>
      </div>
    </div>
  </div>
</template>
