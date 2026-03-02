import React from 'react';
import '@styles/SuccessModal.css';

const InfoModal = ({ show, onHide, onSuccess, modalInfo }) => {
    if (!show) return null;

    return (
<div className="studio-modal-backdrop">
      <div className="studio-modal">
        <div className="info-modal-header">
          <button
            type="button"
            className="studio-modal-close"
            onClick={onHide}
            aria-label="Закрити"
          >
            ×
          </button>
        </div>

        <div className="studio-modal-body">
          <p>
            <strong>{modalInfo}</strong><br />
          </p>
            <button
            type="button"
            className="modal-btn-success"
            onClick={() => {
              onSuccess();
            }}
          >
            Добре
          </button>
        </div>

      </div>
    </div>
  );
};

export default InfoModal;