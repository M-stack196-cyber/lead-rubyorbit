import http from 'node:http'
import { createApp } from './app.js'
import { env } from './config/env.js'

const app = createApp()
const server = http.createServer(app)

server.listen(env.port, env.host, () => {
  console.log(`LeadRubyOrbit backend listening at http://${env.host}:${env.port}`)
})
