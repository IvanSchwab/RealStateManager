// Supabase Edge Function for sending overdue payment notifications
// Deploy: supabase functions deploy send-overdue-notifications
// Schedule: Can be triggered via pg_cron or external scheduler

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface OverduePayment {
  id: string
  period_month: number
  period_year: number
  due_date: string
  expected_amount: number
  contract: {
    id: string
    property: {
      address_street: string
      address_number: string | null
      address_city: string
    }
  }
  tenant: {
    id: string
    first_name: string
    last_name: string
    email: string | null
  } | null
}

interface NotificationResult {
  paymentId: string
  tenantEmail: string | null
  success: boolean
  error?: string
}

// Email templates in Spanish
function getOverdueEmailSubject(daysOverdue: number): string {
  if (daysOverdue <= 5) {
    return 'Recordatorio: Pago de alquiler pendiente'
  } else if (daysOverdue <= 15) {
    return 'Aviso: Su pago de alquiler está vencido'
  } else {
    return 'Urgente: Pago de alquiler vencido'
  }
}

function getOverdueEmailBody(
  tenantName: string,
  propertyAddress: string,
  periodLabel: string,
  amount: number,
  dueDate: string,
  daysOverdue: number
): string {
  const formattedAmount = new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
  }).format(amount)

  const formattedDueDate = new Date(dueDate).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })

  return `
Estimado/a ${tenantName},

Le informamos que su pago de alquiler correspondiente a ${periodLabel} se encuentra vencido.

Detalles del pago:
- Propiedad: ${propertyAddress}
- Período: ${periodLabel}
- Monto: ${formattedAmount}
- Fecha de vencimiento: ${formattedDueDate}
- Días de atraso: ${daysOverdue}

Le solicitamos regularizar su situación a la brevedad posible.

Si ya realizó el pago, por favor ignore este mensaje y comuníquese con la administración para actualizar el estado de su pago.

Atentamente,
Administración de Propiedades
  `.trim()
}

function getMonthName(month: number): string {
  const months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
  ]
  return months[month - 1] || ''
}

async function sendEmail(
  to: string,
  subject: string,
  body: string,
  resendApiKey: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Using Resend API
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Administración <noreply@resend.dev>', // Configure your verified domain
        to: [to],
        subject,
        text: body,
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
    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const resendApiKey = Deno.env.get('RESEND_API_KEY')

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables')
    }

    if (!resendApiKey) {
      throw new Error('Missing RESEND_API_KEY environment variable')
    }

    // Create Supabase client with service role key
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get today's date
    const today = new Date().toISOString().split('T')[0]

    // Query for overdue payments
    const { data: overduePayments, error: queryError } = await supabase
      .from('payments')
      .select(`
        id,
        period_month,
        period_year,
        due_date,
        expected_amount,
        contract:contracts!inner(
          id,
          property:properties(
            address_street,
            address_number,
            address_city
          )
        )
      `)
      .eq('status', 'vencido')
      .lt('due_date', today)
      .is('notification_sent_at', null) // Only payments not yet notified
      .limit(100) // Process in batches

    if (queryError) {
      throw new Error(`Failed to query overdue payments: ${queryError.message}`)
    }

    if (!overduePayments || overduePayments.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No overdue payments to notify', count: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get tenant info for each overdue payment
    const results: NotificationResult[] = []

    for (const payment of overduePayments) {
      try {
        // Get the titular tenant for this contract
        const { data: contractTenant, error: tenantError } = await supabase
          .from('contract_tenants')
          .select(`
            tenant:tenants(
              id,
              first_name,
              last_name,
              email
            )
          `)
          .eq('contract_id', payment.contract.id)
          .eq('role', 'titular')
          .single()

        if (tenantError || !contractTenant?.tenant) {
          results.push({
            paymentId: payment.id,
            tenantEmail: null,
            success: false,
            error: 'Tenant not found',
          })
          continue
        }

        const tenant = contractTenant.tenant as {
          id: string
          first_name: string
          last_name: string
          email: string | null
        }

        if (!tenant.email) {
          results.push({
            paymentId: payment.id,
            tenantEmail: null,
            success: false,
            error: 'Tenant has no email',
          })
          continue
        }

        // Calculate days overdue
        const dueDate = new Date(payment.due_date)
        const todayDate = new Date(today)
        const daysOverdue = Math.floor(
          (todayDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
        )

        // Build email content
        const tenantName = `${tenant.first_name} ${tenant.last_name}`
        const property = payment.contract.property
        const propertyAddress = property
          ? `${property.address_street} ${property.address_number || ''}, ${property.address_city}`
          : 'Dirección no disponible'
        const periodLabel = `${getMonthName(payment.period_month)} ${payment.period_year}`

        const subject = getOverdueEmailSubject(daysOverdue)
        const body = getOverdueEmailBody(
          tenantName,
          propertyAddress,
          periodLabel,
          payment.expected_amount,
          payment.due_date,
          daysOverdue
        )

        // Send email
        const emailResult = await sendEmail(tenant.email, subject, body, resendApiKey)

        if (emailResult.success) {
          // Mark payment as notified
          await supabase
            .from('payments')
            .update({ notification_sent_at: new Date().toISOString() })
            .eq('id', payment.id)

          // Create in-app notifications for admin/manager users
          const { data: staffUsers } = await supabase
            .from('profiles')
            .select('id')
            .in('role', ['admin', 'manager'])

          if (staffUsers && staffUsers.length > 0) {
            const notificationRecords = staffUsers.map((user) => ({
              user_id: user.id,
              type: 'pago_vencido',
              title: subject,
              message: `${tenantName} - ${propertyAddress} - ${periodLabel}. ${daysOverdue} días de atraso.`,
              payment_id: payment.id,
              contract_id: payment.contract.id,
              status: 'no_leida',
            }))

            await supabase.from('notifications').insert(notificationRecords)
          }
        }

        results.push({
          paymentId: payment.id,
          tenantEmail: tenant.email,
          success: emailResult.success,
          error: emailResult.error,
        })
      } catch (error) {
        results.push({
          paymentId: payment.id,
          tenantEmail: null,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }

    const successCount = results.filter(r => r.success).length
    const failureCount = results.filter(r => !r.success).length

    return new Response(
      JSON.stringify({
        message: `Processed ${results.length} overdue payments`,
        successCount,
        failureCount,
        results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error in send-overdue-notifications:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
