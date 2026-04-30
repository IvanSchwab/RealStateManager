<template>
  <div>
    <!-- Loading state -->
    <div v-if="loading && !currentProperty" class="flex flex-col items-center justify-center py-20 gap-3" style="color: var(--pia-text-3)">
      <Loader2 class="w-8 h-8 animate-spin" />
      <p class="text-sm">Cargando propiedad...</p>
    </div>

    <!-- Error state -->
    <div v-else-if="error && !currentProperty" class="flex flex-col items-center justify-center py-20 gap-3">
      <AlertCircle class="w-10 h-10" style="color: var(--terra)" />
      <p class="font-medium" style="color: var(--terra)">Error al cargar la propiedad</p>
      <p class="text-sm" style="color: var(--pia-text-3)">{{ error }}</p>
      <button class="pia-btn pia-btn-ghost" @click="goBack">
        <ArrowLeft class="w-4 h-4" />
        Volver a Propiedades
      </button>
    </div>

    <!-- Property details -->
    <template v-else-if="currentProperty">
      <!-- Page header -->
      <div class="pia-page-header prop-page-header">
        <!-- Back link -->
        <button class="pia-btn-back" @click="goBack">
          <ArrowLeft class="w-3.5 h-3.5" />
          <span>Volver a Propiedades</span>
        </button>

        <!-- Title row -->
        <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <!-- Status + type + purpose badges -->
            <div class="flex flex-wrap items-center gap-2 mb-3">
              <span class="pia-status" :class="getPropertyStatusClass(currentProperty.status)">
                <span class="dot" />{{ getStatusLabel(currentProperty.status) }}
              </span>
              <span class="prop-chip">{{ getTypeLabel(currentProperty.property_type) }}</span>
              <span class="prop-chip">{{ currentProperty.purpose === 'alquiler' ? 'Alquiler' : 'Venta' }}</span>
            </div>
            <!-- Name -->
            <h1 class="prop-name">{{ currentProperty.name }}</h1>
            <!-- Address sub-line -->
            <div class="prop-address-line">
              <MapPin class="w-3.5 h-3.5 flex-shrink-0" />
              <span>{{ currentProperty.address_city }}, {{ currentProperty.address_state }}</span>
              <template v-if="currentProperty.address_floor || currentProperty.address_apartment">
                <span class="prop-addr-sep">·</span>
                <span>Unidad {{ [currentProperty.address_floor, currentProperty.address_apartment].filter(Boolean).join(' ') }}</span>
              </template>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex items-center gap-2 flex-shrink-0">
            <button class="pia-btn pia-btn-ghost" :disabled="isEditing" @click="enterEditMode">
              <Pencil class="w-3.5 h-3.5" />
              Editar
            </button>
          </div>
        </div>
      </div>

      <!-- Tab navigation -->
      <div class="prop-tabs-nav">
        <button class="prop-tab" :class="{ active: activeTab === 'datos' }" @click="activeTab = 'datos'">
          Datos
        </button>
        <button class="prop-tab" :class="{ active: activeTab === 'contratos' }" @click="setTab('contratos')">
          Contratos
        </button>
        <button class="prop-tab" :class="{ active: activeTab === 'documentos' }" @click="setTab('documentos')">
          Documentos legales
        </button>
        <button class="prop-tab" :class="{ active: activeTab === 'fotos' }" @click="setTab('fotos')">
          Fotos
        </button>
      </div>

      <!-- ── Datos tab ── -->
      <div v-if="activeTab === 'datos'">
        <!-- Edit mode -->
        <div v-if="isEditing" class="pia-card" style="padding: 0; overflow: hidden">
          <div class="pia-detail-section-head">
            <span class="pia-detail-section-label">Editar propiedad</span>
          </div>
          <div class="pia-detail-section-body">
            <form @submit.prevent="handleSave" style="display: flex; flex-direction: column; gap: 20px">
              <!-- Basic Info -->
              <div class="prop-form-grid">
                <div style="grid-column: 1 / -1">
                  <Label for="name" class="prop-form-label">Nombre</Label>
                  <Input id="name" v-model="editForm.name" required />
                </div>
                <div>
                  <Label for="property_type" class="prop-form-label">Tipo de Propiedad</Label>
                  <Select v-model="editForm.property_type">
                    <SelectTrigger><SelectValue placeholder="Seleccionar tipo" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="departamento">Departamento</SelectItem>
                      <SelectItem value="casa">Casa</SelectItem>
                      <SelectItem value="comercial">Comercial</SelectItem>
                      <SelectItem value="terreno">Terreno</SelectItem>
                      <SelectItem value="oficina">Oficina</SelectItem>
                      <SelectItem value="local">Local</SelectItem>
                      <SelectItem value="galpon">Galpon</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label for="purpose" class="prop-form-label">Propósito</Label>
                  <Select v-model="editForm.purpose">
                    <SelectTrigger><SelectValue placeholder="Seleccionar propósito" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="alquiler">Alquiler</SelectItem>
                      <SelectItem value="venta">Venta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label for="status" class="prop-form-label">Estado</Label>
                  <Select v-model="editForm.status">
                    <SelectTrigger><SelectValue placeholder="Seleccionar estado" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="disponible">Disponible</SelectItem>
                      <SelectItem value="alquilada">Alquilada</SelectItem>
                      <SelectItem value="mantenimiento">En mantenimiento</SelectItem>
                      <SelectItem value="reservada">Reservada</SelectItem>
                      <SelectItem value="vendida">Vendida</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />
              <p class="prop-form-section-title">Ubicación</p>
              <div class="prop-form-grid">
                <div>
                  <Label for="address_street" class="prop-form-label">Calle</Label>
                  <Input id="address_street" v-model="editForm.address_street" required />
                </div>
                <div>
                  <Label for="address_number" class="prop-form-label">Número</Label>
                  <Input id="address_number" :model-value="editForm.address_number ?? undefined" @update:model-value="editForm.address_number = $event != null ? String($event) : null" />
                </div>
                <div>
                  <Label for="address_floor" class="prop-form-label">Piso</Label>
                  <Input id="address_floor" :model-value="editForm.address_floor ?? undefined" @update:model-value="editForm.address_floor = $event != null ? String($event) : null" />
                </div>
                <div>
                  <Label for="address_apartment" class="prop-form-label">Departamento</Label>
                  <Input id="address_apartment" :model-value="editForm.address_apartment ?? undefined" @update:model-value="editForm.address_apartment = $event != null ? String($event) : null" />
                </div>
                <div>
                  <Label for="address_city" class="prop-form-label">Ciudad</Label>
                  <Input id="address_city" v-model="editForm.address_city" required />
                </div>
                <div>
                  <Label for="address_state" class="prop-form-label">Provincia</Label>
                  <Input id="address_state" v-model="editForm.address_state" required />
                </div>
                <div>
                  <Label for="address_zip_code" class="prop-form-label">Código Postal</Label>
                  <Input id="address_zip_code" :model-value="editForm.address_zip_code ?? undefined" @update:model-value="editForm.address_zip_code = $event != null ? String($event) : null" />
                </div>
              </div>

              <Separator />
              <p class="prop-form-section-title">Detalles</p>
              <div class="prop-form-grid prop-form-grid-3">
                <div>
                  <Label for="bedrooms" class="prop-form-label">Dormitorios</Label>
                  <Input id="bedrooms" :model-value="editForm.bedrooms ?? undefined" @update:model-value="editForm.bedrooms = $event ?? null" type="text" inputmode="decimal" placeholder="ej: 3" />
                </div>
                <div>
                  <Label for="bathrooms" class="prop-form-label">Baños</Label>
                  <Input id="bathrooms" :model-value="editForm.bathrooms ?? undefined" @update:model-value="editForm.bathrooms = $event ?? null" type="text" inputmode="decimal" placeholder="ej: 2" />
                </div>
                <div>
                  <Label for="square_meters" class="prop-form-label">Superficie (m²)</Label>
                  <Input id="square_meters" :model-value="editForm.square_meters ?? undefined" @update:model-value="editForm.square_meters = $event ?? null" type="text" inputmode="decimal" placeholder="ej: 45,5" />
                </div>
              </div>

              <div>
                <Label for="description" class="prop-form-label">Descripción</Label>
                <Textarea id="description" :model-value="editForm.description ?? undefined" @update:model-value="editForm.description = $event != null ? String($event) : null" rows="3" />
              </div>

              <Separator />
              <p class="prop-form-section-title">Propietario</p>
              <div>
                <Label for="owner_id" class="prop-form-label">Propietario</Label>
                <Select v-model="editForm.owner_id">
                  <SelectTrigger><SelectValue placeholder="Seleccionar propietario" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin propietario</SelectItem>
                    <SelectItem v-for="owner in owners" :key="owner.id" :value="owner.id">
                      {{ owner.full_name }}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <!-- Form actions -->
              <div class="flex justify-end gap-2 pt-2">
                <button type="button" class="pia-btn pia-btn-ghost" :disabled="saving" @click="cancelEdit">Cancelar</button>
                <button type="submit" class="pia-btn pia-btn-primary" :disabled="saving">
                  <Loader2 v-if="saving" class="w-3.5 h-3.5 animate-spin" />
                  Guardar cambios
                </button>
              </div>
            </form>
          </div>
        </div>

        <!-- Read mode -->
        <div v-else class="pia-grid pia-grid-main" style="align-items: start">
          <!-- Main column -->
          <div style="display: flex; flex-direction: column; gap: var(--gap)">

            <!-- General information -->
            <div class="pia-card" style="padding: 0; overflow: hidden">
              <div class="pia-detail-section-head">
                <span class="pia-detail-section-label">Información general</span>
              </div>
              <div class="pia-detail-section-body">
                <dl class="pia-detail-grid">
                  <div class="pia-detail-field">
                    <dt class="pia-detail-label">Tipo de propiedad</dt>
                    <dd class="pia-detail-value">{{ getTypeLabel(currentProperty.property_type) }}</dd>
                  </div>
                  <div class="pia-detail-field">
                    <dt class="pia-detail-label">Propósito</dt>
                    <dd class="pia-detail-value">{{ currentProperty.purpose === 'alquiler' ? 'Alquiler' : 'Venta' }}</dd>
                  </div>
                  <div class="pia-detail-field">
                    <dt class="pia-detail-label">Estado</dt>
                    <dd>
                      <span class="pia-status" :class="getPropertyStatusClass(currentProperty.status)">
                        <span class="dot" />{{ getStatusLabel(currentProperty.status) }}
                      </span>
                    </dd>
                  </div>
                  <div class="pia-detail-field">
                    <dt class="pia-detail-label">Superficie</dt>
                    <dd class="pia-detail-value">{{ currentProperty.square_meters ? `${currentProperty.square_meters} m²` : '-' }}</dd>
                  </div>
                  <div class="pia-detail-field">
                    <dt class="pia-detail-label">Dormitorios</dt>
                    <dd class="pia-detail-value">{{ currentProperty.bedrooms ?? '-' }}</dd>
                  </div>
                  <div class="pia-detail-field">
                    <dt class="pia-detail-label">Baños</dt>
                    <dd class="pia-detail-value">{{ currentProperty.bathrooms ?? '-' }}</dd>
                  </div>
                  <div v-if="currentProperty.description" class="pia-detail-field prop-full-col">
                    <dt class="pia-detail-label">Descripción</dt>
                    <dd class="pia-detail-value" style="white-space: pre-wrap; line-height: 1.6">{{ currentProperty.description }}</dd>
                  </div>
                </dl>
              </div>
            </div>

            <!-- Location -->
            <div class="pia-card" style="padding: 0; overflow: hidden">
              <div class="pia-detail-section-head">
                <span class="pia-detail-section-label">Ubicación</span>
              </div>
              <div class="pia-detail-section-body">
                <dl class="pia-detail-grid">
                  <div class="pia-detail-field">
                    <dt class="pia-detail-label">Calle y número</dt>
                    <dd class="pia-detail-value">
                      {{ currentProperty.address_street }}{{ currentProperty.address_number ? ` ${currentProperty.address_number}` : '' }}
                    </dd>
                  </div>
                  <div v-if="currentProperty.address_floor || currentProperty.address_apartment" class="pia-detail-field">
                    <dt class="pia-detail-label">Piso / Depto</dt>
                    <dd class="pia-detail-value">
                      {{ [currentProperty.address_floor, currentProperty.address_apartment].filter(Boolean).join(' - ') }}
                    </dd>
                  </div>
                  <div class="pia-detail-field">
                    <dt class="pia-detail-label">Ciudad</dt>
                    <dd class="pia-detail-value">{{ currentProperty.address_city }}</dd>
                  </div>
                  <div class="pia-detail-field">
                    <dt class="pia-detail-label">Provincia</dt>
                    <dd class="pia-detail-value">{{ currentProperty.address_state }}</dd>
                  </div>
                  <div v-if="currentProperty.address_zip_code" class="pia-detail-field">
                    <dt class="pia-detail-label">Código Postal</dt>
                    <dd class="pia-detail-value">{{ currentProperty.address_zip_code }}</dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>

          <!-- Sidebar -->
          <div style="display: flex; flex-direction: column; gap: var(--gap)">

            <!-- Owner -->
            <div class="pia-card" style="padding: 0; overflow: hidden">
              <div class="pia-detail-section-head">
                <span class="pia-detail-section-label">Propietario</span>
              </div>
              <div class="pia-detail-section-body">
                <div v-if="currentProperty.owner">
                  <div class="flex items-center justify-between mb-3">
                    <div class="flex items-center gap-3">
                      <div class="prop-owner-avatar">
                        {{ getOwnerInitials(currentProperty.owner.full_name) }}
                      </div>
                      <div>
                        <p style="font-size: 13.5px; font-weight: 600; color: var(--pia-text)">{{ currentProperty.owner.full_name }}</p>
                        <p v-if="currentProperty.owner.cuit_cuil" style="font-size: 11.5px; color: var(--pia-text-4); font-family: var(--font-mono); margin-top: 1px">
                          {{ currentProperty.owner.cuit_cuil }}
                        </p>
                      </div>
                    </div>
                    <RouterLink
                      :to="{ name: 'owner-details', params: { id: currentProperty.owner.id } }"
                      class="pia-icon-btn"
                      style="width: 28px; height: 28px"
                      title="Ver propietario"
                    >
                      <ChevronRight class="w-3.5 h-3.5" />
                    </RouterLink>
                  </div>
                  <div style="display: flex; flex-direction: column; gap: 6px">
                    <div v-if="currentProperty.owner.email" class="prop-owner-contact">
                      <Mail class="w-3.5 h-3.5 flex-shrink-0" />
                      <a :href="`mailto:${currentProperty.owner.email}`" class="pia-detail-link" style="font-size: 12.5px">
                        {{ currentProperty.owner.email }}
                      </a>
                    </div>
                    <div v-if="currentProperty.owner.phone" class="prop-owner-contact">
                      <Phone class="w-3.5 h-3.5 flex-shrink-0" />
                      <a :href="`tel:${currentProperty.owner.phone}`" class="pia-detail-link" style="font-size: 12.5px; font-family: var(--font-mono)">
                        {{ currentProperty.owner.phone }}
                      </a>
                    </div>
                  </div>
                </div>
                <div v-else class="pia-empty" style="padding: 20px 0">
                  <div class="pia-empty-mark">
                    <User class="w-4 h-4" />
                  </div>
                  <div>Sin propietario asignado</div>
                  <button class="pia-btn pia-btn-ghost pia-btn-sm" @click="enterEditMode">Asignar propietario</button>
                </div>
              </div>
            </div>

            <!-- Metadata -->
            <div class="pia-card" style="padding: 14px 16px; display: flex; flex-direction: column; gap: 8px">
              <p class="pia-meta-row">
                <span class="pia-meta-label">Creado</span>
                <span class="pia-meta-date">{{ formatDateTime(currentProperty.created_at) }}</span>
              </p>
              <p class="pia-meta-row">
                <span class="pia-meta-label">Última actualización</span>
                <span class="pia-meta-date">{{ formatDateTime(currentProperty.updated_at) }}</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- ── Contratos tab ── -->
      <div v-if="activeTab === 'contratos'" class="pia-card" style="padding: 0; overflow: hidden">
        <div class="pia-detail-section-head">
          <span class="pia-detail-section-label">Contratos asociados</span>
          <button class="pia-btn pia-btn-primary pia-btn-sm" @click="contractDialogOpen = true">
            <Plus class="w-3.5 h-3.5" />
            Nuevo contrato
          </button>
        </div>

        <!-- Loading -->
        <div v-if="loadingContracts" class="pia-detail-section-body" style="display: flex; flex-direction: column; gap: 10px">
          <Skeleton class="h-16 w-full rounded-lg" />
          <Skeleton class="h-16 w-full rounded-lg" />
          <Skeleton class="h-16 w-full rounded-lg" />
        </div>

        <!-- Contracts list -->
        <div v-else-if="contracts.length > 0">
          <div
            v-for="contract in contracts"
            :key="contract.id"
            class="prop-contract-row"
            @click="navigateToContract(contract.id)"
          >
            <div class="prop-contract-bar" :style="{ background: getContractColor(contract.id) }" />
            <div class="prop-contract-info">
              <span class="prop-contract-tenants">
                {{ contract.tenants.map(t => `${t.first_name} ${t.last_name}`).join(', ') || 'Sin inquilinos' }}
              </span>
              <span class="prop-contract-dates">
                {{ formatDate(contract.start_date) }} → {{ formatDate(contract.end_date) }}
              </span>
            </div>
            <div class="prop-contract-right">
              <span class="prop-contract-amount">{{ formatCurrency(contract.monthly_rent) }}</span>
              <span class="pia-status" :class="getContractStatusPiaClass(contract.status)">
                <span class="dot" />{{ getContractStatusLabel(contract.status) }}
              </span>
              <ChevronRight class="w-3.5 h-3.5 flex-shrink-0" style="color: var(--pia-text-4)" />
            </div>
          </div>
        </div>

        <!-- Empty -->
        <div v-else class="pia-empty">
          <div class="pia-empty-mark">
            <FileText class="w-4 h-4" />
          </div>
          <div>No hay contratos asociados</div>
          <p style="font-size: 12px; color: var(--pia-text-4)">Los contratos de esta propiedad aparecerán aquí</p>
          <button class="pia-btn pia-btn-primary pia-btn-sm" @click="contractDialogOpen = true">
            <Plus class="w-3.5 h-3.5" />
            Nuevo contrato
          </button>
        </div>
      </div>

      <!-- ── Documentos legales tab ── -->
      <div v-if="activeTab === 'documentos'" class="pia-card" style="padding: 0; overflow: hidden">
        <div class="pia-detail-section-head">
          <span class="pia-detail-section-label">Documentos legales</span>
        </div>

        <!-- Loading -->
        <div v-if="loadingLegalDocs" class="pia-detail-section-body" style="display: flex; flex-direction: column; gap: 10px">
          <Skeleton class="h-14 w-full rounded-lg" />
          <Skeleton class="h-14 w-full rounded-lg" />
          <Skeleton class="h-14 w-full rounded-lg" />
        </div>

        <!-- Docs list -->
        <div v-else-if="legalDocuments.length > 0">
          <div
            v-for="doc in legalDocuments"
            :key="doc.id"
            class="prop-doc-row"
          >
            <div class="prop-doc-icon-wrap">
              <FileText class="w-4 h-4" style="color: var(--brand-700)" />
            </div>
            <div class="prop-doc-info">
              <span class="prop-doc-name">{{ getLegalDocumentTypeLabel(doc.document_type) }}</span>
              <span class="prop-doc-date">{{ formatDate(doc.created_at) }}</span>
            </div>
            <button
              class="pia-btn pia-btn-ghost pia-btn-sm"
              :disabled="!doc.pdf_url || downloadingDocId === doc.id"
              @click="downloadLegalDocument(doc)"
            >
              <Loader2 v-if="downloadingDocId === doc.id" class="w-3.5 h-3.5 animate-spin" />
              <Download v-else class="w-3.5 h-3.5" />
              Descargar
            </button>
          </div>
        </div>

        <!-- Empty -->
        <div v-else class="pia-empty">
          <div class="pia-empty-mark">
            <FileText class="w-4 h-4" />
          </div>
          <div>No hay documentos legales</div>
          <p style="font-size: 12px; color: var(--pia-text-4)">Los documentos legales aparecerán aquí</p>
        </div>
      </div>

      <!-- ── Fotos tab ── -->
      <div v-if="activeTab === 'fotos'" class="pia-card" style="padding: 0; overflow: hidden">
        <div class="pia-detail-section-head">
          <span class="pia-detail-section-label">Fotos</span>
          <button class="pia-btn pia-btn-primary pia-btn-sm" :disabled="uploading" @click="triggerFileInput">
            <Plus class="w-3.5 h-3.5" />
            Agregar foto
          </button>
          <input ref="fileInputRef" type="file" accept="image/*" multiple class="hidden" @change="handleFileSelect" />
        </div>

        <div class="pia-detail-section-body">
          <!-- Loading -->
          <div v-if="loadingImages" class="prop-photo-grid">
            <Skeleton class="aspect-square w-full rounded-lg" />
            <Skeleton class="aspect-square w-full rounded-lg" />
            <Skeleton class="aspect-square w-full rounded-lg" />
            <Skeleton class="aspect-square w-full rounded-lg" />
          </div>

          <!-- Image grid -->
          <div v-else-if="images.length > 0 || uploadProgress.length > 0" class="prop-photo-grid">
            <div
              v-for="image in images"
              :key="image.id"
              class="prop-photo-item"
              @click="openImageLightbox(image)"
            >
              <img :src="image.url" :alt="image.name" class="prop-photo-img" />
              <div class="prop-photo-overlay" />
              <div class="prop-photo-actions">
                <button class="pia-btn pia-btn-ghost prop-photo-action-btn" title="Ver" @click.stop="openImageLightbox(image)">
                  <Expand class="w-4 h-4" />
                </button>
                <button class="pia-btn pia-btn-ghost prop-photo-action-btn" title="Descargar" @click.stop="downloadImage(image)">
                  <Download class="w-4 h-4" />
                </button>
              </div>
              <button class="prop-photo-delete" title="Eliminar" @click.stop="confirmDeleteImage(image)">
                <X class="w-3.5 h-3.5" />
              </button>
            </div>

            <!-- Upload progress items -->
            <div
              v-for="progress in uploadProgress"
              :key="progress.fileName"
              class="prop-photo-item prop-photo-uploading"
            >
              <div class="flex flex-col items-center gap-2">
                <Loader2 class="w-7 h-7 animate-spin" style="color: var(--brand-600)" />
                <p style="font-size: 12px; color: var(--pia-text-3)" class="truncate px-2 w-full text-center">{{ progress.fileName }}</p>
                <p style="font-size: 11px; color: var(--pia-text-4)">{{ progress.percentage }}%</p>
              </div>
            </div>
          </div>

          <!-- Empty -->
          <div v-else class="pia-empty">
            <div class="pia-empty-mark">
              <ImageIcon class="w-4 h-4" />
            </div>
            <div>No hay fotos cargadas</div>
            <button class="pia-btn pia-btn-ghost pia-btn-sm" :disabled="uploading" @click="triggerFileInput">
              <Plus class="w-3.5 h-3.5" />
              Agregar foto
            </button>
          </div>
        </div>
      </div>
    </template>

    <!-- Delete image dialog -->
    <AlertDialog v-model:open="deleteImageDialogOpen">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Eliminar imagen</AlertDialogTitle>
          <AlertDialogDescription>
            ¿Estás seguro de que deseas eliminar esta imagen? Esta acción no se puede deshacer.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel :disabled="deletingImage">Cancelar</AlertDialogCancel>
          <AlertDialogAction
            class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            :disabled="deletingImage"
            @click="executeDeleteImage"
          >
            <Loader2 v-if="deletingImage" class="w-4 h-4 mr-2 animate-spin" />
            Eliminar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <!-- New contract dialog (with property pre-filled) -->
    <ContractDialog
      v-model:open="contractDialogOpen"
      :initial-property-id="propertyId"
      @success="loadContracts"
    />

    <!-- Image lightbox -->
    <AlertDialog v-model:open="lightboxOpen">
      <AlertDialogContent class="max-w-4xl p-0 overflow-hidden">
        <div class="relative">
          <button
            class="absolute top-2 right-2 z-10 w-8 h-8 rounded-full flex items-center justify-center"
            style="background: rgba(0,0,0,0.5); color: white"
            @click="lightboxOpen = false"
          >
            <X class="w-4 h-4" />
          </button>
          <img
            v-if="lightboxImage"
            :src="lightboxImage.url"
            :alt="lightboxImage.name"
            class="w-full max-h-[80vh] object-contain bg-black"
          />
          <div class="p-4 flex items-center justify-between" style="background: var(--pia-surface); border-top: 1px solid var(--pia-border)">
            <p style="font-size: 13px; color: var(--pia-text-3)" class="truncate">{{ lightboxImage?.name }}</p>
            <button class="pia-btn pia-btn-ghost pia-btn-sm" @click="downloadImage(lightboxImage!)">
              <Download class="w-3.5 h-3.5" />
              Descargar
            </button>
          </div>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  ArrowLeft,
  Pencil,
  Loader2,
  User,
  Mail,
  Phone,
  ChevronRight,
  FileText,
  Download,
  Plus,
  X,
  Image as ImageIcon,
  AlertCircle,
  Expand,
  MapPin,
} from 'lucide-vue-next'
import ContractDialog from '@/components/contracts/ContractDialog.vue'
import { useProperties } from '@/composables/useProperties'
import { usePropertyImages, type PropertyImage } from '@/composables/usePropertyImages'
import { useOwners } from '@/composables/useOwners'
import { useDate } from '@/composables/useDate'
import { useFormatCurrency } from '@/composables/useFormatCurrency'
import { useToast } from '@/composables/useToast'
import { supabase } from '@/lib/supabase'
import type {
  PropertyType,
  PropertyStatus,
  PropertyPurpose,
  PropertyContract,
  PropertyLegalDocument,
  ContractStatus,
} from '@/types'

