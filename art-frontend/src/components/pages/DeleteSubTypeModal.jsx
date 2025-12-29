import React from 'react';
import '@styles/DeleteModal.css';  

const DeleteSubTypeModal = ({ show, onHide, onDelete, subTypeId, subTypeName }) => {
  if (!show) return null;

  return (
    <div className="delete-modal-backdrop">
      <div className="delete-modal">
          <div className="delete-modal-header">
            <h5 className="delete-modal-title">Видалити слот #{subTypeId}?</h5>
            <button type="button" className="btn-close btn-close-white" onClick={onHide}></button>
          </div>
          <div className="delete-modal-body">
            <p>Ви впевнені, що хочете видалити <strong>"{subTypeName}"</strong>? Після видалення цю дію буде неможливо скасувати.</p>
          </div>
          <div className="delete-modal-footer">
            <button type="button" className="btn-modal-cancel" onClick={onHide}>
              Скасувати
            </button>
            <button type="button" className="btn-modal-delete" onClick={() => { onDelete(subTypeId); onHide(); }}>
              Видалити
            </button>
          </div>
        </div>
    </div>
  );
};

export default DeleteSubTypeModal;