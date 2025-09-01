import { Link, Outlet } from "react-router-dom";

export default function AdminHome() {
  // Primary admin modules with description
  const primary = [
    {
      to: "/admin/usuarios",
      title: "Registro y gestión",
      desc: "Clientes, empleados y proveedores",
    },
    {
      to: "/admin/vehiculos",
      title: "Vehículos",
      desc: "Registro y asociación con clientes",
    },
    {
      to: "/admin/trabajos",
      title: "Trabajos mecánicos",
      desc: "Crear, asignar, estados, cancelar, reasignar",
    },
    {
      to: "/admin/inventario",
      title: "Inventario",
      desc: "Entradas, salidas, actualización de stock",
    },
    {
      to: "/admin/facturacion",
      title: "Facturación",
      desc: "Finalizar trabajos y generar factura",
    },
    {
      to: "/admin/pagos",
      title: "Pagos a proveedores",
      desc: "Realizados y pendientes",
    },
  ];

  return (
    <section className="prose max-w-none">
      <div className="mb-6">
        <div className="flex justify-between w-full">
          <img
            src="/side-car.gif"
            alt="Sidecar"
            className="w-[700px] my-10 -scale-x-100"
          />
         <div className="flex items-center justify-center">
             <div className="stats shadow">
            <div className="stat">
              <div className="stat-title">Trabajos activos</div>
              <div className="stat-value">—</div>
              <div className="stat-desc">Hoy</div>
            </div>
            <div className="stat">
              <div className="stat-title">Pendientes de pago</div>
              <div className="stat-value">—</div>
              <div className="stat-desc">Este mes</div>
            </div>
            <div className="stat">
              <div className="stat-title">Stock bajo</div>
              <div className="stat-value">—</div>
              <div className="stat-desc">Revisar inventario</div>
            </div>
          </div>
         </div>
        </div>

        <div className="mt-4">
          <h2>Dashboard Administrador</h2>
          <p className="opacity-70">
            Acceso rápido a los módulos y acciones más frecuentes.
          </p>
        </div>
      </div>

      {/* Primary modules */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 mb-8">
        {primary.map((it) => (
          <Link
            key={it.to}
            to={it.to}
            className="card bg-base-100 shadow hover:shadow-lg transition"
          >
            <div className="card-body">
              <h3 className="card-title">{it.title}</h3>
              <p>{it.desc}</p>
              <div className="card-actions justify-end">
                <button className="btn btn-primary btn-sm">Abrir modulo</button>
              </div>
            </div>
          </Link>
        ))}
      </div>
     
    </section>
  );
}
