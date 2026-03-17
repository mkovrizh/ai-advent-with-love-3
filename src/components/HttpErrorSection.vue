<template>
    <q-expansion-item
        class="http-error-section"
        icon="error_outline"
        :label="httpErrorInstance.message"
        header-class="http-error-header"
    >
        <q-card class="http-error-card">
            <q-card-section>
                <div class="error-details">
                    <div class="error-row" v-if="httpErrorInstance.systemName">
                        <span class="error-label">System:</span>
                        <span class="error-value">{{ httpErrorInstance.systemName }}</span>
                    </div>
                    <div class="error-row" v-if="httpErrorInstance.method">
                        <span class="error-label">Method:</span>
                        <span class="error-value">{{ httpErrorInstance.method }}</span>
                    </div>
                    <div class="error-row" v-if="httpErrorInstance.URL">
                        <span class="error-label">URL:</span>
                        <span class="error-value">{{ httpErrorInstance.URL }}</span>
                    </div>
                    <div class="error-row" v-if="httpErrorInstance.body">
                        <span class="error-label">Request Body:</span>
                        <span class="error-value">{{ httpErrorInstance.body }}</span>
                    </div>
                    <div class="error-row" v-if="httpErrorInstance.statusCode">
                        <span class="error-label">Status Code:</span>
                        <span class="error-value">{{ httpErrorInstance.statusCode }}</span>
                    </div>
                    <div class="error-row" v-if="httpErrorInstance.messageExt">
                        <span class="error-label">Details:</span>
                        <span class="error-value">{{ httpErrorInstance.messageExt }}</span>
                    </div>
                    <div class="error-row" v-if="httpErrorInstance.serverResponse">
                        <span class="error-label">Server Response:</span>
                        <span class="error-value">{{ truncatedResponse }}</span>
                    </div>
                </div>
                <q-btn
                    flat
                    dense
                    size="sm"
                    icon="content_copy"
                    label="Copy"
                    class="copy-btn"
                    @click="copyToClipboard"
                />
            </q-card-section>
        </q-card>
    </q-expansion-item>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { HttpError } from '@/utils/HttpError'

const props = defineProps<{
    httpErrorInstance: HttpError
}>()

const truncatedResponse = computed(() => {
    const resp = String(props.httpErrorInstance.serverResponse ?? '')
    return resp.length > 300 ? resp.substring(0, 300) + '...' : resp
})

function copyToClipboard() {
    const err = props.httpErrorInstance
    const text = [
        `System: ${err.systemName}`,
        `Method: ${err.method}`,
        `URL: ${err.URL}`,
        `Body: ${err.body}`,
        `Status: ${err.statusCode}`,
        `Message: ${err.message}`,
        `Details: ${err.messageExt}`,
        `Response: ${err.serverResponse}`
    ].join('\n')
    navigator.clipboard.writeText(text)
}
</script>

<style scoped>
.http-error-section {
    border-radius: 8px;
    overflow: hidden;
}

.http-error-header {
    color: var(--accent-warning);
}

.http-error-card {
    background: var(--bg-surface) !important;
}

.error-details {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.error-row {
    display: flex;
    gap: 8px;
}

.error-label {
    font-weight: 600;
    color: var(--text-secondary);
    min-width: 120px;
    flex-shrink: 0;
}

.error-value {
    color: var(--text-primary);
    word-break: break-all;
}

.copy-btn {
    margin-top: 12px;
    color: var(--text-secondary);
}
</style>
