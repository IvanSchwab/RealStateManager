<template>
  <div class="p-6">
    <!-- Loading state -->
    <div v-if="loading && !currentProperty" class="py-12 text-center text-muted-foreground">
      <Loader2 class="w-8 h-8 mx-auto animate-spin" />
      <p class="mt-2">Cargando propiedad...</p>
    </div>

    <!-- Error state -->
    <div v-else-if="error && !currentProperty" class="py-12 text-center">
      <AlertCircle class="w-12 h-12 mx-auto text-destructive mb-4" />
      <p class="text-destructive font-medium mb-2">Error al cargar la propiedad</p>
      <p class="text-sm text-muted-foreground mb-4">{{ error }}</p>
      <Button variant="outline" @click="goBack">
        <ArrowLeft class="w-4 h-4 mr-2" />
        Volver a Propiedades
      </Button>
    </div>

    <!-- Property details -->
    <template v-else-if="currentProperty">
      <!-- Header Card -->
      <div
        class="bg-white dark:bg-gray-900 rounded-xl shadow-sm mb-6 overflow-hidden"
      >
        <!-- Colored top border based on property_type -->
        <div :class="['h-1', getPropertyTypeColorClass(currentProperty.property_type)]" />

        <div class="p-6">
          <div class="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div>
              <Button variant="ghost" size="sm" class="mb-2 -ml-2" @click="goBack">
                <ArrowLeft class="w-4 h-4 mr-2" />
                Volver a Propiedades
              </Button>
              <h1 class="text-2xl font-bold text-gray-900 dark:text-white">{{ currentProperty.name }}</h1>
              <div class="flex items-center gap-2 mt-3">
                <Badge :class="getStatusBadgeClass(currentProperty.status)">
                  {{ getStatusLabel(currentProperty.status) }}
                </Badge>
                <Badge :class="getTypeBadgeClass(currentProperty.property_type)">
                  {{ getTypeLabel(currentProperty.property_type) }}
                </Badge>
                <Badge :class="getPurposeBadgeClass(currentProperty.purpose)">
                  {{ currentProperty.purpose === 'alquiler' ? 'Alquiler' : 'Venta' }}
                </Badge>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <Button variant="outline" @click="enterEditMode" :disabled="isEditing">
                <Pencil class="w-4 h-4 mr-2" />
                Editar Propiedad
              </Button>
            </div>
          </div>
        </div>
      </div>

      <!-- Tabs -->
      <Tabs v-model="activeTab" class="w-full">
        <TabsList class="mb-6 w-full overflow-x-auto justify-start">
          <TabsTrigger value="datos" class="shrink-0">Datos</TabsTrigger>
          <TabsTrigger value="contratos" class="shrink-0" @click="loadContractsIfNeeded">Contratos</TabsTrigger>
          <TabsTrigger value="documentos" class="shrink-0" @click="loadLegalDocumentsIfNeeded">Documentos Legales</TabsTrigger>
          <TabsTrigger value="fotos" class="shrink-0" @click="loadImagesIfNeeded">Fotos</TabsTrigger>
        </TabsList>

        <!-- Tab 1: Datos -->
        <TabsContent value="datos">
          <!-- Edit Mode -->
          <div v-if="isEditing" class="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle class="text-lg">Editar Propiedad</CardTitle>
              </CardHeader>
              <CardContent>
                <form @submit.prevent="handleSave" class="space-y-6">
                  <!-- Basic Info -->
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div class="md:col-span-2">
                      <Label for="name">Nombre</Label>
                      <Input id="name" v-model="editForm.name" required />
                    </div>
                    <div>
                      <Label for="property_type">Tipo de Propiedad</Label>
                      <Select v-model="editForm.property_type">
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar tipo" />
                        </SelectTrigger>
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
                      <Label for="purpose">Proposito</Label>
                      <Select v-model="editForm.purpose">
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar proposito" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="alquiler">Alquiler</SelectItem>
                          <SelectItem value="venta">Venta</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label for="status">Estado</Label>
                      <Select v-model="editForm.status">
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar estado" />
                        </SelectTrigger>
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

                  <!-- Location -->
                  <Separator />
                  <h3 class="font-medium">Ubicacion</h3>
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label for="address_street">Calle</Label>
                      <Input id="address_street" v-model="editForm.address_street" required />
                    </div>
                    <div>
                      <Label for="address_number">Numero</Label>
                      <Input id="address_number" :model-value="editForm.address_number ?? undefined" @update:model-value="editForm.address_number = $event != null ? String($event) : null" />
                    </div>
                    <div>
                      <Label for="address_floor">Piso</Label>
                      <Input id="address_floor" :model-value="editForm.address_floor ?? undefined" @update:model-value="editForm.address_floor = $event != null ? String($event) : null" />
                    </div>
                    <div>
                      <Label for="address_apartment">Departamento</Label>
                      <Input id="address_apartment" :model-value="editForm.address_apartment ?? undefined" @update:model-value="editForm.address_apartment = $event != null ? String($event) : null" />
                    </div>
                    <div>
                      <Label for="address_city">Ciudad</Label>
                      <Input id="address_city" v-model="editForm.address_city" required />
                    </div>
                    <div>
                      <Label for="address_state">Provincia</Label>
                      <Input id="address_state" v-model="editForm.address_state" required />
                    </div>
                    <div>
                      <Label for="address_zip_code">Codigo Postal</Label>
                      <Input id="address_zip_code" :model-value="editForm.address_zip_code ?? undefined" @update:model-value="editForm.address_zip_code = $event != null ? String($event) : null" />
                    </div>
                  </div>

                  <!-- Details -->
                  <Separator />
                  <h3 class="font-medium">Detalles</h3>
                  <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label for="bedrooms">Dormitorios</Label>
                      <Input id="bedrooms" :model-value="editForm.bedrooms ?? undefined" @update:model-value="editForm.bedrooms = $event ?? null" type="text" inputmode="decimal" placeholder="ej: 3" />
                    </div>
                    <div>
                      <Label for="bathrooms">Banos</Label>
                      <Input id="bathrooms" :model-value="editForm.bathrooms ?? undefined" @update:model-value="editForm.bathrooms = $event ?? null" type="text" inputmode="decimal" placeholder="ej: 2" />
                    </div>
                    <div>
                      <Label for="square_meters">Superficie (m2)</Label>
                      <Input id="square_meters" :model-value="editForm.square_meters ?? undefined" @update:model-value="editForm.square_meters = $event ?? null" type="text" inputmode="decimal" placeholder="ej: 45,5" />
                    </div>
                  </div>

                  <div>
                    <Label for="description">Descripcion</Label>
                    <Textarea id="description" :model-value="editForm.description ?? undefined" @update:model-value="editForm.description = $event != null ? String($event) : null" rows="3" />
                  </div>

                  <!-- Owner -->
                  <Separator />
                  <h3 class="font-medium">Propietario</h3>
                  <div>
                    <Label for="owner_id">Propietario</Label>
                    <Select v-model="editForm.owner_id">
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar propietario" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Sin propietario</SelectItem>
                        <SelectItem v-for="owner in owners" :key="owner.id" :value="owner.id">
                          {{ owner.full_name }}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <!-- Actions -->
                  <div class="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="outline" @click="cancelEdit" :disabled="saving">
                      Cancelar
                    </Button>
                    <Button type="submit" :disabled="saving">
                      <Loader2 v-if="saving" class="w-4 h-4 mr-2 animate-spin" />
                      Guardar cambios
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>

          <!-- Read-only Mode -->
          <div v-else class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <!-- Main Column -->
            <div class="lg:col-span-2 space-y-6">
              <!-- General Information -->
              <Card>
                <CardHeader>
                  <CardTitle class="text-lg border-l-4 border-primary pl-3">Informacion General</CardTitle>
                </CardHeader>
                <CardContent>
                  <dl class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <dt class="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">Tipo de Propiedad</dt>
                      <dd class="text-sm font-medium text-gray-900 dark:text-white">{{ getTypeLabel(currentProperty.property_type) }}</dd>
                    </div>
                    <div>
                      <dt class="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">Proposito</dt>
                      <dd class="text-sm font-medium text-gray-900 dark:text-white">{{ currentProperty.purpose === 'alquiler' ? 'Alquiler' : 'Venta' }}</dd>
                    </div>
                    <div>
                      <dt class="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">Estado</dt>
                      <dd>
                        <Badge :class="getStatusBadgeClass(currentProperty.status)">
                          {{ getStatusLabel(currentProperty.status) }}
                        </Badge>
                      </dd>
                    </div>
                    <div>
                      <dt class="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">Superficie</dt>
                      <dd class="text-sm font-medium text-gray-900 dark:text-white">{{ currentProperty.square_meters ? `${currentProperty.square_meters} m2` : '-' }}</dd>
                    </div>
                    <div>
                      <dt class="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">Dormitorios</dt>
                      <dd class="text-sm font-medium text-gray-900 dark:text-white">{{ currentProperty.bedrooms ?? '-' }}</dd>
                    </div>
                    <div>
                      <dt class="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">Banos</dt>
                      <dd class="text-sm font-medium text-gray-900 dark:text-white">{{ currentProperty.bathrooms ?? '-' }}</dd>
                    </div>
                    <div v-if="currentProperty.description" class="md:col-span-2">
                      <dt class="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">Descripcion</dt>
                      <dd class="text-sm font-medium text-gray-900 dark:text-white whitespace-pre-wrap">{{ currentProperty.description }}</dd>
                    </div>
                  </dl>
                </CardContent>
              </Card>

              <!-- Location -->
              <Card>
                <CardHeader>
                  <CardTitle class="text-lg border-l-4 border-primary pl-3">Ubicacion</CardTitle>
                </CardHeader>
                <CardContent>
                  <dl class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <dt class="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">Calle y numero</dt>
                      <dd class="text-sm font-medium text-gray-900 dark:text-white">
                        {{ currentProperty.address_street }}{{ currentProperty.address_number ? ` ${currentProperty.address_number}` : '' }}
                      </dd>
                    </div>
                    <div v-if="currentProperty.address_floor || currentProperty.address_apartment">
                      <dt class="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">Piso / Depto</dt>
                      <dd class="text-sm font-medium text-gray-900 dark:text-white">
                        {{ [currentProperty.address_floor, currentProperty.address_apartment].filter(Boolean).join(' - ') }}
                      </dd>
                    </div>
                    <div>
                      <dt class="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">Ciudad</dt>
                      <dd class="text-sm font-medium text-gray-900 dark:text-white">{{ currentProperty.address_city }}</dd>
                    </div>
                    <div>
                      <dt class="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">Provincia</dt>
                      <dd class="text-sm font-medium text-gray-900 dark:text-white">{{ currentProperty.address_state }}</dd>
                    </div>
                    <div v-if="currentProperty.address_zip_code">
                      <dt class="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">Codigo Postal</dt>
                      <dd class="text-sm font-medium text-gray-900 dark:text-white">{{ currentProperty.address_zip_code }}</dd>
                    </div>
                  </dl>
                </CardContent>
              </Card>
            </div>

            <!-- Sidebar -->
            <div class="space-y-6">
              <!-- Owner Card -->
              <Card>
                <CardHeader>
                  <CardTitle class="text-lg border-l-4 border-primary pl-3">Propietario</CardTitle>
                </CardHeader>
                <CardContent>
                  <div v-if="currentProperty.owner" class="space-y-3">
                    <div class="flex items-center gap-3">
                      <div class="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                        <User class="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p class="font-medium text-gray-900 dark:text-white">{{ currentProperty.owner.full_name }}</p>
                      </div>
                    </div>
                    <div v-if="currentProperty.owner.email" class="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                      <Mail class="w-4 h-4" />
                      <span>{{ currentProperty.owner.email }}</span>
                    </div>
                    <div v-if="currentProperty.owner.phone" class="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                      <Phone class="w-4 h-4" />
                      <span>{{ currentProperty.owner.phone }}</span>
                    </div>
                    <RouterLink
                      :to="{ name: 'owner-details', params: { id: currentProperty.owner.id } }"
                      class="inline-flex items-center text-sm text-primary hover:underline mt-2"
                    >
                      Ver propietario
                      <ChevronRight class="w-4 h-4 ml-1" />
                    </RouterLink>
                  </div>
                  <div v-else class="text-center py-4">
                    <User class="w-10 h-10 mx-auto text-gray-300 dark:text-gray-600 mb-2" />
                    <p class="text-sm text-gray-600 dark:text-gray-400 mb-1">Sin propietario asignado</p>
                    <p class="text-xs text-gray-400 dark:text-gray-500 mb-3">Asigna un propietario para esta propiedad</p>
                    <Button variant="outline" size="sm" @click="enterEditMode">
                      Asignar propietario
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <!-- Metadata Card -->
              <Card>
                <CardHeader>
                  <CardTitle class="text-lg border-l-4 border-primary pl-3">Detalles</CardTitle>
                </CardHeader>
                <CardContent class="space-y-4">
                  <div>
                    <p class="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">Creado</p>
                    <p class="text-sm font-medium text-gray-900 dark:text-white">{{ formatDateTime(currentProperty.created_at) }}</p>
                  </div>
                  <div>
                    <p class="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">Ultima actualizacion</p>
                    <p class="text-sm font-medium text-gray-900 dark:text-white">{{ formatDateTime(currentProperty.updated_at) }}</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <!-- Tab 2: Contratos -->
        <TabsContent value="contratos">
          <Card>
            <CardHeader>
              <CardTitle class="text-lg">Contratos Asociados</CardTitle>
            </CardHeader>
            <CardContent>
              <!-- Loading -->
              <div v-if="loadingContracts" class="space-y-3">
                <Skeleton class="h-16 w-full" />
                <Skeleton class="h-16 w-full" />
                <Skeleton class="h-16 w-full" />
              </div>

              <!-- Contracts List -->
              <div v-else-if="contracts.length > 0" class="space-y-3">
                <div
                  v-for="contract in contracts"
                  :key="contract.id"
                  :class="[
                    'flex items-center justify-between p-4 border border-border rounded-lg cursor-pointer transition-colors',
                    'hover:bg-gray-50 dark:hover:bg-gray-800/50',
                    'border-l-4',
                    getContractStatusBorderClass(contract.status)
                  ]"
                  @click="navigateToContract(contract.id)"
                >
                  <div class="space-y-1">
                    <p class="font-medium text-gray-900 dark:text-white">
                      {{ contract.tenants.map(t => `${t.first_name} ${t.last_name}`).join(', ') || 'Sin inquilinos' }}
                    </p>
                    <p class="text-sm text-gray-500 dark:text-gray-400">
                      {{ formatDate(contract.start_date) }} - {{ formatDate(contract.end_date) }}
                    </p>
                  </div>
                  <div class="flex items-center gap-4">
                    <p class="font-semibold text-gray-900 dark:text-white">{{ formatCurrency(contract.monthly_rent) }}</p>
                    <Badge :class="getContractStatusBadgeClass(contract.status)">
                      {{ getContractStatusLabel(contract.status) }}
                    </Badge>
                    <ChevronRight class="w-4 h-4 text-gray-400 dark:text-gray-500" />
                  </div>
                </div>
              </div>

              <!-- Empty State -->
              <div v-else class="py-12 text-center">
                <FileText class="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                <p class="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">No hay contratos asociados</p>
                <p class="text-xs text-gray-400 dark:text-gray-500">Los contratos de esta propiedad apareceran aqui</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <!-- Tab 3: Documentos Legales -->
        <TabsContent value="documentos">
          <Card>
            <CardHeader>
              <CardTitle class="text-lg">Documentos Legales</CardTitle>
            </CardHeader>
            <CardContent>
              <!-- Loading -->
              <div v-if="loadingLegalDocs" class="space-y-3">
                <Skeleton class="h-12 w-full" />
                <Skeleton class="h-12 w-full" />
                <Skeleton class="h-12 w-full" />
              </div>

              <!-- Documents List -->
              <div v-else-if="legalDocuments.length > 0" class="space-y-3">
                <div
                  v-for="doc in legalDocuments"
                  :key="doc.id"
                  class="flex items-center justify-between p-4 border border-border rounded-lg"
                >
                  <div class="flex items-center gap-3">
                    <div class="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                      <FileText class="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p class="font-medium">{{ getLegalDocumentTypeLabel(doc.document_type) }}</p>
                      <p class="text-sm text-muted-foreground">{{ formatDate(doc.created_at) }}</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" :disabled="!doc.pdf_url || downloadingDocId === doc.id" @click="downloadLegalDocument(doc)">
                    <Loader2 v-if="downloadingDocId === doc.id" class="w-4 h-4 mr-2 animate-spin" />
                    <Download v-else class="w-4 h-4 mr-2" />
                    Descargar
                  </Button>
                </div>
              </div>

              <!-- Empty State -->
              <div v-else class="py-12 text-center">
                <FileText class="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                <p class="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">No hay documentos legales</p>
                <p class="text-xs text-gray-400 dark:text-gray-500">Los documentos legales de esta propiedad apareceran aqui</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <!-- Tab 4: Fotos -->
        <TabsContent value="fotos">
          <Card>
            <CardHeader class="flex flex-row items-center justify-between">
              <CardTitle class="text-lg">Fotos</CardTitle>
              <Button @click="triggerFileInput" :disabled="uploading">
                <Plus class="w-4 h-4 mr-2" />
                Agregar foto
              </Button>
              <input
                ref="fileInputRef"
                type="file"
                accept="image/*"
                multiple
                class="hidden"
                @change="handleFileSelect"
              />
            </CardHeader>
            <CardContent>
              <!-- Loading -->
              <div v-if="loadingImages" class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                <Skeleton class="aspect-square w-full rounded-lg" />
                <Skeleton class="aspect-square w-full rounded-lg" />
                <Skeleton class="aspect-square w-full rounded-lg" />
                <Skeleton class="aspect-square w-full rounded-lg" />
              </div>

              <!-- Images Grid -->
              <div v-else-if="images.length > 0" class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                <div
                  v-for="image in images"
                  :key="image.id"
                  class="relative group aspect-square rounded-lg overflow-hidden border border-border hover:shadow-md transition-all duration-200 cursor-pointer"
                  @click="openImageLightbox(image)"
                >
                  <img
                    :src="image.url"
                    :alt="image.name"
                    class="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                  />
                  <div class="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors duration-200" />
                  <!-- Action buttons overlay -->
                  <div class="absolute inset-0 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <Button
                      variant="secondary"
                      size="icon"
                      class="h-9 w-9 shadow-lg"
                      @click.stop="openImageLightbox(image)"
                    >
                      <Expand class="w-4 h-4" />
                    </Button>
                    <Button
                      variant="secondary"
                      size="icon"
                      class="h-9 w-9 shadow-lg"
                      @click.stop="downloadImage(image)"
                    >
                      <Download class="w-4 h-4" />
                    </Button>
                  </div>
                  <!-- Delete button -->
                  <Button
                    variant="destructive"
                    size="icon"
                    class="absolute top-2 right-2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-lg"
                    @click.stop="confirmDeleteImage(image)"
                  >
                    <X class="w-4 h-4" />
                  </Button>
                </div>

                <!-- Upload Progress -->
                <div
                  v-for="progress in uploadProgress"
                  :key="progress.fileName"
                  class="relative aspect-square rounded-lg overflow-hidden border border-border bg-gray-50 dark:bg-gray-800/50 flex items-center justify-center"
                >
                  <div class="text-center">
                    <Loader2 class="w-8 h-8 mx-auto animate-spin text-primary mb-2" />
                    <p class="text-sm text-gray-600 dark:text-gray-400 truncate px-2">{{ progress.fileName }}</p>
                    <p class="text-xs text-gray-400 dark:text-gray-500">{{ progress.percentage }}%</p>
                  </div>
                </div>
              </div>

              <!-- Empty State -->
              <div v-else class="py-12 text-center">
                <ImageIcon class="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                <p class="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">No hay fotos cargadas</p>
                <p class="text-xs text-gray-400 dark:text-gray-500 mb-4">Sube imagenes de la propiedad para mostrar a los interesados</p>
                <Button @click="triggerFileInput" :disabled="uploading">
                  <Plus class="w-4 h-4 mr-2" />
                  Agregar foto
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </template>

    <!-- Delete Image Confirmation Dialog -->
    <AlertDialog v-model:open="deleteImageDialogOpen">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Eliminar imagen</AlertDialogTitle>
          <AlertDialogDescription>
            Estas seguro de que deseas eliminar esta imagen? Esta accion no se puede deshacer.
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

    <!-- Image Lightbox Dialog -->
    <AlertDialog v-model:open="lightboxOpen">
      <AlertDialogContent class="max-w-4xl p-0 overflow-hidden">
        <div class="relative">
          <!-- Close button -->
          <Button
            variant="ghost"
            size="icon"
            class="absolute top-2 right-2 z-10 h-8 w-8 bg-black/50 hover:bg-black/70 text-white"
            @click="lightboxOpen = false"
          >
            <X class="w-4 h-4" />
          </Button>
          <!-- Image -->
          <img
            v-if="lightboxImage"
            :src="lightboxImage.url"
            :alt="lightboxImage.name"
            class="w-full max-h-[80vh] object-contain bg-black"
          />
          <!-- Footer with filename and download -->
          <div class="p-4 bg-background flex items-center justify-between">
            <p class="text-sm text-muted-foreground truncate">{{ lightboxImage?.name }}</p>
            <Button variant="outline" size="sm" @click="downloadImage(lightboxImage!)">
              <Download class="w-4 h-4 mr-2" />
              Descargar
            </Button>
          </div>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
} from 'lucide-vue-next'
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