const route = useRoute()
const router = useRouter()
const toast = useToast()
const { formatDate, formatDateTime } = useDate()
const { formatCurrency } = useFormatCurrency()

const {
  currentProperty,
  loading,
  error,
  fetchPropertyById,
  updateProperty,
  getPropertyContracts,
  getPropertyLegalDocuments,
} = useProperties()

const {
  images,
  loading: loadingImages,
  uploading,
  uploadProgress,
  fetchPropertyImages,
  uploadPropertyImage,
  deletePropertyImage,
} = usePropertyImages()

const { owners, fetchOwners } = useOwners()

const activeTab = ref('datos')
const isEditing = ref(false)
const saving = ref(false)

const contracts = ref<PropertyContract[]>([])
const loadingContracts = ref(false)
const contractsLoaded = ref(false)
const contractDialogOpen = ref(false)

const legalDocuments = ref<PropertyLegalDocument[]>([])
const loadingLegalDocs = ref(false)
const legalDocsLoaded = ref(false)
const downloadingDocId = ref<string | null>(null)

const imagesLoaded = ref(false)
const fileInputRef = ref<HTMLInputElement | null>(null)
const deleteImageDialogOpen = ref(false)
const imageToDelete = ref<PropertyImage | null>(null)
const deletingImage = ref(false)
const lightboxOpen = ref(false)
const lightboxImage = ref<PropertyImage | null>(null)

