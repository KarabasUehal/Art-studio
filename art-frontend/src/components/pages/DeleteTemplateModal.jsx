import React from 'react';
import '@styles/DeleteModal.css';

const DeleteTemplateModal = ({ show, onHide, onDelete, templateId, templateInfo }) => {
  if (!show) return null;

  return (
    <div className="delete-modal-backdrop">
      <div className="delete-modal">
        <div className="delete-modal-header">
          <h5 className="delete-modal-title">Видалити шаблон #{templateId}?</h5>
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
            Ви впевнені, що хочете видалити "<strong>{templateInfo.activityName}</strong>"?<br />
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
              onDelete(templateId);
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

export default DeleteTemplateModal;