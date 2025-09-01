import { NavLink } from "react-router-dom";

export default function Recovery() {
  return (
    <section className="w-full">
      <div className="flex flex-row min-h-screen">
        <div className="bg-pitstop-red w-3/5 ">
          <img
            src="/recovery-banner.png"
            alt="PitStop Background"
            className="w-[1200px] absolute top-1/5 right-1/2"
          />
        </div>
        <div className="flex flex-col justify-center items-center w-2/5 p-8">
          <img
            src="/pitstop-logo.png"
            alt="PitStop Logo"
            className="w-64 mb-4"
          />
          <form className="space-y-4 w-2/3">
            <div className="w-full flex justify-center font-semibold"><h2 className="mx-auto text-xl">Recuperacion de password</h2></div>
            <div className="form-control">
              <label className="label mb-2">
                <span className="label-text">Usuario</span>
              </label>
              <input
                type="text"
                placeholder="Ingresa tu usuario"
                className="input input-bordered w-full"
              />
            </div>
            <div className="form-control mb-6">
              <label className="label mb-2">
                <span className="label-text">Nueva contraseña</span>
              </label>
              <input
                type="password"
                placeholder="••••••••"
                className="input input-bordered w-full"
              />
            </div>
             <div className="form-control mb-6">
              <label className="label mb-2">
                <span className="label-text">Confirma la contraseña</span>
              </label>
              <input
                type="password"
                placeholder="••••••••"
                className="input input-bordered w-full"
              />
            </div>
              <NavLink to="/home" className='btn w-full bg-pitstop-red border-pitstop-red'>Recuperar</NavLink>
              <NavLink to="/login" className=' text-pitstop-red text-xs'>¿Iniciar sesion?</NavLink>
          </form>
        </div>
      </div>
    </section>
  );
}