const editForm = reactive<{
  name: string
  property_type: PropertyType
  purpose: PropertyPurpose
  status: PropertyStatus
  address_street: string
  address_number: string | null
  address_floor: string | null
  address_apartment: string | null
  address_city: string
  address_state: string
  address_zip_code: string | null
  bedrooms: string | number | null
  bathrooms: string | number | null
  square_meters: string | number | null
  description: string | null
  owner_id: string
}>({
  name: '',
  property_type: 'departamento',
  purpose: 'alquiler',
  status: 'disponible',
  address_street: '',
  address_number: null,
  address_floor: null,
  address_apartment: null,
  address_city: '',
  address_state: '',
  address_zip_code: null,
  bedrooms: null,
  bathrooms: null,
  square_meters: null,
  description: null,
  owner_id: 'none',
})

const propertyId = route.params.id as string

// Color palette (same as ContractsView)
const CONTRACT_COLORS = [
  '#E8DCC8', '#DDE5D8', '#E6D3C2', '#D6DADB', '#E3D9E8',
  '#D7E7E5', '#F0E2C8', '#E1E5EA', '#E8D6D6', '#D9E4E6',
  '#EAD8C8', '#E2E8D5', '#D6E2F0', '#E4ECDD', '#F1E6CC',
]
function getContractColor(id: string): string {
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash)
  return CONTRACT_COLORS[Math.abs(hash) % CONTRACT_COLORS.length]
}

