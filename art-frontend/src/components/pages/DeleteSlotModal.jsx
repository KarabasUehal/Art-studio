import React from 'react';
import '@styles/DeleteModal.css';  

const DeleteSlotModal = ({ show, onHide, onDelete, slotId, slotInfo }) => {
  if (!show) return null;

  return (
    <div className="delete-modal-backdrop">
      <div className="delete-modal">
          <div className="delete-modal-header">
            <h5 className="delete-modal-title">Видалити слот #{slotId}?</h5>
            <button type="button" className="btn-close btn-close-white" onClick={onHide}></button>
          </div>
          <div className="delete-modal-body">
            <p>Ви впевнені, що хочете видалити слот для <strong>"{slotInfo.activityName}" ({slotInfo.time})"</strong>? Після видалення цю дію буде неможливо скасувати.</p>
          </div>
          <div className="delete-modal-footer">
            <button type="button" className="btn-modal-cancel" onClick={onHide}>
              Вiдмiна
            </button>
            <button type="button" className="btn-modal-delete" onClick={() => { onDelete(slotId); onHide(); }}>
              Видалити
            </button>
          </div>
        </div>
    </div>
  );
};

export default DeleteSlotModal;