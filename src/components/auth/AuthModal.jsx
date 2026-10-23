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
        
        {/* Encabezado */}
        <div className="modal-encabezado">
          <div className="grupo-titulo">
            {isRegister ? <UserPlus size={20} color="#6366f1" /> : <LogIn size={20} color="#6366f1" />}
            <h3 className="modal-titulo-chico">
              {isRegister ? 'Crear Cuenta Supabase' : 'Iniciar Sesión'}
            </h3>
          </div>
          <button onClick={onClose} className="modal-cerrar">
            <X size={18} />
          </button>
        </div>

        {/* Cuerpo */}
        <div className="modal-cuerpo-simple">

          {/* UUID del usuario con sesión activa, con botón para copiarlo */}
          {currentUser && (
            <div className="tarjeta-uuid">
              <div className="tarjeta-uuid-etiqueta">Tu UUID de Usuario Activo:</div>
              <div className="tarjeta-uuid-valor">
                <code>{currentUser.id}</code>
                <button onClick={copyUuid} className="boton-copiar">
                  {copiedUuid ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                </button>
              </div>
            </div>
          )}

          {/* Error de autenticación */}
          {errorMsg && (
            <div className="alerta-error espaciada">
              {errorMsg}
            </div>
          )}

          {/* Formulario de correo y contraseña */}
          <form onSubmit={handleSubmit} className="auth-formulario">
            <div>
              <label className="input-label">Correo Electrónico</label>
              <div className="campo-con-icono">
                <Mail size={16} color="var(--text-muted)" className="campo-icono" />
                <input 
                  type="email" 
                  required 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu.email@ejemplo.com"
                  className="input-field"
                />
              </div>
            </div>

            <div>
              <label className="input-label">Contraseña</label>
              <div className="campo-con-icono">
                <Lock size={16} color="var(--text-muted)" className="campo-icono" />
                <input 
                  type="password" 
                  required 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input-field"
                />
              </div>
            </div>

            <button type="submit" className="btn-primary boton-centrado" disabled={loading}>
              {loading ? 'Procesando...' : (isRegister ? 'Registrarse' : 'Entrar a la Plataforma')}
            </button>
          </form>

          {/* Alternar entre iniciar sesión y registrarse */}
          <div className="auth-pie">
            {isRegister ? '¿Ya tienes una cuenta?' : '¿No tienes cuenta?'} {' '}
            <button 
              onClick={() => setIsRegister(!isRegister)}
              className="boton-enlace"
            >
              {isRegister ? 'Inicia sesión aquí' : 'Regístrate'}
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}