// Helper functions
function getOwnerInitials(name: string): string {
  return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
}

function getTypeLabel(type: PropertyType): string {
  const labels: Record<PropertyType, string> = {
    departamento: 'Departamento', casa: 'Casa', comercial: 'Comercial',
    terreno: 'Terreno', oficina: 'Oficina', local: 'Local', galpon: 'Galpon',
  }
  return labels[type] || type
}

function getStatusLabel(status: PropertyStatus): string {
  const labels: Record<PropertyStatus, string> = {
    disponible: 'Disponible', alquilada: 'Alquilada', mantenimiento: 'En mantenimiento',
    reservada: 'Reservada', vendida: 'Vendida',
  }
  return labels[status] || status
}

function getPropertyStatusClass(status: PropertyStatus): string {
  const map: Record<PropertyStatus, string> = {
    alquilada: 'ok',
    disponible: 'pending',
    mantenimiento: 'danger',
    reservada: 'warning',
    vendida: 'draft',
  }
  return map[status] || 'draft'
}

function getContractStatusLabel(status: ContractStatus): string {
  const labels: Record<ContractStatus, string> = {
    borrador: 'Borrador', activo: 'Activo', vencido: 'Vencido',
    rescindido: 'Rescindido', renovado: 'Renovado',
  }
  return labels[status] || status
}

