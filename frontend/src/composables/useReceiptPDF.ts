import { jsPDF } from 'jspdf'
import type { PaymentWithDetails } from '@/types'

// Receipt dimensions (mm) - 6 per A4 page (2 columns x 3 rows)
const RECEIPT_WIDTH = 99
const RECEIPT_HEIGHT = 99
const PAGE_MARGIN = 3
const A4_WIDTH = 210
const A4_HEIGHT = 297

export function useReceiptPDF() {
  /**
   * Format currency in Argentine style
   */
  function formatCurrency(amount: number | null | undefined): string {
    if (amount === null || amount === undefined) return '$0'
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  /**
   * Format date as DD/MM/YYYY
   */
  function formatDate(dateStr: string | null | undefined): string {
    if (!dateStr) return '___/___/______'
    const date = new Date(dateStr + 'T00:00:00')
    const day = String(date.getDate()).padStart(2, '0')
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const year = date.getFullYear()
    return `${day}/${month}/${year}`
  }

  /**
   * Get month name in Spanish
   */
  function getMonthName(month: number): string {
    const months = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
    ]
    return months[month - 1] || ''
  }

  /**
   * Get payment method label
   */
  function getPaymentMethodLabel(method: string | null): string {
    if (!method) return ''
    const labels: Record<string, string> = {
      efectivo: 'Efectivo',
      transferencia: 'Transferencia',
      cheque: 'Cheque',
      tarjeta: 'Tarjeta',
      deposito: 'Depósito',
    }
    return labels[method] || method
  }

  /**
   * Calculate month position in contract (e.g., "7/36")
   */
  function getMonthLabel(payment: PaymentWithDetails): string {
    if (!payment.contract) return ''

    const startDate = new Date(payment.contract.start_date)
    const endDate = new Date(payment.contract.end_date)
    const paymentDate = new Date(payment.due_date)

    const totalMonths = monthsBetween(startDate, endDate) + 1
    const currentMonth = monthsBetween(startDate, paymentDate) + 1

    return `${currentMonth}/${totalMonths}`
  }

  /**
   * Calculate months between two dates
   */
  function monthsBetween(date1: Date, date2: Date): number {
    const months = (date2.getFullYear() - date1.getFullYear()) * 12
    return months + date2.getMonth() - date1.getMonth()
  }

  /**
   * Get tenant names from payment
   */
  function getTenantNames(payment: PaymentWithDetails): string {
    const tenants = payment.contract?.tenants || []
    const names = tenants
      .map(ct => ct.tenant ? `${ct.tenant.first_name} ${ct.tenant.last_name}` : '')
      .filter(Boolean)

    if (names.length === 0) return 'N/A'
    if (names.length === 1) return names[0]
    return names.slice(0, -1).join(', ') + ' y ' + names[names.length - 1]
  }

  /**
   * Get property address from payment
   */
  function getPropertyAddress(payment: PaymentWithDetails): { line1: string; line2: string } {
    const p = payment.contract?.property
    if (!p) return { line1: 'N/A', line2: '' }

    let line1 = p.address_street || ''
    if (p.address_number) line1 += ` ${p.address_number}`
    if (p.address_floor) line1 += `, Piso ${p.address_floor}`
    if (p.address_apartment) line1 += `, Depto ${p.address_apartment}`

    const line2 = `${p.address_city || ''}${p.address_state ? `, ${p.address_state}` : ''}`

    return { line1, line2 }
  }

  /**
   * Get owner name from payment
   */
  function getOwnerName(payment: PaymentWithDetails): string {
    return payment.contract?.property?.owner?.full_name || 'N/A'
  }

  /**
   * Draw a single receipt on the PDF
   */
  function drawReceipt(
    doc: jsPDF,
    payment: PaymentWithDetails,
    x: number,
    y: number,
    width: number,
    height: number,
    copyNumber: number
  ): void {
    const padding = 3
    const lineHeight = 4
    let currentY = y + padding

    // Border with rounded corners
    doc.setDrawColor(200, 200, 200)
    doc.setLineWidth(0.3)
    doc.roundedRect(x, y, width, height, 2, 2)

    // === HEADER ===
    // Logo placeholder (uncomment and adjust when logo is available)
    // doc.addImage(logoBase64, 'PNG', x + width/2 - 10, currentY, 20, 10)
    // currentY += 12

    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text('RECIBO DE ALQUILER', x + width / 2, currentY, { align: 'center' })
    currentY += lineHeight

    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.text('Olivera de Schwab Propiedades', x + width / 2, currentY, { align: 'center' })
    currentY += lineHeight

    // Receipt number
    if (payment.reference_number) {
      doc.setFontSize(8)
      doc.text(`Recibo N° ${payment.reference_number}`, x + width / 2, currentY, { align: 'center' })
      currentY += lineHeight
    }

    // === DIVIDER ===
    doc.setDrawColor(220, 220, 220)
    doc.line(x + padding, currentY, x + width - padding, currentY)
    currentY += lineHeight

    // === DATE & PERIOD INFO ===
    doc.setFontSize(9)
    const paidDateStr = formatDate(payment.payment_date)
    const monthLabel = getMonthLabel(payment)

    doc.text(`Fecha: ${paidDateStr}`, x + padding, currentY)
    if (monthLabel) {
      doc.text(`Mes: ${monthLabel}`, x + width - padding, currentY, { align: 'right' })
    }
    currentY += lineHeight

    const periodStr = `${getMonthName(payment.period_month).toUpperCase()} ${payment.period_year}`
    doc.text(`Período: ${periodStr}`, x + padding, currentY)
    currentY += lineHeight + 1

    // === DIVIDER ===
    doc.line(x + padding, currentY, x + width - padding, currentY)
    currentY += lineHeight

    // === OWNER ===
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.text('PROPIETARIO', x + padding, currentY)
    currentY += lineHeight - 1
    doc.setFont('helvetica', 'normal')
    const ownerName = getOwnerName(payment)
    doc.text(ownerName, x + padding, currentY, { maxWidth: width - padding * 2 })
    currentY += lineHeight + 1

    // === TENANT ===
    doc.setFont('helvetica', 'bold')
    doc.text('INQUILINO', x + padding, currentY)
    currentY += lineHeight - 1
    doc.setFont('helvetica', 'normal')
    const tenantNames = getTenantNames(payment)
    // Handle long tenant names
    const tenantLines = doc.splitTextToSize(tenantNames, width - padding * 2)
    doc.text(tenantLines, x + padding, currentY)
    currentY += (tenantLines.length * (lineHeight - 1)) + 1

    // === PROPERTY ===
    doc.setFont('helvetica', 'bold')
    doc.text('PROPIEDAD', x + padding, currentY)
    currentY += lineHeight - 1
    doc.setFont('helvetica', 'normal')
    const address = getPropertyAddress(payment)
    const addressLines = doc.splitTextToSize(address.line1, width - padding * 2)
    doc.text(addressLines, x + padding, currentY)
    currentY += (addressLines.length * (lineHeight - 1))
    if (address.line2) {
      doc.text(address.line2, x + padding, currentY)
      currentY += lineHeight - 1
    }
    currentY += 1

    // === DIVIDER ===
    doc.line(x + padding, currentY, x + width - padding, currentY)
    currentY += lineHeight

    // === AMOUNTS ===
    doc.setFontSize(9)

    // Rent amount
    const rentAmountStr = formatCurrency(payment.rent_amount || payment.expected_amount)
    doc.text('Alquiler', x + padding, currentY)
    doc.text(rentAmountStr, x + width - padding, currentY, { align: 'right' })
    currentY += lineHeight

    // Concepts
    if (payment.concepts && payment.concepts.length > 0) {
      for (const concept of payment.concepts) {
        const conceptAmountStr = formatCurrency(concept.amount)
        doc.text(concept.concept_name, x + padding, currentY)
        doc.text(conceptAmountStr, x + width - padding, currentY, { align: 'right' })
        currentY += lineHeight
      }
    }

    // Total line
    doc.setDrawColor(100, 100, 100)
    doc.line(x + padding + 30, currentY - 1, x + width - padding, currentY - 1)
    currentY += lineHeight - 1

    // Total
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    const totalAmountStr = formatCurrency(payment.total_amount || payment.expected_amount)
    doc.text('TOTAL', x + padding, currentY)
    doc.text(totalAmountStr, x + width - padding, currentY, { align: 'right' })
    currentY += lineHeight + 1

    // === DIVIDER ===
    doc.setDrawColor(220, 220, 220)
    doc.line(x + padding, currentY, x + width - padding, currentY)
    currentY += lineHeight

    // === PAYMENT METHOD ===
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    if (payment.payment_method) {
      const methodLabel = getPaymentMethodLabel(payment.payment_method)
      doc.text(`Método: ${methodLabel}`, x + padding, currentY)
      currentY += lineHeight
    }

    // === SIGNATURES ===
    const sigY = y + height - padding - 10
    doc.setFontSize(7)

    // Tenant signature
    doc.line(x + padding, sigY, x + padding + 35, sigY)
    doc.text('Firma Inquilino', x + padding, sigY + 3)

    // Agency signature
    doc.line(x + width - padding - 35, sigY, x + width - padding, sigY)
    doc.text('Firma Inmobiliaria', x + width - padding - 35, sigY + 3)

    // === COPY NUMBER WATERMARK ===
    doc.setFontSize(6)
    doc.setTextColor(180, 180, 180)
    const copyLabels = ['Original', 'Duplicado', 'Triplicado']
    doc.text(copyLabels[copyNumber - 1] || `Copia ${copyNumber}`, x + width / 2, y + height - 2, { align: 'center' })
    doc.setTextColor(0, 0, 0)
  }

  /**
   * Generate receipt PDF with 6 receipts per page (2 columns x 3 rows)
   * Each payment gets 3 copies (Original, Duplicado, Triplicado)
   */
  function generateReceiptPDF(payments: PaymentWithDetails[]): jsPDF {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    })

    let receiptsDrawn = 0

    for (let i = 0; i < payments.length; i++) {
      const payment = payments[i]

      // Each payment gets 3 copies in the left column
      for (let copy = 0; copy < 3; copy++) {
        // Check if we need a new page (6 receipts per page max)
        if (receiptsDrawn > 0 && receiptsDrawn % 6 === 0) {
          doc.addPage()
        }

        // Calculate position
        const positionOnPage = receiptsDrawn % 6
        const col = positionOnPage % 2 // 0 or 1
        const row = Math.floor(positionOnPage / 2) // 0, 1, or 2

        const x = PAGE_MARGIN + col * (RECEIPT_WIDTH + PAGE_MARGIN)
        const y = PAGE_MARGIN + row * RECEIPT_HEIGHT

        drawReceipt(doc, payment, x, y, RECEIPT_WIDTH, RECEIPT_HEIGHT, copy + 1)
        receiptsDrawn++
      }
    }

    return doc
  }

  /**
   * Generate PDF for a single payment (3 copies in left column)
   */
  function generateSingleReceiptPDF(payment: PaymentWithDetails): jsPDF {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    })

    // Draw 3 copies in the left column
    for (let copy = 0; copy < 3; copy++) {
      const x = PAGE_MARGIN
      const y = PAGE_MARGIN + copy * RECEIPT_HEIGHT

      drawReceipt(doc, payment, x, y, RECEIPT_WIDTH, RECEIPT_HEIGHT, copy + 1)
    }

    return doc
  }

  /**
   * Generate PDF for multiple payments optimized for printing
   * Groups payments in pairs (2 per page, 3 copies each)
   */
  function generateBulkReceiptPDF(payments: PaymentWithDetails[]): jsPDF {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    })

    // Process payments in pairs
    for (let i = 0; i < payments.length; i += 2) {
      if (i > 0) {
        doc.addPage()
      }

      const payment1 = payments[i]
      const payment2 = payments[i + 1]

      // Draw 3 copies of payment1 in left column
      for (let copy = 0; copy < 3; copy++) {
        const x = PAGE_MARGIN
        const y = PAGE_MARGIN + copy * RECEIPT_HEIGHT
        drawReceipt(doc, payment1, x, y, RECEIPT_WIDTH, RECEIPT_HEIGHT, copy + 1)
      }

      // Draw 3 copies of payment2 in right column (if exists)
      if (payment2) {
        for (let copy = 0; copy < 3; copy++) {
          const x = PAGE_MARGIN + RECEIPT_WIDTH + PAGE_MARGIN
          const y = PAGE_MARGIN + copy * RECEIPT_HEIGHT
          drawReceipt(doc, payment2, x, y, RECEIPT_WIDTH, RECEIPT_HEIGHT, copy + 1)
        }
      }
    }

    return doc
  }

  /**
   * Download receipt PDF with proper filename
   */
  function downloadReceiptPDF(payments: PaymentWithDetails | PaymentWithDetails[]): void {
    const paymentsArray = Array.isArray(payments) ? payments : [payments]

    const pdf = paymentsArray.length === 1
      ? generateSingleReceiptPDF(paymentsArray[0])
      : generateBulkReceiptPDF(paymentsArray)

    // Generate filename
    let filename: string
    if (paymentsArray.length === 1) {
      const p = paymentsArray[0]
      const month = String(p.period_month).padStart(2, '0')
      filename = `Recibo_${p.period_year}-${month}_${p.reference_number || p.id.substring(0, 8)}.pdf`
    } else {
      const date = new Date()
      filename = `Recibos_${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}.pdf`
    }

    pdf.save(filename)
  }

  /**
   * Open receipt PDF in new tab for printing
   */
  function printReceiptPDF(payments: PaymentWithDetails | PaymentWithDetails[]): void {
    const paymentsArray = Array.isArray(payments) ? payments : [payments]

    const pdf = paymentsArray.length === 1
      ? generateSingleReceiptPDF(paymentsArray[0])
      : generateBulkReceiptPDF(paymentsArray)

    // Open in new tab
    const blob = pdf.output('blob')
    const url = URL.createObjectURL(blob)
    window.open(url, '_blank')

    // Clean up after a delay
    setTimeout(() => URL.revokeObjectURL(url), 30000)
  }

  return {
    generateReceiptPDF,
    generateSingleReceiptPDF,
    generateBulkReceiptPDF,
    downloadReceiptPDF,
    printReceiptPDF,
    // Utilities exposed for external use
    formatCurrency,
    formatDate,
    getMonthName,
    getMonthLabel,
    getTenantNames,
    getPropertyAddress,
    getOwnerName,
    getPaymentMethodLabel,
  }
}
