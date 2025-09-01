export default function Home() {
  return (
    <section className="prose max-w-none">
      <div className="mt-4 flex gap-2 justify-center w-full">
        <div className="flex justify-center items-center min-h-screen bg-base-200 w-[500px]">
          <div className="card w-full max-w-lg shadow-2xl bg-base-100">
            <div className="card-body">
              <h2 className="text-2xl font-bold text-center mb-4">
                Actualizacion de usuario
              </h2>
              <form className="space-y-4">
                {/* Nombre */}
                <div className="form-control">
                  <label className="label w-20">
                    <span className="label-text">Nombre</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Ingresa tu nombre"
                    className="input input-bordered"
                  />
                </div>

                {/* Apellido */}
                <div className="form-control">
                  <label className="label w-20">
                    <span className="label-text">Apellido</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Ingresa tu apellido"
                    className="input input-bordered"
                  />
                </div>

                {/* Username */}
                <div className="form-control">
                  <label className="label w-20">
                    <span className="label-text">Usuario</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Nombre de usuario"
                    className="input input-bordered"
                  />
                </div>

                {/* Password */}
                <div className="form-control">
                  <label className="label w-20">
                    <span className="label-text">Contraseña</span>
                  </label>
                  <input
                    type="password"
                    placeholder="********"
                    className="input input-bordered"
                  />
                </div>

                {/* Rol */}
                <div className="form-control">
                  <label className="label w-20">
                    <span className="label-text">Rol</span>
                  </label>
                  <select className="select select-bordered">
                    <option disabled selected>
                      Selecciona un rol
                    </option>
                    <option>Administrador</option>
                    <option>Usuario</option>
                    <option>Invitado</option>
                  </select>
                </div>

                {/* Email */}
                <div className="form-control">
                  <label className="label w-20">
                    <span className="label-text">Correo</span>
                  </label>
                  <input
                    type="email"
                    placeholder="ejemplo@correo.com"
                    className="input input-bordered"
                  />
                </div>

                {/* Teléfono */}
                <div className="form-control">
                  <label className="label w-20">
                    <span className="label-text">Teléfono</span>
                  </label>
                  <input
                    type="tel"
                    placeholder="+502 1234-5678"
                    className="input input-bordered"
                  />
                </div>

                {/* Correo verificado */}
                <div className="form-control">
                  <label className="cursor-pointer label w-20">
                    <span className="label-text">¿Correo verificado?</span>
                    <input
                      type="checkbox"
                      className="checkbox checkbox-primary border-pitstop-red"
                    />
                  </label>
                </div>

                {/* Botón */}
                <div className="form-control mt-6 flex justify-center">
                  <button className="btn btn-primary bg-pitstop-red border-pitstop-red">Actualizar Usuario</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