function getContractStatusPiaClass(status: ContractStatus): string {
  const map: Record<ContractStatus, string> = {
    activo: 'ok', renovado: 'ok',
    borrador: 'draft', rescindido: 'draft', vencido: 'danger',
  }
  return map[status] || 'draft'
}

function getLegalDocumentTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    corretaje: 'Corretaje',
    boleto_compraventa: 'Boleto de Compraventa',
    entrega_llaves: 'Entrega de Llaves',
  }
  return labels[type] || type
}

// Tab switching (preserves lazy-load triggers)
function setTab(tab: string) {
  activeTab.value = tab
  if (tab === 'contratos') loadContractsIfNeeded()
  if (tab === 'documentos') loadLegalDocumentsIfNeeded()
  if (tab === 'fotos') loadImagesIfNeeded()
}

function goBack() { router.push({ name: 'properties' }) }
function navigateToContract(id: string) { router.push({ name: 'contract-details', params: { id } }) }

function enterEditMode() {
  if (!currentProperty.value) return
  editForm.name = currentProperty.value.name
  editForm.property_type = currentProperty.value.property_type
  editForm.purpose = currentProperty.value.purpose
  editForm.status = currentProperty.value.status
  editForm.address_street = currentProperty.value.address_street
  editForm.address_number = currentProperty.value.address_number
  editForm.address_floor = currentProperty.value.address_floor
  editForm.address_apartment = currentProperty.value.address_apartment
  editForm.address_city = currentProperty.value.address_city
  editForm.address_state = currentProperty.value.address_state
  editForm.address_zip_code = currentProperty.value.address_zip_code
  editForm.bedrooms = currentProperty.value.bedrooms ?? ''
  editForm.bathrooms = currentProperty.value.bathrooms ?? ''
  editForm.square_meters = currentProperty.value.square_meters ?? ''
  editForm.description = currentProperty.value.description
  editForm.owner_id = currentProperty.value.owner_id || 'none'
  isEditing.value = true
  activeTab.value = 'datos'
}

