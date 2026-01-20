import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Login } from './componets/login';
import { ForgotPassword } from './componets/forgotPassword';
import { ResetPassword } from './componets/resetPassword';
import { Dashboard } from './componets/dashboard';
import { UserProvider } from './componets/userContext';
import { AllUsers } from './componets/allusers';
import { CreateUser } from './componets/createUser';
import { UserDetail } from './componets/userDetails';

export default function App() {
  return (
    <UserProvider>
      <BrowserRouter>
        <Routes>
          {/* Offentliga routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* Protected dashboard */}
          <Route path="/dashboard" element={<Dashboard />}>
            <Route index element={<div className="p-6">Välkommen till dashboarden!</div>} />

            {/* Superadmin-routes */}
            <Route path="create-user" element={<CreateUser onUserCreated={() => { }} />} />
            <Route path="users" element={<AllUsers />} />
            <Route path="users/:id" element={<UserDetail />} />   {/* detaljvy */}

            {/* Andra routes */}
            <Route path="me" element={<div>My details</div>} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </UserProvider>
  );
}
