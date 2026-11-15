import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckinModal } from '../../components/patient/CheckinModal';

export const CheckinPage: React.FC = () => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(true);

  const handleClose = () => {
    setIsOpen(false);
    navigate('/home');
  };

  return (
    <div className="min-h-screen bg-sand/20 dark:bg-ink">
      <CheckinModal isOpen={isOpen} onClose={handleClose} trigger="manual" />
    </div>
  );
};
