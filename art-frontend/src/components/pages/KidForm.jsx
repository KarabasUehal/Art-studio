import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import '@styles/KidForm.css';

const KidForm = () => {
  const { id } = useParams();  // Для редактирования ребенка, если ID присутствует
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    name: '',
    age: 0,
    gender: 'male', 
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Если ID есть, то загружаем данные для редактирования
  useEffect(() => {
    if (id) {
      api.get(`/client/kids/${id}`).then(res => {
          setFormData({
            name: res.data.name || '',
            age: res.data.age || 0,
            gender: res.data.gender || 'male',
          });
        })
        .catch(err => {
          alert('Не вдалося завантажити дані дитини');
          console.error(err);
        });
    }
  }, [id]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name)
    return setError(`Введіть ім'я для дитини`);
    if (formData.age < 3 || formData.age > 17)
    return setError(`Вік дитини має бути від 3 до 17 років`);
    if (!formData.gender)
    return setError(`Оберіть стать для дитини`);

    setLoading(true);

    const payload = {
      name: formData.name,
      age: formData.age,
      gender: formData.gender,
    };

    try {
      if (id) {
        await api.put(`/client/kids/${id}`, payload);  // Редактируем ребенка по ID
      } else {
        await api.post('/client/kids', payload);  // Добавляем нового ребенка
      }
      navigate('/client/kids');  // После сохранения перенаправляем на список детей
    } catch (err) {
      alert('Ошибка при сохранении данных');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
  <div className="kid-form-page">
    <div className="kid-form-container">
      <h2 className="kid-form-title">
        {id ? 'Редагувати дитину' : 'Додати нову дитину'}
      </h2>

      <form className="kid-form" onSubmit={handleSubmit}>

        {/* Ім'я дитини */}
        <div className="form-group">
          <label htmlFor="name" className="form-label">
            Ім'я дитини
          </label>
          <input
            type="text"
            id="name"
            className="form-input"
            placeholder="Наприклад: Марія"
            value={formData.name}
            onChange={(e) =>
              setFormData({ ...formData, name: e.target.value })
            }
            required
          />
        </div>

        {/* Вік */}
        <div className="form-group">
          <label htmlFor="age" className="form-label">
            Вік
          </label>
          <input
            type="number"
            id="age"
            className="form-age-input"
            value={formData.age}
            onChange={(e) =>
              setFormData({ ...formData, age: +e.target.value })
            }
            min="1"
            required
          />
        </div>

        {/* Стать */}
        <div className="form-group">
          <label htmlFor="gender" className="form-label">
            Стать
          </label>
          <select
            id="gender"
            className="form-input"
            value={formData.gender}
            onChange={(e) =>
              setFormData({ ...formData, gender: e.target.value })
            }
            required
          >
            <option value="">Оберіть стать</option>
            <option value="male">Хлопець</option>
            <option value="female">Дівчина</option>
          </select>
        </div>

        {error && <div className="kid-error">{error}</div>}

        <div className="form-actions">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="btn-cancel"
          >
            Скасувати
          </button>

          <button
            type="submit"
            disabled={loading}
            className="btn-save"
          >
            {loading ? 'Збереження...' : 'Зберегти'}
          </button>
        </div>

      </form>
    </div>
  </div>
 );
};

export default KidForm;
