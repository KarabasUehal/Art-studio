import React from 'react';
import '@styles/DeleteModal.css';

const DeleteActivityModal = ({ show, onHide, onDelete, activityId, activityName }) => {
  if (!show) return null;

  return (
    <div className="delete-modal-backdrop">
      <div className="delete-modal">
        <div className="delete-modal-header">
          <h5 className="delete-modal-title">
            Видалити напрям #{activityId}?
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
            Ви впевнені, що хочете видалити "<strong>{activityName}</strong>"?<br />
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
              onDelete(activityId);
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

export default DeleteActivityModal;