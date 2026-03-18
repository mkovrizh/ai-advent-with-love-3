<template>
    <q-page class="day02-page">
        <!-- Header -->
        <header class="page-header">
            <button class="icon-btn" @click="$router.push('/')" title="Home">
                <q-icon name="arrow_back" size="20px" />
            </button>
            <span class="page-title">Day 02: Response Format</span>
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

        <!-- Constraints panel -->
        <div class="constraints-panel">
            <div class="constraint-row constraint-row-vertical">
                <label class="constraint-label">Response format instruction:</label>
                <input
                    v-model="formatInstruction"
                    class="constraint-input"
                    placeholder="e.g. Respond in JSON with keys: title, summary, tags"
                    :disabled="isStreaming"
                />
            </div>
            <div class="constraint-row">
                <label class="constraint-label">Max tokens:</label>
                <input
                    v-model.number="maxTokens"
                    type="number" min="1" max="4096" class="constraint-input constraint-input-short" style="margin-right:24px !important;"
                    :disabled="isStreaming"
                />
            </div>
            <div class="constraint-row">
                <label class="constraint-label">Temperature:</label>
                <input
                    v-model.number="temperature"
                    type="number" min="0" max="1" step="0.1" class="constraint-input constraint-input-short"
                    :disabled="isStreaming"
                />
            </div>
            <div class="constraint-row">
                <label class="constraint-label">Top P:</label>
                <input
                    v-model.number="topP"
                    type="number" min="0" max="1" step="0.1" class="constraint-input constraint-input-short"
                    :disabled="isStreaming"
                />
            </div>
            <div class="constraint-row">
                <label class="constraint-label">Top K:</label>
                <input
                    v-model.number="topK"
                    type="number" min="0" step="1" class="constraint-input constraint-input-short"
                    :disabled="isStreaming"
                />
            </div>
            <div class="constraint-row">
                <label class="constraint-label">Stop sequences (comma-separated):</label>
                <input
                    v-model="stopSequencesInput"
                    class="constraint-input"
                    placeholder='e.g. END, ###, DONE'
                    :disabled="isStreaming"
                />
            </div>
        </div>

        <!-- Prompt input -->
        <div class="prompt-section">
            <div class="prompt-box">
                <textarea
                    ref="inputRef"
                    v-model="userPrompt"
                    @keydown="handleKeydown"
                    @input="autoResize()"
                    placeholder="Enter a prompt to compare responses..."
                    class="prompt-textarea"
                    rows="2"
                    :disabled="isStreaming"
                />
                <button
                    class="send-btn"
                    :class="{active: canSend}"
                    :disabled="!canSend"
                    @click="sendBoth()"
                    title="Send to both"
                >
                    <q-icon name="arrow_upward" size="18px" />
                </button>
            </div>
        </div>

        <!-- Comparison columns -->
        <div class="comparison">
            <div class="comparison-col">
                <div class="col-header">
                    <q-icon name="lock_open" size="18px" />
                    <span>Without constraints</span>
                    <span v-if="freeOutputTokens > 0" class="token-count">{{ freeOutputTokens }} output tokens</span>
                </div>
                <div class="col-body">
                    <div v-if="!freeResponse && !freeStreaming" class="col-empty">
                        Response will appear here
                    </div>
                    <div v-if="freeStreaming" class="response-text">
                        {{ freeStreamingText }}<span class="cursor-blink">▎</span>
                    </div>
                    <div v-if="freeResponse && !freeStreaming" class="response-text">{{ freeResponse }}</div>
                    <div v-if="freeError" class="error-text">{{ freeError }}</div>
                </div>
            </div>
            <div class="comparison-col">
                <div class="col-header">
                    <q-icon name="tune" size="18px" />
                    <span>With constraints</span>
                    <span v-if="constrainedOutputTokens > 0" class="token-count">{{ constrainedOutputTokens }} output tokens</span>
                </div>
                <div class="col-body">
                    <div v-if="!constrainedResponse && !constrainedStreaming" class="col-empty">
                        Response will appear here
                    </div>
                    <div v-if="constrainedStreaming" class="response-text">
                        {{ constrainedStreamingText }}<span class="cursor-blink">▎</span>
                    </div>
                    <div v-if="constrainedResponse && !constrainedStreaming" class="response-text">{{ constrainedResponse }}</div>
                    <div v-if="constrainedError" class="error-text">{{ constrainedError }}</div>
                </div>
            </div>
        </div>
    </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
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

const userPrompt = ref('')
const formatInstruction = ref('')
const maxTokens = ref(50)
const temperature = ref(1)
const topP = ref(0)
const topK = ref(0)
const stopSequencesInput = ref('')

const freeResponse = ref('')
const freeStreamingText = ref('')
const freeStreaming = ref(false)
const freeError = ref('')
const freeOutputTokens = ref(0)

const constrainedResponse = ref('')
const constrainedStreamingText = ref('')
const constrainedStreaming = ref(false)
const constrainedError = ref('')
const constrainedOutputTokens = ref(0)