function cancelEdit() { isEditing.value = false }

function normalizeDecimal(val: string | number | null): number | null {
  if (val === null || val === '') return null
  const parsed = parseFloat(String(val).replace(',', '.'))
  return isNaN(parsed) ? null : parsed
}

async function handleSave() {
  if (!currentProperty.value) return
  saving.value = true
  try {
    await updateProperty(propertyId, {
      name: editForm.name,
      property_type: editForm.property_type,
      purpose: editForm.purpose,
      status: editForm.status,
      address_street: editForm.address_street,
      address_number: editForm.address_number || null,
      address_floor: editForm.address_floor || null,
      address_apartment: editForm.address_apartment || null,
      address_city: editForm.address_city,
      address_state: editForm.address_state,
      address_zip_code: editForm.address_zip_code || null,
      bedrooms: normalizeDecimal(editForm.bedrooms),
      bathrooms: normalizeDecimal(editForm.bathrooms),
      square_meters: normalizeDecimal(editForm.square_meters),
      description: editForm.description || null,
      owner_id: editForm.owner_id === 'none' ? null : editForm.owner_id || null,
    })
    toast.success('Propiedad actualizada correctamente')
    isEditing.value = false
    fetchPropertyById(propertyId)
  } catch (e) {
    console.error('Error updating property:', e)
    toast.error('Error al actualizar la propiedad')
  } finally {
    saving.value = false
  }
}

