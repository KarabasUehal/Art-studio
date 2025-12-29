import React from 'react';
import '@styles/DeleteModal.css';

const DeleteKidModal = ({ show, onHide, onDelete, kidId, kidName }) => {
  if (!show) return null;

  return (
    <div className="delete-modal-backdrop">
      <div className="delete-modal">
        <div className="delete-modal-header">
          <h5 className="delete-modal-title">
            Видалити данi дитини #{kidId}?
          </h5>
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
          <p>
            Ви впевнені, що хочете видалити данi про "<strong>{kidName}</strong>"?<br />
            Після видалення цю дію буде неможливо скасувати.
          </p>
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
              onDelete(kidId);
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

export default DeleteKidModal;