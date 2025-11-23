import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Schedule.css'; 

const SuccessModal = ({ show, onHide }) => {
  const navigate = useNavigate();

  if (!show) return null;

  return (
    <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex="-1">
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header bg-success text-white">
            <h5 className="modal-title">Успіх! Запис створено</h5>
            <button type="button" className="btn-close btn-close-white" onClick={onHide}></button>
          </div>
          <div className="modal-body text-center">
            <p className="mb-0">Побачимося на майстер-класі! 🎉</p>
          </div>
          <div className="modal-footer">
           <button type="button" className="btn btn-success-custom btn-lg" onClick={() => { onHide(); navigate('/client/records'); }}>  {/* Добавлено: btn-lg */}
              Перейти до записів
           </button>
           </div>
        </div>
      </div>
    </div>
  );
};

export default SuccessModal;