// Properties composable
const {
  currentProperty,
  loading,
  error,
  fetchPropertyById,
  updateProperty,
  getPropertyContracts,
  getPropertyLegalDocuments,
} = useProperties()

// Property images composable
const {
  images,
  loading: loadingImages,
  uploading,
  uploadProgress,
  fetchPropertyImages,
  uploadPropertyImage,
  deletePropertyImage,
} = usePropertyImages()

// Owners composable
const { owners, fetchOwners } = useOwners()

// State
const activeTab = ref('datos')
const isEditing = ref(false)
const saving = ref(false)

// Contracts state
const contracts = ref<PropertyContract[]>([])
const loadingContracts = ref(false)
const contractsLoaded = ref(false)

// Legal documents state
const legalDocuments = ref<PropertyLegalDocument[]>([])
const loadingLegalDocs = ref(false)
const legalDocsLoaded = ref(false)
const downloadingDocId = ref<string | null>(null)

// Images state
const imagesLoaded = ref(false)
const fileInputRef = ref<HTMLInputElement | null>(null)
const deleteImageDialogOpen = ref(false)
const imageToDelete = ref<PropertyImage | null>(null)
const deletingImage = ref(false)
const lightboxOpen = ref(false)
const lightboxImage = ref<PropertyImage | null>(null)

