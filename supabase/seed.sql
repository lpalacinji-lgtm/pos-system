-- ============================================================================
-- SEED DATA - Datos iniciales para arrancar el sistema
-- Ejecutar DESPUÉS del 000_complete_setup.sql
-- ============================================================================

-- Cajas de ejemplo
INSERT INTO cajas (nombre, ubicacion) VALUES
  ('Caja 1', 'Mostrador principal'),
  ('Caja 2', 'Terraza');

-- Categorías
INSERT INTO categorias (nombre, orden) VALUES
  ('Pizzas', 1),
  ('Hamburguesas', 2),
  ('Bebidas', 3),
  ('Postres', 4),
  ('Adicionales', 5);

-- Insumos de ejemplo
INSERT INTO insumos (codigo, nombre, unidad, stock_actual, stock_minimo, costo_unitario) VALUES
  ('HAR-001', 'Harina de trigo', 'kg', 50, 10, 3500),
  ('QUE-001', 'Queso mozzarella', 'kg', 15, 3, 22000),
  ('TOM-001', 'Salsa de tomate', 'lt', 8, 2, 8500),
  ('CAR-001', 'Carne molida', 'kg', 12, 3, 28000),
  ('PAN-001', 'Pan de hamburguesa', 'unidad', 100, 20, 1200),
  ('GAS-001', 'Coca-Cola 350ml', 'unidad', 80, 15, 2500),
  ('AGU-001', 'Agua 600ml', 'unidad', 60, 12, 1800);

-- Productos de ejemplo
INSERT INTO productos (codigo, nombre, categoria_id, precio, iva_porcentaje, va_a_cocina)
SELECT 'PIZ-001', 'Pizza Margarita', id, 28000, 8, true FROM categorias WHERE nombre = 'Pizzas';

INSERT INTO productos (codigo, nombre, categoria_id, precio, iva_porcentaje, va_a_cocina)
SELECT 'HAM-001', 'Hamburguesa Clásica', id, 18000, 8, true FROM categorias WHERE nombre = 'Hamburguesas';

INSERT INTO productos (codigo, nombre, categoria_id, precio, iva_porcentaje, va_a_cocina)
SELECT 'BEB-001', 'Coca-Cola 350ml', id, 4500, 19, false FROM categorias WHERE nombre = 'Bebidas';

-- Recetas (escandallos) — vinculación de platos con insumos
-- Pizza Margarita = 250g harina + 150g queso + 100ml salsa de tomate
INSERT INTO recetas (producto_id, insumo_id, cantidad, merma_porcentaje)
SELECT p.id, i.id, 0.250, 5
FROM productos p, insumos i
WHERE p.codigo = 'PIZ-001' AND i.codigo = 'HAR-001';

INSERT INTO recetas (producto_id, insumo_id, cantidad, merma_porcentaje)
SELECT p.id, i.id, 0.150, 3
FROM productos p, insumos i
WHERE p.codigo = 'PIZ-001' AND i.codigo = 'QUE-001';

INSERT INTO recetas (producto_id, insumo_id, cantidad, merma_porcentaje)
SELECT p.id, i.id, 0.100, 0
FROM productos p, insumos i
WHERE p.codigo = 'PIZ-001' AND i.codigo = 'TOM-001';

-- Hamburguesa = 1 pan + 150g carne
INSERT INTO recetas (producto_id, insumo_id, cantidad, merma_porcentaje)
SELECT p.id, i.id, 1, 0
FROM productos p, insumos i
WHERE p.codigo = 'HAM-001' AND i.codigo = 'PAN-001';

INSERT INTO recetas (producto_id, insumo_id, cantidad, merma_porcentaje)
SELECT p.id, i.id, 0.150, 5
FROM productos p, insumos i
WHERE p.codigo = 'HAM-001' AND i.codigo = 'CAR-001';

-- Bebida = 1 unidad de gaseosa
INSERT INTO recetas (producto_id, insumo_id, cantidad, merma_porcentaje)
SELECT p.id, i.id, 1, 0
FROM productos p, insumos i
WHERE p.codigo = 'BEB-001' AND i.codigo = 'GAS-001';

-- ============================================
-- CREACIÓN DE ADMIN INICIAL
-- ============================================
-- IMPORTANTE: Después de correr este script, debes:
-- 1. Ir a Authentication > Users en Supabase
-- 2. Click "Add user" > "Create new user"
-- 3. Crear un usuario con email/password (ej: admin@tudominio.com)
-- 4. Copiar el UUID del usuario creado
-- 5. Ejecutar el siguiente INSERT reemplazando el UUID:
--
-- INSERT INTO profiles (id, email, nombre_completo, rol)
-- VALUES (
--   'PEGAR-UUID-AQUI'::uuid,
--   'admin@tudominio.com',
--   'Administrador',
--   'ADMIN'
-- );
