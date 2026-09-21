import { createSupabaseServiceClient } from '../../config/supabase.js'

function getSupabaseClient() {
  const supabase = createSupabaseServiceClient()

  if (!supabase) {
    const error = new Error('Supabase service client is not configured.')
    error.statusCode = 500
    throw error
  }

  return supabase
}

export async function listImportedLeads() {
  const supabase = getSupabaseClient()

  const { data, error: leadsError } = await supabase
    .from('leads')
    .select(
      'id, name, email, phone, company, website, linkedin_url, location, source, status, created_at',
    )
    .eq('status', 'imported')
    .order('created_at', { ascending: false })

  if (leadsError) {
    const error = new Error(leadsError.message)
    error.statusCode = 500
    throw error
  }

  return data || []
}
