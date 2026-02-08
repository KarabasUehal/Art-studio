import React from 'react';
import '@styles/DeleteModal.css';

const DeleteRecordModal = ({ show, onHide, onDelete, recordId, recordName }) => {
  if (!show) return null;

  return (
    <div className="delete-modal-backdrop">
      <div className="delete-modal">
        <div className="delete-modal-header">
            <h5 className="delete-modal-title">Видалити запис #{recordId}?</h5>
            <button
            type="button"
            className="delete-modal-close"
            onClick={onHide}
            aria-label="Закрити"
          >
            ×
          </button>
          </div>
          <div className="delete-modal-body">
            <p>Ви впевнені, що хочете видалити запис на <strong>"{recordName}"</strong>?<br />
             Ця дія також поверне відвідування за підпискою, витрачені на нього.</p>
          </div>
          <div className="delete-modal-footer">
          <button
            type="button"
            className="btn-modal-cancel"
            onClick={onHide}
          >
            Вiдмiна
          </button>
          <button
            type="button"
            className="btn-modal-delete"
            onClick={() => {
              onDelete(recordId);
              onHide();
            }}
          >
            Видалити
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteRecordModal;