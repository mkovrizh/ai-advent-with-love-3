export interface ModelInfo {
    id: string,
    displayName: string
}

export interface ChatMessage {
    role: 'user' | 'assistant',
    content: string
}

export interface SendMessageParams {
    model: string,
    messages: ChatMessage[],
    system?: string,
    maxTokens?: number
}

export class AnthropicModelProvider {
    private readonly baseUrl = '/api/anthropic'

    async fetchModels(): Promise<ModelInfo[]> {
        const response = await fetch(`${this.baseUrl}/v1/models?limit=100`)
        if (!response.ok) {
            throw new Error(`Failed to load models: ${response.status}`)
        }
        const data = await response.json()
        return data.data.map((m: {id: string, display_name: string}) => ({id: m.id, displayName: m.display_name}))
    }

    async sendMessageStream(params: SendMessageParams, onDelta: (text: string) => void): Promise<string> {
        const response = await fetch(`${this.baseUrl}/v1/messages`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                model: params.model,
                max_tokens: params.maxTokens ?? 4096,
                system: params.system || undefined,
                messages: params.messages,
                stream: true
            })
        })
        if (!response.ok) {
            const errBody = await response.text()
            throw new Error(`API error ${response.status}: ${errBody}`)
        }
        const reader = response.body!.getReader()
        const decoder = new TextDecoder()
        let buffer = ''
        let fullText = ''
        while (true) {
            const { done, value } = await reader.read()
            if (done) { break }
            buffer += decoder.decode(value, { stream: true })
            const lines = buffer.split('\n')
            buffer = lines.pop() || ''
            for (const line of lines) {
                if (!line.startsWith('data: ')) { continue }
                const jsonStr = line.slice(6).trim()
                if (jsonStr === '[DONE]') { continue }
                try {
                    const event = JSON.parse(jsonStr)
                    if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
                        fullText += event.delta.text
                        onDelta(event.delta.text)
                    }
                } catch {
                    // Skip malformed JSON lines
                }
            }
        }
        return fullText
    }
}