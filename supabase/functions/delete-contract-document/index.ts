// Supabase Edge Function for deleting contract documents
// Deploy: supabase functions deploy delete-contract-document
//
// This function:
// 1. Verifies the calling user belongs to the same org as the document
// 2. Soft deletes the database record (sets deleted_at)
// 3. Hard deletes the file from Supabase Storage using service role

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface DeleteRequest {
  document_id: string
}

interface DeleteResponse {
  success: boolean
  message?: string
  error?: string
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Only accept POST requests
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ success: false, error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables')
    }

    // Parse request body
    const body: DeleteRequest = await req.json()
    const { document_id } = body

    if (!document_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'document_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get the authorization header from the request
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Authorization header required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create client with user's JWT to verify they have access
    const supabaseUser = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: authHeader } }
    })

    // Get the current user
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser()
    if (userError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create service role client for privileged operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    // Get the user's organization and role
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ success: false, error: 'User profile not found' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if user has permission to delete (admin or collaborator)
    if (!['admin', 'collaborator'].includes(profile.role)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Insufficient permissions. Admin or collaborator role required.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get the document to verify ownership and get storage_path
    const { data: document, error: docError } = await supabaseAdmin
      .from('contract_documents')
      .select('id, org_id, storage_path, deleted_at')
      .eq('id', document_id)
      .single()

    if (docError || !document) {
      return new Response(
        JSON.stringify({ success: false, error: 'Document not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify the document belongs to the user's organization
    if (document.org_id !== profile.organization_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Document does not belong to your organization' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if already deleted
    if (document.deleted_at) {
      return new Response(
        JSON.stringify({ success: false, error: 'Document already deleted' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Step 1: Soft delete the database record
    const { error: updateError } = await supabaseAdmin
      .from('contract_documents')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', document_id)

    if (updateError) {
      throw new Error(`Failed to update document record: ${updateError.message}`)
    }

    // Step 2: Hard delete the file from storage
    const { error: storageError } = await supabaseAdmin.storage
      .from('contract-documents')
      .remove([document.storage_path])

    if (storageError) {
      // Log the error but don't fail the request - the soft delete already succeeded
      console.error('Failed to delete file from storage:', storageError)
      // We could optionally roll back the soft delete here, but it's safer to keep it
      // The file will be orphaned but the document won't appear in the UI
    }

    const response: DeleteResponse = {
      success: true,
      message: 'Document deleted successfully'
    }

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in delete-contract-document:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
