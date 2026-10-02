import http from 'node:http'
import { fileURLToPath } from 'node:url'
import { createApp } from './app.js'
import { assertProductionEnv, env } from './config/env.js'
import { startAutomationScheduler } from './modules/automation/automation.scheduler.js'
import { setupNotificationRealtime } from './modules/notifications/notifications.realtime.js'

assertProductionEnv()

const app = createApp()

function isMainModule() {
  return process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]
}

function startLocalServer() {
  const server = http.createServer(app)

  setupNotificationRealtime(server)

  server.listen(env.port, env.host, () => {
    console.log(`LeadRubyOrbit backend listening at http://${env.host}:${env.port}`)
    startAutomationScheduler()
  })

  return server
}

if (isMainModule()) {
  startLocalServer()
}

export { app, startLocalServer }
export default app
