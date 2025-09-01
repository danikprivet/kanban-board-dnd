import React, { useState } from 'react';
import { useAuth } from '../auth/AuthContext';

function validateEmail(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

function validatePassword(v) {
  return /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{6,50}$/.test(v);
}

export default function Login({ onSuccess }) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    
    // Clear previous errors
    setErrors({});
    
    // Client-side validation
    const nextErrors = {};
    if (!email.trim()) {
      nextErrors.email = 'Email обязателен';
    } else if (!validateEmail(email)) {
      nextErrors.email = 'Введите корректный email (youremail@gmail.com)';
    }
    
    if (!password) {
      nextErrors.password = 'Пароль обязателен';
    } else if (!validatePassword(password)) {
      nextErrors.password = 'Пароль 6-50 символов, буквы и цифры';
    }
    
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }
    
    setLoading(true);
    
    try {
      await login(email.trim(), password);
      onSuccess && onSuccess();
    } catch (err) {
      // Handle different error formats from new API
      let errorMessage = 'Ошибка входа';
      
      if (err.message) {
        errorMessage = err.message;
      } else if (err.error) {
        errorMessage = err.error;
      } else if (typeof err === 'string') {
        errorMessage = err;
      }
      
      setErrors({ form: errorMessage });
    } finally {
      setLoading(false);
    }
  }

  const handleEmailChange = (e) => {
    setEmail(e.target.value);
    if (errors.email) {
      setErrors(prev => ({ ...prev, email: '' }));
    }
  };

  const handlePasswordChange = (e) => {
    setPassword(e.target.value);
    if (errors.password) {
      setErrors(prev => ({ ...prev, password: '' }));
    }
  };

  return (
    <div style={{ 
      maxWidth: 400, 
      margin: '60px auto', 
      background: 'var(--surface)', 
      boxShadow: 'var(--shadow)', 
      borderRadius: 12, 
      padding: 32,
      border: '1px solid var(--border)'
    }}>
      <h2 style={{ 
        marginTop: 0, 
        marginBottom: 24,
        textAlign: 'center', 
        color: 'var(--text)',
        fontSize: '28px',
        fontWeight: '600'
      }}>
        Вход в систему
      </h2>
      
      {errors.form && (
        <div style={{ 
          color: 'var(--error)', 
          marginBottom: 20, 
          padding: '12px 16px',
          background: 'var(--error-bg)',
          borderRadius: 8,
          border: '1px solid var(--error-border)',
          fontSize: '14px'
        }}>
          {errors.form}
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 20 }}>
          <label style={{ 
            display: 'block', 
            marginBottom: 8, 
            color: 'var(--text-secondary)',
            fontSize: '14px',
            fontWeight: '500'
          }}>
            Email
          </label>
          <input
            value={email}
            onChange={handleEmailChange}
            type="email"
            placeholder="youremail@gmail.com"
            disabled={loading}
            style={{ 
              width: '100%', 
              padding: '12px 16px', 
              borderRadius: 8, 
              border: `1px solid ${errors.email ? 'var(--error)' : 'var(--border)'}`, 
              background: 'var(--surface)', 
              color: 'var(--text)',
              boxSizing: 'border-box',
              fontSize: '16px',
              transition: 'border-color 0.2s ease',
              outline: 'none'
            }}
            onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
            onBlur={(e) => e.target.style.borderColor = errors.email ? 'var(--error)' : 'var(--border)'}
          />
          {errors.email && (
            <div style={{ 
              color: 'var(--error)', 
              fontSize: 12, 
              marginTop: 6,
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              <span>⚠</span> {errors.email}
            </div>
          )}
        </div>
        
        <div style={{ marginBottom: 24 }}>
          <label style={{ 
            display: 'block', 
            marginBottom: 8, 
            color: 'var(--text-secondary)',
            fontSize: '14px',
            fontWeight: '500'
          }}>
            Пароль
          </label>
          <div style={{ position: 'relative' }}>
            <input
              value={password}
              onChange={handlePasswordChange}
              type={showPassword ? "text" : "password"}
              placeholder="••••••"
              disabled={loading}
              style={{ 
                width: '100%', 
                padding: '12px 16px', 
                paddingRight: '48px',
                borderRadius: 8, 
                border: `1px solid ${errors.password ? 'var(--error)' : 'var(--border)'}`, 
                background: 'var(--surface)', 
                color: 'var(--text)',
                boxSizing: 'border-box',
                fontSize: '16px',
                transition: 'border-color 0.2s ease',
                outline: 'none'
              }}
              onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
              onBlur={(e) => e.target.style.borderColor = errors.password ? 'var(--error)' : 'var(--border)'}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: 'absolute',
                right: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '18px',
                padding: '4px',
                color: 'var(--text-secondary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              {showPassword ? '👁️' : '👁️‍🗨️'}
            </button>
          </div>
          {errors.password && (
            <div style={{ 
              color: 'var(--error)', 
              fontSize: 12, 
              marginTop: 6,
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              <span>⚠</span> {errors.password}
            </div>
          )}
        </div>
        
        <button 
          disabled={loading} 
          type="submit" 
          style={{ 
            width: '100%', 
            padding: '14px 16px', 
            borderRadius: 8, 
            border: 'none', 
            background: loading ? 'var(--disabled)' : 'var(--primary)', 
            color: '#fff', 
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '16px',
            fontWeight: '600',
            transition: 'all 0.2s ease',
            boxShadow: loading ? 'none' : '0 2px 8px rgba(0, 0, 0, 0.1)'
          }}
          onMouseEnter={(e) => {
            if (!loading) {
              e.target.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
            }
          }}
          onMouseLeave={(e) => {
            if (!loading) {
              e.target.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
            }
          }}
        >
          {loading ? 'Вход...' : 'Войти'}
        </button>
      </form>
    </div>
  );
}

