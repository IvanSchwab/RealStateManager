<template>
  <div class="p-6">
      <!-- Loading state -->
      <div v-if="loading" class="py-12 text-center text-muted-foreground">
        <Loader2 class="w-8 h-8 mx-auto animate-spin" />
        <p class="mt-2">{{ $t('contracts.loadingContracts') }}</p>
      </div>

      <!-- Error state -->
      <div v-else-if="error" class="py-12 text-center">
        <p class="text-destructive font-medium mb-2">{{ $t('contracts.errorLoading') }}</p>
        <p class="text-sm text-muted-foreground mb-4">{{ error }}</p>
        <Button variant="outline" @click="loadContract">
          {{ $t('common.retry') }}
        </Button>
      </div>

      <!-- Not found state -->
      <div v-else-if="!contract" class="py-12 text-center">
        <FileText class="w-12 h-12 mx-auto text-muted-foreground mb-4" />
        <p class="text-lg font-medium text-muted-foreground mb-2">{{ $t('contracts.contractNotFound') }}</p>
        <Button variant="outline" @click="goBack">
          <ArrowLeft class="w-4 h-4 mr-2" />
          {{ $t('contracts.backToList') }}
        </Button>
      </div>

      <!-- Contract details -->
      <template v-else>
        <!-- Header -->
        <div class="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
          <div>
            <Button variant="ghost" size="sm" class="mb-2" @click="goBack">
              <ArrowLeft class="w-4 h-4 mr-2" />
              {{ $t('contracts.backToContracts') }}
            </Button>
            <h1 class="text-2xl font-bold">{{ $t('contracts.contractTitle') }} - {{ propertyAddress }}</h1>
            <div class="flex items-center gap-2 mt-2">
              <Badge :class="getStatusBadgeClass(displayStatus)">
                {{ $t(`contracts.${displayStatus}`) }}
              </Badge>
              <Badge variant="outline" class="capitalize">
                {{ $t(`contracts.${contract.contract_type}`) }}
              </Badge>
            </div>
          </div>
          <div class="grid grid-cols-3 md:flex md:items-center gap-2 w-full md:w-auto">
            <Button variant="outline" size="sm" @click="openEditDialog">
              <Pencil class="w-4 h-4 md:mr-2" />
              <span class="hidden md:inline">{{ $t('common.edit') }}</span>
            </Button>
            <Button variant="outline" size="sm" @click="openPDFEditor">
              <FileText class="w-4 h-4 md:mr-2" />
              <span class="hidden md:inline">{{ $t('contracts.generatePDF') }}</span>
            </Button>
            <!-- Lifecycle actions dropdown - hidden for draft contracts -->
            <DropdownMenu v-if="displayStatus !== 'draft'">
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" class="w-full">
                  <MoreHorizontal class="w-4 h-4 md:mr-2" />
                  <span class="hidden md:inline">{{ $t('common.actions') }}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" class="w-48">
                <!-- Extend (Prórroga) - only for active/expiring_soon contracts -->
                <DropdownMenuItem
                  v-if="displayStatus === 'active' || displayStatus === 'expiring_soon'"
                  @click="showExtensionDialog = true"
                >
                  <CalendarPlus class="w-4 h-4 mr-2" />
                  {{ $t('contracts.extendContract') }}
                </DropdownMenuItem>
                <!-- Renew button -->
                <DropdownMenuItem
                  v-if="displayStatus === 'active' || displayStatus === 'expiring_soon'"
                  :title="$t('contracts.contractCurrentlyActive')"
                  @click="handleRenew"
                >
                  <RefreshCw class="w-4 h-4 mr-2" />
                  {{ $t('contracts.renewContract') }}
                </DropdownMenuItem>
                <DropdownMenuItem
                  v-else-if="displayStatus === 'expired' || displayStatus === 'renewed'"
                  @click="handleRenew"
                >
                  <RefreshCw class="w-4 h-4 mr-2" />
                  {{ $t('contracts.renewContract') }}
                </DropdownMenuItem>
                <DropdownMenuItem
                  v-else-if="displayStatus === 'cancelled'"
                  disabled
                >
                  <RefreshCw class="w-4 h-4 mr-2" />
                  {{ $t('contracts.renewContract') }}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <!-- Rescind button -->
                <DropdownMenuItem
                  class="text-destructive focus:text-destructive"
                  :disabled="displayStatus === 'cancelled'"
                  @click="openRescindDialog"
                >
                  <XCircle class="w-4 h-4 mr-2" />
                  {{ $t('contracts.rescindContract') }}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <!-- Rent Adjustment Alert -->
        <AdjustmentAlert
          v-if="contract && displayStatus === 'active'"
          :contract="contract"
          @apply-adjustment="showAdjustmentDialog = true"
        />

        <!-- Content Grid -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <!-- Main Column -->
          <div class="lg:col-span-2 space-y-6">
            <!-- General Information Card -->
            <Card>
              <CardHeader>
                <CardTitle class="text-lg">{{ $t('contracts.generalInfo') }}</CardTitle>
              </CardHeader>
              <CardContent>
                <dl class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div class="md:col-span-2">
                    <dt class="text-sm text-muted-foreground">{{ $t('contracts.property') }}</dt>
                    <dd class="font-medium">
                      <RouterLink
                        :to="{ name: 'property-detail', params: { id: contract.property_id } }"
                        class="text-primary hover:underline"
                      >
                        {{ propertyAddress }}
                      </RouterLink>
                    </dd>
                  </div>
                  <div>
                    <dt class="text-sm text-muted-foreground">{{ $t('contracts.contractType') }}</dt>
                    <dd class="font-medium capitalize">{{ $t(`contracts.${contract.contract_type}`) }}</dd>
                  </div>
                  <div>
                    <dt class="text-sm text-muted-foreground">{{ $t('common.status') }}</dt>
                    <dd>
                      <Badge :class="['mt-1', getStatusBadgeClass(displayStatus)]">
                        {{ $t(`contracts.${displayStatus}`) }}
                      </Badge>
                    </dd>
                  </div>
                  <div>
                    <dt class="text-sm text-muted-foreground">{{ $t('contracts.startDate') }}</dt>
                    <dd class="font-medium">{{ formatDate(contract.start_date) }}</dd>
                  </div>
                  <div>
                    <dt class="text-sm text-muted-foreground">{{ $t('contracts.endDate') }}</dt>
                    <dd class="font-medium">{{ formatDate(contract.end_date) }}</dd>
                  </div>
                  <div>
                    <dt class="text-sm text-muted-foreground">{{ $t('contracts.duration') }}</dt>
                    <dd class="font-medium">{{ $t('contracts.durationMonths', { months: contractDuration }) }}</dd>
                  </div>
                  <div>
                    <dt class="text-sm text-muted-foreground">{{ $t('contracts.firstPayment') }}</dt>
                    <dd class="font-medium">{{ formatDate(contract.first_payment_date) }}</dd>
                  </div>
                </dl>
              </CardContent>
            </Card>

            <!-- Financial Terms Card -->
            <Card>
              <CardHeader>
                <CardTitle class="text-lg">{{ $t('contracts.financialTerms') }}</CardTitle>
              </CardHeader>
              <CardContent>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <!-- Rent amounts - highlighted -->
                  <div class="md:col-span-2 p-4 bg-primary/5 rounded-lg">
                    <div class="grid grid-cols-2 gap-4">
                      <div>
                        <p class="text-sm text-muted-foreground">{{ $t('contracts.baseRent') }}</p>
                        <p class="text-2xl font-bold text-primary">
                          {{ formatCurrency(contract.base_rent_amount) }}
                        </p>
                      </div>
                      <div v-if="contract.current_rent_amount !== contract.base_rent_amount">
                        <p class="text-sm text-muted-foreground">{{ $t('contracts.currentRent') }}</p>
                        <p class="text-2xl font-bold text-primary">
                          {{ formatCurrency(contract.current_rent_amount) }}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <dt class="text-sm text-muted-foreground">{{ $t('contracts.deposit') }}</dt>
                    <dd class="font-medium">{{ formatCurrency(contract.deposit_amount) }}</dd>
                  </div>
                  <div>
                    <dt class="text-sm text-muted-foreground">{{ $t('contracts.paymentDay') }}</dt>
                    <dd class="font-medium">{{ $t('contracts.paymentDayOfMonth', { day: contract.payment_due_day }) }}</dd>
                  </div>

                  <Separator class="md:col-span-2" />

                  <div>
                    <dt class="text-sm text-muted-foreground">{{ $t('contracts.adjustmentType') }}</dt>
                    <dd class="font-medium">
                      {{ contract.adjustment_type ?? $t('contracts.noAdjustment') }}
                      {{ contract.adjustment_period ? $t(`contracts.${contract.adjustment_period}`) : '' }}
                    </dd>
                  </div>
                  <div>
                    <dt class="text-sm text-muted-foreground">{{ $t('contracts.nextAdjustment') }}</dt>
                    <dd class="font-medium">
                      <span v-if="contract.next_adjustment_date" :class="isAdjustmentSoon ? 'text-yellow-600' : ''">
                        {{ formatDate(contract.next_adjustment_date) }}
                      </span>
                      <span v-else class="text-muted-foreground">-</span>
                    </dd>
                  </div>

                  <Separator class="md:col-span-2" />

                  <div>
                    <dt class="text-sm text-muted-foreground">{{ $t('contracts.lateInterestRate') }}</dt>
                    <dd class="font-medium">{{ $t('contracts.dailyRate', { rate: contract.late_payment_interest_rate }) }}</dd>
                  </div>
                  <div>
                    <dt class="text-sm text-muted-foreground">{{ $t('contracts.earlyTerminationPenalty') }}</dt>
                    <dd class="font-medium">{{ $t('contracts.monthsOfRent', { months: contract.early_termination_penalty_months }) }}</dd>
                  </div>
                  <div>
                    <dt class="text-sm text-muted-foreground">{{ $t('contracts.nonReturnPenaltyRate') }}</dt>
                    <dd class="font-medium">{{ $t('contracts.dailyRate', { rate: contract.non_return_penalty_rate }) }}</dd>
                  </div>
                </div>
              </CardContent>
            </Card>

            <!-- Guarantors Card -->
            <Card>
              <CardHeader>
                <CardTitle class="text-lg">{{ $t('contracts.guarantors') }} ({{ contract.guarantors?.length ?? 0 }})</CardTitle>
              </CardHeader>
              <CardContent>
                <div v-if="contract.guarantors && contract.guarantors.length > 0" class="space-y-4">
                  <div
                    v-for="(guarantor, index) in contract.guarantors"
                    :key="index"
                    class="p-4 border border-border rounded-lg"
                  >
                    <!-- Persona Física -->
                    <template v-if="guarantor.type === 'persona_fisica'">
                      <div class="flex items-center gap-2 mb-3">
                        <Badge variant="outline">{{ $t('contracts.personaFisica') }}</Badge>
                      </div>
                      <dl class="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <dt class="text-muted-foreground">{{ $t('contracts.guarantorName') }}</dt>
                          <dd class="font-medium">{{ (guarantor as GuarantorPersonaFisica).full_name }}</dd>
                        </div>
                        <div>
                          <dt class="text-muted-foreground">{{ $t('contracts.guarantorDni') }}</dt>
                          <dd class="font-medium">{{ (guarantor as GuarantorPersonaFisica).dni }}</dd>
                        </div>
                        <div>
                          <dt class="text-muted-foreground">{{ $t('contracts.guarantorCuil') }}</dt>
                          <dd class="font-medium">{{ (guarantor as GuarantorPersonaFisica).cuil }}</dd>
                        </div>
                        <div>
                          <dt class="text-muted-foreground">{{ $t('common.phone') }}</dt>
                          <dd class="font-medium">{{ (guarantor as GuarantorPersonaFisica).phone || '-' }}</dd>
                        </div>
                        <div class="col-span-2">
                          <dt class="text-muted-foreground">{{ $t('common.address') }}</dt>
                          <dd class="font-medium">{{ (guarantor as GuarantorPersonaFisica).address || '-' }}</dd>
                        </div>
                      </dl>
                    </template>

                    <!-- FINAER -->
                    <template v-else-if="guarantor.type === 'finaer'">
                      <div class="flex items-center gap-2 mb-3">
                        <Badge variant="outline">{{ $t('contracts.finaer') }}</Badge>
                      </div>
                      <dl class="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <dt class="text-muted-foreground">{{ $t('contracts.companyName') }}</dt>
                          <dd class="font-medium">{{ (guarantor as GuarantorFinaer).company_name }}</dd>
                        </div>
                        <div>
                          <dt class="text-muted-foreground">{{ $t('contracts.companyCuit') }}</dt>
                          <dd class="font-medium">{{ (guarantor as GuarantorFinaer).cuit }}</dd>
                        </div>
                        <div>
                          <dt class="text-muted-foreground">{{ $t('contracts.guaranteeCode') }}</dt>
                          <dd class="font-medium font-mono">{{ (guarantor as GuarantorFinaer).guarantee_code }}</dd>
                        </div>
                        <div>
                          <dt class="text-muted-foreground">{{ $t('contracts.representative') }}</dt>
                          <dd class="font-medium">
                            {{ (guarantor as GuarantorFinaer).representative_name }}
                            <span class="text-muted-foreground">({{ $t('contracts.guarantorDni') }}: {{ (guarantor as GuarantorFinaer).representative_dni }})</span>
                          </dd>
                        </div>
                      </dl>
                    </template>

                    <!-- Propiedad en Garantía -->
                    <template v-else-if="guarantor.type === 'propiedad'">
                      <div class="flex items-center gap-2 mb-3">
                        <Badge variant="outline">{{ $t('contracts.propiedad') }}</Badge>
                      </div>
                      <dl class="grid grid-cols-2 gap-3 text-sm">
                        <div class="col-span-2">
                          <dt class="text-muted-foreground">{{ $t('contracts.guarantorName') }}</dt>
                          <dd class="font-medium">
                            {{ (guarantor as GuarantorPropiedad).guarantor_name }}
                            <span class="text-muted-foreground">
                              ({{ $t('contracts.guarantorDni') }}: {{ (guarantor as GuarantorPropiedad).guarantor_dni }}
                              <span v-if="(guarantor as GuarantorPropiedad).guarantor_cuil">
                                , {{ $t('contracts.guarantorCuil') }}: {{ (guarantor as GuarantorPropiedad).guarantor_cuil }}
                              </span>)
                            </span>
                          </dd>
                        </div>
                        <div class="col-span-2">
                          <dt class="text-muted-foreground">{{ $t('contracts.propertyAddress') }}</dt>
                          <dd class="font-medium">{{ (guarantor as GuarantorPropiedad).property_address }}</dd>
                        </div>
                        <div class="col-span-2">
                          <dt class="text-muted-foreground">{{ $t('contracts.cadastralData') }}</dt>
                          <dd class="font-medium">{{ (guarantor as GuarantorPropiedad).cadastral_data }}</dd>
                        </div>
                        <div v-if="(guarantor as GuarantorPropiedad).cadastral_details" class="col-span-2">
                          <dt class="text-muted-foreground">{{ $t('contracts.cadastralDetails') }}</dt>
                          <dd class="font-medium">{{ (guarantor as GuarantorPropiedad).cadastral_details }}</dd>
                        </div>
                      </dl>
                    </template>
                  </div>
                </div>

                <div v-else class="py-8 text-center">
                  <Shield class="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                  <p class="text-sm text-muted-foreground">{{ $t('contracts.noGuarantors') }}</p>
                </div>
              </CardContent>
            </Card>

            <!-- Special Clauses Card -->
            <Card>
              <CardHeader>
                <CardTitle class="text-lg">{{ $t('contracts.specialClauses') }}</CardTitle>
              </CardHeader>
              <CardContent>
                <div class="space-y-4">
                  <div class="flex items-center gap-3">
                    <div
                      class="w-8 h-8 rounded-full flex items-center justify-center"
                      :class="contract.insurance_required ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'"
                    >
                      <ShieldCheck v-if="contract.insurance_required" class="w-4 h-4" />
                      <ShieldX v-else class="w-4 h-4" />
                    </div>
                    <div>
                      <p class="font-medium">{{ $t('contracts.tenantInsurance') }}</p>
                      <p class="text-sm text-muted-foreground">
                        {{ contract.insurance_required ? $t('contracts.required') : $t('contracts.notRequired') }}
                      </p>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <p class="text-sm text-muted-foreground mb-2">{{ $t('contracts.additionalNotes') }}</p>
                    <p v-if="contract.notes" class="whitespace-pre-wrap">{{ contract.notes }}</p>
                    <p v-else class="text-muted-foreground italic">{{ $t('contracts.noAdditionalNotes') }}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <!-- Contract Documents Section -->
            <ContractDocumentsSection
              v-if="contract"
              :contract-id="contract.id"
            />

            <!-- Legal Documents Section (Generated PDFs) -->
            <ContractLegalDocumentsSection
              v-if="contract"
              :contract-id="contract.id"
              :organization-id="contract.organization_id"
            />

            <!-- Payments Section -->
            <Card>
              <CardHeader class="flex flex-row items-center justify-between">
                <CardTitle class="text-lg">{{ $t('contracts.paymentHistory') }}</CardTitle>
                <div class="flex gap-2">
                  <Button
                    v-if="paymentsSummary.total === 0 && contract"
                    size="sm"
                    @click="showGeneratePaymentsDialog = true"
                  >
                    <Plus class="w-4 h-4 mr-2" />
                    {{ $t('contracts.generatePayments') }}
                  </Button>
                  <RouterLink
                    v-if="paymentsSummary.total > 0"
                    :to="{ name: 'payments', query: { contractId: contract?.id } }"
                  >
                    <Button variant="outline" size="sm">
                      {{ $t('contracts.viewAll') }}
                      <ChevronRight class="w-4 h-4 ml-1" />
                    </Button>
                  </RouterLink>
                </div>
              </CardHeader>
              <CardContent>
                <!-- Loading State -->
                <div v-if="loadingPayments" class="py-4 text-center">
                  <Loader2 class="w-6 h-6 mx-auto animate-spin text-muted-foreground" />
                </div>

                <!-- Summary -->
                <div v-else-if="paymentsSummary.total > 0" class="space-y-4">
                  <!-- Summary Stats -->
                  <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div class="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg text-center">
                      <p class="text-lg font-bold text-green-600 dark:text-green-400">
                        {{ paymentsSummary.paid }}
                      </p>
                      <p class="text-xs text-green-700 dark:text-green-300">{{ $t('contracts.paid') }}</p>
                    </div>
                    <div class="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-center">
                      <p class="text-lg font-bold text-blue-600 dark:text-blue-400">
                        {{ paymentsSummary.pending }}
                      </p>
                      <p class="text-xs text-blue-700 dark:text-blue-300">{{ $t('contracts.pending') }}</p>
                    </div>
                    <div class="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg text-center">
                      <p class="text-lg font-bold text-red-600 dark:text-red-400">
                        {{ paymentsSummary.overdue }}
                      </p>
                      <p class="text-xs text-red-700 dark:text-red-300">{{ $t('contracts.overdue') }}</p>
                    </div>
                    <div class="p-3 bg-muted rounded-lg text-center">
                      <p class="text-lg font-bold">{{ paymentsSummary.total }}</p>
                      <p class="text-xs text-muted-foreground">{{ $t('contracts.total') }}</p>
                    </div>
                  </div>

                  <!-- Amount Summary -->
                  <div class="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                    <span class="text-sm text-muted-foreground">{{ $t('contracts.totalCollected') }}</span>
                    <span class="font-semibold text-green-600">
                      {{ formatCurrency(paymentsSummary.paidAmount) }}
                    </span>
                  </div>

                  <!-- Recent Payments Preview -->
                  <div v-if="recentPayments.length > 0" class="space-y-2">
                    <p class="text-sm font-medium text-muted-foreground">{{ $t('contracts.recentPayments') }}</p>
                    <div
                      v-for="payment in recentPayments"
                      :key="payment.id"
                      class="flex items-center justify-between p-2 border rounded-lg"
                    >
                      <div>
                        <p class="text-sm font-medium">{{ getMonthName(payment.period_month) }} {{ payment.period_year }}</p>
                        <p class="text-xs text-muted-foreground">{{ formatDate(payment.payment_date || payment.due_date) }}</p>
                      </div>
                      <div class="flex items-center gap-2">
                        <span class="font-semibold">{{ formatCurrency(payment.total_amount || payment.expected_amount) }}</span>
                        <Badge :class="getPaymentStatusClass(payment.status)">
                          {{ getPaymentStatusLabel(payment.status) }}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Empty State -->
                <div v-else class="py-8 text-center">
                  <CreditCard class="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                  <p class="text-sm text-muted-foreground mb-3">
                    {{ $t('contracts.noPaymentsGenerated') }}
                  </p>
                  <Button
                    v-if="contract"
                    variant="outline"
                    size="sm"
                    @click="showGeneratePaymentsDialog = true"
                  >
                    <Plus class="w-4 h-4 mr-2" />
                    {{ $t('contracts.generatePayments') }}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <!-- Generate Payments Dialog -->
            <GeneratePaymentsDialog
              v-if="contract"
              v-model:open="showGeneratePaymentsDialog"
              :contract-id="contract.id"
              :contract="contract"
              @success="handlePaymentsGenerated"
            />
          </div>

          <!-- Sidebar -->
          <div class="space-y-6">
            <!-- Tenants Card -->
            <Card>
              <CardHeader>
                <CardTitle class="text-lg">{{ $t('contracts.tenants') }}</CardTitle>
              </CardHeader>
              <CardContent>
                <div class="space-y-4">
                  <!-- Titular -->
                  <div v-if="titular">
                    <p class="text-sm text-muted-foreground mb-2">{{ $t('contracts.titular') }}</p>
                    <div class="flex items-center gap-3">
                      <div class="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                        <User class="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <RouterLink
                          :to="{ name: 'tenant-details', params: { id: titular.id } }"
                          class="font-medium text-primary hover:underline"
                        >
                          {{ titular.first_name }} {{ titular.last_name }}
                        </RouterLink>
                        <p class="text-sm text-muted-foreground">{{ titular.phone }}</p>
                        <p v-if="titular.email" class="text-sm text-muted-foreground">{{ titular.email }}</p>
                      </div>
                    </div>
                  </div>

                  <!-- Co-titulares -->
                  <div v-if="coTitulares.length > 0">
                    <Separator class="my-3" />
                    <p class="text-sm text-muted-foreground mb-2">{{ $t('contracts.coTitulares') }}</p>
                    <div class="space-y-3">
                      <div v-for="coTitular in coTitulares" :key="coTitular.id" class="flex items-center gap-3">
                        <div class="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
                          <User class="w-4 h-4 text-muted-foreground" />
                        </div>
                        <div>
                          <RouterLink
                            :to="{ name: 'tenant-details', params: { id: coTitular.id } }"
                            class="font-medium text-primary hover:underline text-sm"
                          >
                            {{ coTitular.first_name }} {{ coTitular.last_name }}
                          </RouterLink>
                          <p class="text-xs text-muted-foreground">{{ coTitular.phone }}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div v-if="!titular && coTitulares.length === 0" class="text-center py-4">
                    <p class="text-sm text-muted-foreground">{{ $t('contracts.noTenantsAssigned') }}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <!-- Metadata Card -->
            <Card>
              <CardHeader>
                <CardTitle class="text-lg">{{ $t('common.details') }}</CardTitle>
              </CardHeader>
              <CardContent class="space-y-3">
                <div>
                  <p class="text-sm text-muted-foreground">{{ $t('common.created') }}</p>
                  <p class="font-medium">{{ formatDateTime(contract.created_at) }}</p>
                </div>
                <div>
                  <p class="text-sm text-muted-foreground">{{ $t('common.lastUpdated') }}</p>
                  <p class="font-medium">{{ formatDateTime(contract.updated_at) }}</p>
                </div>
              </CardContent>
            </Card>

            <!-- Quick Actions Card -->
            <Card>
              <CardHeader>
                <CardTitle class="text-lg">{{ $t('contracts.quickActions') }}</CardTitle>
              </CardHeader>
              <CardContent class="space-y-2">
                <Button variant="outline" class="w-full justify-start" @click="openEditDialog">
                  <Pencil class="w-4 h-4 mr-2" />
                  {{ $t('contracts.editContract') }}
                </Button>
                <Button variant="outline" class="w-full justify-start" @click="openPDFEditor">
                  <FileText class="w-4 h-4 mr-2" />
                  {{ $t('contracts.generatePDF') }}
                </Button>
                <!-- Lifecycle action buttons - hidden for draft contracts -->
                <template v-if="displayStatus !== 'draft'">
                  <!-- Rescind button -->
                  <Button
                    variant="outline"
                    class="w-full justify-start text-destructive hover:text-destructive"
                    :disabled="displayStatus === 'cancelled'"
                    @click="openRescindDialog"
                  >
                    <XCircle class="w-4 h-4 mr-2" />
                    {{ $t('contracts.rescindContract') }}
                  </Button>
                  <!-- Renew button -->
                  <Button
                    variant="outline"
                    class="w-full justify-start"
                    :disabled="displayStatus === 'cancelled'"
                    @click="handleRenew"
                  >
                    <RefreshCw class="w-4 h-4 mr-2" />
                    {{ $t('contracts.renewContract') }}
                  </Button>
                  <!-- Extend (Prórroga) button -->
                  <Button
                    variant="outline"
                    class="w-full justify-start"
                    :disabled="displayStatus === 'cancelled'"
                    @click="showExtensionDialog = true"
                  >
                    <CalendarPlus class="w-4 h-4 mr-2" />
                    {{ $t('contracts.extendContract') }}
                  </Button>
                  <!-- Active contract info banner -->
                  <p
                    v-if="displayStatus === 'active' || displayStatus === 'expiring_soon'"
                    class="text-xs text-muted-foreground px-2"
                  >
                    {{ $t('contracts.contractCurrentlyActive') }}
                  </p>
                  <!-- Rescinded contract indicator -->
                  <p
                    v-if="displayStatus === 'cancelled'"
                    class="text-xs text-muted-foreground px-2"
                  >
                    {{ $t('contracts.noActionsAvailable') }}
                  </p>
                </template>
              </CardContent>
            </Card>
          </div>
        </div>
      </template>

      <!-- Contract Dialog (Edit) -->
      <ContractDialog
        v-model:open="dialogOpen"
        :contract-id="contractId"
        @success="handleEditSuccess"
      />

      <!-- Rescind Contract Confirmation Dialog -->
      <CancelContractDialog
        v-if="contract"
        v-model:open="cancelDialogOpen"
        :contract-id="contract.id"
        :property-address="propertyAddress"
        :tenant-name="titularName"
        @confirm="handleRescindSuccess"
      />

      <!-- PDF Editor Dialog -->
      <ContractPDFEditor
        v-if="contract"
        v-model:open="pdfEditorOpen"
        :contract-id="contract.id"
        @success="handlePDFSuccess"
      />

      <!-- Rent Adjustment Dialog -->
      <RentAdjustmentDialog
        v-if="contract"
        v-model:open="showAdjustmentDialog"
        :contract-id="contract.id"
        :current-amount="contract.current_rent_amount"
        @success="handleAdjustmentApplied"
      />

      <!-- Extension Dialog -->
      <ExtensionDialog
        v-if="contract"
        :contract="contract"
        v-model:open="showExtensionDialog"
        @success="handleExtensionSuccess"
      />

      <!-- Renewal Dialog -->
      <RenewalDialog
        v-if="contract"
        :contract="contract"
        v-model:open="showRenewalDialog"
        @success="handleRenewalSuccess"
      />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

