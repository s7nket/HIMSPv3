import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './Login.css'; // We will replace this file next

const Login = () => {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login, isAuthenticated, user } = useAuth();

  // Redirect if already authenticated
  if (isAuthenticated && user) {
    return <Navigate to={user.role === 'admin' ? '/admin' : '/officer'} replace />;
  }

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    await login({
      username: formData.username,
      password: formData.password
    });
    setIsLoading(false);
  };

  return (
    // 1. New, simpler wrapper to center the card
    <div className="login-container-simple">
      
      {/* 2. Card is now the main element, with new animation class */}
      <div className="login-card-animated">
        
        {/* 3. New, simplified card header */}
        <div className="card-header-simple">
          <div className="logo-container-simple">
            {/* Shield Icon */}
            <svg className="logo-icon-simple" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
          </div>
          <h1 className="card-title-simple">
            Sign in to Police Inventory
          </h1>
          <p className="card-subtitle-simple">
            Use your official department credentials.
          </p>
        </div>

        {/* 4. The form is unchanged, but will use new styles */}
        <form onSubmit={handleSubmit} className="login-form-simple">
          <div className="form-group-simple">
            <label className="form-label-simple">Email</label>
            <div className="input-wrapper-simple">
              {/* Mail Icon */}
              <svg className="input-icon-simple" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <rect x="2" y="4" width="20" height="16" rx="2"/>
                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
              </svg>
              <input
                type="text"
                name="username"
                className="form-control-simple with-icon"
                value={formData.username}
                onChange={handleChange}
                required
                placeholder="name@police.gov.in"
              />
            </div>
          </div>

          <div className="form-group-simple">
            <label className="form-label-simple">Password</label>
            <div className="input-wrapper-simple">
              {/* Lock Icon */}
              <svg className="input-icon-simple" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                className="form-control-simple with-icon password-input"
                value={formData.password}
                onChange={handleChange}
                required
                placeholder="••••••••"
              />
              <button
                type="button"
                className="password-toggle-btn-simple"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  // Eye-off icon
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24M1 1l22 22"/>
                  </svg>
                ) : (
                  // Eye-on icon
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn-primary-simple"
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="spinner-simple"></span>
            ) : (
              'Sign in'
            )}
          </button>
        </form>

        {/* 5. New, simple footer text */}
        <div className="card-footer-simple">
          <p>© 2025 Police Inventory System. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
};

export default Login;