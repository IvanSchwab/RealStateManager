import { ref } from 'vue'
import { jsPDF } from 'jspdf'
import { supabase } from '@/lib/supabase'
import { useDate } from './useDate'
import { useAuth } from './useAuth'
import { useLegalDocuments } from './useLegalDocuments'
import type { Property } from '@/types'

// ============================================
// TypeScript Interfaces for Form Data
// ============================================

export interface CorretajeFormData {
  property_id: string
  property: Pick<Property, 'name' | 'address_street' | 'address_number' | 'address_city' | 'address_state'>
  owner: { full_name: string; dni: string; address: string }
  agency: { name: string; matricula: string }
  exclusivity: boolean
  commission_percentage: number
  valid_from: string   // ISO date
  valid_until: string  // ISO date
  purpose: 'venta' | 'alquiler'
}

export interface BoletoFormData {
  property_id: string
  property: Pick<Property, 'name' | 'address_street' | 'address_number' | 'address_city' | 'address_state'>
  seller: { full_name: string; dni: string; address: string }
  buyer: { full_name: string; dni: string; address: string }
  price: number
  currency: 'ARS' | 'USD'
  payment_conditions: string
  possession_date: string  // ISO date
  escritura_date: string   // ISO date
  penalty_clause: string
}

export interface EntregaLlavesFormData {
  property_id: string
  property: Pick<Property, 'name' | 'address_street' | 'address_number' | 'address_city' | 'address_state'>
  deliverer: { full_name: string; dni: string }
  receiver: { full_name: string; dni: string }
  delivery_date: string   // ISO date
  keys_count: number
  remotes_count: number
  tags_count: number
  property_condition: string
  meter_readings: { electricity?: string; gas?: string; water?: string }
  observations: string
  expenses_from: string  // ISO date - desde cuando asume el receptor
}

// Storage configuration
const BUCKET_NAME = 'contract-documents'

// ============================================
// Composable
// ============================================

