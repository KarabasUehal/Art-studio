import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import '@styles//SubscriptionForm.css';

const SubscriptionForm = () => {
  const navigate = useNavigate();

  const [users, setUsers] = useState([]);
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({
    user_id: '',
    subscription_type_id: '',  // ← строка!
    sub_kids: [''],
    price_paid: '',
    start_date: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    fetchData();
  }, []);

 const fetchData = async () => {
  try {
    const [usersRes, typesRes] = await Promise.all([
      api.get('/admin/users'),
      api.get('/subscriptions/types'),
    ]);

    const usersArray = usersRes.data.users || usersRes.data.data || usersRes.data || [];

    const rawTypes = typesRes.data.subscription_types || typesRes.data.data || typesRes.data || [];
    const typesArray = rawTypes.map(type => ({
      ...type,
      id: type.ID !== undefined ? type.ID : type.id, 
    }));

    console.log('Загруженные типы:', typesArray);

    setUsers(Array.isArray(usersArray) ? usersArray : []);
    setTypes(typesArray);
  } catch (err) {
    console.error('Ошибка:', err);
    alert('Не вдалося завантажити дані');
    setUsers([]);
    setTypes([]);
  } finally {
    setLoading(false);
  }
};

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (
      !form.user_id ||
      !form.subscription_type_id ||
      !form.kid_name.trim() ||
      !form.kid_age ||
      !form.price_paid ||
      !form.start_date
    ) {
      alert('Заповніть усі поля!');
      return;
    }

    const payload = {
      user_id: Number(form.user_id) || 0,
      subscription_type_id: Number(form.subscription_type_id) || 0, 
      sub_kids: [
    {
      name: form.kid_name.trim(),
      age: Number(form.kid_age),
      gender: form.kid_gender,
    }
  ],
      price_paid: Number(form.price_paid),
      start_date: `${form.start_date}T00:00:00Z`,
    };

    if (payload.subscription_type_id === 0) {
    alert('Оберіть тип абонемента!');
    return;
    }

    try {
      await api.post('/subscriptions', payload);
      alert('Абонемент видано!');
      navigate('/admin/subscriptions');
    } catch (err) {
      console.error(err);
      alert('Помилка видачі абонемента: ' + (err.response?.data?.error || ''));
    }
  };

  if (loading) return <div className="text-center py-5 text-white">Завантаження...</div>;

  return (
    <div className="subscription-form-page">
      <div className="subscription-form-container">
        <h1 className="subscription-form-title">
          Видача нового абонемента
        </h1>

        <form onSubmit={handleSubmit} className="subscription-form">

          {/* Користувач */}
          <div className="form-group">
            <label className="form-label">Батько / Користувач</label>
            <select
              value={form.user_id}
              onChange={(e) => setForm({ ...form, user_id: e.target.value })}
              required
              className="form-input"
            >
              <option value="">Оберіть користувача</option>
              {Array.isArray(users) && users.map(user => (
                <option key={user.id} value={user.id}>
                  {user.name} ({user.phone_number || 'без телефону'})
                </option>
              ))}
            </select>
          </div>

          {/* Тип абонемента */}
          <div className="form-group">
            <label className="form-label">Тип абонемента</label>
              <select
                value={form.subscription_type_id}
                onChange={(e) => {
                  const value = e.target.value;
                  console.log('Выбран тип ID:', value);
                  setForm({ ...form, subscription_type_id: value });
                }}
                required
                className="form-input"
              >
                <option value="">Оберіть тип</option>
                {Array.isArray(types) && types.map(type => (
                  <option key={type.id} value={type.id}>
                    {type.name} — {type.price} грн ({type.visits_count} занять, {type.duration_days} днів)
                  </option>
                ))}
              </select>
            </div>

          {/* Дитина */}
          <div className="form-group">
            <label className="form-label">Ім'я дитини</label>
            <input
              type="text"
              value={form.kid_name}
              onChange={(e) => setForm({ ...form, kid_name: e.target.value })}
              required
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Вік</label>
            <input
              type="number"
              min="3"
              max="18"
              value={form.kid_age}
              onChange={(e) => setForm({ ...form, kid_age: e.target.value })}
              required
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Стать</label>
            <select
              value={form.kid_gender}
              onChange={(e) => setForm({ ...form, kid_gender: e.target.value })}
              className="form-input"
            >
              <option value="male">Хлопчик</option>
              <option value="female">Дівчинка</option>
            </select>
          </div>

          {/* Ціна та дата */}
          <div className="form-group">
            <label className="form-label">Оплачено (грн)</label>
            <input
              type="number"
              value={form.price_paid}
              onChange={(e) => setForm({ ...form, price_paid: e.target.value })}
              required
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Дата початку</label>
            <input
              type="date"
              value={form.start_date}
              onChange={(e) => setForm({ ...form, start_date: e.target.value })}
              required
              className="form-input"
            />
          </div>

          <div className="form-actions">
            <button type="button" onClick={() => navigate(-1)} className="btn-cancel">
              Скасувати
            </button>
            <button type="submit" className="btn-save">
              Видати абонемент
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SubscriptionForm;