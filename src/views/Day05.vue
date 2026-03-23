<template>
    <q-page class="day05-page">
        <!-- Header -->
        <header class="page-header">
            <button class="icon-btn" @click="$router.push('/')" title="Home">
                <q-icon name="arrow_back" size="20px" />
            </button>
            <span class="page-title">Day 05: Model Versions</span>
        </header>

        <!-- Prompt input -->
        <div class="prompt-section">
            <div class="prompt-box">
                <textarea
                    ref="inputRef"
                    v-model="userPrompt"
                    @keydown="handleKeydown"
                    @input="autoResize()"
                    placeholder="Enter a prompt to compare models..."
                    class="prompt-textarea"
                    rows="2"
                    :disabled="isStreaming"
                />
                <button
                    class="send-btn"
                    :class="{active: canSend}"
                    :disabled="!canSend"
                    @click="sendAll()"
                    title="Send to all"
                >
                    <q-icon name="arrow_upward" size="18px" />
                </button>
            </div>
        </div>

        <!-- 3 comparison columns -->
        <div class="comparison">
            <div
                v-for="(col, index) in columns"
                :key="index"
                class="comparison-col"
            >
                <div class="col-header">
                    <q-icon :name="col.icon" size="18px" />
                    <span class="tier-label">{{ col.tier }}</span>
                    <select
                        v-model="col.modelId"
                        class="col-model-select"
                        :disabled="col.streaming || modelsLoading"
                    >
                        <option v-if="modelsLoading" value="" disabled>Loading...</option>
                        <option
                            v-for="m in availableModels"
                            :key="m.id" :value="m.id"
                        >{{ m.displayName }}</option>
                    </select>
                </div>

                <!-- Metrics bar -->
                <div v-if="col.metrics" class="metrics-bar">
                    <span class="metric">
                        <q-icon name="timer" size="14px" />
                        {{ col.metrics.timeMs >= 1000 ? (col.metrics.timeMs / 1000).toFixed(1) + 's' : col.metrics.timeMs + 'ms' }}
                    </span>
                    <span class="metric">
                        <q-icon name="token" size="14px" />
                        {{ col.metrics.inputTokens }} / {{ col.metrics.outputTokens }}
                    </span>
                    <span class="metric">
                        <q-icon name="payments" size="14px" />
                        ${{ col.metrics.cost }}
                    </span>
                </div>
                <div v-else-if="col.streaming" class="metrics-bar">
                    <span class="metric streaming-indicator">
                        <q-icon name="pending" size="14px" class="spin" /> generating...
                    </span>
                    <span class="metric">
                        <q-icon name="timer" size="14px" />
                        {{ elapsedText(col.startTime) }}
                    </span>
                </div>

                <div class="col-body">
                    <div v-if="!col.responseText && !col.streaming" class="col-empty">
                        Response will appear here
                    </div>
                    <div v-if="col.responseText || col.streaming" class="response-text">
                        {{ col.responseText || col.streamingText }}<span v-if="col.streaming" class="cursor-blink">▎</span>
                    </div>
                    <div v-if="col.error" class="error-text">{{ col.error }}</div>
                </div>
            </div>
        </div>
    </q-page>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { AnthropicModelProvider, type ModelInfo } from '@/services/ModelProvider'

const modelProvider = new AnthropicModelProvider()
const availableModels = ref<ModelInfo[]>([])
const modelsLoading = ref(false)

// Pricing per million tokens (USD)
const pricing: Record<string, {input: number, output: number}> = {
    'claude-3-haiku-20240307': {input: 0.80, output: 4.00},
    'claude-sonnet-4-20250514': {input: 3.00, output: 15.00},
    'claude-opus-4-6': {input: 5.00, output: 25.00}
}

function calcCost(modelId: string, inputTokens: number, outputTokens: number): string {
    const p = Object.entries(pricing).find(([key]) => modelId.includes(key.replace(/-\d+$/, '')) || modelId === key)
    if (!p) return '—'
    const [, rates] = p
    const cost = (inputTokens / 1_000_000) * rates.input + (outputTokens / 1_000_000) * rates.output
    if (cost < 0.0001) return '< 0.0001'
    return cost.toFixed(4)
}

