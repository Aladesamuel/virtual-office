import React, { useState } from 'react';
import { ChevronRight, Lock } from 'lucide-react';

export function OfficeSetupWizard({ onComplete }) {
  const [step, setStep] = useState(1);
  const [officeName, setOfficeName] = useState('');
  const [hasPassword, setHasPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [rules, setRules] = useState('');

  const handleNext = () => {
    if (step < 3) {
      setStep(step + 1);
    } else {
      // Save office setup
      const officeId = `office_${Date.now()}`;
      const adminLink = `${window.location.origin}/#/office/${officeId}/admin`;
      const publicLink = `${window.location.origin}/#/office/${officeId}/join`;

      const officeData = {
        id: officeId,
        name: officeName || 'My Office',
        hasPassword,
        password: hasPassword ? password : null,
        rules: rules || '',
        createdAt: new Date().toISOString()
      };

      localStorage.setItem(`office_${officeId}`, JSON.stringify(officeData));
      
      onComplete({
        officeId,
        adminLink,
        publicLink,
        officeName: officeName || 'My Office'
      });
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 200
    }}>
      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: '2rem',
        maxWidth: '500px',
        width: '90%',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)'
      }}>
        {step === 1 && (
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>Create Your Office</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Step 1 of 3: Basic Setup</p>
            
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem' }}>Office Name</label>
              <input
                type="text"
                value={officeName}
                onChange={(e) => setOfficeName(e.target.value)}
                placeholder="e.g., Acme Corp Engineering"
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

        {step === 2 && (
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>Security</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Step 2 of 3: Password Protection</p>
            
            <label style={{ display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer', marginBottom: '1.5rem' }}>
              <input
                type="checkbox"
                checked={hasPassword}
                onChange={(e) => setHasPassword(e.target.checked)}
                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
              />
              <span style={{ fontWeight: 600 }}>Require password to join</span>
            </label>

            {hasPassword && (
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem' }}>Office Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter a secure password"
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
            )}
          </div>
        )}

        {step === 3 && (
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>Office Rules</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Step 3 of 3: Optional Guidelines</p>
            
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem' }}>Rules & Guidelines (optional)</label>
            <textarea
              value={rules}
              onChange={(e) => setRules(e.target.value)}
              placeholder="e.g., Keep calls professional, mute when not speaking, etc."
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid var(--border)',
                borderRadius: '10px',
                fontSize: '1rem',
                fontFamily: 'inherit',
                minHeight: '100px',
                resize: 'vertical'
              }}
            />
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
            {step === 3 ? 'Create Office' : 'Next'} <ChevronRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
