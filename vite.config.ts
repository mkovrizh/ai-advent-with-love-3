import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { quasar, transformAssetUrls } from '@quasar/vite-plugin'
import path from 'path'

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '')

    return {
        plugins: [
            vue({
                template: {transformAssetUrls}
            }),
            quasar({
                sassVariables: 'src/styles/quasar-variables.scss'
            })
        ],
        resolve: {
            alias: {
                '@': path.resolve(__dirname, './src'),
                '@config': path.resolve(__dirname, './config')
            },
            extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json', '.vue']
        },
        server: {
            host: '0.0.0.0',
            port: 8001,
            proxy: {
                '/api/anthropic': {
                    target: 'https://api.anthropic.com',
                    changeOrigin: true,
                    rewrite: (path) => path.replace(/^\/api\/anthropic/, ''),
                    configure: (proxy) => {
                        proxy.on('proxyReq', proxyReq => {
                            proxyReq.setHeader('x-api-key', env.ANTHROPIC_API_KEY || '')
                            proxyReq.setHeader('anthropic-version', '2023-06-01')
                            proxyReq.setHeader('anthropic-dangerous-direct-browser-access', 'true')
                        })
                    }
                }
            }
        },
        build: {
            rollupOptions: {
                output: {
                    manualChunks: undefined
                }
            }
        }
    }
})