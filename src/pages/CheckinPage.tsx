import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckinModal } from '../components/patient/CheckinModal';

export const CheckinPage: React.FC = () => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="py-6">
      <CheckinModal
        isOpen={isOpen}
        onClose={() => {
          setIsOpen(false);
          navigate('/home');
        }}
        trigger="manual"
        onCheckinSubmitted={() => {
          // Handled within modal
        }}
      />
    </div>
  );
};
