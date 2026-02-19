import React from 'react';
import '@styles/SuccessModal.css';

const SuccessModal = ({ show, onHide, onSuccess, modalTitle, modalElementName, modalQuestion, modalWarning }) => {
    if (!show) return null;

    return (
<div className="studio-modal-backdrop">
      <div className="studio-modal">
        <div className="extend-modal-header">
          <h5 className="studio-modal-title">
            {modalTitle}
          </h5>
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
            {modalQuestion} "<strong>{modalElementName}</strong>"?<br />
            {modalWarning}
          </p>
        </div>

        <div className="studio-modal-footer">
          <button
            type="button"
            className="btn-modal-cancel"
            onClick={onHide}
          >
            Вiдмiна
          </button>
          <button
            type="button"
            className="btn-modal-success"
            onClick={() => {
              onSuccess();
            }}
          >
            Продовжити
          </button>
        </div>
      </div>
    </div>
  );
};

export default SuccessModal;