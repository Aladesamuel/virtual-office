import React, { useState } from 'react';
import { Check } from 'lucide-react';

const AVATARS = ['🎯', '🚀', '⚡', '🎨', '🔥', '💡', '🌟', '🎭', '🏆', '🎪', '🎸', '🎬'];

export function PublicJoinFlow({ onJoin, officePassword, officeRules }) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(AVATARS[0]);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const handleNext = () => {
    if (step === 1) {
      if (!name.trim()) {
        alert('Please enter your name');
        return;
      }
      if (!email.trim() || !email.includes('@')) {
        alert('Please enter a valid email');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (officePassword && password !== officePassword) {
        setPasswordError('Incorrect password');
        return;
      }
      setStep(3);
    } else if (step === 3) {
      onJoin({ name, email, avatar: selectedAvatar });
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'linear-gradient(135deg, rgba(255,255,255,1) 0%, rgba(236,253,245,0.5) 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 100
    }}>
      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: '2.5rem',
        maxWidth: '500px',
        width: '90%',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.12)'
      }}>
        {step === 1 && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <div style={{
                width: '60px',
                height: '60px',
                background: 'var(--primary-subtle)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1rem',
                fontSize: '2rem'
              }}>
                🏢
              </div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>Join the Office</h2>
              <p style={{ color: 'var(--text-muted)' }}>Tell us about yourself</p>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem' }}>Your Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid var(--border)',
                  borderRadius: '10px',
                  fontSize: '1rem',
                  fontFamily: 'inherit'
                }}
              />
            </div>

            <div style={{ marginBottom: '2rem' }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem' }}>Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="john@example.com"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid var(--border)',
                  borderRadius: '10px',
                  fontSize: '1rem',
                  fontFamily: 'inherit'
                }}
              />
            </div>
          </div>
        )}

        {step === 2 && officePassword && (
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '2rem' }}>Enter Office Password</h2>

            <div style={{ marginBottom: '2rem' }}>
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setPasswordError('');
                }}
                placeholder="Office password"
                autoFocus
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: `1px solid ${passwordError ? 'var(--danger)' : 'var(--border)'}`,
                  borderRadius: '10px',
                  fontSize: '1rem',
                  fontFamily: 'inherit'
                }}
              />
              {passwordError && (
                <p style={{ color: 'var(--danger)', fontSize: '0.85rem', marginTop: '0.5rem' }}>{passwordError}</p>
              )}
            </div>
          </div>
        )}

        {step === 2 && !officePassword && (
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '2rem' }}>Welcome!</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>You're ready to join the office.</p>
          </div>
        )}

        {step === 3 && (
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem' }}>Choose Your Avatar</h2>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '1rem',
              marginBottom: '2rem'
            }}>
              {AVATARS.map(avatar => (
                <button
                  key={avatar}
                  onClick={() => setSelectedAvatar(avatar)}
                  style={{
                    fontSize: '2rem',
                    padding: '1rem',
                    border: `2px solid ${selectedAvatar === avatar ? 'var(--primary)' : 'var(--border)'}`,
                    background: selectedAvatar === avatar ? 'var(--primary-subtle)' : 'white',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  {avatar}
                </button>
              ))}
            </div>

            {officeRules && (
              <div style={{
                background: 'var(--bg-hover)',
                padding: '1rem',
                borderRadius: '10px',
                marginBottom: '2rem'
              }}>
                <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.5rem' }}>Office Rules</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', whiteSpace: 'pre-wrap' }}>
                  {officeRules}
                </p>
              </div>
            )}
          </div>
        )}

        <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
          {step > 1 && (
            <button
              onClick={() => setStep(step - 1)}
              style={{
                flex: 1,
                padding: '0.75rem',
                border: '1px solid var(--border)',
                background: 'white',
                borderRadius: '10px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Back
            </button>
          )}
          <button
            onClick={handleNext}
            style={{
              flex: 1,
              padding: '0.75rem',
              background: 'var(--primary)',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem'
            }}
          >
            {step === 3 ? 'Join Office' : 'Next'} <Check size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
