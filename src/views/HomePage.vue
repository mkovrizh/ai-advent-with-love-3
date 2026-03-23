<template>
    <q-page class="home-page">
        <div class="home-content">
            <h1 class="home-title">AI Advent with Love #3</h1>
            <p class="home-subtitle">Advent calendar of AI experiments</p>

            <div class="nav-grid">
                <q-card
                    v-for="item in navItems"
                    :key="item.path"
                    class="nav-card"
                    @click="navigateTo(item.path)"
                >
                    <q-card-section class="text-center">
                        <q-icon :name="item.icon" size="40px" color="primary" />
                    </q-card-section>
                    <q-card-section>
                        <div class="text-h6">{{ item.name }}</div>
                        <div class="text-caption nav-card-desc">{{ item.description }}</div>
                    </q-card-section>
                </q-card>
            </div>
        </div>
    </q-page>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

const navItems = [
    {
        name: 'Day 01: Chat',
        path: '/day01',
        description: 'Chat with Claude AI',
        icon: 'chat'
    },
    {
        name: 'Day 02: Format',
        path: '/day02',
        description: 'Response format constraints',
        icon: 'format_list_bulleted'
    },
    {
        name: 'Day 03: Reasoning',
        path: '/day03',
        description: 'Compare reasoning strategies',
        icon: 'psychology'
    },
    {
        name: 'Day 04: Temperature',
        path: '/day04',
        description: 'Accuracy vs creativity vs diversity',
        icon: 'thermostat'
    },
    {
        name: 'Day 05: Models',
        path: '/day05',
        description: 'Compare Haiku, Sonnet, Opus',
        icon: 'compare_arrows'
    }
]

function navigateTo(path: string): void {
    router.push(path)
}
</script>

<style scoped>
.home-page {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    background: var(--bg-page);
}

.home-content {
    text-align: center;
    padding: 32px;
}

.home-title {
    font-size: 2.5rem;
    font-weight: 600;
    margin-bottom: 8px;
    color: var(--text-primary);
}

.home-subtitle {
    font-size: 1.2rem;
    color: var(--text-secondary);
    margin-bottom: 48px;
}

.nav-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 24px;
    justify-content: center;
}

.nav-card {
    background: var(--bg-surface) !important;
    border: 1px solid var(--border-subtle);
    cursor: pointer;
    transition: all 0.2s ease;
    padding: 12px;
    border-radius: var(--radius-sm);
    width: 200px;
}

.nav-card:hover {
    border-color: var(--accent-primary);
    transform: translateY(-4px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
}

.nav-card-desc {
    color: var(--text-secondary);
}

@media (max-width: 640px) {
    .nav-grid {
        grid-template-columns: 1fr;
    }
}
</style>
