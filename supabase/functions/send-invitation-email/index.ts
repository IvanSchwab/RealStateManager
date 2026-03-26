// Supabase Edge Function for sending organization invitation emails
// Deploy: supabase functions deploy send-invitation-email

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface InvitationEmailRequest {
  invitation_id: string
  token: string
  email: string
  role: 'admin' | 'collaborator'
  organization_name: string
  invited_by_name: string
  action: 'new' | 'resend'
}

interface InvitationEmailResponse {
  success: boolean
  error?: string
}

function getRoleName(role: 'admin' | 'collaborator'): string {
  return role === 'admin' ? 'Administrador' : 'Colaborador'
}

function getEmailSubject(action: 'new' | 'resend', organizationName: string): string {
  if (action === 'new') {
    return `Te invitaron a unirse a ${organizationName}`
  }
  return `Recordatorio: tu invitacion a ${organizationName}`
}

function getEmailHtml(
  organizationName: string,
  invitedByName: string,
  role: 'admin' | 'collaborator',
  inviteUrl: string,
  action: 'new' | 'resend'
): string {
  const roleName = getRoleName(role)
  const heading = action === 'new'
    ? `Te invitaron a unirte a ${organizationName}`
    : 'Recordatorio de invitación'
  const currentYear = new Date().getFullYear()

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${heading}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="560" cellspacing="0" cellpadding="0" border="0" style="max-width: 560px; width: 100%;">
          <!-- Top accent bar -->
          <tr>
            <td style="height: 4px; background-color: #bec092;"></td>
          </tr>
          <!-- Logo/App name -->
          <tr>
            <td align="center" style="padding: 24px 0 20px 0;">
              <span style="font-size: 14px; font-weight: 600; color: #374151; text-transform: uppercase; letter-spacing: 1px;">Real Estate Manager</span>
            </td>
          </tr>
          <!-- Main card -->
          <tr>
            <td>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px;">
                <tr>
                  <td style="padding: 40px;">
                    <!-- Heading -->
                    <h1 style="margin: 0 0 24px 0; font-size: 22px; font-weight: 600; color: #111827; text-align: center;">${heading}</h1>
                    <!-- Body text -->
                    <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.6; color: #6b7280; text-align: center;">
                      ${invitedByName} te invitó a unirte a <strong style="color: #374151;">${organizationName}</strong> como ${roleName}.
                    </p>
                    <!-- Role badge -->
                    <p style="margin: 0 0 32px 0; font-size: 14px; line-height: 1.6; color: #6b7280; text-align: center;">
                      Tu rol será: <span style="display: inline-block; background-color: #bec092; color: #5a5e2f; padding: 4px 12px; border-radius: 4px; font-weight: 500; font-size: 13px;">${roleName}</span>
                    </p>
                    <!-- CTA button -->
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td align="center">
                          <a href="${inviteUrl}" target="_blank" style="display: inline-block; background-color: #bec092; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 6px; font-weight: 600; font-size: 15px;">Aceptar invitación</a>
                        </td>
                      </tr>
                    </table>
                    <!-- Expiration notice -->
                    <p style="margin: 24px 0 0 0; font-size: 13px; color: #9ca3af; text-align: center;">
                      Este enlace expira en 7 días.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 0 0 0;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="border-top: 1px solid #e5e7eb; padding-top: 20px;">
                    <p style="margin: 0; font-size: 12px; color: #9ca3af; text-align: center; line-height: 1.5;">
                      Si no esperabas esta invitación, podés ignorar este mensaje.<br>
                      © ${currentYear} Real Estate Manager
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

async function sendEmail(
  to: string,
  subject: string,
  body: string,
  resendApiKey: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Administracion <noreply@resend.dev>', // Configure your verified domain
        to: [to],
        subject,
        html: body,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      return { success: false, error: errorData.message || 'Failed to send email' }
    }

    return { success: true }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
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
    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    const appUrl = Deno.env.get('APP_URL')

    if (!resendApiKey) {
      throw new Error('Missing RESEND_API_KEY environment variable')
    }

    if (!appUrl) {
      throw new Error('Missing APP_URL environment variable')
    }

    // Parse request body
    const body: InvitationEmailRequest = await req.json()
    const {
      invitation_id,
      token,
      email,
      role,
      organization_name,
      invited_by_name,
      action,
    } = body

    // Validate required fields
    if (!invitation_id || !token || !email || !role || !organization_name || !invited_by_name || !action) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate role
    if (!['admin', 'collaborator'].includes(role)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid role' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate action
    if (!['new', 'resend'].includes(action)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid action' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Build invite URL
    const inviteUrl = `${appUrl}/invite/${token}`

    // Build email content
    const subject = getEmailSubject(action, organization_name)
    const emailHtml = getEmailHtml(
      organization_name,
      invited_by_name,
      role,
      inviteUrl,
      action
    )

    // Send email
    const emailResult = await sendEmail(email, subject, emailHtml, resendApiKey)

    const response: InvitationEmailResponse = {
      success: emailResult.success,
      error: emailResult.error,
    }

    if (!emailResult.success) {
      console.error('Failed to send invitation email:', emailResult.error)
      return new Response(
        JSON.stringify(response),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error in send-invitation-email:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
