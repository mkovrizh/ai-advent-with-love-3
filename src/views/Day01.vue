<template>
    <q-page class="chat-page">
        <!-- System Prompt Dialog -->
        <q-dialog v-model="showSettings">
            <div class="settings-card">
                <div class="settings-header">
                    <span class="settings-title">System Prompt</span>
                    <button class="icon-btn" @click="showSettings = false">
                        <q-icon name="close" size="20px" />
                    </button>
                </div>
                <textarea
                    v-model="systemPrompt"
                    class="system-prompt-textarea"
                    placeholder="You are a helpful assistant..."
                    rows="8"
                />
                <div class="settings-footer">
                    <button class="btn-save" @click="showSettings = false">Save</button>
                </div>
            </div>
        </q-dialog>

        <!-- Header -->
        <header class="chat-header">
            <button class="icon-btn" @click="$router.push('/')" title="Home">
                <q-icon name="arrow_back" size="20px" />
            </button>
            <div class="header-model">
                <span class="model-name">Claude</span>
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
            <button class="icon-btn" @click="showSettings = true" title="System Prompt">
                <q-icon name="tune" size="20px" />
            </button>
        </header>

        <!-- Messages area -->
        <div class="chat-messages" ref="messagesRef">
            <!-- Empty state -->
            <div v-if="messages.length === 0 && !isStreaming" class="empty-state">
                <div class="empty-icon">
                    <q-icon name="chat_bubble_outline" size="52px" />
                </div>
                <h2 class="empty-title">How can I help you today?</h2>
            </div>

            <!-- Messages -->
            <div class="messages-list">
                <div
                    v-for="(msg, index) in messages"
                    :key="index"
                    class="message-row"
                    :class="'message-' + msg.role"
                >
                    <div class="message-inner">
                        <div v-if="msg.role === 'assistant'" class="avatar avatar-claude">
                            <q-icon name="smart_toy" size="18px" />
                        </div>
                        <div v-else class="avatar avatar-user">
                            <q-icon name="person" size="16px" />
                        </div>
                        <div class="message-content">
                            <span class="message-role">{{ msg.role === 'user' ? 'You' : 'Claude' }}</span>
                            <div class="message-text">{{ msg.content }}</div>
                        </div>
                    </div>
                </div>

                <!-- Streaming message -->
                <div v-if="isStreaming" class="message-row message-assistant">
                    <div class="message-inner">
                        <div class="avatar avatar-claude">
                            <q-icon name="smart_toy" size="18px" />
                        </div>
                        <div class="message-content">
                            <span class="message-role">Claude</span>
                            <div class="message-text">
                                {{ streamingText }}<span v-if="streamingText" class="cursor-blink">▎</span>
                                <span v-if="!streamingText" class="typing-dots">
                                    <span>.</span><span>.</span><span>.</span>
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Error message -->
                <div v-if="errorMessage" class="error-banner">
                    <q-icon name="error_outline" size="18px" />
                    <span>{{ errorMessage }}</span>
                    <button class="icon-btn" @click="errorMessage = ''">
                        <q-icon name="close" size="16px" />
                    </button>
                </div>
            </div>
        </div>

        <!-- Input area -->
        <div class="chat-input-container">
            <div class="chat-input-box">
                <textarea
                    ref="inputRef"
                    v-model="userInput"
                    @keydown="handleKeydown"
                    @input="autoResize"
                    placeholder="Message Claude..."
                    class="chat-textarea"
                    rows="1"
                    :disabled="isStreaming"
                />
                <button
                    class="send-btn"
                    :class="{ active: canSend }"
                    :disabled="!canSend"
                    @click="sendMessage"
                    title="Send message"
                >
                    <q-icon name="arrow_upward" size="18px" />
                </button>
            </div>
        </div>
    </q-page>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, watch, onMounted } from 'vue'
import { AnthropicModelProvider, type ModelInfo, type ChatMessage } from '@/services/ModelProvider'

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
        const msg = err instanceof Error ? err.message : String(err)
        modelsError.value = msg
    }
    finally {
        modelsLoading.value = false
    }
}

onMounted(loadModels)
const messages = ref<ChatMessage[]>([])
const userInput = ref('')
const systemPrompt = ref('You are a helpful, friendly assistant.')
const isStreaming = ref(false)
const streamingText = ref('')
const errorMessage = ref('')
const showSettings = ref(false)

const messagesRef = ref<HTMLElement | null>(null)
const inputRef = ref<HTMLTextAreaElement | null>(null)

const canSend = computed(() => userInput.value.trim().length > 0 && !isStreaming.value)

function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        sendMessage()
    }
}

function autoResize(): void {
    const el = inputRef.value
    if (!el) { return }
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 200) + 'px'
}

function scrollToBottom(): void {
    nextTick(() => {
        const el = messagesRef.value
        if (el) { el.scrollTop = el.scrollHeight }
    })
}

async function sendMessage(): Promise<void> {
    const text = userInput.value.trim()
    if (!text || isStreaming.value) { return }
    errorMessage.value = ''
    messages.value.push({ role: 'user', content: text })
    userInput.value = ''
    // Reset textarea height
    nextTick(() => {
        if (inputRef.value) inputRef.value.style.height = 'auto'
    })
    scrollToBottom()
    isStreaming.value = true
    streamingText.value = ''
    try {
        const fullText = await modelProvider.sendMessageStream(
            {
                model: selectedModel.value,
                messages: messages.value,
                system: systemPrompt.value
            },
            (delta) => {
                streamingText.value += delta
                scrollToBottom()
            }
        )
        if (fullText) {
            messages.value.push({ role: 'assistant', content: fullText })
        }
    }
    catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        errorMessage.value = msg
    }
    finally {
        isStreaming.value = false
        streamingText.value = ''
        scrollToBottom()
    }
}

