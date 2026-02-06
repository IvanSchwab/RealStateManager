import { ref } from 'vue'
import { jsPDF } from 'jspdf'
import { supabase } from '@/lib/supabase'
import type {
  Contract,
  ContractWithRelations,
  CustomClause,
  Guarantor,
  GuarantorPersonaFisica,
  GuarantorFinaer,
  GuarantorPropiedad,
  Tenant,
  Owner,
  AdjustmentPeriod,
} from '@/types'

// Spanish ordinal numbers for clauses
const CLAUSE_ORDINALS: Record<number, string> = {
  1: 'PRIMERO',
  2: 'SEGUNDO',
  3: 'TERCERA',
  4: 'CUARTA',
  5: 'QUINTA',
  6: 'SEXTA',
  7: 'SÉPTIMA',
  8: 'OCTAVA',
  9: 'NOVENA',
  10: 'DÉCIMA',
  11: 'UNDÉCIMA',
  12: 'DUODÉCIMA',
  13: 'DECIMOTERCERA',
  14: 'DECIMOCUARTA',
  15: 'DECIMOQUINTA',
  16: 'DECIMOSEXTA',
  17: 'DECIMOSÉPTIMA',
  18: 'DECIMOCTAVA',
  19: 'DECIMONOVENA',
  20: 'VIGÉSIMA',
  21: 'VIGÉSIMA PRIMERA',
  22: 'VIGÉSIMA SEGUNDA',
  23: 'VIGÉSIMA TERCERA',
  24: 'VIGÉSIMA CUARTA',
  25: 'VIGÉSIMA QUINTA',
  26: 'VIGÉSIMA SEXTA',
  27: 'VIGÉSIMA SÉPTIMA',
  28: 'VIGÉSIMA OCTAVA',
  29: 'VIGÉSIMA NOVENA',
  30: 'TRIGÉSIMA',
}

// Clause titles
const CLAUSE_TITLES: Record<string, string> = {
  PRIMERO: 'OBJETO',
  SEGUNDO: 'DESTINO',
  TERCERA: 'PRECIO-AJUSTES',
  CUARTA: 'PLAZO',
  QUINTA: 'ENTREGA',
  SEXTA: 'PAGO',
  SÉPTIMA: 'SERVICIOS',
  OCTAVA: 'EXPENSAS',
  NOVENA: 'MEJORAS',
  DÉCIMA: 'ESTADO DEL INMUEBLE',
  UNDÉCIMA: 'DEVOLUCIÓN',
  DUODÉCIMA: 'INTIMACIÓN',
  DECIMOTERCERA: 'RESCISIÓN ANTICIPADA',
  DECIMOCUARTA: 'PROHIBICIONES',
  DECIMOQUINTA: 'DOMICILIOS',
  DECIMOSEXTA: 'JURISDICCIÓN',
  DECIMOSÉPTIMA: 'GASTOS',
  DECIMOCTAVA: 'ADMINISTRACIÓN',
  DECIMONOVENA: 'OBLIGACIONES DEL LOCATARIO',
  VIGÉSIMA: 'SEGURO',
  'VIGÉSIMA PRIMERA': 'GARANTÍAS',
  'VIGÉSIMA SEGUNDA': 'MORA',
  'VIGÉSIMA TERCERA': 'PENALIDADES',
  'VIGÉSIMA CUARTA': 'DISPOSICIONES FINALES',
}

// Adjustment period labels
const ADJUSTMENT_PERIOD_LABELS: Record<AdjustmentPeriod, string> = {
  trimestral: 'trimestralmente',
  semestral: 'semestralmente',
  anual: 'anualmente',
}

