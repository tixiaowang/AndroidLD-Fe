// import './assets/main.css'

import ElementPlus from 'element-plus'
import { createApp } from 'vue'
import AutoDev from './AutoDev.vue'
import 'element-plus/dist/index.css'
import zhCn from 'element-plus/dist/locale/zh-cn.mjs'

createApp(AutoDev).use(ElementPlus, {locale: zhCn}).mount('#app')