import { useRoute, useRouter, RouterLink } from 'vue-router'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import ContractDialog from '@/components/contracts/ContractDialog.vue'
import CancelContractDialog from '@/components/contracts/CancelContractDialog.vue'
import ExtensionDialog from '@/components/contracts/ExtensionDialog.vue'
import RenewalDialog from '@/components/contracts/RenewalDialog.vue'
import ContractPDFEditor from '@/components/contracts/ContractPDFEditor.vue'
import ContractDocumentsSection from '@/components/contracts/ContractDocumentsSection.vue'
import ContractLegalDocumentsSection from '@/components/contracts/ContractLegalDocumentsSection.vue'
import {
  ArrowLeft,
  Pencil,
  XCircle,
  FileText,
  Loader2,
  User,
  Shield,
  ShieldCheck,
  ShieldX,
  CreditCard,
  Plus,
  ChevronRight,
  RefreshCw,
  CalendarPlus,
  MoreHorizontal,
} from 'lucide-vue-next'
import { useContracts } from '@/composables/useContracts'
import { usePayments } from '@/composables/usePayments'
import { useDate } from '@/composables/useDate'
import { useFormatCurrency } from '@/composables/useFormatCurrency'

import AdjustmentAlert from '@/components/payments/AdjustmentAlert.vue'
import GeneratePaymentsDialog from '@/components/payments/GeneratePaymentsDialog.vue'
import RentAdjustmentDialog from '@/components/payments/RentAdjustmentDialog.vue'
import type {
  ContractWithRelations,
  ContractDisplayStatus,
  Tenant,
  GuarantorPersonaFisica,
  GuarantorFinaer,
  GuarantorPropiedad,
  Payment,
  PaymentStatus,
} from '@/types'