// Auto-scroll when messages change
watch(() => messages.value.length, scrollToBottom)

</script>

<style scoped>
.chat-page {
    display: flex;
    flex-direction: column;
    height: 100vh;
    max-height: 100vh;
    background: var(--bg-page);
    overflow: hidden;
}

/* Header */
.chat-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    border-bottom: 1px solid var(--border-subtle);
    flex-shrink: 0;
}

.header-model {
    display: flex;
    align-items: center;
    gap: 8px;
}

.model-name {
    font-size: 1rem;
    font-weight: 600;
    color: var(--text-primary);
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

.models-error {
    display: flex;
    align-items: center;
    color: var(--accent-danger);
    cursor: help;
}

.model-select:hover {
    border-color: var(--accent-primary);
}

.model-select:focus {
    border-color: var(--accent-primary);
}

.model-select option {
    background: var(--bg-surface);
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

/* Messages area */
.chat-messages {
    flex: 1;
    overflow-y: auto;
    padding: 24px 16px;
}

.messages-list {
    max-width: 768px;
    margin: 0 auto;
}

/* Empty state */
.empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    gap: 16px;
}

.empty-icon {
    opacity: 0.8;
}

.empty-title {
    font-size: 1.5rem;
    font-weight: 500;
    color: var(--text-secondary);
    margin: 0;
}

/* Messages */
.message-row {
    margin-bottom: 24px;
}

.message-inner {
    display: flex;
    gap: 12px;
    align-items: flex-start;
}

.avatar {
    flex-shrink: 0;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-top: 2px;
}

.avatar-claude {
    background: transparent;
}

.avatar-user {
    background: var(--bg-surface);
    color: var(--text-secondary);
}

.message-content {
    flex: 1;
    min-width: 0;
}

.message-role {
    display: block;
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--text-secondary);
    margin-bottom: 4px;
    letter-spacing: 0.03em;
}

.message-text {
    font-size: 0.95rem;
    line-height: 1.65;
    color: var(--text-primary);
    white-space: pre-wrap;
    word-break: break-word;
}

.message-user .message-text {
    background: var(--bg-user-message);
    padding: 12px 16px;
    border-radius: var(--radius-md);
    border-top-left-radius: 4px;
}

/* Streaming indicators */
.cursor-blink {
    animation: blink 0.8s step-end infinite;
    color: var(--accent-primary);
}

@keyframes blink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0; }
}

.typing-dots span {
    animation: dot-bounce 1.4s infinite ease-in-out;
    font-size: 1.5rem;
    color: var(--text-secondary);
}

.typing-dots span:nth-child(1) { animation-delay: 0s; }
.typing-dots span:nth-child(2) { animation-delay: 0.2s; }
.typing-dots span:nth-child(3) { animation-delay: 0.4s; }

@keyframes dot-bounce {
    0%, 80%, 100% { opacity: 0.3; }
    40% { opacity: 1; }
}

/* Error banner */
.error-banner {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 16px;
    background: rgba(248, 113, 113, 0.1);
    border: 1px solid rgba(248, 113, 113, 0.3);
    border-radius: var(--radius-sm);
    color: var(--accent-danger);
    font-size: 0.875rem;
    margin-top: 12px;
}

.error-banner .icon-btn {
    width: 24px;
    height: 24px;
    margin-left: auto;
    color: var(--accent-danger);
}

/* Input area */
.chat-input-container {
    flex-shrink: 0;
    padding: 16px;
    padding-top: 8px;
}

.chat-input-box {
    max-width: 768px;
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

.chat-input-box:focus-within {
    border-color: var(--accent-primary);
}

.chat-textarea {
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
    max-height: 200px;
}

.chat-textarea::placeholder {
    color: var(--text-placeholder);
}

.chat-textarea:disabled {
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

/* Settings dialog */
.settings-card {
    background: var(--bg-surface);
    border-radius: var(--radius-md);
    padding: 24px;
    width: 520px;
    max-width: 90vw;
}

.settings-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
}

.settings-title {
    font-size: 1.1rem;
    font-weight: 600;
    color: var(--text-primary);
}

.system-prompt-textarea {
    width: 100%;
    border: 1px solid var(--border-input);
    border-radius: var(--radius-sm);
    background: var(--bg-input);
    color: var(--text-primary);
    font-family: inherit;
    font-size: 0.9rem;
    line-height: 1.5;
    padding: 12px;
    resize: vertical;
    outline: none;
    transition: border-color 0.2s;
}

.system-prompt-textarea::placeholder {
    color: var(--text-placeholder);
}

.system-prompt-textarea:focus {
    border-color: var(--accent-primary);
}

.settings-footer {
    display: flex;
    justify-content: flex-end;
    margin-top: 16px;
}

.btn-save {
    padding: 8px 24px;
    border: none;
    border-radius: var(--radius-sm);
    background: var(--accent-primary);
    color: #1A1915;
    font-weight: 600;
    font-size: 0.9rem;
    cursor: pointer;
    transition: background 0.15s;
}

.btn-save:hover {
    background: var(--accent-hover);
}
</style>