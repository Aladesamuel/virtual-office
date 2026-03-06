import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, ArrowRight, AudioLines, ShieldCheck, Zap } from 'lucide-react';

export default function Home() {
  const navigate = useNavigate();

  const generateRoomId = () => {
    const randomBytes = new Uint8Array(6);
    crypto.getRandomValues(randomBytes);
    return Array.from(randomBytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
      .match(/.{1,4}/g)
      ?.join('-') || 'rand-room';
  };

  const handleCreateOffice = () => {
    const roomId = generateRoomId();
    navigate(`/room/${roomId}`);
  };

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
