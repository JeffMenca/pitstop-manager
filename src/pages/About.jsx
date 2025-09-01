export default function About() {
  return (
   <section className="flex flex-col justify-center items-center text-center w-full p-6 px-56">
      <img
        src="/pitstop-logo.png"
        alt="PitStop Logo"
        className="w-64 mb-6"
      />
      <h2 className="text-3xl font-bold mb-4">Acerca de Pitstop Manager</h2>
      <p className="mb-4 text-lg leading-relaxed">
        Pitstop Manager es una aplicación diseñada para transformar la manera en que los talleres mecánicos gestionan sus operaciones. 
        Nuestro objetivo es modernizar procesos que antes eran manuales y desorganizados, ofreciendo una plataforma intuitiva que integra 
        atención al cliente, administración de inventarios, gestión de trabajos y facturación en un solo lugar.
      </p>

       <img
        src="/fixing-car.png"
        alt="Fixing carr"
        className="w-[700px] my-10"
      />

      <p className="mb-4 text-lg leading-relaxed">
        La app permite a <strong>administradores, empleados, especialistas, clientes y proveedores</strong> interactuar de forma clara y eficiente, 
        garantizando transparencia, seguridad y rapidez en cada servicio. Desde registrar vehículos y trabajos mecánicos, hasta emitir facturas 
        y dar seguimiento en tiempo real, Pitstop Manager simplifica la experiencia tanto para el taller como para sus clientes.
      </p>
      <p className="mb-6 text-lg leading-relaxed">
        <em>Nuestra misión</em> es apoyar a los talleres automotrices en su digitalización, reduciendo tiempos de espera, minimizando errores 
        y aumentando la satisfacción del cliente. <em>Nuestra visión</em> es convertirnos en el aliado tecnológico número uno para talleres 
        en toda Latinoamérica, impulsando la innovación y la confianza en el sector automotriz.
      </p>

       <img
        src="/side-car.png"
        alt="Sidecar"
        className="w-[700px] my-10"
      />

      <h3 className="text-xl font-bold  mb-2">Sobre la empresa</h3>
      <p className="text-lg leading-relaxed">
        Pitstop Labs es una startup tecnológica fundada en 2025 con sede en Quetzaltenango, Guatemala. 
        Nació como un proyecto universitario con la misión de conectar la ingeniería de software con las necesidades reales de los 
        talleres mecánicos. Hoy buscamos escalar nuestras soluciones a nivel regional, ofreciendo herramientas accesibles, seguras 
        y fáciles de usar para modernizar el rubro automotriz.
      </p>
    </section>
  )
}
