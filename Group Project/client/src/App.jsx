import { lazy, Suspense } from "react";
import { ApolloClient, InMemoryCache, createHttpLink } from "@apollo/client";
import { ApolloProvider } from "@apollo/client/react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Container, Spinner } from "react-bootstrap";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ReportIssuePage from "./pages/ReportIssuePage";
import DashboardPage from "./pages/DashboardPage";
import StaffIssuesPage from "./pages/StaffIssuesPage";
import AppNavbar from "./components/AppNavbar";
import ProtectedRoute from "./components/ProtectedRoute";
import NotAuthorizedPage from "./pages/NotAuthorizedPage";

const ChatbotPage = lazy(() => import("./pages/ChatBotPage"));
const AnalyticsPage = lazy(() => import("./pages/AnalyticsPage"));
const MapPage = lazy(() => import("./pages/MapPage"));

const httpLink = createHttpLink({
  uri: "http://localhost:5000/graphql",
  credentials: "include"
});

const client = new ApolloClient({
  link: httpLink,
  cache: new InMemoryCache()
});

function PageLoader() {
  return (
    <Container className="app-loader flex-column gap-3 text-center">
      <Spinner animation="border" />
      <div className="app-loader-text">Loading workspace...</div>
    </Container>
  );
}

export default function App() {
  return (
    <ApolloProvider client={client}>
      <BrowserRouter>
        <AppNavbar />
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/not-authorized" element={<NotAuthorizedPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/map" element={<MapPage />} />

            <Route
              path="/report"
              element={
                <ProtectedRoute>
                  <ReportIssuePage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/chatbot"
              element={
                <ProtectedRoute>
                  <ChatbotPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/staff/issues"
              element={
                <ProtectedRoute allowedRoles={["staff"]}>
                  <StaffIssuesPage />
                </ProtectedRoute>
              }
            />

            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ApolloProvider>
  );
}