// Edit form
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

// Property ID from route
const propertyId = route.params.id as string

// Helper functions
function getTypeLabel(type: PropertyType): string {
  const labels: Record<PropertyType, string> = {
    departamento: 'Departamento',
    casa: 'Casa',
    comercial: 'Comercial',
    terreno: 'Terreno',
    oficina: 'Oficina',
    local: 'Local',
    galpon: 'Galpon',
  }
  return labels[type] || type
}

function getTypeBadgeClass(type: PropertyType): string {
  const classes: Record<PropertyType, string> = {
    departamento: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800',
    casa: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
    comercial: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800',
    terreno: 'bg-stone-100 text-stone-800 dark:bg-stone-900/30 dark:text-stone-400 border-stone-200 dark:border-stone-800',
    oficina: 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-400 border-sky-200 dark:border-sky-800',
    local: 'bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-400 border-violet-200 dark:border-violet-800',
    galpon: 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400 border-rose-200 dark:border-rose-800',
  }
  return classes[type] || ''
}

function getPropertyTypeColorClass(type: PropertyType): string {
  const classes: Record<PropertyType, string> = {
    departamento: 'bg-indigo-500',
    casa: 'bg-emerald-500',
    comercial: 'bg-amber-500',
    terreno: 'bg-stone-500',
    oficina: 'bg-sky-500',
    local: 'bg-violet-500',
    galpon: 'bg-rose-500',
  }
  return classes[type] || 'bg-gray-500'
}

