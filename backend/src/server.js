import http from 'node:http'
import { createApp } from './app.js'
import { env } from './config/env.js'
import { startAutomationScheduler } from './modules/automation/automation.scheduler.js'
import { setupNotificationRealtime } from './modules/notifications/notifications.realtime.js'

const app = createApp()
const server = http.createServer(app)

setupNotificationRealtime(server)

server.listen(env.port, env.host, () => {
  console.log(`LeadRubyOrbit backend listening at http://${env.host}:${env.port}`)
  startAutomationScheduler()
})
