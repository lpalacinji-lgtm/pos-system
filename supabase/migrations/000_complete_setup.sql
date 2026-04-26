-- ============================================================================
-- POS SYSTEM - SETUP COMPLETO
-- Ejecutar en Supabase SQL Editor en orden
-- ============================================================================

-- ============================================
-- ENUMS
-- ============================================
CREATE TYPE user_role AS ENUM ('ADMIN', 'CAJERA', 'BODEGA', 'COCINA', 'DOMICILIARIO');
CREATE TYPE unidad_medida AS ENUM ('kg', 'gr', 'lt', 'ml', 'unidad');
CREATE TYPE estado_pedido AS ENUM ('PENDIENTE', 'EN_COCINA', 'LISTO', 'EN_RUTA', 'ENTREGADO', 'CANCELADO');
CREATE TYPE metodo_pago AS ENUM ('EFECTIVO', 'TARJETA', 'NEQUI', 'DAVIPLATA', 'BANCOLOMBIA', 'TRANSFERENCIA');
CREATE TYPE tipo_movimiento AS ENUM ('ENTRADA', 'SALIDA', 'AJUSTE', 'VENTA', 'MERMA');
CREATE TYPE tipo_factura AS ENUM ('POS', 'ELECTRONICA');

-- ============================================
-- TABLAS
-- ============================================
CREATE TABLE cajas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL UNIQUE,
  ubicacion TEXT,
  activa BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  nombre_completo TEXT NOT NULL,
  rol user_role NOT NULL,
  caja_id UUID REFERENCES cajas(id) ON DELETE SET NULL,
  telefono TEXT,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_profiles_rol ON profiles(rol);
CREATE INDEX idx_profiles_caja ON profiles(caja_id) WHERE caja_id IS NOT NULL;

CREATE TABLE insumos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT NOT NULL UNIQUE,
  nombre TEXT NOT NULL,
  unidad unidad_medida NOT NULL,
  stock_actual NUMERIC(12,3) NOT NULL DEFAULT 0,
  stock_minimo NUMERIC(12,3) DEFAULT 0,
  costo_unitario NUMERIC(12,2) DEFAULT 0,
  proveedor TEXT,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_insumos_codigo ON insumos(codigo);
CREATE INDEX idx_insumos_stock_bajo ON insumos(id) WHERE stock_actual <= stock_minimo;

CREATE TABLE movimientos_bodega (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  insumo_id UUID NOT NULL REFERENCES insumos(id),
  tipo tipo_movimiento NOT NULL,
  cantidad NUMERIC(12,3) NOT NULL,
  stock_anterior NUMERIC(12,3) NOT NULL,
  stock_nuevo NUMERIC(12,3) NOT NULL,
  costo_unitario NUMERIC(12,2),
  referencia_id UUID,
  observacion TEXT,
  usuario_id UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_movimientos_insumo ON movimientos_bodega(insumo_id, created_at DESC);
CREATE INDEX idx_movimientos_referencia ON movimientos_bodega(referencia_id) WHERE referencia_id IS NOT NULL;

CREATE TABLE categorias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL UNIQUE,
  orden INT DEFAULT 0,
  activa BOOLEAN DEFAULT true
);

CREATE TABLE productos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT NOT NULL UNIQUE,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  categoria_id UUID REFERENCES categorias(id),
  precio NUMERIC(12,2) NOT NULL,
  iva_porcentaje NUMERIC(5,2) DEFAULT 19.00,
  imagen_url TEXT,
  activo BOOLEAN DEFAULT true,
  va_a_cocina BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_productos_categoria ON productos(categoria_id) WHERE activo = true;

CREATE TABLE recetas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  producto_id UUID NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
  insumo_id UUID NOT NULL REFERENCES insumos(id),
  cantidad NUMERIC(12,3) NOT NULL,
  merma_porcentaje NUMERIC(5,2) DEFAULT 0,
  UNIQUE(producto_id, insumo_id)
);
CREATE INDEX idx_recetas_producto ON recetas(producto_id);