async function loadContractsIfNeeded() {
  if (contractsLoaded.value) return
  loadingContracts.value = true
  try {
    contracts.value = await getPropertyContracts(propertyId)
    contractsLoaded.value = true
  } catch (e) {
    console.error('Error loading contracts:', e)
    toast.error('Error al cargar los contratos')
  } finally {
    loadingContracts.value = false
  }
}

async function loadContracts() {
  contractsLoaded.value = false
  await loadContractsIfNeeded()
}

async function loadLegalDocumentsIfNeeded() {
  if (legalDocsLoaded.value) return
  loadingLegalDocs.value = true
  try {
    legalDocuments.value = await getPropertyLegalDocuments(propertyId)
    legalDocsLoaded.value = true
  } catch (e) {
    console.error('Error loading legal documents:', e)
    toast.error('Error al cargar los documentos legales')
  } finally {
    loadingLegalDocs.value = false
  }
}

async function loadImagesIfNeeded() {
  if (imagesLoaded.value) return
  try {
    await fetchPropertyImages(propertyId)
    imagesLoaded.value = true
  } catch (e) {
    console.error('Error loading images:', e)
    toast.error('Error al cargar las imágenes')
  }
}

async function downloadLegalDocument(doc: PropertyLegalDocument) {
  if (!doc.pdf_url) { toast.error('El documento no tiene un PDF asociado'); return }
  downloadingDocId.value = doc.id
  try {
    const { data, error: downloadError } = await supabase.storage
      .from('contract-documents')
      .download(doc.pdf_url)
    if (downloadError) throw downloadError
    const url = URL.createObjectURL(data)
    const link = document.createElement('a')
    link.href = url
    link.download = `${getLegalDocumentTypeLabel(doc.document_type)}_${currentProperty.value?.name || 'documento'}.pdf`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    toast.success('Documento descargado correctamente')
  } catch (e) {
    console.error('Error downloading document:', e)
    toast.error('Error al descargar el documento')
  } finally {
    downloadingDocId.value = null
  }
}

function triggerFileInput() { fileInputRef.value?.click() }

async function handleFileSelect(event: Event) {
  const input = event.target as HTMLInputElement
  const files = input.files
  if (!files || files.length === 0) return
  for (const file of files) {
    try {
      const result = await uploadPropertyImage(propertyId, file)
      if (result) toast.success(`Imagen "${file.name}" subida correctamente`)
    } catch (e) {
      console.error('Error uploading image:', e)
      toast.error(`Error al subir "${file.name}"`)
    }
  }
  input.value = ''
}

function confirmDeleteImage(image: PropertyImage) {
  imageToDelete.value = image
  deleteImageDialogOpen.value = true
}

async function executeDeleteImage() {
  if (!imageToDelete.value) return
  deletingImage.value = true
  try {
    const success = await deletePropertyImage(imageToDelete.value.id)
    if (success) toast.success('Imagen eliminada correctamente')
    else toast.error('Error al eliminar la imagen')
  } catch (e) {
    console.error('Error deleting image:', e)
    toast.error('Error al eliminar la imagen')
  } finally {
    deletingImage.value = false
    deleteImageDialogOpen.value = false
    imageToDelete.value = null
  }
}

function openImageLightbox(image: PropertyImage) {
  lightboxImage.value = image
  lightboxOpen.value = true
}

async function downloadImage(image: PropertyImage) {
  try {
    const response = await fetch(image.url)
    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = image.name
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    toast.success('Imagen descargada')
  } catch (e) {
    console.error('Error downloading image:', e)
    toast.error('Error al descargar la imagen')
  }
}

onMounted(async () => {
  await Promise.all([fetchPropertyById(propertyId), fetchOwners()])
})
</script>

<style scoped>
/* Mobile topbar clearance */
@media (max-width: 1023px) {
  .prop-page-header {
    padding-top: calc(var(--app-header-height) - 16px);
  }
}

/* Page header */
.prop-page-header {
  flex-direction: column;
  gap: 16px;
  align-items: stretch;
}

/* Back link */
.pia-btn-back {
  font-size: 12.5px;
  color: var(--pia-text-3);
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  font-family: var(--font-sans);
  transition: color 0.12s;
  width: fit-content;
}
.pia-btn-back:hover { color: var(--pia-text-2); }

/* Property name */
.prop-name {
  font-size: 24px;
  font-weight: 600;
  color: var(--pia-text);
  letter-spacing: -0.02em;
  margin: 0 0 8px;
  line-height: 1.2;
}

/* Address sub-line */
.prop-address-line {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 12.5px;
  color: var(--pia-text-4);
}
.prop-addr-sep { color: var(--pia-border-strong); margin: 0 2px; }

/* Type/purpose chips */
.prop-chip {
  font-size: 11.5px;
  font-weight: 500;
  padding: 2px 9px;
  border-radius: 20px;
  background: var(--pia-surface-2);
  border: 1px solid var(--pia-border);
  color: var(--pia-text-3);
}

/* Tab navigation */
.prop-tabs-nav {
  display: flex;
  gap: 0;
  border-bottom: 1px solid var(--pia-border);
  margin-bottom: var(--gap);
  overflow-x: auto;
  scrollbar-width: none;
}
.prop-tabs-nav::-webkit-scrollbar { display: none; }

.prop-tab {
  padding: 10px 16px;
  font-size: 13px;
  font-weight: 450;
  color: var(--pia-text-3);
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  white-space: nowrap;
  font-family: var(--font-sans);
  transition: color 0.12s, border-color 0.12s;
  margin-bottom: -1px;
}
.prop-tab:hover { color: var(--pia-text-2); }
.prop-tab.active {
  color: var(--brand-700);
  font-weight: 550;
  border-bottom-color: var(--brand-600);
}