const inputRef = ref<HTMLTextAreaElement | null>(null)

const isStreaming = computed(() => freeStreaming.value || constrainedStreaming.value)
const canSend = computed(() => userPrompt.value.trim().length > 0 && !isStreaming.value)

function handleKeydown(e: KeyboardEvent): void {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        sendBoth()
    }
}

function autoResize(): void {
    const el = inputRef.value
    if (!el) { return }
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 150) + 'px'
}

function parsedStopSequences(): string[] {
    return stopSequencesInput.value
        .split(',')
        .map(s => s.trim())
        .filter(s => s.length > 0)
}

async function sendFree(text: string): Promise<void> {
    freeResponse.value = ''
    freeStreamingText.value = ''
    freeStreaming.value = true
    freeError.value = ''
    freeOutputTokens.value = 0
    try {
        const result = await modelProvider.sendMessageStream(
            {
                model: selectedModel.value,
                messages: [{role: 'user', content: text}],
                maxTokens: 4096
            },
            (delta) => { freeStreamingText.value += delta }
        )
        freeResponse.value = result.text
        freeOutputTokens.value = result.outputTokens
    }
    catch (err: unknown) {
        freeError.value = err instanceof Error ? err.message : String(err)
    }
    finally {
        freeStreaming.value = false
        freeStreamingText.value = ''
    }
}

async function sendConstrained(text: string): Promise<void> {
    constrainedResponse.value = ''
    constrainedStreamingText.value = ''
    constrainedStreaming.value = true
    constrainedError.value = ''
    constrainedOutputTokens.value = 0
    const systemParts: string[] = []
    if (formatInstruction.value.trim()) {
        systemParts.push(`Response format: ${formatInstruction.value.trim()}`)
    }
    if (maxTokens.value < 4096) {
        systemParts.push(`Учти, что длина твоего ответа не должна превышать ${maxTokens.value} токенов.`)
    }
    const stops = parsedStopSequences()
    if (stops.length > 0) {
        systemParts.push(`Когда закончишь с ответом, добавь в конце выражение: ${stops[0]}`)
    }
    try {
        const result = await modelProvider.sendMessageStream(
            {
                model: selectedModel.value,
                messages: [{ role: 'user', content: text }],
                system: systemParts.join('\n'),
                maxTokens: maxTokens.value,
                stopSequences: stops.length > 0 ? stops : undefined,
                temperature: temperature.value || undefined,
                topP: topP.value || undefined,
                topK: topK.value || undefined
            },
            (delta) => { constrainedStreamingText.value += delta }
        )
        constrainedResponse.value = result.text
        constrainedOutputTokens.value = result.outputTokens
    }
    catch (err: unknown) {
        constrainedError.value = err instanceof Error ? err.message : String(err)
    }
    finally {
        constrainedStreaming.value = false
        constrainedStreamingText.value = ''
    }
}

async function sendBoth(): Promise<void> {
    const text = userPrompt.value.trim()
    if (!text || isStreaming.value) { return }
    sendFree(text)
    sendConstrained(text)
}
</script>

<style scoped>
.day02-page {
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
    padding: 8px 16px 8px 16px;
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

/* Constraints */
.constraints-panel {
    flex-shrink: 0;
    max-width: 900px;
    margin: 8px auto 0;
    width: calc(100% - 32px);
    padding: 12px 16px;
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-md);
    background: var(--bg-surface);
}

.constraint-row {
    display: flex;
    align-items: center;
    gap: 8px;
}

.constraint-row-vertical {
    flex-direction: column;
    align-items: stretch;
    width: 100%;
}

.constraint-label {
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--text-secondary);
    white-space: nowrap;
}

.constraint-input {
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-sm);
    background: var(--bg-surface);
    color: var(--text-primary);
    font-size: 0.8rem;
    font-family: inherit;
    padding: 4px 8px;
    outline: none;
    transition: border-color 0.15s;
    flex: 1;
    min-width: 120px;
}

.constraint-input:focus {
    border-color: var(--accent-primary);
}

.constraint-input:disabled {
    opacity: 0.5;
}

.constraint-input-short {
    min-width: 80px;
    max-width: 80px;
    flex: none;
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
}

.col-header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 16px;
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--text-secondary);
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

.col-body {
    flex: 1;
    overflow-y: auto;
    padding: 16px;
}

.col-empty {
    color: var(--text-placeholder);
    font-size: 0.9rem;
    text-align: center;
    padding-top: 32px;
}

.response-text {
    font-size: 0.9rem;
    line-height: 1.65;
    color: var(--text-primary);
    white-space: pre-wrap;
    word-break: break-word;
}

.error-text {
    color: var(--accent-danger);
    font-size: 0.85rem;
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

@media (max-width: 640px) {
    .comparison {
        flex-direction: column;
    }

    .constraints-panel {
        flex-direction: column;
    }
}
</style>
