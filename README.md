# POS Profesional Colombia

Sistema POS multi-caja con módulos de **Bodega (escandallos)**, **Cocina en tiempo real**, **Domicilio (PWA + GPS)** y **Reportes financieros**, listo para desplegar en **Vercel + Supabase**.

## ⚙️ Stack

| Capa | Tecnología |
|---|---|
| Frontend | Next.js 14 (App Router) + TypeScript + Tailwind |
| Auth & DB | Supabase (Postgres + Auth + Realtime + RLS) |
| Hosting | Vercel |
| PWA | Service Worker + Manifest (módulo Domicilio) |

## 🧩 Estructura

```
pos-system/
├── app/
│   ├── (auth)/login/             # Login
│   ├── (admin)/admin/            # Dashboard, usuarios, productos, recetas, reportes, auditoría
│   ├── (caja)/caja/[cajaId]/     # POS por caja (aislado por RLS)
│   ├── (cocina)/cocina/          # Pantalla de cocina con audio + Realtime
│   ├── (bodega)/bodega/          # Stock, kardex, entradas/salidas, CSV
│   ├── (domicilio)/domicilio/    # PWA mobile-first con GPS
│   └── api/
│       ├── admin/crear-usuario/  # Creación segura con service role
│       ├── facturacion/whatsapp/ # Envío de factura por WhatsApp (Twilio)
│       ├── inventario/upload/    # Carga masiva CSV
│       └── nit/[nit]/            # Lookup NIT con autollenado
├── components/                   # POSCaja, PantallaCocina, BodegaModule, DomicilioModule, ...
├── lib/supabase/                 # Clientes (browser y server)
├── middleware.ts                 # Protección de rutas por rol
├── supabase/migrations/000_complete_setup.sql
└── supabase/seed.sql             # Datos de ejemplo
```

## 🚀 Despliegue rápido (≈20 min)

### 1. Supabase