/* Shared section styles */
.pia-detail-section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 18px;
  border-bottom: 1px solid var(--pia-border);
  background: var(--pia-surface-2);
}
.pia-detail-section-label {
  font-size: 10.5px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--pia-text-3);
}
.pia-detail-section-body { padding: 18px; }

.pia-detail-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 18px 32px;
}
@media (max-width: 540px) {
  .pia-detail-grid { grid-template-columns: 1fr; }
}

.prop-full-col { grid-column: 1 / -1; }

.pia-detail-field { display: flex; flex-direction: column; gap: 3px; }
.pia-detail-label {
  font-size: 10.5px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: var(--pia-text-4);
}
.pia-detail-value {
  font-size: 13.5px;
  font-weight: 500;
  color: var(--pia-text);
}
.pia-detail-link {
  color: var(--brand-700);
  text-decoration: none;
  transition: opacity 0.12s;
}
.pia-detail-link:hover { text-decoration: underline; }

/* Metadata */
.pia-meta-row {
  display: flex;
  align-items: baseline;
  gap: 6px;
  margin: 0;
  font-size: 12.5px;
}
.pia-meta-label { color: var(--pia-text-3); font-weight: 400; flex-shrink: 0; }
.pia-meta-date { color: var(--pia-text); font-weight: 500; }

/* Owner card */
.prop-owner-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--brand-100);
  color: var(--brand-700);
  display: grid;
  place-items: center;
  font-size: 14px;
  font-weight: 600;
  flex-shrink: 0;
}
.prop-owner-contact {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--pia-text-3);
}

/* Status variants */
.pia-status.warning { background: var(--amber-50); color: var(--amber-700); }
.pia-status.warning .dot { background: var(--amber-500); }
.pia-status.danger { background: var(--terra-50, #fef2f2); color: var(--terra); }
.pia-status.danger .dot { background: var(--terra); }
.pia-status.draft { background: var(--pia-surface-2); color: var(--pia-text-3); }
.pia-status.draft .dot { background: var(--pia-text-4); }
.pia-status.pending { background: var(--amber-50); color: var(--amber-700); }
.pia-status.pending .dot { background: var(--amber-500); }

/* Contract rows */
.prop-contract-row {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 18px;
  border-bottom: 1px solid var(--pia-border);
  cursor: pointer;
  transition: background 0.12s;
}
.prop-contract-row:last-child { border-bottom: none; }
.prop-contract-row:hover { background: var(--pia-surface-2); }

.prop-contract-bar {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  flex-shrink: 0;
}
.prop-contract-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.prop-contract-tenants {
  font-size: 13.5px;
  font-weight: 500;
  color: var(--pia-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.prop-contract-dates {
  font-size: 11.5px;
  color: var(--pia-text-4);
  font-family: var(--font-mono);
}
.prop-contract-right {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}
.prop-contract-amount {
  font-size: 13.5px;
  font-weight: 600;
  color: var(--pia-text);
}

/* Legal doc rows */
.prop-doc-row {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 13px 18px;
  border-bottom: 1px solid var(--pia-border);
}
.prop-doc-row:last-child { border-bottom: none; }
.prop-doc-icon-wrap {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: var(--brand-50);
  display: grid;
  place-items: center;
  flex-shrink: 0;
}
.prop-doc-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.prop-doc-name { font-size: 13px; font-weight: 500; color: var(--pia-text); }
.prop-doc-date { font-size: 11.5px; color: var(--pia-text-4); }

/* Photo grid */
.prop-photo-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 12px;
}
@media (max-width: 480px) {
  .prop-photo-grid { grid-template-columns: repeat(2, 1fr); }
}
.prop-photo-item {
  position: relative;
  aspect-ratio: 1;
  border-radius: var(--pia-radius-sm);
  overflow: hidden;
  border: 1px solid var(--pia-border);
  cursor: pointer;
}
.prop-photo-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.2s;
}
.prop-photo-item:hover .prop-photo-img { transform: scale(1.05); }
.prop-photo-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0,0,0,0);
  transition: background 0.2s;
}
.prop-photo-item:hover .prop-photo-overlay { background: rgba(0,0,0,0.28); }
.prop-photo-actions {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  opacity: 0;
  transition: opacity 0.2s;
}
.prop-photo-item:hover .prop-photo-actions { opacity: 1; }
.prop-photo-action-btn {
  background: rgba(255,255,255,0.9) !important;
  color: var(--pia-text) !important;
  width: 34px !important;
  height: 34px !important;
  padding: 0 !important;
  border-radius: 8px !important;
}
.prop-photo-delete {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  background: var(--terra);
  color: white;
  border: none;
  cursor: pointer;
  display: grid;
  place-items: center;
  opacity: 0;
  transition: opacity 0.2s;
}
.prop-photo-item:hover .prop-photo-delete { opacity: 1; }
.prop-photo-uploading {
  background: var(--pia-surface-2);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: default;
}

/* Edit form */
.prop-form-label {
  font-size: 11.5px;
  font-weight: 500;
  color: var(--pia-text-2);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  display: block;
  margin-bottom: 5px;
}
.prop-form-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 14px;
}
.prop-form-grid-3 { grid-template-columns: repeat(3, 1fr); }
@media (max-width: 640px) {
  .prop-form-grid, .prop-form-grid-3 { grid-template-columns: 1fr; }
}
.prop-form-section-title {
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--pia-text-3);
  margin: 0;
}

/* Danger button (used nowhere in this file but keep consistent) */
.pia-btn-danger {
  background: var(--terra-50, #fef2f2);
  color: var(--terra);
  border: 1px solid color-mix(in oklch, var(--terra) 20%, transparent);
}
.pia-btn-danger:hover { background: color-mix(in oklch, var(--terra) 12%, white); }
</style>
