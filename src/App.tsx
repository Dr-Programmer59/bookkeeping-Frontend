import Clients from '@/pages/Clients';
import Categories from '@/pages/Categories';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Layout } from "@/components/Layout";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Login } from "@/pages/Login";
import { Dashboard } from "@/pages/Dashboard";
import { Upload } from "@/pages/Upload";
import { Transactions } from "@/pages/Transactions";
import { Rules } from "@/pages/Rules";
import { Logs } from "@/pages/Logs";
import { MyUploads } from "@/pages/MyUploads";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/" element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }>
                <Route index element={<Dashboard />} />
                <Route path="dashboard" element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <Dashboard />
                  </ProtectedRoute>
                } />
                <Route path="upload" element={<Upload />} />
                <Route path="my-uploads" element={
                  <ProtectedRoute allowedRoles={['worker']}>
                    <MyUploads />
                  </ProtectedRoute>
                } />
                <Route path="transactions" element={<Transactions />} />
                <Route path="clients" element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <Clients />
                  </ProtectedRoute>
                } />
                <Route path="categories" element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <Categories />
                  </ProtectedRoute>
                } />
                <Route path="rules" element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <Rules />
                  </ProtectedRoute>
                } />
                <Route path="logs" element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <Logs />
                  </ProtectedRoute>
                } />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
