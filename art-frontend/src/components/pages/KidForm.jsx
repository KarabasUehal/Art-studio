import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import '@styles/Develop.css';

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
    <div className="container py-5">
      <div className="card shadow-lg border-0 my-card" style={{ maxWidth: '650px', margin: '0 auto', borderRadius: '20px' }}>
        <div className="card-body p-5">
          <h2 className="text-center mb-5 fw-bold text-primary">
            {id ? 'Редагувати дитину' : 'Додати нову дитину'}
          </h2>

          <form onSubmit={handleSubmit}>

            {/* Имя ребенка */}
            <div className="mb-4">
              <label htmlFor="name" className="form-label fw-bold text-dark">
                Ім'я дитини
              </label>
              <input
                type="text"
                id="name"
                className="form-control form-control-lg"
                placeholder="Наприклад: Марія"
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                required
              />
            </div>

            {/* Возраст ребенка */}
            <div className="mb-4">
              <label htmlFor="age" className="form-label fw-bold text-dark">
                Вік
              </label>
              <input
                type="number"
                id="age"
                className="form-control form-control-lg"
                value={formData.age}
                onChange={e => setFormData({...formData, age: +e.target.value})}
                required
                min="1"
              />
            </div>

            {/* Пол ребенка */}
            <div className="mb-4">
              <label htmlFor="gender" className="form-label fw-bold text-dark">
                Стать
              </label>
              <select
                id="gender"
                className="form-control form-control-lg"
                value={formData.gender}
                onChange={e => setFormData({...formData, gender: e.target.value})}
                required
              >
                <option value="male">Хлопець</option>
                <option value="female">Дівчина</option>
              </select>
            </div>

             {error && <div className="kid-error">{error}</div>}

            <div className="d-grid mt-5">
              <button
                type="submit"
                disabled={loading}
                className="btn btn-success btn-lg fw-bold shadow"
                style={{ borderRadius: '15px', padding: '14px' }}
              >
                {loading ? (
                  <>Зберігаємо...</>
                ) : (
                  <>Зберегти дитину</>
                )}
              </button>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
};

export default KidForm;