function getPurposeBadgeClass(purpose: PropertyPurpose): string {
  if (purpose === 'alquiler') {
    return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800'
  }
  return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200 dark:border-purple-800'
}

function getStatusLabel(status: PropertyStatus): string {
  const labels: Record<PropertyStatus, string> = {
    disponible: 'Disponible',
    alquilada: 'Alquilada',
    mantenimiento: 'En mantenimiento',
    reservada: 'Reservada',
    vendida: 'Vendida',
  }
  return labels[status] || status
}

function getStatusBadgeClass(status: PropertyStatus): string {
  const classes: Record<PropertyStatus, string> = {
    disponible: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800',
    alquilada: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800',
    mantenimiento: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800',
    reservada: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200 dark:border-orange-800',
    vendida: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400 border-gray-200 dark:border-gray-800',
  }
  return classes[status] || ''
}

function getContractStatusLabel(status: ContractStatus): string {
  const labels: Record<ContractStatus, string> = {
    borrador: 'Borrador',
    activo: 'Activo',
    vencido: 'Vencido',
    rescindido: 'Rescindido',
    renovado: 'Renovado',
  }
  return labels[status] || status
}

function getContractStatusBadgeClass(status: ContractStatus): string {
  const classes: Record<ContractStatus, string> = {
    borrador: 'bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-400 border-slate-200 dark:border-slate-800',
    activo: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800',
    vencido: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800',
    rescindido: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400 border-gray-200 dark:border-gray-800',
    renovado: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800',
  }
  return classes[status] || ''
}

