import { Outlet } from "react-router-dom";

export default function EmployeeLayout() {
  return (
    <section className="prose max-w-none p-4">
      <Outlet />
    </section>
  );
}
