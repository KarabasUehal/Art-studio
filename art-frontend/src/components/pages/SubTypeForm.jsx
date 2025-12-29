import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import '@styles//SubTypeForm.css'; 

const SubTypeForm = ({ mode = "add" }) => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: '',
    activity_id: '',
    price: '',
    visits_count: '',
    duration_days: '',
    is_active: true
  });

  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActivities();
    if (mode === 'edit' && id) {
      fetchType();
    } else {
      setLoading(false);
    }
  }, [mode, id]);

  const fetchActivities = async () => {
    try {
      const res = await api.get('/activities');
      setActivities(res.data.activity || res.data);
    } catch (err) {
      alert('Не вдалося завантажити напрямки');
    }
  };

  const fetchType = async () => {
    try {
      const res = await api.get(`/subscriptions/types/${id}`);
      setForm({
        name: res.data.name,
        activity_id: res.data.activity_id,
        price: res.data.price,
        visits_count: res.data.visits_count,
        duration_days: res.data.duration_days,
        is_active: res.data.is_active
      });
    } catch (err) {
      alert('Не вдалося завантажити тип абонемента');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
  e.preventDefault();

  const payload = {
    name: form.name.trim(),
    activity_id: Number(form.activity_id),        
    price: Number(form.price),                   
    visits_count: Number(form.visits_count),      
    duration_days: Number(form.duration_days),    
    is_active: form.is_active,
  };

  // Валидация на фронте
  if (!payload.name) return alert('Введіть назву');
  if (payload.activity_id === 0) return alert('Оберіть напрямок');
  if (payload.price <= 0) return alert('Введіть ціну');
  if (payload.visits_count <= 0) return alert('Введіть кількість занять');
  if (payload.duration_days <= 0) return alert('Введіть термін дії');

  try {
    if (mode === 'edit') {
      await api.put(`/subscriptions/types/${id}`, payload);
    } else {
      await api.post('/subscriptions/types', payload);
    }
    navigate('/subscriptions/types', { state: { refresh: true } });
  } catch (err) {
    console.error('Ошибка:', err.response?.data || err);
    alert('Помилка збереження: ' + (err.response?.data?.error || 'Спробуйте ще раз'));
  }
};

  if (loading) return <div className="text-center py-5 text-white">Завантаження...</div>;

  return (
    <div className="subtype-form-page">
      <div className="subtype-form-container">
        <h1 className="subtype-form-title">
          {mode === 'edit' ? 'Редагувати тип абонемента' : 'Новий тип абонемента'}
        </h1>

        <form onSubmit={handleSubmit} className="subtype-form">
          <div className="form-group">
            <label className="form-label">Назва</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Напрямок</label>
            <select
              value={form.activity_id}
              onChange={(e) => setForm({ ...form, activity_id: e.target.value })}
              required
              className="form-input"
            >
              <option value="">Оберіть напрямок</option>
              {activities.map(act => (
                <option key={act.id} value={act.id}>{act.name}</option>
              ))}
            </select>
          </div>

          
            <div className="form-group">
              <label className="form-label">Ціна (грн)</label>
              <input
                type="number"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                required
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Кількість занять</label>
              <input
                type="number"
                value={form.visits_count}
                onChange={(e) => setForm({ ...form, visits_count: e.target.value })}
                required
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Термін дії (днів)</label>
              <input
                type="number"
                value={form.duration_days}
                onChange={(e) => setForm({ ...form, duration_days: e.target.value })}
                required
                className="form-input"
              />
            </div>
          

          <div className="switch-group">
              <label className="switch">
                <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
              />
              <span className="slider"></span>
              <span className="switch-label">Активний</span>
            </label>
          </div>

          <div className="form-actions">
            <button type="button" onClick={() => navigate(-1)} className="btn-cancel">
              Скасувати
            </button>
            <button type="submit" className="btn-save">
              {mode === 'edit' ? 'Зберегти зміни' : 'Створити тип'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SubTypeForm;