import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import App from './App.jsx';
import NotFound from './NotFound.jsx';
import AdminLogin from './admin/AdminLogin.jsx';
import AdminLayout from './admin/AdminLayout.jsx';
import AdminDashboard from './admin/AdminDashboard.jsx';
import AdminQueries from './admin/AdminQueries.jsx';
import AdminResume from './admin/AdminResume.jsx';
import AdminProjects from './admin/AdminProjects.jsx';
import RequireAdmin from './admin/RequireAdmin.jsx';
import './styles.css';
import './portfolio.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route element={<RequireAdmin/>}>
          <Route element={<AdminLayout/>}>
            <Route path="/admin" element={<Navigate to="/admin/dashboard" replace/>} />
            <Route path="/admin/dashboard" element={<AdminDashboard/>} />
            <Route path="/admin/queries" element={<AdminQueries/>} />
            <Route path="/admin/resume" element={<AdminResume/>} />
            <Route path="/admin/projects" element={<AdminProjects/>} />
          </Route>
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);