const route = useRoute()
const router = useRouter()
const {
  loading,
  error,
  fetchContractById,
  calculateDisplayStatus,
  formatPropertyAddress,
  getTitular,
  getCoTitulares,
} = useContracts()

const { formatDate, formatDateTime, getMonthName } = useDate()
const { formatCurrency } = useFormatCurrency()

const contract = ref<ContractWithRelations | null>(null)
const dialogOpen = ref(false)
const cancelDialogOpen = ref(false)
const pdfEditorOpen = ref(false)
const showGeneratePaymentsDialog = ref(false)
const showAdjustmentDialog = ref(false)
const showExtensionDialog = ref(false)
const showRenewalDialog = ref(false)

// Payments
const {
  getPaymentsSummary,
  fetchPayments,
  getStatusLabel: getPaymentStatusLabel,
} = usePayments()

const loadingPayments = ref(false)
const recentPayments = ref<Payment[]>([])
const paymentsSummary = ref({
  total: 0,
  paid: 0,
  pending: 0,
  overdue: 0,
  totalAmount: 0,
  paidAmount: 0,
})

const contractId = computed(() => route.params.id as string)

// Computed
const displayStatus = computed<ContractDisplayStatus>(() => {
  if (!contract.value) return 'active'
  return calculateDisplayStatus(contract.value)
})