interface Metrics {
    timeMs: number,
    inputTokens: number,
    outputTokens: number,
    cost: string
}

interface ColumnState {
    tier: string,
    icon: string,
    modelId: string,
    responseText: string,
    streamingText: string,
    streaming: boolean,
    error: string,
    metrics: Metrics | null,
    startTime: number
}

const defaultModels = [
    'claude-3-haiku-20240307',
    'claude-sonnet-4-20250514',
    'claude-opus-4-6'
]

const columns = reactive<ColumnState[]>([
    {tier: 'Weak', icon: 'speed', modelId: '', responseText: '', streamingText: '', streaming: false, error: '', metrics: null, startTime: 0},
    {tier: 'Medium', icon: 'balance', modelId: '', responseText: '', streamingText: '', streaming: false, error: '', metrics: null, startTime: 0},
    {tier: 'Strong', icon: 'psychology', modelId: '', responseText: '', streamingText: '', streaming: false, error: '', metrics: null, startTime: 0}
])

async function loadModels(): Promise<void> {
    modelsLoading.value = true
    try {
        availableModels.value = await modelProvider.fetchModels()
        // Auto-assign default models
        for (let i = 0; i < columns.length; i++) {
            const defaultId = defaultModels[i]
            const found = availableModels.value.find(m => m.id === defaultId)
            columns[i]!.modelId = found ? found.id : (availableModels.value[i]?.id ?? '')
        }
    }
    catch { /* silently fail, user can pick manually */ }
    finally {
        modelsLoading.value = false
    }
}

onMounted(loadModels)

const userPrompt = ref('')
const inputRef = ref<HTMLTextAreaElement | null>(null)

const isStreaming = computed(() => columns.some(c => c.streaming))
const canSend = computed(() => userPrompt.value.trim().length > 0 && !isStreaming.value)

// Live elapsed timer
const now = ref(Date.now())
let timerInterval: ReturnType<typeof setInterval> | null = null

function startTimer(): void {
    now.value = Date.now()
    timerInterval = setInterval(() => { now.value = Date.now() }, 100)
}

function stopTimer(): void {
    if (timerInterval) { clearInterval(timerInterval); timerInterval = null }
}

onUnmounted(stopTimer)

function elapsedText(startTime: number): string {
    if (!startTime) return ''
    const ms = now.value - startTime
    return ms >= 1000 ? (ms / 1000).toFixed(1) + 's' : ms + 'ms'
}

function handleKeydown(e: KeyboardEvent): void {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        sendAll()
    }
}

function autoResize(): void {
    if (inputRef.value) {
        inputRef.value.style.height = 'auto'
        inputRef.value.style.height = Math.min(inputRef.value.scrollHeight, 150) + 'px'
    }
}

async function sendColumn(col: ColumnState, text: string): Promise<void> {
    col.streamingText = ''
    col.responseText = ''
    col.streaming = true
    col.error = ''
    col.metrics = null
    col.startTime = Date.now()
    try {
        const result = await modelProvider.sendMessageStream(
            {
                model: col.modelId,
                messages: [{role: 'user', content: text}]
            },
            (delta) => { col.streamingText += delta }
        )
        const timeMs = Date.now() - col.startTime
        col.responseText = result.text
        col.metrics = {
            timeMs,
            inputTokens: result.inputTokens,
            outputTokens: result.outputTokens,
            cost: calcCost(col.modelId, result.inputTokens, result.outputTokens)
        }
    }
    catch (err: unknown) {
        col.error = err instanceof Error ? err.message : String(err)
    }
    finally {
        col.streaming = false
        col.streamingText = ''
        if (!columns.some(c => c.streaming)) { stopTimer() }
    }
}

async function sendAll(): Promise<void> {
    const text = userPrompt.value.trim()
    if (!text || isStreaming.value) { return }
    startTimer()
    for (const col of columns) { sendColumn(col, text) }
}
</script>

<style scoped>
.day05-page {
    display: flex;
    flex-direction: column;
    height: 100vh;
    max-height: 100vh;
    background: var(--bg-page);
    overflow: hidden;
}