CREATE TABLE clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  documento TEXT NOT NULL UNIQUE,
  tipo_documento TEXT DEFAULT 'CC',
  razon_social TEXT NOT NULL,
  email TEXT,
  telefono TEXT,
  direccion TEXT,
  ciudad TEXT,
  regimen_tributario TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_clientes_documento ON clientes(documento);

CREATE TABLE ventas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_consecutivo SERIAL UNIQUE,
  caja_id UUID NOT NULL REFERENCES cajas(id),
  cajera_id UUID NOT NULL REFERENCES profiles(id),
  cliente_id UUID REFERENCES clientes(id),
  estado estado_pedido NOT NULL DEFAULT 'PENDIENTE',
  tipo_factura tipo_factura DEFAULT 'POS',
  metodo_pago metodo_pago,
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  iva NUMERIC(12,2) NOT NULL DEFAULT 0,
  descuento NUMERIC(12,2) DEFAULT 0,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  es_domicilio BOOLEAN DEFAULT false,
  domiciliario_id UUID REFERENCES profiles(id),
  direccion_entrega TEXT,
  observaciones TEXT,
  inventario_descontado BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  cocina_at TIMESTAMPTZ,
  listo_at TIMESTAMPTZ,
  en_ruta_at TIMESTAMPTZ,
  entregado_at TIMESTAMPTZ,
  entrega_lat DOUBLE PRECISION,
  entrega_lng DOUBLE PRECISION
);
CREATE INDEX idx_ventas_caja_fecha ON ventas(caja_id, created_at DESC);
CREATE INDEX idx_ventas_estado ON ventas(estado) WHERE estado IN ('PENDIENTE','EN_COCINA','LISTO','EN_RUTA');
CREATE INDEX idx_ventas_cajera ON ventas(cajera_id, created_at DESC);
CREATE INDEX idx_ventas_domiciliario ON ventas(domiciliario_id) WHERE es_domicilio = true;

CREATE TABLE venta_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venta_id UUID NOT NULL REFERENCES ventas(id) ON DELETE CASCADE,
  producto_id UUID NOT NULL REFERENCES productos(id),
  cantidad INT NOT NULL CHECK (cantidad > 0),
  precio_unitario NUMERIC(12,2) NOT NULL,
  iva_porcentaje NUMERIC(5,2) NOT NULL,
  subtotal NUMERIC(12,2) NOT NULL,
  observacion TEXT
);
CREATE INDEX idx_venta_items_venta ON venta_items(venta_id);

CREATE TABLE turnos_caja (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  caja_id UUID NOT NULL REFERENCES cajas(id),
  cajera_id UUID NOT NULL REFERENCES profiles(id),
  apertura_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  cierre_at TIMESTAMPTZ,
  base_inicial NUMERIC(12,2) NOT NULL,
  total_efectivo NUMERIC(12,2),
  total_tarjeta NUMERIC(12,2),
  total_transferencias NUMERIC(12,2),
  total_ventas NUMERIC(12,2),
  diferencia NUMERIC(12,2),
  observaciones TEXT,
  cerrado BOOLEAN DEFAULT false
);
CREATE INDEX idx_turnos_caja_abierto ON turnos_caja(caja_id) WHERE cerrado = false;

-- ============================================
-- FUNCIONES HELPER
-- ============================================
CREATE OR REPLACE FUNCTION current_user_rol()
RETURNS user_role
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT rol FROM profiles WHERE id = auth.uid(); $$;

CREATE OR REPLACE FUNCTION current_user_caja()
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT caja_id FROM profiles WHERE id = auth.uid(); $$;

