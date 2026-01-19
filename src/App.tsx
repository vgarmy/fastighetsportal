import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Login } from './componets/login';
import { ForgotPassword } from './componets/forgotPassword';
import { ResetPassword } from './componets/resetPassword';
import { Dashboard } from './componets/dashboard';
import { UserProvider } from './componets/userContext'; // <- importera din context

export default function App() {
  return (
    <UserProvider>
      <BrowserRouter>
        <Routes>
          {/* Auth routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* Skyddad vy – alla går till samma dashboard */}
          <Route path="/dashboard" element={<Dashboard />} />

          {/* Default: skicka till /login */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </UserProvider>
  );
}
