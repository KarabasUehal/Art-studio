import React from 'react';
import { useNavigate } from 'react-router-dom';
import '@styles/SuccessModal.css';

const SuccessScheduleModal = ({ show, onHide }) => {
  const navigate = useNavigate();

  if (!show) return null;

  return (
    <div className="success-modal-overlay">
      <div className="success-modal-container">

        <div className="success-modal-header">
            <h5 className="success-modal-title">Розклад продовжено!</h5>
            <button type="button" className="btn-close btn-close-white" onClick={onHide}></button>
        </div>

        <div className="success-modal-footer">
          <button
            type="button"
            className="btn btn-success-modal"
            onClick={() => {
              onHide();
              navigate('/schedule');
            }}
          >
            Перейти до графіку
          </button>
        </div>

      </div>
    </div>
  );
};

export default SuccessScheduleModal;