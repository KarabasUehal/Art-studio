import '@styles/SuccessModal.css'; 
import React from 'react';

const SuccessExtendSubModal = ({
  show,
  onHide,
  onExtend,
  subscriptionIds = [],
  subInfo,
  bulk
}) => {
  if (!show) return null;

  return (
    <div className="delete-modal-backdrop">
      <div className="delete-modal">

        <div className="extend-modal-header">
          <h5 className="delete-modal-title">
            {bulk
              ? `Продовжити ${subscriptionIds.length} абонементiв?`
              : `Продовжити абонемент #${subscriptionIds[0]}?`}
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
              Ви впевнені, що хочете продовжити
              <strong> усi обранi абонементи</strong>?
            </p>
          ) : (
            <p>
              Ви впевнені, що хочете продовжити абонемент
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
            className="btn-modal-extend"
            onClick={() => {
              onExtend(subscriptionIds);
              onHide();
            }}
          >
            Продовжити
          </button>
        </div>

      </div>
    </div>
  );
};

export default SuccessExtendSubModal;