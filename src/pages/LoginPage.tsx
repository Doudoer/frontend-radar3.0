import React, { useState } from 'react';
import { useAuth } from '../store/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, Loader2, ShieldCheck, ArrowRight } from 'lucide-react';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      await login({ email, password });
      navigate('/dashboard');
    } catch (err: any) {
      const message = err.response?.data?.message || 'Credenciales inválidas';
      setError(message);
      setLoading(false);
    }
  };

  return (
    <div className="login-page-container">
      {/* Background Elements */}
      <div className="mesh-gradient" />
      <div className="glow-orb orb-1" />
      <div className="glow-orb orb-2" />

      <div className="glass-card login-card fade-in">
        <div className="login-header">
          <div className="radar-icon-container">
            <ShieldCheck size={40} className="radar-pulse" />
            <div className="radar-sweep" />
          </div>
          <h1 className="font-outfit login-title">RADAR</h1>
          <p className="login-subtitle">Gestión Logística Avanzada</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="input-group">
            <label>Correo Electrónico</label>
            <div className="input-wrapper">
              <Mail className="input-icon" size={20} />
              <input 
                className="modern-input"
                type="email" 
                placeholder="usuario@radar.com" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>
          
          <div className="input-group">
            <label>Contraseña</label>
            <div className="input-wrapper">
              <Lock className="input-icon" size={20} />
              <input 
                className="modern-input"
                type={showPassword ? "text" : "password"} 
                placeholder="••••••••" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button 
                type="button" 
                className="pw-toggle"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="error-alert fade-in">
              {error}
            </div>
          )}

          <button 
            className="btn-primary modern-submit" 
            type="submit" 
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="spin" size={20} />
            ) : (
              <>
                Entrar al Sistema
                <ArrowRight size={20} />
              </>
            )}
          </button>
        </form>
        
        <footer className="login-footer">
          <p>© 2026 Radar Logistics. Todos los derechos reservados.</p>
        </footer>
      </div>

      <style>{`
        .login-page-container {
          min-height: 100vh;
          width: 100vw;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          overflow: hidden;
          background:
            radial-gradient(circle at 18% 18%, rgba(56, 189, 248, 0.16), transparent 18%),
            radial-gradient(circle at 82% 20%, rgba(20, 184, 166, 0.14), transparent 16%),
            linear-gradient(180deg, #020617 0%, #0f172a 100%);
        }

        body.light-mode .login-page-container {
          background:
            radial-gradient(circle at 18% 18%, rgba(56, 189, 248, 0.12), transparent 18%),
            radial-gradient(circle at 82% 20%, rgba(20, 184, 166, 0.08), transparent 16%),
            linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%);
        }

        .mesh-gradient {
          position: absolute;
          inset: 0;
          background:
            linear-gradient(rgba(148, 163, 184, 0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(148, 163, 184, 0.05) 1px, transparent 1px);
          background-size: 72px 72px;
          opacity: 0.55;
        }

        .glow-orb {
          position: absolute;
          width: 520px;
          height: 520px;
          border-radius: 50%;
          filter: blur(120px);
          opacity: 0.22;
          animation: float 22s ease-in-out infinite alternate;
        }

        .orb-1 {
          top: -220px;
          right: -160px;
          background: radial-gradient(circle, rgba(56, 189, 248, 0.55), rgba(14, 165, 233, 0.12) 58%, transparent 78%);
        }

        .orb-2 {
          bottom: -240px;
          left: -180px;
          background: radial-gradient(circle, rgba(20, 184, 166, 0.46), rgba(15, 118, 110, 0.12) 58%, transparent 78%);
          animation-delay: -10s;
        }

        @keyframes float {
          from {
            transform: translate3d(0, 0, 0);
          }

          to {
            transform: translate3d(64px, 44px, 0);
          }
        }

        .login-card {
          width: min(100%, 500px);
          padding: 2.5rem 2.1rem;
          z-index: 2;
          margin: 1rem;
          border-radius: 30px;
          background: linear-gradient(180deg, rgba(15, 23, 42, 0.96), rgba(15, 23, 42, 0.9));
          border: 1px solid rgba(148, 163, 184, 0.18);
          box-shadow: 0 36px 110px rgba(2, 6, 23, 0.6);
        }

        body.light-mode .login-card {
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(248, 250, 252, 0.94));
          box-shadow: 0 24px 70px rgba(15, 23, 42, 0.14);
        }

        .login-header {
          text-align: center;
          margin-bottom: 2rem;
        }

        .radar-icon-container {
          width: 76px;
          height: 76px;
          margin: 0 auto 1.2rem;
          position: relative;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 22px;
          background: linear-gradient(180deg, rgba(56, 189, 248, 0.16), rgba(20, 184, 166, 0.08));
          border: 1px solid rgba(56, 189, 248, 0.24);
          color: #38bdf8;
        }

        .radar-pulse {
          animation: pulse 2.4s ease-in-out infinite;
        }

        .radar-sweep {
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.22), transparent);
          animation: sweep 3.6s linear infinite;
        }

        .login-title {
          margin-bottom: 0.3rem;
          font-size: 2.8rem;
          letter-spacing: 0.14em;
          background: linear-gradient(135deg, #f8fafc 0%, #7dd3fc 45%, #2dd4bf 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        body.light-mode .login-title {
          background: linear-gradient(135deg, #0f172a 0%, #0284c7 50%, #0f766e 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .login-subtitle {
          color: #94a3b8;
          font-size: 0.98rem;
        }

        .login-form {
          display: flex;
          flex-direction: column;
          gap: 1.2rem;
        }

        .input-group label {
          display: block;
          margin-bottom: 0.55rem;
          color: #94a3b8;
          font-size: 0.75rem;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }

        .input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        .input-icon {
          position: absolute;
          left: 1rem;
          color: #94a3b8;
          transition: color 160ms ease;
        }

        .modern-input {
          width: 100%;
          padding: 1rem 1rem 1rem 3rem;
          background: rgba(15, 23, 42, 0.82);
          border: 1px solid rgba(148, 163, 184, 0.18);
          border-radius: 18px;
          color: #e2e8f0;
          font-size: 1rem;
          transition: border-color 160ms ease, box-shadow 160ms ease, transform 160ms ease;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
        }

        body.light-mode .modern-input {
          background: rgba(255, 255, 255, 0.92);
          color: #0f172a;
        }

        .modern-input::placeholder {
          color: rgba(148, 163, 184, 0.72);
        }

        .modern-input:focus {
          outline: none;
          border-color: rgba(14, 165, 233, 0.6);
          box-shadow: 0 0 0 4px rgba(14, 165, 233, 0.2);
        }

        .modern-input:focus + .input-icon {
          color: #0ea5e9;
        }

        .pw-toggle {
          position: absolute;
          right: 0.85rem;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(148, 163, 184, 0.18);
          color: #94a3b8;
          cursor: pointer;
          padding: 0.5rem;
          border-radius: 999px;
          transition: transform 160ms ease, background 160ms ease, color 160ms ease;
        }

        .pw-toggle:hover {
          color: #e2e8f0;
          background: rgba(14, 165, 233, 0.12);
          transform: translateY(-1px);
        }

        .error-alert {
          padding: 0.85rem 1rem;
          border-radius: 14px;
          border: 1px solid rgba(244, 63, 94, 0.24);
          background: rgba(244, 63, 94, 0.08);
          color: #fecdd3;
          text-align: center;
          font-size: 0.9rem;
          line-height: 1.4;
        }

        body.light-mode .error-alert {
          color: #be123c;
        }

        .modern-submit {
          width: 100%;
          padding: 1rem 1.15rem;
          margin-top: 0.4rem;
          border-radius: 999px;
          border: 0;
          background: linear-gradient(135deg, #0ea5e9 0%, #14b8a6 100%);
          color: #fff;
          box-shadow: 0 20px 42px rgba(14, 165, 233, 0.28);
        }

        .modern-submit:hover {
          filter: saturate(1.05);
        }

        .login-footer {
          margin-top: 2rem;
          text-align: center;
          color: #94a3b8;
          font-size: 0.78rem;
        }

        @keyframes pulse {
          0%,
          100% {
            opacity: 0.8;
            transform: scale(1);
          }

          50% {
            opacity: 1;
            transform: scale(1.04);
          }
        }

        @keyframes sweep {
          0% {
            transform: translateX(-120%);
          }

          100% {
            transform: translateX(120%);
          }
        }

        @media (max-width: 640px) {
          .login-card {
            width: calc(100% - 1rem);
            padding: 1.25rem 1rem;
            border-radius: 22px;
          }

          .login-title {
            font-size: 2.3rem;
          }
        }
      `}</style>
    </div>
  );
};

export default LoginPage;
