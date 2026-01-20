import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Login } from './componets/login';
import { ForgotPassword } from './componets/forgotPassword';
import { ResetPassword } from './componets/resetPassword';
import { Dashboard } from './componets/dashboard';
import { UserProvider } from './componets/userContext'; // <- importera din context
import { AllUsers } from './componets/allusers';
import CreateUser from './componets/createuser';


export default function App() {
  return (
    <UserProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          <Route path="/dashboard" element={<Dashboard />}>
            <Route index element={<div>Welcome</div>} />
            <Route path="users" element={<AllUsers />} />
            <Route path="me" element={<div>My details</div>} />
            <Route path="createuser" element={<CreateUser />} />
          </Route>

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </UserProvider>
  );
}
