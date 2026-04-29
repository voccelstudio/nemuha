// ════════════════════════════════════════
// ÑEMUHA — jsdummy.js
// Datos de prueba para demostración
// ════════════════════════════════════════

const DummyData = {
    populate() {
        if (!confirm('¿Cargar datos de prueba? Esto sobrescribirá o se mezclará con tus datos actuales.')) return;

        console.log('[Dummy] Poblando base de datos...');

        // 1. Configuración de empresa
        DB.data.config.empresa = {
            nombre: 'Comercial Ñemuha Demo',
            ruc: '80012345-6',
            direccion: 'Av. Mcal. López c/ Perú, Asunción',
            telefono: '021 444 555'
        };

        // 2. Clientes
        const clientes = [
            { id: DB.id('clientes'), nombre: 'Juan Pérez', ruc: '1234567-0', tel: '0981 111 222', email: 'juan@email.com', direccion: 'Barrio Obrero', limiteCredito: 2000000, creditoUsado: 0 },
            { id: DB.id('clientes'), nombre: 'María García', ruc: '2345678-1', tel: '0971 333 444', email: 'maria@email.com', direccion: 'Villa Morra', limiteCredito: 5000000, creditoUsado: 0 },
            { id: DB.id('clientes'), nombre: 'Tech Solutions SA', ruc: '80088899-0', tel: '021 666 777', email: 'ventas@tech.com', direccion: 'Centro', limiteCredito: 10000000, creditoUsado: 0 },
            { id: DB.id('clientes'), nombre: 'Bodega El Paso', ruc: '4567890-2', tel: '0991 555 666', email: 'elpaso@email.com', direccion: 'Sajonia', limiteCredito: 1500000, creditoUsado: 0 },
            { id: DB.id('clientes'), nombre: 'Cliente Ocasional', ruc: '4444444-4', tel: '', email: '', direccion: '', limiteCredito: 0, creditoUsado: 0 }
        ];
        DB.data.clientes = clientes;

        // 3. Proveedores
        const proveedores = [
            { id: DB.id('proveedores'), nombre: 'Distribuidora Alfa', ruc: '80011122-3', tel: '021 222 333', email: 'pedidos@alfa.com.py' },
            { id: DB.id('proveedores'), nombre: 'Importadora Global', ruc: '80055566-7', tel: '021 555 111', email: 'compras@global.com' },
            { id: DB.id('proveedores'), nombre: 'Bebidas del Sur', ruc: '80099900-1', tel: '021 888 999', email: 'ventas@bebidas.com.py' }
        ];
        DB.data.proveedores = proveedores;

        // 4. Vendedores
        const vendedores = [
            { id: DB.id('vendedores'), nombre: 'Carlos Vendedor', ci: '333444', tel: '0981 000 111', email: 'carlos@nemuha.pro', comision: 5, activo: true },
            { id: DB.id('vendedores'), nombre: 'Ana Ventas', ci: '555666', tel: '0971 000 222', email: 'ana@nemuha.pro', comision: 3, activo: true }
        ];
        // Mantener el admin si existe
        if (!DB.data.vendedores.find(v => v.nombre === 'Administrador')) {
            vendedores.push({ id: 'VEND-ADMIN', nombre: 'Administrador', ci: '', tel: '', email: 'admin@nemuha.pro', comision: 0, activo: true });
        }
        DB.data.vendedores = [...DB.data.vendedores, ...vendedores.filter(v => !DB.data.vendedores.some(ev => ev.nombre === v.nombre))];

        // 5. Productos
        const categorias = ['Alimentos', 'Bebidas', 'Limpieza', 'Tecnología'];
        const productos = [
            { id: 'PROD-001', nombre: 'Coca Cola 2L', categoria: 'bebidas', stock: 50, stockMin: 10, costo: 8500, precio: 12000, margen: 41, ubicacion: 'Pasillo 1', vencimiento: '2026-12-31' },
            { id: 'PROD-002', nombre: 'Harina 0000 1kg', categoria: 'alimentos', stock: 100, stockMin: 20, costo: 4200, precio: 6500, margen: 54, ubicacion: 'Estante A2' },
            { id: 'PROD-003', nombre: 'Aceite de Girasol 900ml', categoria: 'alimentos', stock: 30, stockMin: 10, costo: 11000, precio: 15500, margen: 40, ubicacion: 'Pasillo 2' },
            { id: 'PROD-004', nombre: 'Cerveza Pilsen 6-pack', categoria: 'bebidas', stock: 24, stockMin: 6, costo: 28000, precio: 38000, margen: 35, ubicacion: 'Nevera 1' },
            { id: 'PROD-005', nombre: 'Detergente 500ml', categoria: 'limpieza', stock: 40, stockMin: 10, costo: 3500, precio: 5500, margen: 57, ubicacion: 'Pasillo 4' },
            { id: 'PROD-006', nombre: 'Arroz Premium 1kg', categoria: 'alimentos', stock: 80, stockMin: 15, costo: 5500, precio: 8000, margen: 45, ubicacion: 'Estante B1' },
            { id: 'PROD-007', nombre: 'Café Molido 250g', categoria: 'alimentos', stock: 15, stockMin: 5, costo: 18000, precio: 26000, margen: 44, ubicacion: 'Estante C3' },
            { id: 'PROD-008', nombre: 'Smartphone Android Demo', categoria: 'tecnologia', stock: 5, stockMin: 2, costo: 850000, precio: 1250000, margen: 47, ubicacion: 'Vitrina 1' },
            { id: 'PROD-009', nombre: 'Papel Higiénico 4 rollos', categoria: 'limpieza', stock: 60, stockMin: 12, costo: 7000, precio: 11000, margen: 57, ubicacion: 'Pasillo 4' },
            { id: 'PROD-010', nombre: 'Leche Entera 1L', categoria: 'alimentos', stock: 45, stockMin: 10, costo: 5200, precio: 7200, margen: 38, ubicacion: 'Pasillo 1', vencimiento: '2026-05-15' }
        ];
        DB.data.productos = productos;

        // 6. Ventas (últimos 7 días)
        const ventas = [];
        const hoy = new Date();
        for (let i = 0; i < 20; i++) {
            const fechaVenta = new Date();
            fechaVenta.setDate(hoy.getDate() - Math.floor(Math.random() * 7));
            const cliente = clientes[Math.floor(Math.random() * clientes.length)];
            const vendedor = vendedores[Math.floor(Math.random() * vendedores.length)];
            const prod = productos[Math.floor(Math.random() * productos.length)];
            const cant = Math.floor(Math.random() * 5) + 1;
            const subtotal = prod.precio * cant;
            const iva = Math.round(subtotal * 0.1);
            const total = subtotal + iva;

            ventas.push({
                id: DB.id('ventas'),
                fecha: fechaVenta.toISOString(),
                cliente: { id: cliente.id, nombre: cliente.nombre },
                vendedor: { id: vendedor.id, nombre: vendedor.nombre },
                canal: 'presencial',
                entrega: 'pickup',
                items: [{ id: prod.id, nombre: prod.nombre, cantidad: cant, precio: prod.precio, subtotal }],
                subtotal, iva, total,
                metodo: 'efectivo',
                estado: 'pagada',
                estadoEntrega: 'entregado'
            });
        }
        DB.data.ventas = ventas;

        // 7. Compras
        const compras = [];
        for (let i = 0; i < 5; i++) {
            const prov = proveedores[Math.floor(Math.random() * proveedores.length)];
            const prod = productos[Math.floor(Math.random() * productos.length)];
            const cant = 20;
            const total = prod.costo * cant;
            compras.push({
                id: DB.id('compras'),
                fecha: new Date().toISOString(),
                proveedor: { id: prov.id, nombre: prov.nombre },
                condicion: 'contado',
                items: [{ id: prod.id, nombre: prod.nombre, cantidad: cant, costo: prod.costo, subtotal: total }],
                total,
                pagado: total,
                moneda: 'PYG'
            });
        }
        DB.data.compras = compras;

        // 8. Empleados
        const empleados = [
            { id: DB.id('empleados'), nombre: 'Ricardo Chofer', ci: '111222', cargo: 'Delivery', tel: '0981 777 888', tipo: 'mensual', salario: 2700000, ingreso: '2025-01-10', activo: true },
            { id: DB.id('empleados'), nombre: 'Laura Cajera', ci: '333444', cargo: 'Caja', tel: '0971 666 555', tipo: 'mensual', salario: 3000000, ingreso: '2025-02-15', activo: true }
        ];
        DB.data.empleados = empleados;

        // 9. Caja inicial
        DB._caja();
        DB.movCaja('entrada', 'Apertura de demostración', 500000, 'PYG');

        // Guardar y recargar
        DB.guardar();
        Toast.show('✅ Datos de demostración cargados exitosamente', 'success');
        
        setTimeout(() => {
            location.reload();
        }, 1500);
    }
};
