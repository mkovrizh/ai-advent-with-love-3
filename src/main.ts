import { createApp } from 'vue'
import { Quasar } from 'quasar'
import router from './router'
import App from './App.vue'

// Quasar styles
import '@quasar/extras/material-icons/material-icons.css'
import 'quasar/dist/quasar.css'
import './styles/main.css'

const app = createApp(App)

app.use(Quasar, {
    plugins: {}
})

app.use(router)
app.mount('#app')
