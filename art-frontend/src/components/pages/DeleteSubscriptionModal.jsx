import React from 'react';
import '@styles/DeleteModal.css';  

const DeleteSubscriptionModal = ({ show,
  onHide,
  onDelete,
  subIds = [],
  subInfo,
  bulk
}) => {
  if (!show) return null;

  return (
    <div className="delete-modal-backdrop">
      <div className="delete-modal">

        <div className="delete-modal-header">
          <h5 className="delete-modal-title">
            {bulk
              ? `Видалити ${subIds.length} абонементiв?`
              : `Видалити абонемент #${subIds[0]}?`}
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
          {bulk ? (
            <p>
              Ви впевнені, що хочете видалити
              <strong> усi обранi абонементи</strong>?
            </p>
          ) : (
            <p>
              Ви впевнені, що хочете видалити абонемент
              <strong> "{subInfo.subName}"</strong> для
              <strong> "{subInfo.kidName}"</strong>?
            </p>
          )}
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
              onDelete();
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

export default DeleteSubscriptionModal;