export function useLegalDocumentPDF() {
  const loading = ref(false)
  const error = ref<string | null>(null)
  const { dateLocale } = useDate()
  const { organizationId } = useAuth()
  const legalDocumentsStore = useLegalDocuments()

  // ============================================
  // Utility Functions
  // ============================================

  /**
   * Format currency for PDF display (Argentine style)
   */
  function formatCurrency(amount: number, currency: 'ARS' | 'USD' = 'ARS'): string {
    if (currency === 'USD') {
      return new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(amount)
    }
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  /**
   * Format date for PDF display
   */
  function formatDate(dateStr: string | null | undefined): string {
    if (!dateStr) return '[FECHA]'
    const date = new Date(dateStr + 'T00:00:00')
    return date.toLocaleDateString(dateLocale.value, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  /**
   * Format date in long Spanish format (e.g., "15 de marzo de 2026")
   */
  function formatDateLong(dateStr: string): string {
    if (!dateStr) return '[FECHA]'
    const date = new Date(dateStr + 'T00:00:00')
    return date.toLocaleDateString('es-AR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }

  /**
   * Convert number to Spanish words
   */
  function numberToSpanishWords(num: number): string {
    const units = ['', 'UN', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE']
    const teens = ['DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISÉIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE']
    const tens = ['', '', 'VEINTE', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA']
    const hundreds = ['', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS']

    if (num === 0) return 'CERO'
    if (num === 100) return 'CIEN'

    let result = ''

    if (num >= 1000000) {
      const millions = Math.floor(num / 1000000)
      if (millions === 1) {
        result += 'UN MILLÓN '
      } else {
        result += numberToSpanishWords(millions) + ' MILLONES '
      }
      num %= 1000000
    }

    if (num >= 1000) {
      const thousands = Math.floor(num / 1000)
      if (thousands === 1) {
        result += 'MIL '
      } else {
        result += numberToSpanishWords(thousands) + ' MIL '
      }
      num %= 1000
    }

    if (num >= 100) {
      result += hundreds[Math.floor(num / 100)] + ' '
      num %= 100
    }

    if (num >= 20) {
      const ten = Math.floor(num / 10)
      const unit = num % 10
      if (unit === 0) {
        result += tens[ten]
      } else {
        result += tens[ten] + ' Y ' + units[unit]
      }
    } else if (num >= 10) {
      result += teens[num - 10]
    } else if (num > 0) {
      result += units[num]
    }

    return result.trim()
  }

  /**
   * Get full property address string
   */
  function getPropertyAddress(property: Pick<Property, 'address_street' | 'address_number' | 'address_city' | 'address_state'>): string {
    let address = property.address_street
    if (property.address_number) address += ` ${property.address_number}`
    if (property.address_city) address += `, ${property.address_city}`
    if (property.address_state) address += `, ${property.address_state}`
    return address
  }

  /**
   * Upload PDF to Supabase Storage
   */
  async function uploadPdfToStorage(
    blob: Blob,
    propertyId: string,
    filename: string
  ): Promise<string | null> {
    if (!organizationId.value) {
      console.error('[useLegalDocumentPDF] No organization_id available')
      return null
    }

    try {
      const uuid = crypto.randomUUID()
      const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_')
      const storagePath = `${organizationId.value}/properties/${propertyId}/legal/${uuid}-${sanitizedFilename}`

      const { error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(storagePath, blob, {
          cacheControl: '3600',
          upsert: false,
          contentType: 'application/pdf',
        })

      if (uploadError) {
        console.error('[useLegalDocumentPDF] Storage upload failed:', uploadError.message)
        return null
      }

      return storagePath
    } catch (e) {
      console.error('[useLegalDocumentPDF] Upload error:', e)
      return null
    }
  }

  /**
   * Trigger browser download of a blob
   */
  function triggerDownload(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  /**
   * Generate PDF document using jsPDF with standard formatting
   */
  function createPdfDocument(): jsPDF {
    return new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    })
  }

  /**
   * Render text content to PDF with proper pagination
   */
  function renderTextToPdf(doc: jsPDF, text: string, title: string): void {
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const margin = 25
    const usableWidth = pageWidth - (margin * 2)
    const lineHeight = 6

    // Title
    doc.setFont('times', 'bold')
    doc.setFontSize(14)
    const titleWidth = doc.getTextWidth(title)
    doc.text(title, (pageWidth - titleWidth) / 2, margin)

    doc.setFont('times', 'normal')
    doc.setFontSize(11)

    const lines = text.split('\n')
    let y = margin + 15

    for (const line of lines) {
      if (y > pageHeight - margin) {
        doc.addPage()
        y = margin
      }

      // Handle separator lines
      if (line.startsWith('═') || line.startsWith('─')) {
        doc.setDrawColor(100)
        doc.line(margin, y - 2, pageWidth - margin, y - 2)
        y += 3
        continue
      }

      // Handle signature lines
      if (line.startsWith('_')) {
        doc.line(margin, y, margin + 50, y)
        y += lineHeight
        continue
      }

      // Bold for clause headers
      const clauseMatch = line.match(/^(PRIMERO|SEGUNDO|TERCERO|CUARTO|QUINTO|SEXTO|SÉPTIMO|OCTAVO|NOVENO|DÉCIMO|CLÁUSULA)/)
      if (clauseMatch || line.includes('AUTORIZACIÓN') || line.includes('BOLETO') || line.includes('ACTA')) {
        doc.setFont('times', 'bold')
      } else {
        doc.setFont('times', 'normal')
      }

      // Word wrap and render
      const splitLines = doc.splitTextToSize(line, usableWidth)
      for (const splitLine of splitLines) {
        if (y > pageHeight - margin) {
          doc.addPage()
          y = margin
        }
        doc.text(splitLine, margin, y)
        y += lineHeight
      }
    }
  }

  // ============================================
  // PDF Generators
  // ============================================

  /**
   * Generate Corretaje Authorization PDF
   */
  async function generateCorretajePDF(data: CorretajeFormData): Promise<string | null> {
    loading.value = true
    error.value = null

    try {
      const propertyAddress = getPropertyAddress(data.property)
      const purposeText = data.purpose === 'venta' ? 'VENTA' : 'ALQUILER'
      const exclusivityText = data.exclusivity ? 'EXCLUSIVA' : 'NO EXCLUSIVA'
      const today = formatDateLong(new Date().toISOString().split('T')[0])

      // Build document text
      let text = `AUTORIZACIÓN DE CORRETAJE INMOBILIARIO\n\n`
      text += '═'.repeat(60) + '\n\n'

      text += `En la Ciudad de ${data.property.address_city || 'Buenos Aires'}, a los ${today}, entre:\n\n`

      text += `EL PROPIETARIO: ${data.owner.full_name}, DNI ${data.owner.dni}, con domicilio en ${data.owner.address}, en adelante "EL AUTORIZANTE".\n\n`

      text += `LA INMOBILIARIA: ${data.agency.name}, Matrícula N° ${data.agency.matricula}, en adelante "EL CORREDOR".\n\n`

      text += '─'.repeat(60) + '\n\n'

      text += `PRIMERO (OBJETO): EL AUTORIZANTE confiere a EL CORREDOR autorización ${exclusivityText} para intermediar en la operación de ${purposeText} del inmueble sito en ${propertyAddress}, identificado como "${data.property.name}".\n\n`

      text += `SEGUNDO (PLAZO): La presente autorización tendrá vigencia desde el día ${formatDate(data.valid_from)} hasta el día ${formatDate(data.valid_until)}, pudiendo ser renovada de común acuerdo entre las partes.\n\n`

      text += `TERCERO (HONORARIOS): Los honorarios de EL CORREDOR serán del ${data.commission_percentage}% (${numberToSpanishWords(data.commission_percentage)} por ciento) sobre el precio total de la operación, conforme a los aranceles profesionales vigentes. Dichos honorarios serán abonados al momento de la firma del boleto de compraventa o contrato de locación, según corresponda.\n\n`

      if (data.exclusivity) {
        text += `CUARTO (EXCLUSIVIDAD): EL AUTORIZANTE se compromete a no encomendar la misma gestión a otros corredores durante la vigencia de la presente autorización, ni a realizar operaciones directas sobre el inmueble sin intervención de EL CORREDOR. En caso de incumplimiento, EL AUTORIZANTE deberá abonar los honorarios pactados como si la operación se hubiera concretado por intermedio de EL CORREDOR.\n\n`
      } else {
        text += `CUARTO (NO EXCLUSIVIDAD): La presente autorización no impide que EL AUTORIZANTE pueda encomendar la misma gestión a otros corredores o realizar operaciones directas. En caso de concretarse la operación por intermedio de otro corredor o en forma directa, EL AUTORIZANTE no deberá honorarios a EL CORREDOR.\n\n`
      }

      text += `QUINTO (OBLIGACIONES DEL CORREDOR): EL CORREDOR se obliga a: a) Publicitar el inmueble en los medios que considere convenientes; b) Mostrar el inmueble a potenciales interesados previo aviso al propietario; c) Informar periódicamente sobre las gestiones realizadas; d) Verificar la documentación de los potenciales compradores o locatarios; e) Actuar con diligencia y buena fe profesional.\n\n`

      text += `SEXTO (OBLIGACIONES DEL AUTORIZANTE): EL AUTORIZANTE se obliga a: a) Facilitar la documentación necesaria para la gestión; b) Permitir las visitas al inmueble en horarios razonables; c) Informar sobre cualquier circunstancia que afecte la operación; d) Abonar los honorarios pactados en caso de concretarse la operación.\n\n`

      text += `SÉPTIMO (DOCUMENTACIÓN): EL AUTORIZANTE declara que la documentación del inmueble se encuentra en regla y que no existen impedimentos legales, gravámenes, embargos o inhibiciones que impidan la concreción de la operación de ${purposeText.toLowerCase()}.\n\n`

      text += `OCTAVO (JURISDICCIÓN): Para cualquier divergencia que surja del presente contrato, las partes se someten a la jurisdicción de los Tribunales Ordinarios de la Ciudad de ${data.property.address_city || 'Buenos Aires'}.\n\n`

      text += '─'.repeat(60) + '\n\n'

      text += `CLÁUSULA LEGAL: La presente autorización de corretaje se celebra de conformidad con lo dispuesto por la Ley 20.266 de Martilleros y Corredores y sus modificatorias, el Código Civil y Comercial de la Nación Argentina, y las normas del Colegio de Corredores Inmobiliarios de la jurisdicción correspondiente.\n\n`

      text += '═'.repeat(60) + '\n\n'

      text += `En prueba de conformidad, las partes firman el presente documento en dos ejemplares de un mismo tenor y a un solo efecto.\n\n`

      text += '\n\n'
      text += '_'.repeat(28) + '              ' + '_'.repeat(28) + '\n'
      text += '     EL AUTORIZANTE                           EL CORREDOR\n'
      text += `  ${data.owner.full_name.padEnd(30)}    ${data.agency.name.padEnd(30)}\n`
      text += `  DNI: ${data.owner.dni.padEnd(24)}    Mat: ${data.agency.matricula.padEnd(24)}\n`

      text += '\n\n' + '═'.repeat(60) + '\n'
      text += 'Documento generado automáticamente por el Sistema de Gestión Inmobiliaria\n'

      // Generate PDF
      const doc = createPdfDocument()
      renderTextToPdf(doc, text, 'AUTORIZACIÓN DE CORRETAJE INMOBILIARIO')
      const blob = doc.output('blob')

      // Generate filename
      const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '')
      const filename = `Corretaje_${data.property.name.replace(/[^a-zA-Z0-9]/g, '_')}_${dateStr}.pdf`

      // Upload to storage
      const storagePath = await uploadPdfToStorage(blob, data.property_id, filename)

      // Create database record
      await legalDocumentsStore.createDocument({
        property_id: data.property_id,
        document_type: 'corretaje',
        metadata: {
          owner: data.owner,
          agency: data.agency,
          exclusivity: data.exclusivity,
          commission_percentage: data.commission_percentage,
          valid_from: data.valid_from,
          valid_until: data.valid_until,
          purpose: data.purpose,
          generated_at: new Date().toISOString(),
        },
        pdf_url: storagePath ?? undefined,
      })

      // Trigger download
      triggerDownload(blob, filename)

      return storagePath
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Error al generar PDF de corretaje'
      console.error('[useLegalDocumentPDF] Error generating corretaje PDF:', e)
      return null
    } finally {
      loading.value = false
    }
  }

  /**
   * Generate Boleto de Compraventa PDF
   */
  async function generateBoletoPDF(data: BoletoFormData): Promise<string | null> {
    loading.value = true
    error.value = null

    try {
      const propertyAddress = getPropertyAddress(data.property)
      const currencyName = data.currency === 'USD' ? 'DÓLARES ESTADOUNIDENSES' : 'PESOS'
      const currencySymbol = data.currency === 'USD' ? 'USD' : '$'
      const priceInWords = numberToSpanishWords(data.price)
      const today = formatDateLong(new Date().toISOString().split('T')[0])

      // Build document text
      let text = `BOLETO DE COMPRAVENTA\n\n`
      text += '═'.repeat(60) + '\n\n'

      text += `En la Ciudad de ${data.property.address_city || 'Buenos Aires'}, a los ${today}, entre:\n\n`

      text += `EL VENDEDOR: ${data.seller.full_name}, DNI ${data.seller.dni}, con domicilio en ${data.seller.address}, en adelante "LA PARTE VENDEDORA".\n\n`

      text += `EL COMPRADOR: ${data.buyer.full_name}, DNI ${data.buyer.dni}, con domicilio en ${data.buyer.address}, en adelante "LA PARTE COMPRADORA".\n\n`

      text += '─'.repeat(60) + '\n\n'

      text += `PRIMERO (OBJETO): LA PARTE VENDEDORA vende a LA PARTE COMPRADORA, quien compra para sí, el inmueble de su propiedad ubicado en ${propertyAddress}, identificado como "${data.property.name}", con todo lo edificado, plantado, clavado y adherido al suelo, libre de todo gravamen, embargo, inhibición, ocupantes y deudas por impuestos, tasas y contribuciones.\n\n`

      text += `SEGUNDO (PRECIO): El precio total y definitivo de la presente compraventa es de ${currencyName} ${priceInWords} (${currencySymbol} ${formatCurrency(data.price, data.currency).replace(/[^\d.,]/g, '')}), que LA PARTE COMPRADORA abonará de la siguiente forma:\n\n`

      text += `${data.payment_conditions}\n\n`

      text += `TERCERO (POSESIÓN): LA PARTE VENDEDORA hará entrega de la posesión real, efectiva y desocupada del inmueble a LA PARTE COMPRADORA el día ${formatDate(data.possession_date)}, libre de ocupantes y con todas las instalaciones en perfecto estado de funcionamiento.\n\n`

      text += `CUARTO (ESCRITURACIÓN): Las partes se obligan a otorgar la escritura traslativa de dominio ante el escribano que designe LA PARTE COMPRADORA, dentro del plazo de sesenta (60) días corridos a contar desde la fecha del presente, fijándose como fecha límite el día ${formatDate(data.escritura_date)}. Los gastos de escrituración serán soportados conforme a los usos y costumbres de plaza.\n\n`

      text += `QUINTO (IMPUESTOS Y SERVICIOS): Todos los impuestos, tasas, contribuciones y servicios que graven el inmueble serán a cargo de LA PARTE VENDEDORA hasta la fecha de entrega de la posesión, y a partir de dicha fecha serán a cargo de LA PARTE COMPRADORA.\n\n`

      text += `SEXTO (SANEAMIENTO): LA PARTE VENDEDORA garantiza el saneamiento por evicción y vicios redhibitorios conforme a las disposiciones del Código Civil y Comercial de la Nación, respondiendo por cualquier turbación de derecho que sufra LA PARTE COMPRADORA.\n\n`

      text += `SÉPTIMO (CLÁUSULA PENAL): ${data.penalty_clause}\n\n`

      text += `OCTAVO (DOCUMENTACIÓN): LA PARTE VENDEDORA se obliga a entregar a LA PARTE COMPRADORA toda la documentación necesaria para la escrituración, incluyendo: título de propiedad, planos, reglamento de copropiedad (si correspondiere), libre deuda de expensas, ABL, agua y servicios, inhibiciones y declaratoria de herederos si fuere el caso.\n\n`

      text += `NOVENO (ESTADO DEL INMUEBLE): LA PARTE COMPRADORA declara conocer el estado actual del inmueble, habiéndolo visitado y aceptándolo en las condiciones en que se encuentra.\n\n`

      text += `DÉCIMO (JURISDICCIÓN): Para cualquier divergencia que surja del presente contrato, las partes se someten a la jurisdicción de los Tribunales Ordinarios de la Ciudad de ${data.property.address_city || 'Buenos Aires'}, renunciando a cualquier otro fuero o jurisdicción.\n\n`

      text += '─'.repeat(60) + '\n\n'

      text += `CLÁUSULA LEGAL: El presente boleto de compraventa se celebra de conformidad con lo dispuesto por los artículos 1123 y siguientes del Código Civil y Comercial de la Nación Argentina. Las partes declaran conocer que el presente instrumento tiene fuerza vinculante y genera obligaciones recíprocas.\n\n`

      text += '═'.repeat(60) + '\n\n'

      text += `En prueba de conformidad, las partes firman el presente documento en dos ejemplares de un mismo tenor y a un solo efecto.\n\n`

      text += '\n\n'
      text += '_'.repeat(28) + '              ' + '_'.repeat(28) + '\n'
      text += '    PARTE VENDEDORA                        PARTE COMPRADORA\n'
      text += `  ${data.seller.full_name.padEnd(30)}    ${data.buyer.full_name.padEnd(30)}\n`
      text += `  DNI: ${data.seller.dni.padEnd(24)}    DNI: ${data.buyer.dni.padEnd(24)}\n`

      text += '\n\n' + '═'.repeat(60) + '\n'
      text += 'Documento generado automáticamente por el Sistema de Gestión Inmobiliaria\n'

      // Generate PDF
      const doc = createPdfDocument()
      renderTextToPdf(doc, text, 'BOLETO DE COMPRAVENTA')
      const blob = doc.output('blob')

      // Generate filename
      const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '')
      const filename = `Boleto_Compraventa_${data.property.name.replace(/[^a-zA-Z0-9]/g, '_')}_${dateStr}.pdf`

      // Upload to storage
      const storagePath = await uploadPdfToStorage(blob, data.property_id, filename)

      // Create database record
      await legalDocumentsStore.createDocument({
        property_id: data.property_id,
        document_type: 'boleto_compraventa',
        metadata: {
          seller: data.seller,
          buyer: data.buyer,
          price: data.price,
          currency: data.currency,
          payment_conditions: data.payment_conditions,
          possession_date: data.possession_date,
          escritura_date: data.escritura_date,
          penalty_clause: data.penalty_clause,
          generated_at: new Date().toISOString(),
        },
        pdf_url: storagePath ?? undefined,
      })

      // Update property status to 'vendida'
      const { error: updateError } = await supabase
        .from('properties')
        .update({ status: 'vendida' })
        .eq('id', data.property_id)

      if (updateError) {
        console.warn('[useLegalDocumentPDF] Failed to update property status:', updateError.message)
        // Don't throw - the document was created successfully
      }

      // Trigger download
      triggerDownload(blob, filename)

      return storagePath
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Error al generar PDF de boleto de compraventa'
      console.error('[useLegalDocumentPDF] Error generating boleto PDF:', e)
      return null
    } finally {
      loading.value = false
    }
  }

  /**
   * Generate Entrega de Llaves PDF
   */
  async function generateEntregaLlavesPDF(data: EntregaLlavesFormData): Promise<string | null> {
    loading.value = true
    error.value = null

    try {
      const propertyAddress = getPropertyAddress(data.property)
      const today = formatDateLong(new Date().toISOString().split('T')[0])

      // Build document text
      let text = `ACTA DE ENTREGA DE LLAVES\n\n`
      text += '═'.repeat(60) + '\n\n'

      text += `En la Ciudad de ${data.property.address_city || 'Buenos Aires'}, a los ${today}, siendo las ______ horas, se labra la presente acta de entrega de llaves del inmueble sito en ${propertyAddress}, entre:\n\n`

      text += `QUIEN ENTREGA: ${data.deliverer.full_name}, DNI ${data.deliverer.dni}, en adelante "LA PARTE ENTREGANTE".\n\n`

      text += `QUIEN RECIBE: ${data.receiver.full_name}, DNI ${data.receiver.dni}, en adelante "LA PARTE RECEPTORA".\n\n`

      text += '─'.repeat(60) + '\n\n'

      text += `PRIMERO (FECHA DE ENTREGA): La entrega se efectúa el día ${formatDate(data.delivery_date)}, quedando a partir de dicha fecha LA PARTE RECEPTORA en posesión material del inmueble.\n\n`

      text += `SEGUNDO (ELEMENTOS ENTREGADOS): Se hace entrega de los siguientes elementos:\n\n`

      if (data.keys_count > 0) {
        text += `  - Llaves: ${data.keys_count} (${numberToSpanishWords(data.keys_count).toLowerCase()}) unidad${data.keys_count > 1 ? 'es' : ''}\n`
      }
      if (data.remotes_count > 0) {
        text += `  - Controles remotos: ${data.remotes_count} (${numberToSpanishWords(data.remotes_count).toLowerCase()}) unidad${data.remotes_count > 1 ? 'es' : ''}\n`
      }
      if (data.tags_count > 0) {
        text += `  - Tags/Tarjetas de acceso: ${data.tags_count} (${numberToSpanishWords(data.tags_count).toLowerCase()}) unidad${data.tags_count > 1 ? 'es' : ''}\n`
      }

      text += '\n'

      text += `TERCERO (ESTADO DEL INMUEBLE): El inmueble se entrega en el siguiente estado de conservación:\n\n`
      text += `${data.property_condition}\n\n`

      text += `CUARTO (LECTURA DE MEDIDORES): Se consignan las siguientes lecturas de medidores al momento de la entrega:\n\n`

      if (data.meter_readings.electricity) {
        text += `  - Electricidad: ${data.meter_readings.electricity}\n`
      }
      if (data.meter_readings.gas) {
        text += `  - Gas: ${data.meter_readings.gas}\n`
      }
      if (data.meter_readings.water) {
        text += `  - Agua: ${data.meter_readings.water}\n`
      }

      if (!data.meter_readings.electricity && !data.meter_readings.gas && !data.meter_readings.water) {
        text += `  No se registraron lecturas de medidores.\n`
      }

      text += '\n'

      text += `QUINTO (ASUNCIÓN DE GASTOS): LA PARTE RECEPTORA asume la responsabilidad del pago de todos los servicios, expensas, impuestos y demás gastos correspondientes al inmueble a partir del día ${formatDate(data.expenses_from)}.\n\n`

      if (data.observations) {
        text += `SEXTO (OBSERVACIONES): ${data.observations}\n\n`
      }

      text += `${data.observations ? 'SÉPTIMO' : 'SEXTO'} (CONFORMIDAD): Ambas partes manifiestan su conformidad con lo actuado, declarando que la entrega se efectúa de manera voluntaria y sin mediar vicio alguno del consentimiento.\n\n`

      text += '─'.repeat(60) + '\n\n'

      text += `CLÁUSULA LEGAL: La presente acta de entrega de llaves se labra de conformidad con lo dispuesto por el Código Civil y Comercial de la Nación Argentina, constituyendo prueba fehaciente de la transferencia de la posesión material del inmueble.\n\n`

      text += '═'.repeat(60) + '\n\n'

      text += `En prueba de conformidad, las partes firman la presente acta en dos ejemplares de un mismo tenor y a un solo efecto.\n\n`

      text += '\n\n'
      text += '_'.repeat(28) + '              ' + '_'.repeat(28) + '\n'
      text += '   PARTE ENTREGANTE                        PARTE RECEPTORA\n'
      text += `  ${data.deliverer.full_name.padEnd(30)}    ${data.receiver.full_name.padEnd(30)}\n`
      text += `  DNI: ${data.deliverer.dni.padEnd(24)}    DNI: ${data.receiver.dni.padEnd(24)}\n`

      text += '\n\n' + '═'.repeat(60) + '\n'
      text += 'Documento generado automáticamente por el Sistema de Gestión Inmobiliaria\n'

      // Generate PDF
      const doc = createPdfDocument()
      renderTextToPdf(doc, text, 'ACTA DE ENTREGA DE LLAVES')
      const blob = doc.output('blob')

      // Generate filename
      const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '')
      const filename = `Entrega_Llaves_${data.property.name.replace(/[^a-zA-Z0-9]/g, '_')}_${dateStr}.pdf`

      // Upload to storage
      const storagePath = await uploadPdfToStorage(blob, data.property_id, filename)

      // Create database record
      await legalDocumentsStore.createDocument({
        property_id: data.property_id,
        document_type: 'entrega_llaves',
        metadata: {
          deliverer: data.deliverer,
          receiver: data.receiver,
          delivery_date: data.delivery_date,
          keys_count: data.keys_count,
          remotes_count: data.remotes_count,
          tags_count: data.tags_count,
          property_condition: data.property_condition,
          meter_readings: data.meter_readings,
          observations: data.observations,
          expenses_from: data.expenses_from,
          generated_at: new Date().toISOString(),
        },
        pdf_url: storagePath ?? undefined,
      })

      // Trigger download
      triggerDownload(blob, filename)

      return storagePath
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Error al generar PDF de entrega de llaves'
      console.error('[useLegalDocumentPDF] Error generating entrega llaves PDF:', e)
      return null
    } finally {
      loading.value = false
    }
  }

  return {
    loading,
    error,
    // Utilities (exposed for testing/extension)
    formatCurrency,
    formatDate,
    formatDateLong,
    numberToSpanishWords,
    getPropertyAddress,
    // PDF Generators
    generateCorretajePDF,
    generateBoletoPDF,
    generateEntregaLlavesPDF,
  }
}
