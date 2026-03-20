<template>
    <q-page class="day03-page">
        <!-- Header -->
        <header class="page-header">
            <button class="icon-btn" @click="$router.push('/')" title="Home">
                <q-icon name="arrow_back" size="20px" />
            </button>
            <span class="page-title">Day 03: Reasoning Strategies</span>
            <div class="header-model">
                <select v-model="selectedModel" class="model-select" :disabled="modelsLoading">
                    <option v-if="modelsLoading" value="" disabled>Loading...</option>
                    <option
                        v-for="m in availableModels"
                        :key="m.id"
                        :value="m.id"
                    >{{ m.displayName }}</option>
                </select>
                <span v-if="modelsError" class="models-error" :title="modelsError">
                    <q-icon name="error_outline" size="16px" />
                </span>
            </div>
        </header>

        <!-- Prompt input -->
        <div class="prompt-section">
            <div class="prompt-box">
                <textarea
                    ref="inputRef"
                    v-model="userPrompt"
                    @keydown="handleKeydown"
                    @input="autoResize()"
                    placeholder="Enter a logic, algorithmic or analytical task..."
                    class="prompt-textarea"
                    rows="2"
                    :disabled="isStreaming"
                />
                <button
                    class="send-btn"
                    :class="{ active: canSend }"
                    :disabled="!canSend"
                    @click="sendAll()"
                    title="Send to all"
                >
                    <q-icon name="arrow_upward" size="18px" />
                </button>
            </div>
        </div>

        <!-- 4 comparison columns -->
        <div class="comparison">
            <div
                v-for="(col, index) in columns"
                :key="index"
                class="comparison-col"
            >
                <div class="col-header">
                    <q-icon :name="col.icon" size="18px" />
                    <span>{{ col.title }}</span>
                    <span v-if="col.streaming" class="token-count streaming-indicator">
                        <q-icon name="pending" size="14px" class="spin" /> generating...
                    </span>
                    <span v-else-if="col.outputTokens > 0" class="token-count">{{ col.outputTokens }} output tokens</span>
                </div>
                <div class="col-subheader">{{ col.description }}</div>
                <div class="col-body">
                    <div v-if="!col.response && !col.streaming" class="col-empty">
                        Response will appear here
                    </div>
                    <div v-if="col.streaming" class="response-text">
                        {{ col.streamingText }}<span class="cursor-blink">▎</span>
                    </div>
                    <div v-if="col.response && !col.streaming" class="response-text">{{ col.response }}</div>
                    <div v-if="col.error" class="error-text">{{ col.error }}</div>
                </div>
            </div>
        </div>
    </q-page>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { AnthropicModelProvider, type ModelInfo } from '@/services/ModelProvider'

const modelProvider = new AnthropicModelProvider()
const availableModels = ref<ModelInfo[]>([])
const selectedModel = ref('')
const modelsLoading = ref(false)
const modelsError = ref('')

async function loadModels(): Promise<void> {
    modelsLoading.value = true
    try {
        availableModels.value = await modelProvider.fetchModels()
        if (availableModels.value.length > 0) { selectedModel.value = availableModels.value[0]!.id }
    }
    catch (err: unknown) {
        modelsError.value = err instanceof Error ? err.message : String(err)
    }
    finally {
        modelsLoading.value = false
    }
}

onMounted(loadModels)

interface ColumnState {
    title: string,
    description: string,
    icon: string,
    response: string,
    streamingText: string,
    streaming: boolean,
    error: string,
    outputTokens: number
}

const columns = reactive<ColumnState[]>([
    {
        title: 'Direct',
        description: 'Никаких дополнительных инструкций',
        icon: 'bolt',
        response: '', streamingText: '', streaming: false, error: '', outputTokens: 0
    },
    {
        title: 'Step-by-step',
        description: 'Опиши решение шаг за шагом',
        icon: 'format_list_numbered',
        response: '', streamingText: '', streaming: false, error: '', outputTokens: 0
    },
    {
        title: 'Meta-prompt',
        description: 'Модель готовит промпт и потом его выполняет',
        icon: 'auto_fix_high',
        response: '', streamingText: '', streaming: false, error: '', outputTokens: 0
    },
    {
        title: 'Expert panel',
        description: 'Аналитик + Инженер + Критик',
        icon: 'groups',
        response: '', streamingText: '', streaming: false, error: '', outputTokens: 0
    }
])

const userPrompt = ref('')
const inputRef = ref<HTMLTextAreaElement | null>(null)

const isStreaming = computed(() => columns.some(c => c.streaming))
const canSend = computed(() => userPrompt.value.trim().length > 0 && !isStreaming.value)

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

function resetColumn(col: ColumnState): void {
    col.response = ''
    col.streamingText = ''
    col.streaming = true
    col.error = ''
    col.outputTokens = 0
}

async function sendDirect(text: string): Promise<void> {
    const col = columns[0]!
    resetColumn(col)
    try {
        const result = await modelProvider.sendMessageStream(
            {model: selectedModel.value, messages: [{role: 'user', content: text}]},
            (delta) => { col.streamingText += delta }
        )
        col.response = result.text
        col.outputTokens = result.outputTokens
    }
    catch (err: unknown) {
        col.error = err instanceof Error ? err.message : String(err)
    }
    finally {
        col.streaming = false
        col.streamingText = ''
    }
}

