// frontend/src/components/Toast.jsx
import React, { useEffect, useState } from 'react';

const Toast = ({ message, type = 'success', onClose }) => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onClose, 300);
    }, 2500);
    return () => clearTimeout(timer);
  }, [onClose]);

  if (!visible) return null;

  const bgColor = type === 'success' ? '#22c55e' : '#ef4444';
  const icon = type === 'success' ? '✅' : '❌';

  return (
    <div style={{
      position: 'fixed',
      top: '20px',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 9999,
      backgroundColor: bgColor,
      color: '#ffffff',
      padding: '16px 24px',
      borderRadius: '12px',
      boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
      fontFamily: 'Inter, sans-serif',
      fontSize: '16px',
      fontWeight: '500',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      opacity: 1,
      transition: 'opacity 0.3s ease',
      maxWidth: '90%',
      textAlign: 'center'
    }}>
      <span style={{ fontSize: '24px' }}>{icon}</span>
      <span>{message}</span>
    </div>
  );
};

export default Toast;