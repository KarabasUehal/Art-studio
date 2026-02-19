import React from 'react';
import '@styles/Modal.css';  

const DeleteSubTypeModal = ({ show, onHide, onDelete, subTypeId, subTypeName }) => {
  if (!show) return null;

  return (
    <div className="studio-modal-backdrop">
      <div className="studio-modal">
          <div className="delete-modal-header">
            <h5 className="studio-modal-title">Видалити слот #{subTypeId}?</h5>
            <button type="button" className="btn-close btn-close-white" onClick={onHide}></button>
          </div>
          <div className="studio-modal-body">
            <p>Ви впевнені, що хочете видалити <strong>"{subTypeName}"</strong>? Після видалення цю дію буде неможливо скасувати.</p>
          </div>
          <div className="studio-modal-footer">
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