function getContractStatusBorderClass(status: ContractStatus): string {
  const classes: Record<ContractStatus, string> = {
    borrador: 'border-l-slate-400',
    activo: 'border-l-green-500',
    vencido: 'border-l-red-500',
    rescindido: 'border-l-gray-400',
    renovado: 'border-l-blue-500',
  }
  return classes[status] || 'border-l-gray-300'
}

function getLegalDocumentTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    corretaje: 'Corretaje',
    boleto_compraventa: 'Boleto de Compraventa',
    entrega_llaves: 'Entrega de Llaves',
  }
  return labels[type] || type
}

// Navigation
function goBack() {
  router.push({ name: 'properties' })
}

function navigateToContract(contractId: string) {
  router.push({ name: 'contract-details', params: { id: contractId } })
}

// Edit mode
function enterEditMode() {
  if (!currentProperty.value) return

  // Populate form with current values
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

function cancelEdit() {
  isEditing.value = false
}

// Normalize decimal input (handles comma as decimal separator)
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

    // Refresh property data after exiting edit mode
    fetchPropertyById(propertyId)
  } catch (e) {
    console.error('Error updating property:', e)
    toast.error('Error al actualizar la propiedad')
  } finally {
    saving.value = false
  }
}

// Lazy load contracts
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

// Lazy load legal documents
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

