import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import { DataProvider, useData } from "./context/DataContext";
import { ThemeProvider } from "./context/ThemeContext";
import { CommandProvider } from "./context/CommandContext";
import { Layout } from "./components/Layout";
import { LoadingScreen } from "./components/LoadingScreen";

const HomePage = lazy(() => import("./pages/HomePage").then((m) => ({ default: m.HomePage })));
const ProjectDetailPage = lazy(() =>
  import("./pages/ProjectDetailPage").then((m) => ({ default: m.ProjectDetailPage })),
);
const NotFoundPage = lazy(() => import("./pages/NotFoundPage").then((m) => ({ default: m.NotFoundPage })));
const AdminPage = lazy(() => import("./pages/AdminPage").then((m) => ({ default: m.AdminPage })));
// Cyber-Deck: lazy + outside the public Layout; module code never enters the
// initial bundle and the route is unlinked/noindex'd.
const TerminalPage = lazy(() =>
  import("./pages/cyberdeck/TerminalPage").then((m) => ({ default: m.TerminalPage })),
);

function RoutesShell() {
  const { status } = useData();

  return (
    <>
      <LoadingScreen show={status === "loading"} />
      <Suspense fallback={null}>
        <Routes>
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/terminal" element={<TerminalPage />} />
          <Route
            path="*"
            element={
              <Layout>
                <Suspense fallback={null}>
                  <Routes>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/projects/:id" element={<ProjectDetailPage />} />
                    <Route path="*" element={<NotFoundPage />} />
                  </Routes>
                </Suspense>
              </Layout>
            }
          />
        </Routes>
      </Suspense>
    </>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <CommandProvider>
        <DataProvider>
          <RoutesShell />
        </DataProvider>
      </CommandProvider>
    </ThemeProvider>
  );
}
