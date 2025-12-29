import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import '@styles/AddForm.css';

const ActivityForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: 0,
    duration: 60,  
    images: { main_image_url: '', photo: [], caption: ''},
    availability: true,   
    is_regular: false
  });
  const [loading, setLoading] = useState(false);
  const [newPhotoUrl, setNewPhotoUrl] = useState("");

  useEffect(() => {
    if (id) {
      api.get(`/activities/${id}`).then(res => {
        setFormData({
          name: res.data.name || '',
          description: res.data.description || '',
          price: res.data.price || 0,
          duration: res.data.duration || 60,
          images: {
                  main_image_url: res.data.images?.main_image_url || "",
                  caption: res.data.images?.caption || "",
                  photo: Array.isArray(res.data.images?.photo) ? res.data.images.photo : []
                  },
          availability: res.data.availability ?? true,
          is_regular: res.data.is_regular ?? false
        });
      }).catch(err => {
        alert('Не вдалося завантажити активність');
        console.error(err);
      });
    }
  }, [id]);

  const handleSubmit = async (e) => {
  e.preventDefault();
  setLoading(true);

  const payload = {
    name: formData.name,
    description: formData.description,
    price: formData.price,
    duration: formData.duration,
    availability: formData.availability,
    is_regular: formData.is_regular, 
    images: {
    main_image_url: formData.images.main_image_url,
    caption: formData.images.caption,
    photo: formData.images.photo
            }
};

  console.log('Отправляем на бэкенд:', payload); 

  try {
    if (id) {
      await api.put(`/activities/${id}`, payload);
    } else {
      await api.post('/activities', payload);
    }
    navigate('/');
  } catch (err) {
    console.error('Ошибка:', err.response?.data || err);
    alert('Ошибка сохранения!');
  } finally {
    setLoading(false);
  }
};

      return (
    <div className="activity-form-wrapper">
      <div className="activity-card">
        <div className="activity-card-body">

          <h2 className="activity-title">
            {id ? 'Редагувати майстер-клас:' : 'Створити новий майстер-клас:'}
          </h2>

          <form className="activity-form" onSubmit={handleSubmit}>

            {/* Назва */}
            <div className="form-group">
              <label className="form-label">Назва майстер-класу</label>
              <input
                className="form-input"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            {/* Опис */}
            <div className="form-group">
              <label className="form-label">Опис</label>
              <textarea
                className="form-textarea"
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                required
              />
            </div>

            {/* Ціна + тривалість */}
            <div className="form-row">
              <div className="form-col">
                <label className="form-label">Ціна</label>
                <div className="input-group">
                  <input
                    type="number"
                    className="form-input"
                    value={formData.price}
                    onChange={e => setFormData({ ...formData, price: +e.target.value })}
                  />
                  <span className="input-addon">грн</span>
                </div>
              </div>

              <div className="form-col">
                <label className="form-label">Тривалість</label>
                <div className="input-group">
                  <input
                    type="number"
                    className="form-input"
                    value={formData.duration}
                    onChange={e => setFormData({ ...formData, duration: +e.target.value })}
                  />
                  <span className="input-addon">хв</span>
                </div>
              </div>
            </div>

            {/* Головна картинка */}
            <div className="form-group">
              <label className="form-label">Головна картинка</label>
              <input
                className="form-input"
                value={formData.images.main_image_url}
                onChange={e =>
                  setFormData({
                    ...formData,
                    images: { ...formData.images, main_image_url: e.target.value }
                  })
                }
              />
              <div className="form-hint">
                Якщо залишити порожнім — буде стандартна картинка
              </div>
            </div>

            {/* Підпис */}
            <div className="form-group">
              <label className="form-label">Підпис до картинки</label>
              <textarea
                className="form-textarea"
                value={formData.images.caption}
                onChange={e =>
                  setFormData({
                    ...formData,
                    images: { ...formData.images, caption: e.target.value }
                  })
                }
              />
            </div>

            {/* Фото */}
            <div className="form-group">
              <label className="form-label">Фото з майстер-класу</label>

              <div className="photo-add-row">
                <input
                  className="form-input"
                  value={newPhotoUrl}
                  onChange={e => setNewPhotoUrl(e.target.value)}
                  placeholder="https://example.com/photo.jpg"
                />
                <button
                  type="button"
                  className="btn btn-warning"
                  onClick={() => {
                    if (!newPhotoUrl.trim()) return;
                    setFormData({
                      ...formData,
                      images: {
                        ...formData.images,
                        photo: [...formData.images.photo, newPhotoUrl.trim()]
                      }
                    });
                    setNewPhotoUrl('');
                  }}
                >
                  Додати
                </button>
              </div>

              <ul className="photo-list">
                {formData.images.photo.map((img, index) => (
                  <li key={index}>
                    {img}
                    <button
                      type="button"
                      className="btn btn-danger btn-sm"
                      onClick={() =>
                        setFormData({
                          ...formData,
                          images: {
                            ...formData.images,
                            photo: formData.images.photo.filter((_, i) => i !== index)
                          }
                        })
                      }
                    >
                      Видалити
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Світчі */}
            <div className="switch-group">
              <label className="switch">
                <input
                  type="checkbox"
                  checked={formData.availability}
                  onChange={e => setFormData({ ...formData, availability: e.target.checked })}
                />
                <span className="slider"></span>
                <span className="switch-label">Доступний для запису</span>
              </label>
            </div>

            <div className="switch-group">
              <label className="switch">
                <input
                  type="checkbox"
                  checked={formData.is_regular}
                  onChange={e => setFormData({ ...formData, is_regular: e.target.checked })}
                />
                <span className="slider"></span>
                <span className="switch-label">Регулярне заняття</span>
              </label>
            </div>

            <div className="submit-wrapper">
              <button className="btn btn-success submit-btn" disabled={loading}>
                {loading ? 'Зберігаємо...' : 'Зберегти майстер-клас'}
              </button>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
};

export default ActivityForm;