.page-header {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    border-bottom: 1px solid var(--border-subtle);
    flex-shrink: 0;
}

.page-title {
    font-size: 1rem;
    font-weight: 600;
    color: var(--text-primary);
}

.icon-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border: none;
    border-radius: 8px;
    background: transparent;
    color: var(--text-secondary);
    cursor: pointer;
    transition: background 0.15s, color 0.15s;
}

.icon-btn:hover {
    background: var(--bg-hover);
    color: var(--text-primary);
}

/* Prompt section */
.prompt-section {
    flex-shrink: 0;
    padding: 12px 16px 8px;
}

.prompt-box {
    max-width: 900px;
    margin: 0 auto;
    display: flex;
    align-items: flex-end;
    gap: 8px;
    background: var(--bg-input);
    border: 1px solid var(--border-input);
    border-radius: var(--radius-lg);
    padding: 8px 12px;
    transition: border-color 0.2s;
}

.prompt-box:focus-within {
    border-color: var(--accent-primary);
}

.prompt-textarea {
    flex: 1;
    border: none;
    outline: none;
    background: transparent;
    color: var(--text-primary);
    font-size: 0.95rem;
    font-family: inherit;
    line-height: 1.5;
    resize: none;
    padding: 6px 4px;
    max-height: 150px;
}

.prompt-textarea::placeholder {
    color: var(--text-placeholder);
}

.prompt-textarea:disabled {
    opacity: 0.5;
}

.send-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border: none;
    border-radius: 50%;
    background: var(--border-subtle);
    color: var(--text-placeholder);
    cursor: not-allowed;
    transition: all 0.15s;
    flex-shrink: 0;
}

.send-btn.active {
    background: var(--accent-primary);
    color: #1A1915;
    cursor: pointer;
}

.send-btn.active:hover {
    background: var(--accent-hover);
}

/* Comparison */
.comparison {
    flex: 1;
    display: flex;
    gap: 1px;
    background: var(--border-subtle);
    overflow: hidden;
    min-height: 0;
}

.comparison-col {
    flex: 1;
    display: flex;
    flex-direction: column;
    background: var(--bg-page);
    min-width: 0;
    min-height: 0;
}

.col-header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 12px;
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--text-secondary);
    border-bottom: 1px solid var(--border-subtle);
    flex-shrink: 0;
}

.tier-label {
    white-space: nowrap;
}

.col-model-select {
    flex: 1;
    min-width: 0;
    border: 1px solid var(--border-subtle);
    border-radius: 8px;
    background: var(--bg-surface);
    color: var(--text-primary);
    font-size: 0.75rem;
    font-weight: 600;
    font-family: inherit;
    padding: 2px 6px;
    cursor: pointer;
    outline: none;
    transition: border-color 0.15s;
}

.col-model-select:hover,
.col-model-select:focus {
    border-color: var(--accent-primary);
}

.col-model-select option {
    background: var(--bg-surface);
    color: var(--text-primary);
}

/* Metrics */
.metrics-bar {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 6px 12px;
    border-bottom: 1px solid var(--border-subtle);
    flex-shrink: 0;
    background: var(--bg-surface);
}

.metric {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 0.75rem;
    color: var(--text-secondary);
    white-space: nowrap;
}

.streaming-indicator {
    color: var(--accent-primary);
}

.spin {
    animation: spin 1.5s linear infinite;
}

@keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
}

.col-body {
    flex: 1;
    overflow-y: auto;
    padding: 12px;
}

.col-empty {
    color: var(--text-placeholder);
    font-size: 0.85rem;
    text-align: center;
    padding-top: 32px;
}

.response-text {
    font-size: 0.85rem;
    line-height: 1.6;
    color: var(--text-primary);
    white-space: pre-wrap;
    word-break: break-word;
}

.error-text {
    color: var(--accent-danger);
    font-size: 0.8rem;
    margin-top: 8px;
}

.cursor-blink {
    animation: blink 0.8s step-end infinite;
    color: var(--accent-primary);
}

@keyframes blink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0; }
}

@media (max-width: 700px) {
    .comparison {
        flex-direction: column;
        overflow-y: auto;
    }

    .comparison-col {
        min-height: 300px;
    }
}
</style>