async function sendStepByStep(text: string): Promise<void> {
    const col = columns[1]!
    resetColumn(col)
    try {
        const result = await modelProvider.sendMessageStream(
            {
                model: selectedModel.value,
                messages: [{role: 'user', content: text}],
                system: 'Solve the given task step by step. Show your reasoning at each step before giving the final answer.'
            },
            (delta) => { col.streamingText += delta }
        )
        col.response = result.text
        col.outputTokens = result.outputTokens
    }
    catch (err: unknown) {
        col.error = err instanceof Error ? err.message : String(err)
    }
    finally {
        col.streaming = false
        col.streamingText = ''
    }
}

async function sendMetaPrompt(text: string): Promise<void> {
    const col = columns[2]!
    resetColumn(col)
    try {
        // Step 1: ask model to create an optimal prompt
        const metaResult = await modelProvider.sendMessageStream(
            {
                model: selectedModel.value,
                messages: [{role: 'user', content: `I need to solve the following task. Write an optimal, detailed prompt that will help an AI solve it most accurately. Return ONLY the prompt text, nothing else.\n\nTask: ${text}`}]
            },
            () => {}
        )
        const generatedPrompt = metaResult.text

        col.streamingText = `[СГЕНЕРИРОВАННЫЙ ПРОМПТ]:\n${generatedPrompt}\n\n=======\n[РЕШЕНИЕ]:\n`

        // Step 2: solve using the generated prompt
        const result = await modelProvider.sendMessageStream(
            {
                model: selectedModel.value,
                messages: [{role: 'user', content: generatedPrompt}]
            },
            (delta) => { col.streamingText += delta }
        )
        col.response = `[СГЕНЕРИРОВАННЫЙ ПРОМПТ]:\n${generatedPrompt}\n\n=======\n[РЕШЕНИЕ]:\n${result.text}`
        col.outputTokens = metaResult.outputTokens + result.outputTokens
    }
    catch (err: unknown) {
        col.error = err instanceof Error ? err.message : String(err)
    }
    finally {
        col.streaming = false
        col.streamingText = ''
    }
}

async function sendExpertPanel(text: string): Promise<void> {
    const col = columns[3]!
    resetColumn(col)
    const system = `You are a panel of three experts working together to solve the given task.

Expert 1 — Analyst: Breaks down the problem, identifies key data, constraints and edge cases.
Expert 2 — Engineer: Proposes a concrete solution approach, performs calculations or builds logic.
Expert 3 — Critic: Reviews the proposed solution, finds flaws, and suggests improvements.

Format your response as a discussion between the three experts, then provide a final consensus answer.`

    try {
        const result = await modelProvider.sendMessageStream(
            {
                model: selectedModel.value,
                messages: [{role: 'user', content: text}],
                system
            },
            (delta) => { col.streamingText += delta }
        )
        col.response = result.text
        col.outputTokens = result.outputTokens
    }
    catch (err: unknown) {
        col.error = err instanceof Error ? err.message : String(err)
    }
    finally {
        col.streaming = false
        col.streamingText = ''
    }
}

async function sendAll(): Promise<void> {
    const text = userPrompt.value.trim()
    if (!text || isStreaming.value) { return }
    sendDirect(text)
    sendStepByStep(text)
    sendMetaPrompt(text)
    sendExpertPanel(text)
}
</script>

<style scoped>
.day03-page {
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

.header-model {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-left: auto;
}

.model-select {
    border: 1px solid var(--border-subtle);
    border-radius: 12px;
    background: var(--bg-surface);
    color: var(--text-primary);
    font-size: 0.8rem;
    font-weight: 600;
    font-family: inherit;
    padding: 3px 10px;
    cursor: pointer;
    outline: none;
    transition: border-color 0.15s;
}

.model-select:hover,
.model-select:focus {
    border-color: var(--accent-primary);
}

.model-select option {
    background: var(--bg-surface);
    color: var(--text-primary);
}

.models-error {
    display: flex;
    align-items: center;
    color: var(--accent-danger);
    cursor: help;
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
    padding: 10px 12px 0;
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--text-secondary);
    flex-shrink: 0;
}

.col-subheader {
    padding: 2px 12px 8px;
    font-size: 0.7rem;
    color: var(--text-placeholder);
    border-bottom: 1px solid var(--border-subtle);
    flex-shrink: 0;
}

.token-count {
    margin-left: auto;
    font-size: 0.75rem;
    font-weight: 400;
    color: var(--text-placeholder);
    white-space: nowrap;
}

.streaming-indicator {
    display: flex;
    align-items: center;
    gap: 4px;
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

@media (max-width: 900px) {
    .comparison {
        display: grid;
        grid-template-columns: 1fr 1fr;
        grid-template-rows: minmax(0, 1fr) minmax(0, 1fr);
    }
}

@media (max-width: 500px) {
    .comparison {
        grid-template-columns: 1fr;
        grid-template-rows: none;
        overflow-y: auto;
    }

    .comparison-col {
        min-height: 300px;
    }
}
</style>