// Lazy load images
async function loadImagesIfNeeded() {
  if (imagesLoaded.value) return

  try {
    await fetchPropertyImages(propertyId)
    imagesLoaded.value = true
  } catch (e) {
    console.error('Error loading images:', e)
    toast.error('Error al cargar las imagenes')
  }
}

// Legal document download (same approach as LegalDocumentsView.vue)
async function downloadLegalDocument(doc: PropertyLegalDocument) {
  if (!doc.pdf_url) {
    toast.error('El documento no tiene un PDF asociado')
    return
  }

  downloadingDocId.value = doc.id

  try {
    // Download from Supabase storage
    const { data, error: downloadError } = await supabase.storage
      .from('contract-documents')
      .download(doc.pdf_url)

    if (downloadError) throw downloadError

    // Create download link
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

// Image upload
function triggerFileInput() {
  fileInputRef.value?.click()
}

async function handleFileSelect(event: Event) {
  const input = event.target as HTMLInputElement
  const files = input.files

  if (!files || files.length === 0) return

  for (const file of files) {
    try {
      const result = await uploadPropertyImage(propertyId, file)
      if (result) {
        toast.success(`Imagen "${file.name}" subida correctamente`)
      }
    } catch (e) {
      console.error('Error uploading image:', e)
      toast.error(`Error al subir "${file.name}"`)
    }
  }

  // Reset input
  input.value = ''
}

// Image delete
function confirmDeleteImage(image: PropertyImage) {
  imageToDelete.value = image
  deleteImageDialogOpen.value = true
}

async function executeDeleteImage() {
  if (!imageToDelete.value) return

  deletingImage.value = true

  try {
    const success = await deletePropertyImage(imageToDelete.value.id)
    if (success) {
      toast.success('Imagen eliminada correctamente')
    } else {
      toast.error('Error al eliminar la imagen')
    }
  } catch (e) {
    console.error('Error deleting image:', e)
    toast.error('Error al eliminar la imagen')
  } finally {
    deletingImage.value = false
    deleteImageDialogOpen.value = false
    imageToDelete.value = null
  }
}

// Image lightbox
function openImageLightbox(image: PropertyImage) {
  lightboxImage.value = image
  lightboxOpen.value = true
}

// Image download
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

// On mount
onMounted(async () => {
  // Fetch property and owners in parallel
  await Promise.all([
    fetchPropertyById(propertyId),
    fetchOwners(),
  ])
})
</script>