const propertyAddress = computed(() => {
  if (!contract.value) return ''
  return formatPropertyAddress(contract.value)
})

const titular = computed<Tenant | null>(() => {
  if (!contract.value) return null
  return getTitular(contract.value)
})

const titularName = computed(() => {
  if (!titular.value) return ''
  return `${titular.value.first_name} ${titular.value.last_name}`
})

const coTitulares = computed<Tenant[]>(() => {
  if (!contract.value) return []
  return getCoTitulares(contract.value) as Tenant[]
})

const contractDuration = computed(() => {
  if (!contract.value) return 0
  const start = new Date(contract.value.start_date)
  const end = new Date(contract.value.end_date)
  const diffTime = end.getTime() - start.getTime()
  return Math.round(diffTime / (1000 * 60 * 60 * 24 * 30))
})

const isAdjustmentSoon = computed(() => {
  if (!contract.value?.next_adjustment_date) return false
  const nextAdjustment = new Date(contract.value.next_adjustment_date)
  const today = new Date()
  const diffDays = Math.ceil((nextAdjustment.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  return diffDays <= 30 && diffDays >= 0
})

// Methods
function getPaymentStatusClass(status: PaymentStatus): string {
  const classes: Record<PaymentStatus, string> = {
    pendiente: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    pagado: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    vencido: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    pago_parcial: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  }
  return classes[status] || ''
}

function getStatusBadgeClass(status: ContractDisplayStatus): string {
  const classes: Record<ContractDisplayStatus, string> = {
    active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800',
    expiring_soon: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800',
    expired: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800',
    cancelled: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400 border-gray-200 dark:border-gray-800',
    renewed: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800',
    draft: 'bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-400 border-slate-200 dark:border-slate-800',
  }
  return classes[status] ?? classes.active
}

function goBack() {
  router.push({ name: 'Contracts' })
}

function openEditDialog() {
  dialogOpen.value = true
}

function openRescindDialog() {
  cancelDialogOpen.value = true
}

function handleRenew() {
  showRenewalDialog.value = true
}

async function loadContract() {
  const data = await fetchContractById(contractId.value)
  contract.value = data
}

async function handleEditSuccess() {
  await loadContract()
}

function handleRescindSuccess() {
  router.push({ name: 'Contracts' })
}

function openPDFEditor() {
  pdfEditorOpen.value = true
}

async function handlePDFSuccess() {
  await loadContract()
}

async function loadPaymentsData() {
  if (!contractId.value) return

  loadingPayments.value = true
  try {
    // Get summary
    paymentsSummary.value = await getPaymentsSummary(contractId.value)

    // Get recent payments (last 3)
    const result = await fetchPayments({ contractId: contractId.value })
    if (result?.data) {
      recentPayments.value = result.data.slice(0, 3)
    }
  } catch (e) {
    console.error('Error loading payments:', e)
  } finally {
    loadingPayments.value = false
  }
}

async function handlePaymentsGenerated() {
  await loadPaymentsData()
}

async function handleAdjustmentApplied() {
  await loadContract()
  await loadPaymentsData()
}

function handleExtensionSuccess() {
  showExtensionDialog.value = false
}

async function handleRenewalSuccess() {
  showRenewalDialog.value = false
  await loadContract()
}

onMounted(async () => {
  await loadContract()
  await loadPaymentsData()
})
</script>
