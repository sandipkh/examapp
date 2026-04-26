import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import Layout from '@/components/Layout';
import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import MyQuestions from '@/pages/MyQuestions';
import CreateQuestion from '@/pages/CreateQuestion';
import UploadCSV from '@/pages/UploadCSV';
import ReviewQueue from '@/pages/ReviewQueue';
import ReviewedHistory from '@/pages/ReviewedHistory';
import UserManagement from '@/pages/UserManagement';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <Layout>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/questions" element={<MyQuestions />} />
                <Route path="/questions/create" element={<CreateQuestion />} />
                <Route path="/questions/:id/edit" element={<CreateQuestion />} />
                <Route path="/upload-csv" element={<UploadCSV />} />
                <Route path="/review" element={<ReviewQueue />} />
                <Route path="/reviewed-history" element={<ReviewedHistory />} />
                <Route path="/users" element={<UserManagement />} />
              </Routes>
            </Layout>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
