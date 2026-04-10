// Supabase Edge Function for sending payment notifications to tenants
// Deploy: supabase functions deploy send-payment-notification

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface AdditionalConcept {
  name: string
  amount: number
}

interface PaymentNotificationRequest {
  to: string
  tenantName: string
  propertyAddress: string
  period: string
  amount: number
  dueDate: string
  replyTo?: string
  // New fields for detailed breakdown
  baseRent: number
  additionalConcepts: AdditionalConcept[]
  contractMonth: number
  contractDurationMonths: number
}

interface PaymentNotificationResponse {
  success: boolean
  error?: string
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
  }).format(amount)
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

function getEmailHtml(
  tenantName: string,
  propertyAddress: string,
  period: string,
  amount: number,
  dueDate: string,
  baseRent: number,
  additionalConcepts: AdditionalConcept[],
  contractMonth: number,
  contractDurationMonths: number
): string {
  const formattedAmount = formatCurrency(amount)
  const formattedDueDate = formatDate(dueDate)
  const formattedBaseRent = formatCurrency(baseRent)
  const currentYear = new Date().getFullYear()

  // Build additional concepts rows HTML
  const conceptsHtml = additionalConcepts.length > 0
    ? additionalConcepts.map(c => `
                            <tr>
                              <td style="padding: 6px 0;">
                                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                                  <tr>
                                    <td style="font-size: 14px; color: #6b7280;">${c.name}</td>
                                    <td style="font-size: 14px; color: #374151; text-align: right;">${formatCurrency(c.amount)}</td>
                                  </tr>
                                </table>
                              </td>
                            </tr>`).join('')
    : ''

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Aviso de Pago</title>
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
                    <h1 style="margin: 0 0 24px 0; font-size: 22px; font-weight: 600; color: #111827; text-align: center;">Aviso de Pago</h1>
                    <!-- Greeting -->
                    <p style="margin: 0 0 20px 0; font-size: 15px; line-height: 1.6; color: #374151;">
                      Estimado/a <strong>${tenantName}</strong>,
                    </p>
                    <!-- Body text -->
                    <p style="margin: 0 0 24px 0; font-size: 15px; line-height: 1.6; color: #6b7280;">
                      Le informamos que se encuentra disponible el siguiente pago de alquiler:
                    </p>
                    <!-- Payment details card -->
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f9fafb; border-radius: 8px; margin-bottom: 24px;">
                      <tr>
                        <td style="padding: 20px;">
                          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                            <!-- Property -->
                            <tr>
                              <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                                <span style="font-size: 13px; color: #6b7280;">Propiedad</span><br>
                                <span style="font-size: 15px; color: #374151; font-weight: 500;">${propertyAddress}</span>
                              </td>
                            </tr>
                            <!-- Period with contract month -->
                            <tr>
                              <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                                <span style="font-size: 13px; color: #6b7280;">Período</span><br>
                                <span style="font-size: 15px; color: #374151; font-weight: 500;">${period}</span>
                                <span style="font-size: 13px; color: #6b7280; margin-left: 8px;">(Mes ${contractMonth} de ${contractDurationMonths})</span>
                              </td>
                            </tr>
                            <!-- Due date -->
                            <tr>
                              <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                                <span style="font-size: 13px; color: #6b7280;">Fecha de vencimiento</span><br>
                                <span style="font-size: 15px; color: #374151; font-weight: 500;">${formattedDueDate}</span>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>

                    <!-- Payment breakdown card -->
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f9fafb; border-radius: 8px; margin-bottom: 24px;">
                      <tr>
                        <td style="padding: 20px;">
                          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                            <!-- Section title -->
                            <tr>
                              <td style="padding-bottom: 12px; border-bottom: 1px solid #e5e7eb;">
                                <span style="font-size: 14px; font-weight: 600; color: #374151;">Detalle del pago</span>
                              </td>
                            </tr>
                            <!-- Base rent -->
                            <tr>
                              <td style="padding: 8px 0;">
                                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                                  <tr>
                                    <td style="font-size: 14px; color: #374151;">Valor base del alquiler</td>
                                    <td style="font-size: 14px; color: #374151; text-align: right; font-weight: 500;">${formattedBaseRent}</td>
                                  </tr>
                                </table>
                              </td>
                            </tr>
                            <!-- Additional concepts (if any) -->
                            ${additionalConcepts.length > 0 ? `
                            <tr>
                              <td style="padding-top: 8px; padding-bottom: 4px;">
                                <span style="font-size: 13px; color: #6b7280;">Conceptos adicionales:</span>
                              </td>
                            </tr>
                            ${conceptsHtml}
                            ` : ''}
                            <!-- Total separator -->
                            <tr>
                              <td style="padding-top: 12px; border-top: 2px solid #e5e7eb;">
                                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                                  <tr>
                                    <td style="font-size: 16px; font-weight: 600; color: #111827;">Total a pagar</td>
                                    <td style="font-size: 18px; font-weight: 700; color: #111827; text-align: right;">${formattedAmount}</td>
                                  </tr>
                                </table>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>

                    <!-- Footer note -->
                    <p style="margin: 0; font-size: 13px; color: #9ca3af; text-align: center;">
                      Si ya realizó el pago, por favor ignore este mensaje.
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
                      Este es un mensaje automático enviado por el sistema de gestión.<br>
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
  html: string,
  resendApiKey: string,
  replyTo?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const emailPayload: Record<string, unknown> = {
      from: 'Notificaciones <notificaciones@piagestion.com.ar>',
      to: [to],
      subject,
      html,
    }

    if (replyTo) {
      emailPayload.reply_to = replyTo
    }

    console.log('[sendEmail] Sending to Resend API:', {
      to,
      subject,
      from: emailPayload.from,
      replyTo: emailPayload.reply_to,
      apiKeyPresent: !!resendApiKey,
      apiKeyPrefix: resendApiKey ? resendApiKey.substring(0, 8) + '...' : 'MISSING',
    })

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailPayload),
    })

    const responseText = await response.text()
    console.log('[sendEmail] Resend API response:', {
      status: response.status,
      statusText: response.statusText,
      body: responseText,
    })

    if (!response.ok) {
      let errorMessage = 'Failed to send email'
      try {
        const errorData = JSON.parse(responseText)
        errorMessage = errorData.message || errorData.error || errorMessage
        console.error('[sendEmail] Resend API error details:', errorData)
      } catch {
        console.error('[sendEmail] Non-JSON error response:', responseText)
      }
      return { success: false, error: `Resend API (${response.status}): ${errorMessage}` }
    }

    console.log('[sendEmail] Email sent successfully')
    return { success: true }
  } catch (error) {
    console.error('[sendEmail] Exception during email send:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

Deno.serve(async (req) => {
  console.log('[send-payment-notification] Request received:', req.method, req.url)

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    console.log('[send-payment-notification] CORS preflight - returning OK')
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Only accept POST requests
    if (req.method !== 'POST') {
      console.log('[send-payment-notification] Method not allowed:', req.method)
      return new Response(
        JSON.stringify({ success: false, error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const resendApiKey = Deno.env.get('RESEND_API_KEY')

    console.log('[send-payment-notification] Environment check:', {
      SUPABASE_URL: supabaseUrl ? 'SET' : 'MISSING',
      SUPABASE_SERVICE_ROLE_KEY: supabaseServiceKey ? 'SET' : 'MISSING',
      RESEND_API_KEY: resendApiKey ? `SET (${resendApiKey.substring(0, 8)}...)` : 'MISSING',
    })

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('[send-payment-notification] Missing Supabase environment variables')
      throw new Error('Missing Supabase environment variables')
    }

    if (!resendApiKey) {
      console.error('[send-payment-notification] Missing RESEND_API_KEY')
      throw new Error('Missing RESEND_API_KEY environment variable')
    }

    // Verify user is authenticated
    const authHeader = req.headers.get('Authorization')
    console.log('[send-payment-notification] Auth header present:', !!authHeader)

    if (!authHeader) {
      console.error('[send-payment-notification] No Authorization header')
      return new Response(
        JSON.stringify({ success: false, error: 'Authorization header required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Extract the JWT token from the Authorization header
    const token = authHeader.replace('Bearer ', '')
    console.log('[send-payment-notification] Token length:', token.length)

    // Create admin client to verify the user's JWT
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    // Verify the token is valid by getting the user
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)
    if (userError || !user) {
      console.error('[send-payment-notification] JWT validation failed:', {
        error: userError?.message,
        code: userError?.code,
        status: userError?.status,
      })
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    console.log('[send-payment-notification] User authenticated:', user.id)

    // Parse request body
    let body: PaymentNotificationRequest
    try {
      body = await req.json()
      console.log('[send-payment-notification] Request body:', {
        to: body.to,
        tenantName: body.tenantName,
        propertyAddress: body.propertyAddress,
        period: body.period,
        amount: body.amount,
        dueDate: body.dueDate,
        replyTo: body.replyTo,
        baseRent: body.baseRent,
        additionalConcepts: body.additionalConcepts?.length ?? 0,
        contractMonth: body.contractMonth,
        contractDurationMonths: body.contractDurationMonths,
      })
    } catch (parseError) {
      console.error('[send-payment-notification] Failed to parse JSON body:', parseError)
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid JSON body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const {
      to,
      tenantName,
      propertyAddress,
      period,
      amount,
      dueDate,
      replyTo,
      baseRent,
      additionalConcepts,
      contractMonth,
      contractDurationMonths,
    } = body

    // Validate required fields
    if (!to || !tenantName || !propertyAddress || !period || amount === undefined || !dueDate) {
      console.error('[send-payment-notification] Missing required fields:', {
        to: !!to,
        tenantName: !!tenantName,
        propertyAddress: !!propertyAddress,
        period: !!period,
        amount: amount !== undefined,
        dueDate: !!dueDate,
      })
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields: to, tenantName, propertyAddress, period, amount, dueDate' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate email format (basic)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(to)) {
      console.error('[send-payment-notification] Invalid email format:', to)
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid email address' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Use defaults for new optional fields (backward compatibility)
    const rentBase = baseRent ?? amount
    const concepts = additionalConcepts ?? []
    const monthNum = contractMonth ?? 1
    const durationMonths = contractDurationMonths ?? 24

    // Build email content
    const subject = `Aviso de Pago - ${period}`
    const emailHtml = getEmailHtml(
      tenantName,
      propertyAddress,
      period,
      amount,
      dueDate,
      rentBase,
      concepts,
      monthNum,
      durationMonths
    )
    console.log('[send-payment-notification] Email content built, subject:', subject)

    // Send email
    const emailResult = await sendEmail(to, subject, emailHtml, resendApiKey, replyTo)

    const response: PaymentNotificationResponse = {
      success: emailResult.success,
      error: emailResult.error,
    }

    if (!emailResult.success) {
      console.error('[send-payment-notification] Failed to send email:', emailResult.error)
      return new Response(
        JSON.stringify(response),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('[send-payment-notification] Success! Email sent to:', to)
    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('[send-payment-notification] Unhandled exception:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
