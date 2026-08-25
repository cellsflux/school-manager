import { Outlet } from "react-router-dom";
import { TopMenu } from "./menus";

export const PublicLayout: React.FC = () => {
  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
        margin: 0,
        padding: 0,
      }}
    >
      {/* Header fixe */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 44,
          zIndex: 2,
          background: "transparent",
        }}
      >
        <TopMenu />
      </div>

      {/* Contenu centré */}
      <div
        style={{
          position: "absolute",
          top: 50,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
        }}
      >
        <Outlet />
      </div>
    </div>
  );
};
