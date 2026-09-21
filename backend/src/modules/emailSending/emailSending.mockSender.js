import { randomUUID } from 'crypto'

export async function sendMockEmail({ campaignLeadId, leadId }) {
  return {
    messageId: `mock_msg_${randomUUID()}`,
    threadId: `mock_thread_${campaignLeadId || leadId}`,
    sentAt: new Date().toISOString(),
  }
}
