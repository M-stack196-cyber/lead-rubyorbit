import { env } from '../../config/env.js'
import { runBackgroundAutomationCycle } from './automation.service.js'

let automationTimer = null

async function safelyRunAutomation(trigger) {
  try {
    await runBackgroundAutomationCycle({ trigger })
  } catch (error) {
    console.warn('Background automation cycle failed:', error.message)
  }
}

export function startAutomationScheduler() {
  if (!env.automation.enabled || automationTimer) {
    return null
  }

  automationTimer = setInterval(() => {
    safelyRunAutomation('scheduler')
  }, env.automation.intervalMs)

  automationTimer.unref?.()

  if (env.automation.runOnStart) {
    safelyRunAutomation('startup')
  }

  console.log(
    `Background automation scheduler enabled. Interval: ${env.automation.intervalMs}ms.`,
  )

  return automationTimer
}

export function stopAutomationScheduler() {
  if (!automationTimer) return

  clearInterval(automationTimer)
  automationTimer = null
}
