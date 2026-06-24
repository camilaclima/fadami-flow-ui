import { Outlet } from "react-router-dom";
import { SimUserSwitcher } from "./SimUserSwitcher";

export default function DailysLayout() {
  return (
    <>
      <div className="px-4 md:px-6 pt-4 w-full max-w-[1400px] mx-auto">
        <SimUserSwitcher />
      </div>
      <Outlet />
    </>
  );
}