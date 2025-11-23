import React from 'react';
import './Schedule.css';  

const DeleteActivityModal = ({ show, onHide, onDelete, activityId, activityName }) => {
  if (!show) return null;

  return (
    <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex="-1">
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Видалити активність #{activityId}?</h5>
            <button type="button" className="btn-close btn-close-white" onClick={onHide}></button>
          </div>
          <div className="modal-body">
            <p>Ви впевнені, що хочете видалити "{activityName}"? Після видалення цю дію буде неможливо скасувати.</p>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary-custom btn-lg" onClick={onHide}>
              Скасувати
            </button>
            <button type="button" className="btn btn-danger-custom btn-lg" onClick={() => { onDelete(activityId); onHide(); }}>
              Видалити
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeleteActivityModal;