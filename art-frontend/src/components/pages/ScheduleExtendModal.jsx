import React from 'react';
import '@styles/Modal.css';

const ScheduleExtendModal = ({ show, onHide, onExtend}) => {
    if (!show) return null;

    return (
<div className="studio-modal-backdrop">
      <div className="studio-modal">
        <div className="extend-modal-header">
          <h5 className="studio-modal-title">
            Шаблон рокладу студії
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
            <strong>Продовжити розклад на тиждень?</strong>
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
              onExtend();
            }}
          >
            Продовжити
          </button>
        </div>
      </div>
    </div>
  );
};

export default ScheduleExtendModal;