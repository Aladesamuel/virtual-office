import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, ArrowRight, AudioLines, ShieldCheck, Zap, Users } from 'lucide-react';

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

  const handleCreateConference = () => {
    const roomId = generateRoomId();
    navigate(`/room/${roomId}/conference`);
  };

  return (
    <div style={{
      height: '100vh',
      background: 'radial-gradient(circle at 10% 20%, rgba(79, 70, 229, 0.05) 0%, rgba(255,255,255,1) 90%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'var(--font-main)'
    }}>
      <div style={{ maxWidth: '1100px', width: '100%', padding: '2rem', display: 'flex', alignItems: 'center', gap: '5rem' }}>

        {/* Content Side */}
        <div style={{ flex: 1.2 }}>
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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', maxWidth: '600px' }}>
              {/* Office Room Card */}
              <button onClick={handleCreateOffice} style={{ background: 'white', border: '2px solid var(--border)', borderRadius: '20px', padding: '2rem', cursor: 'pointer', transition: 'all 0.3s', textAlign: 'left', outline: 'none' }} onMouseEnter={e => e.target.style.borderColor = 'var(--primary)'} onMouseLeave={e => e.target.style.borderColor = 'var(--border)'}>
                <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--primary-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
                  <AudioLines size={24} color="var(--primary)" />
                </div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.5rem', color: 'var(--text-main)' }}>Virtual Office</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginBottom: '1rem' }}>Quick 1-on-1 conversations with team members</p>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.75rem', background: 'var(--primary-subtle)', color: 'var(--primary)', padding: '4px 12px', borderRadius: '99px', fontWeight: 600 }}>P2P Audio</span>
                  <span style={{ fontSize: '0.75rem', background: 'var(--primary-subtle)', color: 'var(--primary)', padding: '4px 12px', borderRadius: '99px', fontWeight: 600 }}>Instant</span>
                </div>
              </button>

              {/* Conference Room Card */}
              <button onClick={handleCreateConference} style={{ background: 'white', border: '2px solid var(--primary)', borderRadius: '20px', padding: '2rem', cursor: 'pointer', transition: 'all 0.3s', textAlign: 'left', outline: 'none', boxShadow: '0 10px 30px rgba(79, 70, 229, 0.1)' }} onMouseEnter={e => e.target.style.boxShadow = '0 15px 40px rgba(79, 70, 229, 0.2)'} onMouseLeave={e => e.target.style.boxShadow = '0 10px 30px rgba(79, 70, 229, 0.1)'}>
                <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'linear-gradient(135deg, var(--primary), var(--oncall))', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
                  <Users size={24} color="white" />
                </div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.5rem', color: 'var(--text-main)' }}>Conference Room</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginBottom: '1rem' }}>Team meetings with screen sharing capabilities</p>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.75rem', background: 'rgba(79, 70, 229, 0.1)', color: 'var(--primary)', padding: '4px 12px', borderRadius: '99px', fontWeight: 600 }}>Group Call</span>
                  <span style={{ fontSize: '0.75rem', background: 'rgba(79, 70, 229, 0.1)', color: 'var(--primary)', padding: '4px 12px', borderRadius: '99px', fontWeight: 600 }}>Screen Share</span>
                </div>
              </button>
            </div>

            <div style={{ display: 'flex', gap: '2.5rem', marginTop: '1rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 500 }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--shadow-sm)' }}>
                  <ShieldCheck size={18} color="var(--primary)" />
                </div>
                Private & Secure
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 500 }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--shadow-sm)' }}>
                  <Zap size={18} color="var(--primary)" />
                </div>
                Zero Setup
              </div>
            </div>
          </div>
        </div>

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
                    div[style*="flex: 1.2"] {
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                    }
                    h1 { font-size: 3rem !important; }
                }
            `}</style>
    </div>
  );
}
