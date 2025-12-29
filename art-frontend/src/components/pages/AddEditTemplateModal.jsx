import React, { useState, useEffect } from 'react';
import '@styles/TemplateModal.css'; 

const AddEditTemplateModal = ({ show, onHide, onSave, template, activities }) => {
  const [formData, setFormData] = useState(
    template || { activity_id: 0, day_of_week: 1, start_time: '10:00', capacity: 10 }
  );

  useEffect(() => {
    if (template) {
      const st = template.start_time ? template.start_time : '10:00';
      const hhmm = st.length >= 5 && st[2] === ':' ? st.slice(0,5) : (st.slice(11,16) || '10:00');
      setFormData({
        activity_id: template.activity_id || 0,
        day_of_week: template.day_of_week || 1,
        start_time: hhmm,
        capacity: template.capacity || 10,
      });
    } else {
      setFormData({ activity_id: 0, day_of_week: 1, start_time: '10:00', capacity: 10 });
    }
  }, [template]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: ['activity_id', 'day_of_week', 'capacity'].includes(name) ? Number(value) : value,
    });
  };

  const handleSubmit = () => {
    if (!formData.activity_id) {
      alert('Виберіть напрямок');
      return;
    }
    onSave(formData);
  };

  if (!show) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-container">
        <h3 className="modal-title">{template ? 'Редагувати шаблон' : 'Додати шаблон'}</h3>
        
        <label className="modal-label">Напрям:</label>
        <select
          name="activity_id"
          value={formData.activity_id}
          onChange={handleChange}
          className="modal-input"
        >
          <option value={0}>Оберіть...</option>
          {activities.map((act) => (
            <option key={act.id} value={act.id}>{act.name}</option>
          ))}
        </select>

        <label className="modal-label">День тижня:</label>
          <select
          name="day_of_week"
          value={formData.day_of_week}
            onChange={handleChange}
            className="modal-input"
          >
            <option value={1}>Понеділок</option>
            <option value={2}>Вівторок</option>
            <option value={3}>Середа</option>
            <option value={4}>Четвер</option>
            <option value={5}>П'ятниця</option>
          </select>

        <label className="modal-label">Час початку (HH:MM):</label>
        <input
          type="time"
          name="start_time"
          value={formData.start_time}
          onChange={handleChange}
          className="modal-input"
        />

        <label className="modal-label">Місткість:</label>
        <input
          type="number"
          name="capacity"
          min="1"
          value={formData.capacity}
          onChange={handleChange}
          className="modal-input"
        />

        <div className="modal-buttons">
          <button onClick={onHide} className="btn btn-cancel-modal">Скасування</button>
          <button onClick={handleSubmit} className="btn btn-success-modal">Зберегти</button>
        </div>
      </div>
    </div>
  );
};

export default AddEditTemplateModal;