import React from 'react';

const DeleteTemplateModal = ({ show, onHide, onDelete, templateName }) => {
  if (!show) return null;

  return (
    <div className="modal show" style={{ display: 'block' }}>
      <div className="modal-content">
        <h3>Видалити шаблон для "{templateName}"?</h3>
        <p>Пiсля видалення цю дію буде неможливо скасувати.</p>
        <button onClick={onDelete} className="btn btn-danger-custom">Видалити</button>
        <button onClick={onHide} className="btn btn-secondary-custom">Вiдмiна</button>
      </div>
    </div>
  );
};

export default DeleteTemplateModal;