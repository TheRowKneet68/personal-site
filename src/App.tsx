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

function RoutesShell() {
  const { status } = useData();

  return (
    <>
      <LoadingScreen show={status === "loading"} />
      <Suspense fallback={null}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/projects/:id" element={<ProjectDetailPage />} />
          <Route path="*" element={<NotFoundPage />} />
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
          <Layout>
            <RoutesShell />
          </Layout>
        </DataProvider>
      </CommandProvider>
    </ThemeProvider>
  );
}