export function useContractPDF() {
  const loading = ref(false)
  const error = ref<string | null>(null)

  /**
   * Format currency in Argentine format
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
   * Format date in DD/MM/YYYY format
   */
  function formatDate(dateStr: string | null | undefined): string {
    if (!dateStr) return '[FECHA]'
    const date = new Date(dateStr + 'T00:00:00')
    return date.toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  /**
   * Convert number to Spanish words for amounts
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
   * Get full property address
   */
  function getPropertyAddress(contract: ContractWithRelations): string {
    const p = contract.property
    if (!p) return '[DIRECCIÓN DE LA PROPIEDAD]'

    let address = p.address_street
    if (p.address_number) address += ` ${p.address_number}`
    if (p.address_floor) address += `, Piso ${p.address_floor}`
    if (p.address_apartment) address += `, Depto ${p.address_apartment}`
    if (p.address_city) address += `, ${p.address_city}`
    if (p.address_state) address += `, ${p.address_state}`
    return address
  }

  /**
   * Get titular tenant from contract
   */
  function getTitular(contract: ContractWithRelations): Tenant | null {
    return contract.tenants?.find(ct => ct.role === 'titular')?.tenant ?? null
  }

  /**
   * Get co-titulares from contract
   */
  function getCoTitulares(contract: ContractWithRelations): Tenant[] {
    return contract.tenants
      ?.filter(ct => ct.role === 'co_titular')
      .map(ct => ct.tenant)
      .filter((t): t is Tenant => t !== undefined) ?? []
  }

  /**
   * Detect if contract needs plural version (more than 1 tenant)
   */
  function isPluralContract(contract: ContractWithRelations): boolean {
    const coTitularCount = getCoTitulares(contract).length
    return coTitularCount > 0
  }

  /**
   * Get clause key from number
   */
  function getClauseKey(clauseNumber: number): string {
    return CLAUSE_ORDINALS[clauseNumber] ?? `CLÁUSULA ${clauseNumber}`
  }

  /**
   * Get all tenant names formatted
   */
  function getAllTenantNames(contract: ContractWithRelations): string {
    const titular = getTitular(contract)
    const coTitulares = getCoTitulares(contract)

    const names: string[] = []
    if (titular) {
      names.push(`${titular.first_name} ${titular.last_name}, DNI ${titular.dni || '[DNI]'}, CUIL/CUIT ${titular.cuit_cuil || '[CUIL]'}`)
    }
    coTitulares.forEach(ct => {
      names.push(`${ct.first_name} ${ct.last_name}, DNI ${ct.dni || '[DNI]'}, CUIL/CUIT ${ct.cuit_cuil || '[CUIL]'}`)
    })

    if (names.length === 0) return '[NOMBRE DEL LOCATARIO]'
    if (names.length === 1) return names[0]
    return names.slice(0, -1).join(', ') + ' y ' + names[names.length - 1]
  }

  /**
   * Get owner information from property
   */
  function getOwnerInfo(contract: ContractWithRelations): { name: string; cuit: string; address: string } {
    const owner = contract.property?.owner
    return {
      name: owner?.full_name || '[NOMBRE DEL PROPIETARIO]',
      cuit: contract.owner_cuit || owner?.cuit_cuil || '[CUIT DEL PROPIETARIO]',
      address: contract.owner_legal_address || owner?.address || '[DOMICILIO DEL PROPIETARIO]',
    }
  }

  /**
   * Generate default clause text based on clause number
   */
  function getDefaultClauseText(
    clauseNumber: number,
    contract: ContractWithRelations
  ): string {
    const isPlural = isPluralContract(contract)
    const clauseKey = getClauseKey(clauseNumber)
    const titular = getTitular(contract)
    const coTitulares = getCoTitulares(contract)
    const ownerInfo = getOwnerInfo(contract)
    const propertyAddress = getPropertyAddress(contract)

    // Singular/Plural variations
    const locatario = isPlural ? 'LOS LOCATARIOS' : 'EL LOCATARIO'
    const locatarioMin = isPlural ? 'los locatarios' : 'el locatario'
    const locador = 'EL LOCADOR'
    const se_obliga = isPlural ? 'se obligan' : 'se obliga'
    const debera = isPlural ? 'deberán' : 'deberá'
    const podra = isPlural ? 'podrán' : 'podrá'
    const tendra = isPlural ? 'tendrán' : 'tendrá'
    const su = isPlural ? 'sus' : 'su'

    switch (clauseNumber) {
      case 1: // PRIMERO - OBJETO
        return `${clauseKey} (${CLAUSE_TITLES[clauseKey]}): ${locador}, ${ownerInfo.name}, CUIT ${ownerInfo.cuit}, da en locación a ${locatarioMin}, ${getAllTenantNames(contract)}, quien${isPlural ? 'es' : ''} habitará${isPlural ? 'n' : ''} el inmueble ubicado en ${propertyAddress}. ${contract.property_description || 'El inmueble se entrega en las condiciones que se detallan en el inventario anexo.'}`

      case 2: // SEGUNDO - DESTINO
        return `${clauseKey} (${CLAUSE_TITLES[clauseKey]}): El inmueble objeto de la presente locación será destinado exclusivamente a vivienda familiar de ${locatarioMin} y ${su} grupo conviviente, quedando prohibida su utilización para cualquier otro destino distinto al pactado. Queda expresamente prohibido el subalquiler total o parcial del inmueble.`

      case 3: // TERCERA - PRECIO-AJUSTES
        const rentInWords = numberToSpanishWords(contract.base_rent_amount)
        const adjustmentFreq = contract.adjustment_period ? ADJUSTMENT_PERIOD_LABELS[contract.adjustment_period] : 'según lo acordado'
        const adjustmentType = contract.adjustment_type || 'índice acordado'
        return `${clauseKey} (${CLAUSE_TITLES[clauseKey]}): El canon locativo mensual inicial es de PESOS ${rentInWords} (${formatCurrency(contract.base_rent_amount)}). El ajuste del precio del alquiler se realizará ${adjustmentFreq} aplicando el índice ${adjustmentType} publicado por el Banco Central de la República Argentina. El alquiler deberá ser abonado por adelantado, del 1 al ${contract.payment_due_day || 10} de cada mes, en días hábiles, en ${contract.payment_location || 'el domicilio designado por el locador'} en horario de ${contract.payment_hours || '9:00 a 18:00 horas'}.`

      case 4: // CUARTA - PLAZO
        const startDate = formatDate(contract.start_date)
        const endDate = formatDate(contract.end_date)
        const duration = Math.round((new Date(contract.end_date).getTime() - new Date(contract.start_date).getTime()) / (1000 * 60 * 60 * 24 * 30))
        return `${clauseKey} (${CLAUSE_TITLES[clauseKey]}): El plazo de la presente locación es de ${duration} (${numberToSpanishWords(duration)}) meses, comenzando a regir el día ${startDate} y finalizando indefectiblemente el día ${endDate}, fecha en la cual ${locatario} ${debera} restituir el inmueble libre de personas y cosas.`

      case 5: // QUINTA - ENTREGA
        return `${clauseKey} (${CLAUSE_TITLES[clauseKey]}): ${locador} hace entrega del inmueble a ${locatarioMin} en este acto, encontrándose el mismo en perfecto estado de conservación, higiene y funcionamiento de todas sus instalaciones, según consta en el inventario que se adjunta como anexo al presente contrato y que forma parte integrante del mismo.`

      case 6: // SEXTA - PAGO
        const depositAmount = contract.deposit_amount || contract.base_rent_amount
        const depositInWords = numberToSpanishWords(depositAmount)
        return `${clauseKey} (${CLAUSE_TITLES[clauseKey]}): ${locatario} abona en este acto en concepto de depósito en garantía la suma de PESOS ${depositInWords} (${formatCurrency(depositAmount)}), equivalente a un mes de alquiler, el cual será devuelto al finalizar el contrato una vez verificado el correcto estado del inmueble y canceladas todas las obligaciones pendientes.`

      case 7: // SÉPTIMA - SERVICIOS
        return `${clauseKey} (${CLAUSE_TITLES[clauseKey]}): Serán a cargo de ${locatarioMin} los gastos correspondientes a consumos de luz, gas, agua, teléfono, internet, cable y cualquier otro servicio domiciliario que se contraten durante la vigencia de la locación. ${locatario} se ${se_obliga} a mantener dichos servicios al día y a presentar los comprobantes de pago cuando ${locador} lo requiera.`

      case 8: // OCTAVA - EXPENSAS
        return `${clauseKey} (${CLAUSE_TITLES[clauseKey]}): Las expensas ordinarias del consorcio serán a cargo de ${locatarioMin}, quien deberá abonarlas mensualmente dentro de los plazos establecidos por la administración del edificio. Las expensas extraordinarias serán a cargo de ${locador}. ${locatario} deberá presentar los comprobantes de pago cuando le sean requeridos.`

      case 9: // NOVENA - MEJORAS
        return `${clauseKey} (${CLAUSE_TITLES[clauseKey]}): ${locatario} no ${podra} realizar mejoras, modificaciones o refacciones en el inmueble sin previa autorización escrita de ${locador}. En caso de autorizarse, las mismas quedarán en beneficio del inmueble sin derecho a indemnización alguna. Las mejoras realizadas sin autorización deberán ser removidas al finalizar el contrato a costa de ${locatarioMin}.`

      case 10: // DÉCIMA - ESTADO DEL INMUEBLE
        return `${clauseKey} (${CLAUSE_TITLES[clauseKey]}): ${locatario} recibe el inmueble en perfecto estado de conservación y funcionamiento, conforme al inventario adjunto, obligándose a mantenerlo en las mismas condiciones y a efectuar a su cargo las reparaciones menores y locativas que fueren necesarias durante la vigencia del contrato.`

      case 11: // UNDÉCIMA - DEVOLUCIÓN
        return `${clauseKey} (${CLAUSE_TITLES[clauseKey]}): Al vencimiento del plazo contractual o ante cualquier causa de rescisión, ${locatario} ${debera} restituir el inmueble libre de ocupantes y de cualquier efecto personal, en el mismo estado en que lo recibió, salvo el deterioro normal por el uso. La entrega se efectuará mediante acta con verificación del inventario.`

      case 12: // DUODÉCIMA - INTIMACIÓN
        return `${clauseKey} (${CLAUSE_TITLES[clauseKey]}): La falta de pago de un período mensual de alquiler, expensas o servicios, o el incumplimiento de cualquier obligación del presente contrato, facultará a ${locador} a intimar fehacientemente a ${locatarioMin} para que regularice su situación en el plazo de diez (10) días, bajo apercibimiento de resolver el contrato.`

      case 13: // DECIMOTERCERA - RESCISIÓN ANTICIPADA
        const penaltyMonths = contract.early_termination_penalty_months || 2
        return `${clauseKey} (${CLAUSE_TITLES[clauseKey]}): ${locatario} ${podra} rescindir anticipadamente el presente contrato debiendo notificar su decisión en forma fehaciente con un mínimo de treinta (30) días de anticipación. Si la rescisión se produce durante el primer año de vigencia, ${debera} abonar como indemnización una suma equivalente a ${penaltyMonths} (${numberToSpanishWords(penaltyMonths)}) meses de alquiler.`

      case 14: // DECIMOCUARTA - PROHIBICIONES
        return `${clauseKey} (${CLAUSE_TITLES[clauseKey]}): Queda expresamente prohibido: a) subalquilar o ceder el contrato total o parcialmente; b) introducir en el inmueble materiales inflamables, explosivos o peligrosos; c) tener animales domésticos sin autorización expresa del locador; d) realizar actividades que molesten a los vecinos o contravengan las normas del consorcio; e) modificar la estructura del inmueble.`

      case 15: // DECIMOQUINTA - DOMICILIOS
        const titularAddress = titular?.address || '[DOMICILIO DEL LOCATARIO]'
        return `${clauseKey} (${CLAUSE_TITLES[clauseKey]}): Las partes constituyen los siguientes domicilios especiales a todos los efectos legales: ${locador}: ${ownerInfo.address}. ${locatario}: ${titularAddress} y el inmueble objeto de la locación. Todos los domicilios se consideran válidos para notificaciones judiciales y extrajudiciales.`

      case 16: // DECIMOSEXTA - JURISDICCIÓN
        return `${clauseKey} (${CLAUSE_TITLES[clauseKey]}): Para cualquier divergencia que surja del presente contrato, las partes se someten a la jurisdicción de los Tribunales Ordinarios de la Ciudad de Buenos Aires, renunciando expresamente a cualquier otro fuero o jurisdicción que pudiera corresponderles.`

      case 17: // DECIMOSÉPTIMA - GASTOS
        return `${clauseKey} (${CLAUSE_TITLES[clauseKey]}): Los gastos de sellado del presente contrato, honorarios y comisiones inmobiliarias serán abonados por mitades iguales entre ${locador} y ${locatario}, salvo acuerdo expreso en contrario. Los gastos de informes, certificaciones y gestiones serán a cargo de quien los solicite.`

      case 18: // DECIMOCTAVA - ADMINISTRACIÓN
        return `${clauseKey} (${CLAUSE_TITLES[clauseKey]}): La administración del presente contrato estará a cargo de Olivera de Schwab Propiedades, con domicilio en Lincoln 3598, San Martín, Provincia de Buenos Aires, quien actuará como mandataria del locador para la percepción de los alquileres y el cumplimiento de las obligaciones derivadas del contrato.`

      case 19: // DECIMONOVENA - OBLIGACIONES DEL LOCATARIO
        return `${clauseKey} (${CLAUSE_TITLES[clauseKey]}): ${locatario} se ${se_obliga} a: a) habitar el inmueble personalmente; b) mantener el inmueble en buen estado de conservación; c) permitir el acceso para reparaciones urgentes; d) notificar inmediatamente cualquier desperfecto; e) cumplir con las normas del consorcio; f) abonar puntualmente todas las obligaciones a su cargo.`

      case 20: // VIGÉSIMA - SEGURO
        const insuranceText = contract.insurance_required
          ? `${locatario} se ${se_obliga} a contratar un seguro de responsabilidad civil e incendio del inmueble, debiendo presentar la póliza correspondiente dentro de los treinta (30) días de celebrado el presente contrato.`
          : `${locatario} ${podra} contratar un seguro de responsabilidad civil e incendio del inmueble, lo cual es recomendado pero no obligatorio en el presente contrato.`
        return `${clauseKey} (${CLAUSE_TITLES[clauseKey]}): ${insuranceText} El seguro deberá mantenerse vigente durante toda la duración del contrato.`

      case 21: // VIGÉSIMA PRIMERA - GARANTÍAS
        return generateGuarantorsClause(contract)

      case 22: // VIGÉSIMA SEGUNDA - MORA
        const interestRate = contract.daily_interest_rate || contract.late_payment_interest_rate || 0.5
        return `${clauseKey} (${CLAUSE_TITLES[clauseKey]}): La mora en el pago del alquiler o cualquier otra obligación dineraria se producirá de pleno derecho, sin necesidad de interpelación alguna. El monto adeudado devengará un interés punitorio del ${interestRate}% (${numberToSpanishWords(interestRate * 100).toLowerCase()} centésimos por ciento) diario sobre el capital adeudado.`

      case 23: // VIGÉSIMA TERCERA - PENALIDADES
        const penaltyRate = contract.daily_penalty_rate || contract.non_return_penalty_rate || 10
        return `${clauseKey} (${CLAUSE_TITLES[clauseKey]}): En caso de que ${locatario} no restituyere el inmueble al vencimiento del contrato o de cualquier prórroga, deberá abonar una penalidad equivalente al ${penaltyRate}% (${numberToSpanishWords(penaltyRate)} por ciento) diario del valor del último alquiler, sin perjuicio de las acciones legales que correspondan para obtener el desalojo.`

      case 24: // VIGÉSIMA CUARTA - DISPOSICIONES FINALES
        return `${clauseKey} (${CLAUSE_TITLES[clauseKey]}): El presente contrato se celebra de conformidad con lo dispuesto por el Código Civil y Comercial de la Nación y la Ley de Alquileres vigente. Las partes declaran conocer y aceptar todas las cláusulas del presente, firmando tres ejemplares de un mismo tenor y a un solo efecto, en la Ciudad de Buenos Aires, a los días del mes de ${new Date().toLocaleDateString('es-AR', { month: 'long' })} de ${new Date().getFullYear()}.`

      default:
        return `${clauseKey}: [Contenido de la cláusula ${clauseNumber}]`
    }
  }

  /**
   * Generate guarantors clause (VIGÉSIMA PRIMERA) with all guarantor types
   */
  function generateGuarantorsClause(contract: ContractWithRelations): string {
    const clauseKey = 'VIGÉSIMA PRIMERA'
    const guarantors = contract.guarantors || []

    if (guarantors.length === 0) {
      return `${clauseKey} (${CLAUSE_TITLES[clauseKey]}): El presente contrato se celebra sin garantía personal o real adicional, siendo el depósito establecido en la cláusula SEXTA la única garantía del cumplimiento de las obligaciones del locatario.`
    }

    let text = `${clauseKey} (${CLAUSE_TITLES[clauseKey]}): A los efectos de garantizar el fiel cumplimiento de todas las obligaciones emergentes del presente contrato, se constituyen las siguientes garantías:\n\n`

    guarantors.forEach((guarantor, index) => {
      const number = index + 1

      if (guarantor.type === 'persona_fisica') {
        const g = guarantor as GuarantorPersonaFisica
        text += `${number}. GARANTÍA PERSONAL: El/La Sr/a. ${g.full_name}, DNI ${g.dni}, CUIL ${g.cuil}, con domicilio en ${g.address}, teléfono ${g.phone || '[TELÉFONO]'}, se constituye en GARANTE solidario, liso, llano y principal pagador de todas las obligaciones asumidas por el locatario en el presente contrato, renunciando expresamente a los beneficios de excusión y división previstos en el Código Civil y Comercial de la Nación. Esta garantía se extiende hasta la total restitución del inmueble y cancelación de cualquier deuda pendiente.\n\n`
      } else if (guarantor.type === 'finaer') {
        const g = guarantor as GuarantorFinaer
        text += `${number}. GARANTÍA FINAER: Se presenta como garantía el aval otorgado por ${g.company_name}, CUIT ${g.cuit}, mediante CÓDIGO DE GARANTÍA N° ${g.guarantee_code}. Actúa como representante el/la Sr/a. ${g.representative_name}, DNI ${g.representative_dni}. Esta garantía cubre las obligaciones del locatario conforme a los términos y condiciones establecidos por SISTEMA FINAER S.A.\n\n`
      } else if (guarantor.type === 'propiedad') {
        const g = guarantor as GuarantorPropiedad
        text += `${number}. GARANTÍA PROPIETARIA: El/La Sr/a. ${g.guarantor_name}, DNI ${g.guarantor_dni}, CUIL ${g.guarantor_cuil || '[CUIL]'}, avala el presente contrato con el inmueble de su propiedad ubicado en ${g.property_address}. NOMENCLATURA CATASTRAL: ${g.cadastral_data}. ${g.cadastral_details ? `Detalles adicionales: ${g.cadastral_details}. ` : ''}El garante se obliga solidariamente con el locatario por el cumplimiento de todas las obligaciones del presente contrato.\n\n`
      }
    })

    return text.trim()
  }

  /**
   * Generate full contract text with all clauses
   */
  function generateContractText(contract: ContractWithRelations): string {
    const isPlural = isPluralContract(contract)
    const titular = getTitular(contract)
    const coTitulares = getCoTitulares(contract)
    const ownerInfo = getOwnerInfo(contract)
    const propertyAddress = getPropertyAddress(contract)

    // Header
    let contractText = 'CONTRATO DE LOCACIÓN DE INMUEBLE PARA VIVIENDA\n\n'
    contractText += '═'.repeat(60) + '\n\n'

    // Parties introduction
    contractText += `Entre ${ownerInfo.name}, CUIT ${ownerInfo.cuit}, con domicilio en ${ownerInfo.address}, en adelante denominado "EL LOCADOR", `
    contractText += `y ${getAllTenantNames(contract)}, en adelante denominado${isPlural ? 's' : ''} "${isPlural ? 'LOS LOCATARIOS' : 'EL LOCATARIO'}", `
    contractText += `se celebra el presente contrato de locación sujeto a las siguientes cláusulas:\n\n`
    contractText += '─'.repeat(60) + '\n\n'

    // Generate 24 standard clauses
    for (let i = 1; i <= 24; i++) {
      const clauseKey = getClauseKey(i)
      const overrideText = contract.clause_overrides?.[clauseKey]
      const defaultText = getDefaultClauseText(i, contract)

      contractText += (overrideText || defaultText) + '\n\n'
    }

    // Append custom clauses
    if (contract.custom_clauses && contract.custom_clauses.length > 0) {
      contractText += '─'.repeat(60) + '\n'
      contractText += 'CLÁUSULAS ADICIONALES\n'
      contractText += '─'.repeat(60) + '\n\n'

      contract.custom_clauses.forEach(clause => {
        contractText += `${clause.number} (${clause.title}): ${clause.content}\n\n`
      })
    }

    // Signature section
    const city = contract.property?.address_city || 'Buenos Aires'
    const signatureDate = formatDate(contract.start_date)

    contractText += '\n\n'
    contractText += '═'.repeat(60) + '\n\n'
    contractText += `En prueba de conformidad, las partes firman el presente contrato en tres ejemplares de un mismo tenor y a un solo efecto en ${city}, a los ${signatureDate}.\n\n`
    contractText += '\n\n'

    // Owner signature
    const ownerName = ownerInfo.name !== '[NOMBRE DEL PROPIETARIO]' ? ownerInfo.name : (contract.property?.owner?.full_name || 'N/A')
    const ownerCuit = ownerInfo.cuit !== '[CUIT DEL PROPIETARIO]' ? ownerInfo.cuit : (contract.property?.owner?.cuit_cuil || 'N/A')

    // Tenant signature - get full name properly
    const titularFullName = titular ? `${titular.first_name} ${titular.last_name}` : 'N/A'
    const titularDni = titular?.dni || 'N/A'

    // Build all tenant names for display (for co-tenants)
    const allTenantNames: string[] = []
    if (titular) {
      allTenantNames.push(`${titular.first_name} ${titular.last_name}`)
    }
    coTitulares.forEach(ct => {
      allTenantNames.push(`${ct.first_name} ${ct.last_name}`)
    })
    const tenantDisplayName = allTenantNames.length <= 1
      ? titularFullName
      : allTenantNames.slice(0, -1).join(', ') + ' y ' + allTenantNames[allTenantNames.length - 1]

    contractText += '_'.repeat(28) + '              ' + '_'.repeat(28) + '\n'
    contractText += '       EL LOCADOR                              EL LOCATARIO\n'
    contractText += `  ${ownerName.padEnd(30)}      ${titularFullName.padEnd(30)}\n`
    contractText += `  CUIT: ${ownerCuit.padEnd(22)}      DNI: ${titularDni.padEnd(24)}\n`

    // Co-tenants signatures if any
    if (coTitulares.length > 0) {
      contractText += '\n\nCO-LOCATARIOS:\n'
      coTitulares.forEach(ct => {
        const ctName = `${ct.first_name} ${ct.last_name}`
        const ctDni = ct.dni || 'N/A'
        contractText += '\n' + '_'.repeat(28) + '\n'
        contractText += `  ${ctName}\n`
        contractText += `  DNI: ${ctDni}\n`
      })
    }

    // Guarantors signatures
    if (contract.guarantors && contract.guarantors.length > 0) {
      contractText += '\n\n' + '─'.repeat(60) + '\n'
      contractText += 'GARANTES:\n'
      contractText += '─'.repeat(60) + '\n\n'

      contract.guarantors.forEach((g, index) => {
        let name = ''
        let id = ''
        let typeLabel = ''

        if (g.type === 'persona_fisica') {
          const gPf = g as GuarantorPersonaFisica
          name = gPf.full_name
          id = `DNI: ${gPf.dni || 'N/A'} - CUIL: ${gPf.cuil || 'N/A'}`
          typeLabel = 'Persona Física'
        } else if (g.type === 'finaer') {
          const gFin = g as GuarantorFinaer
          name = gFin.company_name
          id = `CUIT: ${gFin.cuit || 'N/A'} - Código: ${gFin.guarantee_code || 'N/A'}`
          typeLabel = 'FINAER'
        } else if (g.type === 'propiedad') {
          const gProp = g as GuarantorPropiedad
          name = gProp.guarantor_name
          id = `DNI: ${gProp.guarantor_dni || 'N/A'} - CUIL: ${gProp.guarantor_cuil || 'N/A'}`
          typeLabel = 'Propiedad en Garantía'
        }

        contractText += '_'.repeat(28) + '\n'
        contractText += `GARANTE ${index + 1}: ${name}\n`
        contractText += `${id}\n`
        contractText += `Tipo: ${typeLabel}\n\n`
      })
    }

    // Final footer
    contractText += '\n' + '═'.repeat(60) + '\n'
    contractText += 'Documento generado automáticamente por el Sistema de Gestión Inmobiliaria\n'

    return contractText
  }

  /**
   * Generate PDF from contract
   */
  async function generatePDF(contract: ContractWithRelations): Promise<Blob> {
    loading.value = true
    error.value = null

    try {
      const contractText = generateContractText(contract)
      const titular = getTitular(contract)
      const propertyAddress = getPropertyAddress(contract)

      // Create PDF
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      })

      // Set font
      doc.setFont('times', 'normal')

      // Page dimensions
      const pageWidth = doc.internal.pageSize.getWidth()
      const pageHeight = doc.internal.pageSize.getHeight()
      const margin = 25 // 2.5cm margins
      const usableWidth = pageWidth - (margin * 2)
      const lineHeight = 6

      // Title
      doc.setFontSize(14)
      doc.setFont('times', 'bold')
      const title = 'CONTRATO DE LOCACIÓN DE INMUEBLE PARA VIVIENDA'
      const titleWidth = doc.getTextWidth(title)
      doc.text(title, (pageWidth - titleWidth) / 2, margin)

      doc.setFontSize(11)
      doc.setFont('times', 'normal')

      // Split text into lines
      const lines = contractText.split('\n')
      let y = margin + 15

      for (const line of lines) {
        // Check if we need a new page
        if (y > pageHeight - margin) {
          doc.addPage()
          y = margin
        }

        // Handle special formatting
        if (line.startsWith('═') || line.startsWith('─')) {
          doc.setDrawColor(100)
          doc.line(margin, y - 2, pageWidth - margin, y - 2)
          y += 3
          continue
        }

        if (line.startsWith('_')) {
          // Signature line
          doc.line(margin, y, margin + 50, y)
          y += lineHeight
          continue
        }

        // Check if it's a clause header (bold)
        const clauseMatch = line.match(/^(PRIMERO|SEGUNDO|TERCERA|CUARTA|QUINTA|SEXTA|SÉPTIMA|OCTAVA|NOVENA|DÉCIMA|UNDÉCIMA|DUODÉCIMA|DECIMOTERCERA|DECIMOCUARTA|DECIMOQUINTA|DECIMOSEXTA|DECIMOSÉPTIMA|DECIMOCTAVA|DECIMONOVENA|VIGÉSIMA|VIGÉSIMA PRIMERA|VIGÉSIMA SEGUNDA|VIGÉSIMA TERCERA|VIGÉSIMA CUARTA)/)

        if (clauseMatch || line.includes('CONTRATO DE LOCACIÓN') || line.includes('CLÁUSULAS ADICIONALES')) {
          doc.setFont('times', 'bold')
        } else {
          doc.setFont('times', 'normal')
        }

        // Word wrap
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

      // Return as blob
      return doc.output('blob')
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Error al generar PDF'
      throw e
    } finally {
      loading.value = false
    }
  }

  /**
   * Download PDF with proper filename
   */
  async function downloadPDF(contract: ContractWithRelations): Promise<void> {
    const blob = await generatePDF(contract)

    // Generate filename
    const titular = getTitular(contract)
    const propertyAddress = getPropertyAddress(contract)
      .replace(/[^a-zA-Z0-9]/g, '_')
      .substring(0, 30)
    const tenantName = titular
      ? `${titular.first_name}_${titular.last_name}`.replace(/[^a-zA-Z0-9]/g, '_')
      : 'Inquilino'
    const startDate = contract.start_date.replace(/-/g, '')

    const filename = `Contrato_${propertyAddress}_${tenantName}_${startDate}.pdf`

    // Create download link
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
   * Save contract PDF-related edits to database
   */
  async function saveContractPDFData(
    contractId: string,
    updates: {
      property_description?: string
      custom_clauses?: CustomClause[]
      clause_overrides?: Record<string, string>
      owner_legal_address?: string
      owner_cuit?: string
      daily_penalty_rate?: number
      daily_interest_rate?: number
      payment_location?: string
      payment_hours?: string
    }
  ): Promise<void> {
    loading.value = true
    error.value = null

    try {
      const { error: updateError } = await supabase
        .from('contracts')
        .update(updates)
        .eq('id', contractId)

      if (updateError) throw updateError
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Error al guardar datos'
      throw e
    } finally {
      loading.value = false
    }
  }

  return {
    loading,
    error,
    // Utilities
    formatCurrency,
    formatDate,
    numberToSpanishWords,
    getPropertyAddress,
    getTitular,
    getCoTitulares,
    isPluralContract,
    getClauseKey,
    getAllTenantNames,
    getOwnerInfo,
    // Clause generation
    CLAUSE_ORDINALS,
    CLAUSE_TITLES,
    getDefaultClauseText,
    generateGuarantorsClause,
    generateContractText,
    // PDF generation
    generatePDF,
    downloadPDF,
    // Database
    saveContractPDFData,
  }
}
