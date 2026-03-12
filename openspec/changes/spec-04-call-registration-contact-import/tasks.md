## 1. Dependencias e instalación

- [x] 1.1 Instalar dependencias: `npm install papaparse xlsx` y `npm install -D @types/papaparse`
- [x] 1.2 Instalar componentes shadcn: `npx shadcn@latest add table badge sheet dialog input select scroll-area separator`
- [x] 1.3 Configurar `bodySizeLimit: '10mb'` para Server Actions en `next.config.ts`

## 2. Utilidades compartidas

- [x] 2.1 Crear `src/shared/lib/retell.ts` con tipos de payload: `RetellPostCallPayload` (metadata post-call de Retell) y `RetellToolPayload` (resultado de tool desde N8N: name, address, phone, date, block, time, transcription), más helpers de mapeo
- [x] 2.2 Crear `src/shared/lib/parse-contacts.ts` con función `parseContactsFile(buffer, filename)` que detecta CSV/Excel, parsea con papaparse/xlsx, normaliza headers (nombre→firstName, telefono→phone, etc.), valida phone requerido, y retorna `ParsedContact[]`
- [x] 2.3 Crear `src/shared/ui/result-badge.tsx` — componente que mapea result a Badge con color: positive→verde, rejected→rojo, dnc→naranja, no_answer→gris

## 3. Repositorios (capa entities)

- [x] 3.1 Crear `src/entities/agents/repository.ts` con métodos: `getActive()` (agentes con isActive=true), `getByRetellId(retellAgentId)` (lookup por ID de Retell), `getAll()` (para dropdowns de filtros)
- [x] 3.2 Crear `src/entities/dnc/repository.ts` con métodos: `getPhoneSet()` (retorna Set de phones en DNC), `insert(phone, sourceCallId?, reason?)` (con onConflictDoNothing)
- [x] 3.3 Crear `src/entities/batches/repository.ts` con métodos: `create(userId, name)`, `updateTotalContacts(batchId, count)`, `getAll()` (para dropdowns de filtros)
- [x] 3.4 Crear `src/entities/contacts/repository.ts` con métodos: `bulkInsert(contacts[])`, `getMany(filters)` (con joins a agents y batches, paginación), `updateStatus(contactId, status)`, `getPhoneSet()` (para dedup), `findByPhone(phone)`
- [x] 3.5 Crear `src/entities/calls/repository.ts` con métodos: `upsert(data)` (onConflictDoUpdate en retellCallId), `getMany(filters)` (con join a agents, filtros dinámicos, búsqueda, paginación), `getById(id)` (con join a agents)

## 4. Webhooks de Retell

- [x] 4.1 Crear `src/app/api/webhook/retell/route.ts` — POST handler que recibe metadata post-call de Retell (sin auth): parsea payload, usa AgentsRepository.getByRetellId, ContactsRepository.findByPhone, CallsRepository.upsert (por retellCallId o phone), calcula duración, persiste transcript/audioUrl/cost/timestamps
- [x] 4.2 Crear `src/app/api/webhook/retell-tool/route.ts` — POST handler que recibe resultado de tool del agente desde N8N (sin auth). Payload: `{ name, address, phone, date, block, time, transcription }`. Usa CallsRepository.upsert con customerName=name, customerAddress=address, summary (incluye date+block), result='positive', transcript=transcription
- [x] 4.3 Implementar actualización de contacto via ContactsRepository.updateStatus según resultado (en ambos webhooks)
- [x] 4.4 Implementar inserción automática en DNC via DncRepository.insert cuando result = 'dnc'

## 5. API routes del dashboard

- [x] 5.1 Crear `src/app/api/calls/route.ts` — GET handler que valida sesión, parsea query params (page, pageSize, result, agentId, dateFrom, dateTo, search), delega a CallsRepository.getMany, retorna { data, total }
- [x] 5.2 Crear `src/app/api/calls/[id]/route.ts` — GET handler que valida sesión, delega a CallsRepository.getById
- [x] 5.3 Crear `src/app/api/contacts/route.ts` — GET handler que valida sesión, parsea query params (page, pageSize, batchId, status, agentId, search), delega a ContactsRepository.getMany
- [x] 5.4 Crear `src/app/api/contacts/import/route.ts` — POST handler que valida sesión, parsea archivo con parseContactsFile, consulta DncRepository.getPhoneSet y ContactsRepository.getPhoneSet, usa AgentsRepository.getActive, crea batch via BatchesRepository, asigna agentes round-robin, bulk insert via ContactsRepository, retorna ImportResult

## 6. Vista de llamadas (`/llamadas`)

- [x] 6.1 Crear `src/widgets/calls/call-filters.tsx` — componente cliente con Select de resultado, Select de agente, inputs de fecha, input de búsqueda (debounced). Usa router.push para actualizar searchParams
- [x] 6.2 Crear `src/widgets/calls/call-detail-sheet.tsx` — componente cliente con Sheet de shadcn que hace fetch a `/api/calls/[id]`, muestra info del cliente, metadata de llamada, summary, transcripción en ScrollArea, y audio player nativo
- [x] 6.3 Crear `src/widgets/calls/calls-table.tsx` — componente cliente con Table de shadcn, hace fetch a `/api/calls` con searchParams, click en fila abre CallDetailSheet, paginación al fondo
- [x] 6.4 Modificar `src/app/(dashboard)/llamadas/page.tsx` — Server Component que usa AgentsRepository.getAll para pasar lista de agentes al filtro, renderiza CallFilters + CallsTable

## 7. Vista de contactos (`/contactos`)

- [x] 7.1 Crear `src/widgets/contacts/contact-filters.tsx` — componente cliente con Select de batch, Select de status, Select de agente, input de búsqueda
- [x] 7.2 Crear `src/widgets/contacts/import-dialog.tsx` — componente cliente con Dialog de shadcn, input de archivo (.csv/.xlsx/.xls), hace POST a `/api/contacts/import`, muestra loading → resumen, router.refresh() al cerrar
- [x] 7.3 Crear `src/widgets/contacts/contacts-table.tsx` — componente cliente con Table, hace fetch a `/api/contacts`, columnas: nombre, teléfono, agente, status badge, batch
- [x] 7.4 Modificar `src/app/(dashboard)/contactos/page.tsx` — Server Component que usa AgentsRepository.getAll y BatchesRepository.getAll para pasar datos iniciales, renderiza ImportDialog + ContactFilters + ContactsTable

## 8. Verificación

- [ ] 8.1 Verificar ambos webhooks con curl: enviar payload mock post-call a `/api/webhook/retell` y payload mock tool a `/api/webhook/retell-tool` → verificar registros en DB y correlación por phone
- [ ] 8.2 Verificar importación: subir CSV de prueba via `/api/contacts/import` → verificar contactos creados, batch creado, DNC respetado, agentes asignados round-robin
- [ ] 8.3 Verificar `/llamadas`: tabla muestra datos via API, filtros funcionan, búsqueda funciona, sheet de detalle abre correctamente
- [ ] 8.4 Verificar `/contactos`: tabla muestra datos via API, filtros funcionan, dialog de importación funciona
- [x] 8.5 Verificar `npm run build` pasa sin errores