1. Ve a [supabase.com](https://supabase.com) → **New project**.
2. Anota la `anon key`, `service_role key` y `Project URL` (Settings → API).
3. **SQL Editor** → pega completo `supabase/migrations/000_complete_setup.sql` → **Run**. Crea ~12 tablas, RLS, RPCs y publication realtime.
4. Opcional: pega `supabase/seed.sql` para tener cajas, categorías, insumos y productos de ejemplo.
5. **Authentication → Providers** → habilita **Email** (deshabilita "Confirm email" durante pruebas).
6. **Database → Replication** → confirma que la publication `supabase_realtime` incluye `ventas`, `venta_items`, `insumos` (la migración los agrega automáticamente).

### 2. Crear el primer ADMIN

Como las RLS impiden crear usuarios sin estar autenticado como ADMIN, el primero se crea manualmente:

1. **Authentication → Users → Add user → Create new user** con email + contraseña.
2. **SQL Editor** → ejecuta:
   ```sql
   INSERT INTO profiles (id, rol, nombre, activo)
   VALUES ('UUID_DEL_USUARIO_RECIEN_CREADO', 'ADMIN', 'Tu nombre', true);
   ```
3. A partir de ahora todos los demás usuarios se crean desde `/admin/usuarios`.

### 3. GitHub

```bash
cd pos-system
git init
git add .
git commit -m "feat: initial POS system"
gh repo create pos-system --private --source=. --push
# o crea el repo manualmente en github.com y luego:
# git remote add origin https://github.com/TU_USUARIO/pos-system.git
# git push -u origin main
```

### 4. Vercel

1. [vercel.com/new](https://vercel.com/new) → importa el repo.
2. **Framework preset**: Next.js (autodetectado).
3. **Environment Variables** (mínimas para arrancar):

   | Variable | Origen | Scope |
   |---|---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API → Project URL | All |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API → anon public | All |
   | `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API → service_role | **Production + Preview** (jamás Public) |

   Variables opcionales (cuando vayas a activar features Colombia):

   | Variable | Para |
   |---|---|
   | `NIT_API_URL`, `NIT_API_TOKEN` | Lookup NIT (proveedor externo: RUES, Datos Colombia, etc.) |
   | `WHATSAPP_PROVIDER=twilio`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_FROM` | Envío de factura por WhatsApp |
   | `DIAN_API_URL`, `DIAN_API_TOKEN` | Facturación electrónica DIAN (Alegra/Siigo/Factus) |
   | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` | Envío por email |

4. **Deploy** → primer build ~2 min.
5. Anota tu URL `https://pos-system-xxx.vercel.app`.
6. En Supabase → **Authentication → URL Configuration** → agrega tu dominio Vercel a *Site URL* y *Redirect URLs*.

### 5. Probar el flujo completo

1. Login con el ADMIN → `/admin`
2. Crea una caja desde `/admin/usuarios`
3. Crea un usuario CAJERA asignado a esa caja
4. Crea un usuario COCINA y otro DOMICILIARIO
5. Logout → login como CAJERA → vende un producto con `requiere_cocina=true`
6. Abre otra ventana → login como COCINA → debes oír el sonido y ver el pedido
7. Marca LISTO → si era domicilio, aparece en `/domicilio`

## 🧪 Desarrollo local

```bash
cp .env.example .env.local   # rellena las 3 variables Supabase
npm install
npm run dev
```

Abre `http://localhost:3000`.

## 🔒 Modelo de seguridad (RLS)

| Rol | Lectura | Escritura |
|---|---|---|
| ADMIN | Todo | Todo |
| CAJERA | `ventas` y `venta_items` SOLO de `caja_id = current_user_caja()` | Crear ventas en su caja |
| BODEGA | `insumos`, `recetas`, `movimientos_bodega`, `productos` | Insumos y movimientos |
| COCINA | `ventas` (todas), `venta_items`, `productos` | Update estado a `LISTO` |
| DOMICILIARIO | `ventas` con `domiciliario_id = auth.uid()` o sin asignar y `LISTO` | Tomar y entregar pedidos |

La **lógica de descuento de inventario** vive en el RPC `confirmar_venta_descontar_inventario`:

- Es **transaccional**: valida stock de TODOS los insumos antes de descontar (con `FOR UPDATE`), luego aplica.
- Es **idempotente**: usa la flag `ventas.inventario_descontado` para no doble-descontar.
- Aplica `merma_porcentaje` por receta automáticamente.
- Registra cada salida en `movimientos_bodega` para kardex/auditoría.

## 📂 Assets adicionales

Coloca en `/public/`:

- `notification.mp3` (alerta de cocina) — descárgalo de pixabay o similar
- `icon-192.png` y `icon-512.png` (íconos PWA)

Sin estos archivos la app sigue funcionando, solo se pierde el sonido de cocina y la posibilidad de "instalar" la PWA.

## 🛠️ Personalización

- **Cambiar IVA**: cada producto tiene `iva_porcentaje` (0/5/8/19) configurable.
- **Más métodos de pago**: agrega valores al enum `metodo_pago` en SQL.
- **Resolución DIAN**: hoy `numero_consecutivo` es un SERIAL. Para facturación electrónica integra Alegra/Siigo/Factus desde el endpoint `/api/facturacion/electronica` (placeholder a implementar).

## 🩺 Troubleshooting

| Síntoma | Causa frecuente | Fix |
|---|---|---|
| `permission denied for table X` | RLS bloqueando | Verifica que el `profile.rol` coincide con la política |
| Cocina no recibe pedidos | Realtime no habilitado | Database → Replication → marca tablas en `supabase_realtime` |
| `CAJERA cannot access /caja/{otro}` | URL con caja distinta a la del perfil | Comportamiento esperado: middleware redirige |
| `crear_venta` falla con "Stock insuficiente" | Recetas mal cargadas o insumos no llegaron a bodega | Revisa kardex y reabastece |

---

**Licencia**: MIT — úsalo libre, modifícalo, véndelo.
