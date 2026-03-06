import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, ArrowRight, AudioLines, ShieldCheck, Zap, Copy, Check } from 'lucide-react';
import { OfficeSetupWizard } from '../components/OfficeSetupWizard';

export default function Home() {
  const navigate = useNavigate();
  const [showWizard, setShowWizard] = useState(false);
  const [setupComplete, setSetupComplete] = useState(null);
  const [copiedLink, setCopiedLink] = useState(null);

  const handleCreateOffice = () => {
    setShowWizard(true);
  };

  const handleWizardComplete = (data) => {
    setSetupComplete(data);
    setShowWizard(false);
  };

  const copyToClipboard = (text, type) => {
    navigator.clipboard.writeText(text);
    setCopiedLink(type);
    setTimeout(() => setCopiedLink(null), 2000);
  };

  if (setupComplete) {
    return (
      <main style={{
        height: '100vh',
        background: 'linear-gradient(135deg, rgba(255,255,255,1) 0%, rgba(236,253,245,0.5) 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'var(--font-main)'
      }}>
        <div style={{ maxWidth: '600px', width: '90%', background: 'white', borderRadius: '20px', padding: '3rem', boxShadow: '0 20px 40px rgba(0, 0, 0, 0.12)' }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎉</div>
            <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '0.5rem' }}>{setupComplete.officeName}</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>is ready to use!</p>
          </div>

          <div style={{ display: 'grid', gap: '2rem', marginBottom: '2rem' }}>
            <div style={{ background: 'var(--bg-hover)', padding: '1.5rem', borderRadius: '14px' }}>
              <h3 style={{ fontWeight: 700, marginBottom: '0.75rem', fontSize: '0.9rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>👨‍💼 Admin Link</h3>
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <input type="text" value={setupComplete.adminLink} readOnly style={{ flex: 1, padding: '0.75rem', background: 'white', border: '1px solid var(--border)', borderRadius: '10px', fontSize: '0.85rem', fontFamily: 'monospace' }} />
                <button onClick={() => copyToClipboard(setupComplete.adminLink, 'admin')} style={{ padding: '0.75rem 1rem', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {copiedLink === 'admin' ? <Check size={18} /> : <Copy size={18} />}
                </button>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Use this to manage your office settings</p>
            </div>

            <div style={{ background: 'var(--primary-subtle)', padding: '1.5rem', borderRadius: '14px' }}>
              <h3 style={{ fontWeight: 700, marginBottom: '0.75rem', fontSize: '0.9rem', textTransform: 'uppercase', color: 'var(--primary)' }}>👥 Public Link</h3>
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <input type="text" value={setupComplete.publicLink} readOnly style={{ flex: 1, padding: '0.75rem', background: 'white', border: '1px solid var(--primary-light)', borderRadius: '10px', fontSize: '0.85rem', fontFamily: 'monospace' }} />
                <button onClick={() => copyToClipboard(setupComplete.publicLink, 'public')} style={{ padding: '0.75rem 1rem', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {copiedLink === 'public' ? <Check size={18} /> : <Copy size={18} />}
                </button>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Share this with team members to join</p>
            </div>
          </div>

          <button onClick={() => { setSetupComplete(null); navigate(`/room/${setupComplete.officeId}`); }} style={{ width: '100%', padding: '1rem', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 700, fontSize: '1rem', cursor: 'pointer' }}>
            Enter Your Office
          </button>
        </div>
      </main>
    );
  }

  return (
    <main
      role="main"
      style={{
        height: '100vh',
        background: 'linear-gradient(135deg, rgba(255,255,255,1) 0%, rgba(236,253,245,0.5) 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'var(--font-main)'
      }}
    >
      {showWizard && <OfficeSetupWizard onComplete={handleWizardComplete} />}
      <div style={{ maxWidth: '1100px', width: '100%', padding: '2rem', display: 'flex', alignItems: 'center', gap: '5rem' }}>

        {/* Content Side */}
        <section aria-label="Virtual Office introduction" style={{ flex: 1.2 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '99px', background: 'var(--primary-subtle)', color: 'var(--primary)', fontWeight: 700, fontSize: '0.8rem', marginBottom: '2rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            <Zap size={14} fill="var(--primary)" />
            Real-time Audio Workspace
          </div>

          <h1 style={{ fontSize: 'clamp(2rem, 8vw, 4.5rem)', lineHeight: 1.1, marginBottom: '2rem', fontWeight: 800, letterSpacing: '-0.04em' }}>
            The virtual space for <span style={{ color: 'var(--primary)' }}>fast teams.</span>
          </h1>

          <p style={{
            color: 'var(--text-muted)',
            fontSize: 'clamp(1rem, 2.5vw, 1.25rem)',
            lineHeight: '1.6',
            marginBottom: '3rem',
            maxWidth: '520px'
          }}>
            Talk to teammates like they're right next to you. No meetings, no friction—just click and speak.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <button className="btn btn-primary" onClick={handleCreateOffice} style={{ width: 'fit-content', padding: '1.25rem 2.5rem', fontSize: '1.1rem', borderRadius: '20px' }}>
              <Sparkles size={20} />
              <span>Create Workspace</span>
              <ArrowRight size={20} />
            </button>

            <ul style={{ display: 'flex', gap: '2.5rem', marginTop: '1rem', flexWrap: 'wrap', listStyle: 'none', padding: 0, margin: 0 }}>
              <li style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 500 }}>
                <div aria-label="Secure" style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--shadow-sm)' }}>
                  <ShieldCheck size={18} color="var(--primary)" />
                </div>
                Private & Secure
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 500 }}>
                <div aria-label="No setup required" style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--shadow-sm)' }}>
                  <Zap size={18} color="var(--primary)" />
                </div>
                Zero Setup
              </li>
            </ul>
          </div>
        </section>

        {/* Visual Side (Preview of Draggable Cards) */}
        <div className="home-visual" style={{ flex: 1, position: 'relative', height: '500px' }}>
          <div className="glass" style={{ position: 'absolute', top: '10%', right: '0', width: '260px', padding: '1.5rem', borderRadius: '24px', transform: 'rotate(2deg)', zIndex: 2 }}>
            <div style={{ width: '50px', height: '50px', borderRadius: '14px', background: 'var(--primary-subtle)', marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Zap size={24} color="var(--primary)" />
            </div>
            <div style={{ height: '12px', width: '60%', background: '#f1f5f9', borderRadius: '6px', marginBottom: '8px' }} />
            <div style={{ height: '8px', width: '40%', background: '#f8fafc', borderRadius: '4px' }} />
          </div>

          <div className="glass" style={{ position: 'absolute', bottom: '15%', left: '0', width: '240px', padding: '1.5rem', borderRadius: '24px', transform: 'rotate(-3deg)', border: '1px solid var(--primary)', boxShadow: '0 20px 40px rgba(79, 70, 229, 0.1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1rem' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Sparkles size={20} color="white" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ height: '10px', width: '80%', background: '#e2e8f0', borderRadius: '5px', marginBottom: '6px' }} />
                <div style={{ height: '6px', width: '50%', background: '#f1f5f9', borderRadius: '3px' }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <div style={{ flex: 1, height: '32px', background: 'var(--primary-subtle)', borderRadius: '8px' }} />
              <div style={{ width: '32px', height: '32px', background: '#f1f5f9', borderRadius: '8px' }} />
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .home-visual { display: block; }
        @media (max-width: 1024px) {
          .home-visual { display: none; }
          div[style*="max-width: 1100px"] {
                        flex-direction: column;
                        text-align: center;
                        gap: 3rem;
                    }
                    section[aria-label="Virtual Office introduction"] {
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                    }
                    h1 { font-size: 3rem !important; }
                }
            `}</style>
    </main>
  );
}