-- ============================================
-- RPC: Confirmar venta y descontar inventario (transaccional + idempotente)
-- ============================================
CREATE OR REPLACE FUNCTION confirmar_venta_descontar_inventario(p_venta_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_venta ventas%ROWTYPE;
  v_item RECORD;
  v_receta RECORD;
  v_cantidad_descontar NUMERIC;
  v_stock_actual NUMERIC;
  v_insumos_insuficientes JSONB := '[]'::jsonb;
BEGIN
  SELECT * INTO v_venta FROM ventas WHERE id = p_venta_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Venta no encontrada: %', p_venta_id;
  END IF;
  IF v_venta.inventario_descontado THEN
    RETURN jsonb_build_object('ok', true, 'mensaje', 'Ya descontado', 'venta_id', p_venta_id);
  END IF;

  -- Validación de stock antes de descontar
  FOR v_item IN
    SELECT vi.producto_id, vi.cantidad FROM venta_items vi WHERE vi.venta_id = p_venta_id
  LOOP
    FOR v_receta IN
      SELECT r.insumo_id, r.cantidad, r.merma_porcentaje, i.nombre, i.stock_actual, i.unidad
      FROM recetas r JOIN insumos i ON i.id = r.insumo_id
      WHERE r.producto_id = v_item.producto_id
      FOR UPDATE OF i
    LOOP
      v_cantidad_descontar := v_receta.cantidad * v_item.cantidad * (1 + v_receta.merma_porcentaje/100);
      IF v_receta.stock_actual < v_cantidad_descontar THEN
        v_insumos_insuficientes := v_insumos_insuficientes || jsonb_build_object(
          'insumo', v_receta.nombre,
          'requerido', v_cantidad_descontar,
          'disponible', v_receta.stock_actual,
          'unidad', v_receta.unidad
        );
      END IF;
    END LOOP;
  END LOOP;

  IF jsonb_array_length(v_insumos_insuficientes) > 0 THEN
    RAISE EXCEPTION 'Stock insuficiente: %', v_insumos_insuficientes;
  END IF;

  -- Descontar y registrar kardex
  FOR v_item IN
    SELECT vi.producto_id, vi.cantidad FROM venta_items vi WHERE vi.venta_id = p_venta_id
  LOOP
    FOR v_receta IN
      SELECT r.insumo_id, r.cantidad, r.merma_porcentaje
      FROM recetas r WHERE r.producto_id = v_item.producto_id
    LOOP
      v_cantidad_descontar := v_receta.cantidad * v_item.cantidad * (1 + v_receta.merma_porcentaje/100);
      SELECT stock_actual INTO v_stock_actual FROM insumos WHERE id = v_receta.insumo_id FOR UPDATE;
      UPDATE insumos SET stock_actual = stock_actual - v_cantidad_descontar, updated_at = now()
        WHERE id = v_receta.insumo_id;
      INSERT INTO movimientos_bodega(insumo_id, tipo, cantidad, stock_anterior, stock_nuevo,
        referencia_id, observacion, usuario_id)
      VALUES (v_receta.insumo_id, 'VENTA', v_cantidad_descontar,
        v_stock_actual, v_stock_actual - v_cantidad_descontar,
        p_venta_id, 'Descuento auto venta #' || v_venta.numero_consecutivo, v_venta.cajera_id);
    END LOOP;
  END LOOP;

  UPDATE ventas
    SET inventario_descontado = true,
        estado = CASE WHEN estado = 'PENDIENTE' THEN 'EN_COCINA'::estado_pedido ELSE estado END,
        cocina_at = COALESCE(cocina_at, now())
  WHERE id = p_venta_id;

  RETURN jsonb_build_object('ok', true, 'venta_id', p_venta_id);
END;
$$;

-- ============================================
-- RPC: Crear venta atómica
-- ============================================
CREATE OR REPLACE FUNCTION crear_venta(
  p_caja_id UUID,
  p_cliente_id UUID,
  p_metodo_pago metodo_pago,
  p_tipo_factura tipo_factura,
  p_es_domicilio BOOLEAN,
  p_direccion_entrega TEXT,
  p_items JSONB
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_venta_id UUID;
  v_item JSONB;
  v_producto productos%ROWTYPE;
  v_subtotal NUMERIC := 0;
  v_iva NUMERIC := 0;
  v_item_subtotal NUMERIC;
  v_item_iva NUMERIC;
  v_cajera_id UUID := auth.uid();
  v_rol user_role;
  v_caja_user UUID;
BEGIN
  SELECT rol, caja_id INTO v_rol, v_caja_user FROM profiles WHERE id = v_cajera_id;
  IF v_rol NOT IN ('CAJERA','ADMIN') THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;
  IF v_rol = 'CAJERA' AND v_caja_user != p_caja_id THEN
    RAISE EXCEPTION 'Cajera solo puede vender en su caja asignada';
  END IF;

  INSERT INTO ventas(caja_id, cajera_id, cliente_id, metodo_pago, tipo_factura, es_domicilio, direccion_entrega, estado)
  VALUES (p_caja_id, v_cajera_id, p_cliente_id, p_metodo_pago, p_tipo_factura, p_es_domicilio, p_direccion_entrega, 'PENDIENTE')
  RETURNING id INTO v_venta_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    SELECT * INTO v_producto FROM productos WHERE id = (v_item->>'producto_id')::UUID AND activo = true;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Producto no encontrado o inactivo: %', v_item->>'producto_id';
    END IF;

    v_item_subtotal := v_producto.precio * (v_item->>'cantidad')::INT;
    v_item_iva := v_item_subtotal * v_producto.iva_porcentaje / 100;

    INSERT INTO venta_items(venta_id, producto_id, cantidad, precio_unitario, iva_porcentaje, subtotal, observacion)
    VALUES (v_venta_id, v_producto.id, (v_item->>'cantidad')::INT,
            v_producto.precio, v_producto.iva_porcentaje, v_item_subtotal, v_item->>'observacion');

    v_subtotal := v_subtotal + v_item_subtotal;
    v_iva := v_iva + v_item_iva;
  END LOOP;

  UPDATE ventas SET subtotal = v_subtotal, iva = v_iva, total = v_subtotal + v_iva WHERE id = v_venta_id;

  PERFORM confirmar_venta_descontar_inventario(v_venta_id);

  RETURN v_venta_id;
END;
$$;

-- ============================================
-- RPC: Reportes financieros
-- ============================================
CREATE OR REPLACE FUNCTION reporte_ventas_periodo(
  fecha_inicio DATE,
  fecha_fin DATE,
  p_caja_id UUID DEFAULT NULL
)
RETURNS TABLE(
  fecha DATE,
  caja_id UUID,
  caja_nombre TEXT,
  metodo_pago TEXT,
  num_ventas BIGINT,
  total_subtotal NUMERIC,
  total_iva NUMERIC,
  total NUMERIC
)
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    v.created_at::date AS fecha,
    c.id AS caja_id,
    c.nombre AS caja_nombre,
    v.metodo_pago::text AS metodo_pago,
    COUNT(*)::bigint AS num_ventas,
    SUM(v.subtotal) AS total_subtotal,
    SUM(v.iva) AS total_iva,
    SUM(v.total) AS total
  FROM ventas v
  JOIN cajas c ON c.id = v.caja_id
  WHERE v.created_at::date BETWEEN fecha_inicio AND fecha_fin
    AND v.estado != 'CANCELADO'
    AND (p_caja_id IS NULL OR v.caja_id = p_caja_id)
  GROUP BY v.created_at::date, c.id, c.nombre, v.metodo_pago
  ORDER BY 1 DESC, 3, 4;
$$;

-- ============================================
-- RPC: Carga masiva de inventario desde CSV
-- ============================================
CREATE OR REPLACE FUNCTION cargar_inventario_masivo(p_data JSONB)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_row JSONB;
  v_insumo_id UUID;
  v_stock_anterior NUMERIC;
  v_creados INT := 0;
  v_actualizados INT := 0;
  v_errores JSONB := '[]'::jsonb;
BEGIN
  IF current_user_rol() NOT IN ('ADMIN','BODEGA') THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  FOR v_row IN SELECT * FROM jsonb_array_elements(p_data)
  LOOP
    BEGIN
      SELECT id, stock_actual INTO v_insumo_id, v_stock_anterior
      FROM insumos WHERE codigo = v_row->>'codigo';

      IF FOUND THEN
        UPDATE insumos SET
          stock_actual = stock_actual + (v_row->>'cantidad')::NUMERIC,
          costo_unitario = COALESCE((v_row->>'costo')::NUMERIC, costo_unitario),
          updated_at = now()
        WHERE id = v_insumo_id;

        INSERT INTO movimientos_bodega(insumo_id, tipo, cantidad, stock_anterior, stock_nuevo,
          costo_unitario, observacion, usuario_id)
        VALUES (v_insumo_id, 'ENTRADA', (v_row->>'cantidad')::NUMERIC,
          v_stock_anterior, v_stock_anterior + (v_row->>'cantidad')::NUMERIC,
          (v_row->>'costo')::NUMERIC, 'Carga masiva CSV', auth.uid());

        v_actualizados := v_actualizados + 1;
      ELSE
        INSERT INTO insumos(codigo, nombre, unidad, stock_actual, costo_unitario, proveedor)
        VALUES (
          v_row->>'codigo',
          v_row->>'nombre',
          (v_row->>'unidad')::unidad_medida,
          (v_row->>'cantidad')::NUMERIC,
          COALESCE((v_row->>'costo')::NUMERIC, 0),
          v_row->>'proveedor'
        ) RETURNING id INTO v_insumo_id;

        INSERT INTO movimientos_bodega(insumo_id, tipo, cantidad, stock_anterior, stock_nuevo,
          costo_unitario, observacion, usuario_id)
        VALUES (v_insumo_id, 'ENTRADA', (v_row->>'cantidad')::NUMERIC,
          0, (v_row->>'cantidad')::NUMERIC,
          (v_row->>'costo')::NUMERIC, 'Insumo creado por carga CSV', auth.uid());

        v_creados := v_creados + 1;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      v_errores := v_errores || jsonb_build_object(
        'codigo', v_row->>'codigo',
        'error', SQLERRM
      );
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'creados', v_creados,
    'actualizados', v_actualizados,
    'errores', v_errores
  );
END;
$$;

-- ============================================
-- RLS - ACTIVAR
-- ============================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE cajas ENABLE ROW LEVEL SECURITY;
ALTER TABLE insumos ENABLE ROW LEVEL SECURITY;
ALTER TABLE movimientos_bodega ENABLE ROW LEVEL SECURITY;
ALTER TABLE categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE recetas ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE ventas ENABLE ROW LEVEL SECURITY;
ALTER TABLE venta_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE turnos_caja ENABLE ROW LEVEL SECURITY;

-- ============================================
-- POLÍTICAS RLS
-- ============================================
CREATE POLICY "Usuarios ven su propio perfil" ON profiles FOR SELECT
  USING (id = auth.uid() OR current_user_rol() = 'ADMIN');
CREATE POLICY "Solo admin gestiona perfiles" ON profiles FOR ALL
  USING (current_user_rol() = 'ADMIN') WITH CHECK (current_user_rol() = 'ADMIN');

CREATE POLICY "Lectura cajas según rol" ON cajas FOR SELECT
  USING (
    current_user_rol() = 'ADMIN'
    OR (current_user_rol() = 'CAJERA' AND id = current_user_caja())
    OR current_user_rol() IN ('COCINA','BODEGA','DOMICILIARIO')
  );
CREATE POLICY "Solo admin modifica cajas" ON cajas FOR ALL
  USING (current_user_rol() = 'ADMIN') WITH CHECK (current_user_rol() = 'ADMIN');

CREATE POLICY "Lectura insumos: admin/bodega/cocina" ON insumos FOR SELECT
  USING (current_user_rol() IN ('ADMIN','BODEGA','COCINA'));
CREATE POLICY "Modificación insumos: admin/bodega" ON insumos FOR ALL
  USING (current_user_rol() IN ('ADMIN','BODEGA'))
  WITH CHECK (current_user_rol() IN ('ADMIN','BODEGA'));

CREATE POLICY "Movimientos bodega: lectura admin/bodega" ON movimientos_bodega FOR SELECT
  USING (current_user_rol() IN ('ADMIN','BODEGA'));
CREATE POLICY "Movimientos bodega: insert" ON movimientos_bodega FOR INSERT
  WITH CHECK (current_user_rol() IN ('ADMIN','BODEGA','CAJERA'));

CREATE POLICY "Lectura productos: autenticados" ON productos FOR SELECT
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "Modificación productos: admin" ON productos FOR ALL
  USING (current_user_rol() = 'ADMIN') WITH CHECK (current_user_rol() = 'ADMIN');

CREATE POLICY "Lectura categorias: todos" ON categorias FOR SELECT
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "Modificación categorias: admin" ON categorias FOR ALL
  USING (current_user_rol() = 'ADMIN') WITH CHECK (current_user_rol() = 'ADMIN');

CREATE POLICY "Lectura recetas: admin/bodega/cocina" ON recetas FOR SELECT
  USING (current_user_rol() IN ('ADMIN','BODEGA','COCINA'));
CREATE POLICY "Modificación recetas: admin/bodega" ON recetas FOR ALL
  USING (current_user_rol() IN ('ADMIN','BODEGA'))
  WITH CHECK (current_user_rol() IN ('ADMIN','BODEGA'));

CREATE POLICY "Lectura clientes: cajera/admin" ON clientes FOR SELECT
  USING (current_user_rol() IN ('ADMIN','CAJERA'));
CREATE POLICY "Insert/update clientes: cajera/admin" ON clientes FOR ALL
  USING (current_user_rol() IN ('ADMIN','CAJERA'))
  WITH CHECK (current_user_rol() IN ('ADMIN','CAJERA'));

CREATE POLICY "Cajera solo ve ventas de su caja" ON ventas FOR SELECT
  USING (
    current_user_rol() = 'ADMIN'
    OR (current_user_rol() = 'CAJERA' AND caja_id = current_user_caja())
    OR current_user_rol() = 'COCINA'
    OR (current_user_rol() = 'DOMICILIARIO' AND domiciliario_id = auth.uid() AND es_domicilio = true)
  );
CREATE POLICY "Cajera solo crea ventas en su caja" ON ventas FOR INSERT
  WITH CHECK (
    current_user_rol() IN ('CAJERA','ADMIN')
    AND (current_user_rol() = 'ADMIN' OR caja_id = current_user_caja())
    AND cajera_id = auth.uid()
  );
CREATE POLICY "Update ventas según rol" ON ventas FOR UPDATE
  USING (
    current_user_rol() = 'ADMIN'
    OR (current_user_rol() = 'CAJERA' AND caja_id = current_user_caja())
    OR current_user_rol() = 'COCINA'
    OR (current_user_rol() = 'DOMICILIARIO' AND domiciliario_id = auth.uid())
  );

CREATE POLICY "Items siguen visibilidad de venta" ON venta_items FOR SELECT
  USING (EXISTS (SELECT 1 FROM ventas v WHERE v.id = venta_items.venta_id));
CREATE POLICY "Insert items: cajera de la caja" ON venta_items FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM ventas v WHERE v.id = venta_items.venta_id
    AND (current_user_rol() = 'ADMIN' OR v.caja_id = current_user_caja())
  ));

CREATE POLICY "Cajera ve sus turnos" ON turnos_caja FOR SELECT
  USING (current_user_rol() = 'ADMIN' OR (current_user_rol() = 'CAJERA' AND cajera_id = auth.uid()));
CREATE POLICY "Cajera gestiona su turno" ON turnos_caja FOR ALL
  USING (
    current_user_rol() = 'ADMIN'
    OR (current_user_rol() = 'CAJERA' AND cajera_id = auth.uid() AND caja_id = current_user_caja())
  )
  WITH CHECK (
    current_user_rol() = 'ADMIN'
    OR (cajera_id = auth.uid() AND caja_id = current_user_caja())
  );

-- ============================================
-- REALTIME
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE ventas;
ALTER PUBLICATION supabase_realtime ADD TABLE venta_items;
ALTER PUBLICATION supabase_realtime ADD TABLE insumos;

-- ============================================
-- TRIGGERS - updated_at automático
-- ============================================
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER set_updated_at_profiles BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER set_updated_at_insumos BEFORE UPDATE ON insumos
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
