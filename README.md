# SWELLS LAB

Webapp mobile-first de gestión de proyectos que se sincroniza con tu base de Airtable **SWELLS LAB**. Backend con Supabase Edge Functions (el PAT de Airtable nunca toca el cliente). Frontend con Next.js 14 + TanStack Query + Tailwind. Instalable como PWA en celular.

---

## 🚀 Setup en 6 pasos (~20 min)

### Paso 1 — Instalar dependencias localmente

Necesitas tener instalado:
- **Node.js 18+**: descárgalo de [nodejs.org](https://nodejs.org)
- **Supabase CLI**: `brew install supabase/tap/supabase` (o ver [supabase.com/docs/guides/cli](https://supabase.com/docs/guides/cli))

Luego, dentro de la carpeta del proyecto:

```bash
npm install
```

### Paso 2 — Crear el proyecto en Supabase

1. Ve a [supabase.com/dashboard](https://supabase.com/dashboard) → **New project**
2. Nómbralo `swells-lab`
3. Genera una contraseña fuerte para la base de datos y guárdala en tu password manager
4. Región: **West US (North California)** (la más cercana a Mazatlán)
5. Plan: **Free** está perfecto
6. Crea el proyecto (tarda ~2 min)

### Paso 3 — Generar tu Airtable Personal Access Token (PAT)

⚠️ **Importante**: si tenías un PAT anterior, revócalo primero en [airtable.com/create/tokens](https://airtable.com/create/tokens).

Crea uno nuevo:
1. Ve a [airtable.com/create/tokens](https://airtable.com/create/tokens) → **Create new token**
2. Nombre: `SWELLS LAB Supabase`
3. **Scopes** (añade los 3):
   - ✅ `data.records:read`
   - ✅ `data.records:write`
   - ✅ `schema.bases:read`
4. **Access**: añade la base **SWELLS LAB**
5. **Create token** → cópialo (empieza con `pat...`). Solo se muestra una vez.

### Paso 4 — Configurar los secrets en Supabase

**Opción A (recomendada) — Dashboard:**

1. En tu proyecto Supabase → barra lateral izquierda → **Edge Functions**
2. Pestaña **Secrets** (o "Manage secrets")
3. Añade estos 4 secrets uno por uno:

| Name | Value |
|---|---|
| `AIRTABLE_PAT` | El token que copiaste (empieza con `pat...`) |
| `AIRTABLE_BASE_ID` | `appVMD6ZRzGiMc423` |
| `AIRTABLE_TASKS_TABLE` | `tbldtz2zWtTmPeIPE` |
| `AIRTABLE_PROJECTS_TABLE` | `tblibxkvR1QTl8KEX` |

**Opción B — CLI:**

```bash
supabase login
supabase link --project-ref TU_PROJECT_REF

supabase secrets set AIRTABLE_PAT=patXXXXXXXXXXXXXX.YYYY...
supabase secrets set AIRTABLE_BASE_ID=appVMD6ZRzGiMc423
supabase secrets set AIRTABLE_TASKS_TABLE=tbldtz2zWtTmPeIPE
supabase secrets set AIRTABLE_PROJECTS_TABLE=tblibxkvR1QTl8KEX
```

(El `project-ref` lo encuentras en Supabase → Project Settings → General → Reference ID.)

### Paso 5 — Desplegar las Edge Functions

```bash
supabase functions deploy airtable-list-tasks
supabase functions deploy airtable-list-projects
supabase functions deploy airtable-update-task
supabase functions deploy airtable-create-task
```

Cada despliegue debería terminar con "Deployed Function ..." ✅.

**Test rápido** desde el dashboard: ve a Edge Functions → click en `airtable-list-tasks` → Invoke → deberías ver tus tareas en JSON.

### Paso 6 — Configurar el frontend localmente

Copia `.env.example` a `.env.local`:

```bash
cp .env.example .env.local
```

Edita `.env.local` y pega:

- `NEXT_PUBLIC_SUPABASE_URL` — Supabase → Project Settings → API → **Project URL**
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase → Project Settings → API → **anon / public** key

⚠️ **NO uses el `service_role` key.** Es server-only.

Lanza el dev server:

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000). Vas a ver la pantalla de login → escribe tu email → recibes el magic link → click → entras.

---

## 🌍 Deploy a producción (Vercel — 2 min)

1. Sube el proyecto a GitHub (`git init && git add . && git commit -m "init" && git push`)
2. Ve a [vercel.com/new](https://vercel.com/new) → **Import** tu repo
3. En **Environment Variables**, añade los mismos 2:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. **Deploy** → Vercel te da una URL `https://swells-lab-xxx.vercel.app`

### Configurar redirect URLs en Supabase

Para que el magic link funcione desde la URL de Vercel:
1. Supabase → Authentication → **URL Configuration**
2. **Site URL**: pega tu URL de Vercel
3. **Redirect URLs**: añade `https://tu-url.vercel.app/**`

---

## 📱 Instalar como app en tu celular

1. Abre la URL de Vercel en Safari (iOS) o Chrome (Android)
2. **iOS**: botón compartir → **Añadir a pantalla de inicio**
3. **Android**: menú ⋮ → **Añadir a pantalla de inicio**

Queda como app nativa: ícono, fullscreen, sin barra del navegador.

---

## 🗺️ Estructura del proyecto

```
swells-lab/
├── src/
│   ├── app/
│   │   ├── layout.tsx           # Layout raíz + Providers
│   │   ├── page.tsx             # Dashboard principal (tabs: Tareas / Proyectos / Semana)
│   │   └── login/page.tsx       # Magic link login
│   ├── components/
│   │   ├── TaskCard.tsx         # Card de tarea con acciones rápidas
│   │   ├── TaskDetail.tsx       # Modal detalle de tarea (editable)
│   │   ├── ProjectCard.tsx      # Card de proyecto con barra de progreso
│   │   ├── Picker.tsx           # Bottom-sheet selector
│   │   ├── Toast.tsx            # Notificaciones inferiores
│   │   └── Providers.tsx        # React Query provider
│   ├── lib/
│   │   ├── supabase.ts          # Cliente Supabase
│   │   ├── api.ts               # Wrappers de las Edge Functions
│   │   ├── queries.ts           # Hooks de TanStack Query + optimistic updates
│   │   ├── types.ts             # Tipos TS compartidos
│   │   └── utils.ts             # Helpers (clases CSS, fechas, sort)
│   └── styles/globals.css
├── supabase/
│   └── functions/
│       ├── airtable-list-tasks/index.ts
│       ├── airtable-list-projects/index.ts
│       ├── airtable-update-task/index.ts
│       └── airtable-create-task/index.ts
├── public/
│   └── manifest.json            # PWA manifest
├── package.json
├── tailwind.config.js
├── tsconfig.json
├── next.config.js
└── .env.example
```

---

## ✨ Features

### Pestaña Tareas
- Stats arriba (Abiertas / Urgente / En curso / Hechas)
- Filtros rápidos (chips horizontales scrolleables)
- Cards con status, prioridad, fecha; tap para editar status/prioridad rápido o abrir el detalle
- Optimistic UI: la pantalla cambia al instante, luego confirma con Airtable

### Pestaña Proyectos
- Lista de los 12 proyectos
- Barra de progreso visual mostrando distribución de tareas por estatus
- Ordenados por: Active primero → más tareas primero

### Pestaña Semana
- **Vencidas** (rojo, alerta)
- **Próximos 7 días**
- **Urgentes sin fecha**

### Detalle de tarea
- Brief / Contexto editable inline (autosave on blur)
- Notas / sub-tareas editables
- Status, prioridad, energía cambiables tocando el badge
- Attachments tappables

---

## 🔒 Seguridad

- El **PAT de Airtable NUNCA** está en el código frontend. Vive solo como secret en Supabase.
- Todas las llamadas a Airtable pasan por Edge Functions que validan el JWT de Supabase Auth.
- Si pierdes el celular: revoca el PAT en Airtable → la app deja de funcionar inmediatamente.

---

## 🐛 Troubleshooting

**"No veo las tareas"**
- Abre las DevTools del navegador → Network → busca llamadas a `airtable-list-tasks`. Mira el error.
- Verifica que los 4 secrets están en Supabase (Edge Functions → Secrets).
- Verifica que el PAT tiene acceso a la base SWELLS LAB.

**"401 Unauthorized"**
- No has iniciado sesión, o tu session expiró. Recarga y vuelve a hacer login.

**"502 Bad Gateway: Airtable 401"**
- El PAT está mal o no tiene los permisos correctos. Genera uno nuevo.

**Magic link no llega**
- Supabase → Authentication → Email Templates → verifica que el SMTP está configurado (el default de Supabase funciona pero a veces va a spam).

**Cambios no se guardan en Airtable**
- Verifica que el PAT tiene `data.records:write`.

---

## 🛠️ Comandos útiles

```bash
npm run dev            # dev server local
npm run build          # build producción
npm run start          # producción local

supabase functions deploy <name>     # redeploy una función
supabase functions logs <name>       # ver logs de una función
supabase secrets list                # ver qué secrets están configurados
```

---

## 📋 IDs de tu base (referencia)

- Base SWELLS LAB: `appVMD6ZRzGiMc423`
- Tabla Tasks: `tbldtz2zWtTmPeIPE`
- Tabla Projects: `tblibxkvR1QTl8KEX`

¡Listo! Cualquier duda, busca en logs primero (Vercel deployment logs y Supabase Edge Function logs).
