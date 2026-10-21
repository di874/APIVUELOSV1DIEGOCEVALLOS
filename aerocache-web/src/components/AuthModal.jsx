import React, { useState } from 'react';
import { X, Lock, Mail, User, Phone, FileText, CheckCircle, AlertCircle, ShieldCheck, Sparkles, Plane } from 'lucide-react';
import { loginUser, registerClient } from '../api';

export default function AuthModal({ isOpen, onClose, onAuthSuccess, initialMode = 'login', isBookingFlow = false }) {
  const [mode, setMode] = useState(initialMode); // 'login' | 'register'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register form state
  const [regNombre, setRegNombre] = useState('');
  const [regApellido, setRegApellido] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regDocumento, setRegDocumento] = useState('');
  const [regTelefono, setRegTelefono] = useState('');

  if (!isOpen) return null;

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await loginUser(loginEmail, loginPassword);
      if (res.success && res.user) {
        localStorage.setItem('aerocache_current_user', JSON.stringify(res.user));
        localStorage.setItem('aerocache_auth_token', res.token);
        if (onAuthSuccess) onAuthSuccess(res.user, res.token);
        onClose();
      } else {
        throw new Error(res.message || 'Error al iniciar sesión');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const payload = {
        nombre: regNombre,
        apellido: regApellido,
        email: regEmail,
        password: regPassword,
        documento: regDocumento,
        telefono: regTelefono
      };
      const res = await registerClient(payload);
      if (res.success && res.user) {
        localStorage.setItem('aerocache_current_user', JSON.stringify(res.user));
        localStorage.setItem('aerocache_auth_token', res.token);
        if (onAuthSuccess) onAuthSuccess(res.user, res.token);
        onClose();
      } else {
        throw new Error(res.message || 'Error al crear la cuenta');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fillQuickDemo = (type) => {
    if (type === 'admin') {
      setMode('login');
      setLoginEmail('admin@aerocache.ec');
      setLoginPassword('admin123');
    } else {
      setMode('login');
      setLoginEmail('diego.cevallos@gmail.com');
      setLoginPassword('cliente123');
    }
    setError(null);
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      backgroundColor: 'rgba(0, 25, 53, 0.78)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2000,
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: '#fff',
        borderRadius: '20px',
        width: '100%',
        maxWidth: '480px',
        maxHeight: '94vh',
        boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          backgroundColor: 'var(--color-latam-navy)',
          color: '#fff',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #e8114b 0%, #ff4b72 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Plane size={20} color="#fff" style={{ transform: 'rotate(-45deg)' }} />
            </div>
            <div>
              <div style={{ fontWeight: '800', fontSize: '18px', letterSpacing: '0.5px' }}>
                AEROCACHE • Acceso
              </div>
              <div style={{ fontSize: '11px', color: '#9bb1c9' }}>
                Portal de Clientes y Administradores
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', color: '#fff', border: 'none', cursor: 'pointer' }}>
            <X size={22} />
          </button>
        </div>

        {/* Booking flow context banner */}
        {isBookingFlow && (
          <div style={{
            backgroundColor: '#fff1f2',
            borderBottom: '1px solid #fecdd3',
            padding: '12px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '12px',
            color: '#9f1239'
          }}>
            <ShieldCheck size={18} color="var(--color-latam-coral)" style={{ flexShrink: 0 }} />
            <div>
              <strong>¡Tus asientos están guardados!</strong> Ingresa o crea tu cuenta para continuar con la confirmación de tu reserva y pago.
            </div>
          </div>
        )}

        {/* Tab Switcher: Iniciar Sesión vs Crear Cuenta */}
        <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
          <button
            type="button"
            onClick={() => { setMode('login'); setError(null); }}
            style={{
              flex: 1,
              padding: '14px',
              border: 'none',
              borderBottom: mode === 'login' ? '3px solid var(--color-latam-coral)' : '3px solid transparent',
              backgroundColor: mode === 'login' ? '#fff' : 'transparent',
              color: mode === 'login' ? 'var(--color-latam-navy)' : '#64748b',
              fontWeight: mode === 'login' ? '800' : '600',
              fontSize: '14px',
              cursor: 'pointer'
            }}
          >
            Iniciar Sesión
          </button>
          <button
            type="button"
            onClick={() => { setMode('register'); setError(null); }}
            style={{
              flex: 1,
              padding: '14px',
              border: 'none',
              borderBottom: mode === 'register' ? '3px solid var(--color-latam-coral)' : '3px solid transparent',
              backgroundColor: mode === 'register' ? '#fff' : 'transparent',
              color: mode === 'register' ? 'var(--color-latam-navy)' : '#64748b',
              fontWeight: mode === 'register' ? '800' : '600',
              fontSize: '14px',
              cursor: 'pointer'
            }}
          >
            Crear Cuenta (Cliente)
          </button>
        </div>

        {/* Body Form */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
          {error && (
            <div style={{
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#b91c1c',
              padding: '12px 16px',
              borderRadius: '10px',
              marginBottom: '18px',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {mode === 'login' ? (
            <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#1e293b', marginBottom: '6px' }}>
                  Correo Electrónico
                </label>
                <div style={{ position: 'relative' }}>
                  <Mail size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '13px' }} />
                  <input
                    type="email"
                    required
                    placeholder="ej. cliente@gmail.com o admin@aerocache.ec"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '11px 12px 11px 38px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '14px',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#1e293b', marginBottom: '6px' }}>
                  Contraseña
                </label>
                <div style={{ position: 'relative' }}>
                  <Lock size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '13px' }} />
                  <input
                    type="password"
                    required
                    placeholder="Ingresa tu contraseña"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '11px 12px 11px 38px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '14px',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              {/* Quick demo pills */}
              <div style={{ backgroundColor: '#f8fafc', padding: '10px 14px', borderRadius: '8px', fontSize: '12px', color: '#64748b' }}>
                <div style={{ fontWeight: '700', marginBottom: '6px' }}>Accesos rápidos demo:</div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => fillQuickDemo('cliente')}
                    style={{
                      backgroundColor: '#e0f2fe',
                      color: '#0369a1',
                      border: '1px solid #bae6fd',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: '700',
                      cursor: 'pointer'
                    }}
                  >
                    👤 Cliente Demo
                  </button>
                  <button
                    type="button"
                    onClick={() => fillQuickDemo('admin')}
                    style={{
                      backgroundColor: '#fee2e2',
                      color: '#b91c1c',
                      border: '1px solid #fecaca',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: '700',
                      cursor: 'pointer'
                    }}
                  >
                    🛡️ Admin Demo
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  marginTop: '10px',
                  padding: '13px',
                  borderRadius: '10px',
                  backgroundColor: 'var(--color-latam-coral)',
                  color: '#fff',
                  border: 'none',
                  fontWeight: '800',
                  fontSize: '15px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.7 : 1,
                  boxShadow: '0 4px 12px rgba(232, 17, 75, 0.3)'
                }}
              >
                {loading ? 'Ingresando...' : 'Iniciar Sesión ➔'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegisterSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#1e293b', marginBottom: '4px' }}>
                    Nombre *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="ej. Mateo"
                    value={regNombre}
                    onChange={(e) => setRegNombre(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#1e293b', marginBottom: '4px' }}>
                    Apellido *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="ej. Cevallos"
                    value={regApellido}
                    onChange={(e) => setRegApellido(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#1e293b', marginBottom: '4px' }}>
                  Cédula / Documento de Identidad *
                </label>
                <div style={{ position: 'relative' }}>
                  <FileText size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '11px' }} />
                  <input
                    type="text"
                    required
                    placeholder="ej. 1751030295"
                    value={regDocumento}
                    onChange={(e) => setRegDocumento(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px 9px 36px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#1e293b', marginBottom: '4px' }}>
                  Teléfono / Móvil *
                </label>
                <div style={{ position: 'relative' }}>
                  <Phone size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '11px' }} />
                  <input
                    type="tel"
                    required
                    placeholder="ej. +593991234567"
                    value={regTelefono}
                    onChange={(e) => setRegTelefono(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px 9px 36px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#1e293b', marginBottom: '4px' }}>
                  Correo Electrónico *
                </label>
                <div style={{ position: 'relative' }}>
                  <Mail size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '11px' }} />
                  <input
                    type="email"
                    required
                    placeholder="ej. mateo.cevallos@gmail.com"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px 9px 36px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#1e293b', marginBottom: '4px' }}>
                  Contraseña *
                </label>
                <div style={{ position: 'relative' }}>
                  <Lock size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '11px' }} />
                  <input
                    type="password"
                    required
                    placeholder="Crea una contraseña segura"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px 9px 36px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  marginTop: '10px',
                  padding: '13px',
                  borderRadius: '10px',
                  backgroundColor: 'var(--color-latam-coral)',
                  color: '#fff',
                  border: 'none',
                  fontWeight: '800',
                  fontSize: '15px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.7 : 1,
                  boxShadow: '0 4px 12px rgba(232, 17, 75, 0.3)'
                }}
              >
                {loading ? 'Creando cuenta...' : 'Crear Cuenta y Continuar ➔'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
