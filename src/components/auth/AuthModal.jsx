import React, { useState } from 'react';
import { X, LogIn, UserPlus, Mail, Lock, Sparkles, Copy, Check } from 'lucide-react';
import { supabase, isSupabaseConfigured, getInitialDemoUser } from '../../lib/supabase';

export default function AuthModal({ isOpen, onClose, onAuthSuccess, currentUser }) {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [copiedUuid, setCopiedUuid] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      if (isSupabaseConfigured && supabase) {
        if (isRegister) {
          const { data, error } = await supabase.auth.signUp({ email, password });
          if (error) throw error;
          if (data.user) {
            onAuthSuccess({ id: data.user.id, email: data.user.email });
            onClose();
          }
        } else {
          const { data, error } = await supabase.auth.signInWithPassword({ email, password });
          if (error) throw error;
          if (data.user) {
            onAuthSuccess({ id: data.user.id, email: data.user.email });
            onClose();
          }
        }
      } else {
        // Fallback / Demo Mode login
        const demoUser = {
          id: 'user-' + Math.random().toString(36).substring(2, 9) + '-' + Date.now(),
          email: email || 'usuario.demo@empresa.com'
        };
        localStorage.setItem('demo_tracker_user', JSON.stringify(demoUser));
        onAuthSuccess(demoUser);
        onClose();
      }
    } catch (err) {
      setErrorMsg(err.message || 'Ocurrió un error al autenticar.');
    } finally {
      setLoading(false);
    }
  };

  const copyUuid = () => {
    if (currentUser?.id) {
      navigator.clipboard.writeText(currentUser.id);
      setCopiedUuid(true);
      setTimeout(() => setCopiedUuid(false), 2000);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px' }}>
        
        {/* Header */}
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-glass)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            {isRegister ? <UserPlus size={20} color="#6366f1" /> : <LogIn size={20} color="#6366f1" />}
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>
              {isRegister ? 'Crear Cuenta Supabase' : 'Iniciar Sesión'}
            </h3>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '1.5rem' }}>
          
          {currentUser && (
            <div style={{ background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.3)', borderRadius: '10px', padding: '0.85rem', marginBottom: '1.25rem' }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Tu UUID de Usuario Activo:</div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(0,0,0,0.3)', padding: '0.35rem 0.65rem', borderRadius: '6px' }}>
                <code style={{ fontSize: '0.78rem', color: '#a5b4fc' }}>{currentUser.id}</code>
                <button onClick={copyUuid} style={{ background: 'none', border: 'none', color: '#a5b4fc', cursor: 'pointer' }}>
                  {copiedUuid ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                </button>
              </div>
            </div>
          )}

          {errorMsg && (
            <div style={{ background: 'rgba(244, 63, 94, 0.15)', color: '#fda4af', border: '1px solid rgba(244, 63, 94, 0.3)', padding: '0.75rem', borderRadius: '8px', fontSize: '0.82rem', marginBottom: '1rem' }}>
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label className="input-label">Correo Electrónico</label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                <input 
                  type="email" 
                  required 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu.email@ejemplo.com"
                  className="input-field"
                  style={{ paddingLeft: '2.4rem' }}
                />
              </div>
            </div>

            <div>
              <label className="input-label">Contraseña</label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                <input 
                  type="password" 
                  required 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input-field"
                  style={{ paddingLeft: '2.4rem' }}
                />
              </div>
            </div>

            <button type="submit" className="btn-primary" disabled={loading} style={{ justifyContent: 'center', marginTop: '0.5rem' }}>
              {loading ? 'Procesando...' : (isRegister ? 'Registrarse' : 'Entrar a la Plataforma')}
            </button>
          </form>

          <div style={{ marginTop: '1.25rem', textAlign: 'center', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            {isRegister ? '¿Ya tienes una cuenta?' : '¿No tienes cuenta?'} {' '}
            <button 
              onClick={() => setIsRegister(!isRegister)} 
              style={{ background: 'none', border: 'none', color: '#a5b4fc', cursor: 'pointer', fontWeight: 600, textDecoration: 'underline' }}
            >
              {isRegister ? 'Inicia sesión aquí' : 'Regístrate'}
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}
