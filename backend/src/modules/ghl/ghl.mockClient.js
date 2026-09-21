export function createGhlMockClient({ workflowId } = {}) {
  const mockWorkflowId = workflowId || 'mock_ghl_workflow_default'

  return {
    async createContact({ campaignLeadId }) {
      return {
        contactId: `mock_ghl_contact_${campaignLeadId}`,
      }
    },

    async enrollContactInWorkflow() {
      return {
        workflowId: mockWorkflowId,
        enrolled: true,
      }
    },
  }
}
