import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import '@styles//SubscriptionForm.css';

const SubscriptionForm = () => {
  const navigate = useNavigate();

  const [users, setUsers] = useState([]);
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);

  const [error, setError] = useState('');

  const [form, setForm] = useState({
    user_id: '',
    subscription_type_id: '',  // ← строка!
    sub_kids: [
    {
      name: '',
      age: '',
      gender: ''
    }
  ],
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
      !form.sub_kids[0].name.trim() ||
      !form.sub_kids[0].age ||
      !form.sub_kids[0].gender ||
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
      name: form.sub_kids[0].name.trim(),
      age: Number(form.sub_kids[0].age),
      gender: form.sub_kids[0].gender,
    }
  ],
      price_paid: Number(form.price_paid),
      start_date: `${form.start_date}T00:00:00Z`,
    };

    if (payload.subscription_type_id === 0) {
    alert('Оберіть тип абонемента!');
    return;
    }

  if (!payload.sub_kids[0].name) {
    setError('Введіть ім\'я дитини');
    return;
  }
    if (!payload.sub_kids[0].age || payload.sub_kids[0].age < 3 || payload.sub_kids[0].age > 17) {
    setError('Вік дитини має бути від 3 до 17 років');
    return;
  }
    if (!['male', 'female'].includes(payload.sub_kids[0].gender)) {
    setError('Оберіть стать дитини');
    return;
  }

    try {
      await api.post('/subscriptions', payload);
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
              value={form.sub_kids[0].name}
              onKeyDown={(e) => {
              // Разрешаем только буквы, пробел, апостроф, дефис и Backspace/Delete
              const allowed = /[A-Za-zА-Яа-яіїєґІЇЄҐ\s'-]/.test(e.key) ||
                      e.key === 'Backspace' ||
                      e.key === 'Delete' ||
                      e.key === 'ArrowLeft' ||
                      e.key === 'ArrowRight' ||
                      e.key === 'Tab';

                if (!allowed) {
                 e.preventDefault(); // блокируем ввод нежелательного символа
                }
              }}
              onChange={(e) => {
              const newSubKids = [...form.sub_kids];
              newSubKids[0] = { ...newSubKids[0], name: e.target.value };
              setForm({ ...form, sub_kids: newSubKids });
              }}
              pattern="[A-Za-zА-Яа-яіїєґІЇЄҐ\s'-]+"
              title="Ім'я може містити тільки літери, пробіли, апостроф або дефіс"
              required
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Вік</label>
            <input
              type="number"
              min="3"
              max="17"
              value={form.sub_kids[0].age}
              onChange={(e) => {
              const newSubKids = [...form.sub_kids];
              newSubKids[0] = { ...newSubKids[0], age: e.target.value };
              setForm({ ...form, sub_kids: newSubKids });
              }}
              required
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Стать</label>
            <select
              value={form.sub_kids[0].gender}
              onChange={(e) => {
              const newSubKids = [...form.sub_kids];
              newSubKids[0] = { ...newSubKids[0], gender: e.target.value };
              setForm({ ...form, sub_kids: newSubKids });
              }}
              required
              className="form-input"
            >
              <option value="" disabled>Оберіть стать</option>
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

          {error && <div className="record-error">{error}</div>}

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