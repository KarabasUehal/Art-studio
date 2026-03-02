import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../../utils/api';
import '@styles/Form.css';

const ActivityForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: 0,
    duration: 60,  
    images: { main_image_url: '', photo: [], caption: ''},  
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
    <div className="studio-form-wrapper">
      <div className="studio-card">
        <div className="studio-card-body">

          <h2 className="studio-title">
            {id ? 'Редагувати майстер-клас:' : 'Створити майстер-клас:'}
          </h2>

          <form className="studio-form" onSubmit={handleSubmit}>

            {/* Назва */}
            <div className="studio-form-group">
              <label className="studio-form-label">Назва майстер-класу</label>
              <input
                className="studio-form-input"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            {/* Опис */}
            <div className="studio-form-group">
              <label className="studio-form-label">Опис</label>
              <textarea
                className="studio-form-textarea"
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                required
              />
            </div>

            {/* Ціна + тривалість */}
            <div className="studio-form-row">
              <div className="studio-form-col">
                <label className="studio-form-label">Ціна</label>
                <div className="studio-input-group">
                  <input
                    type="number"
                    className="studio-form-input"
                    value={formData.price}
                    onChange={e => setFormData({ ...formData, price: +e.target.value })}
                  />
                  <span className="studio-input-addon">грн</span>
                </div>
              </div>

              <div className="studio-form-col">
                <label className="studio-form-label">Тривалість</label>
                <div className="studio-input-group">
                  <input
                    type="number"
                    className="studio-form-input"
                    value={formData.duration}
                    onChange={e => setFormData({ ...formData, duration: +e.target.value })}
                  />
                  <span className="studio-input-addon">хв</span>
                </div>
              </div>
            </div>

            {/* Головна картинка */}
            <div className="studio-form-group">
              <label className="studio-form-label">Головна картинка</label>
              <input
                className="studio-form-input"
                value={formData.images.main_image_url}
                onChange={e =>
                  setFormData({
                    ...formData,
                    images: { ...formData.images, main_image_url: e.target.value }
                  })
                }
              />
              <div className="studio-form-hint">
                Якщо залишити порожнім — буде стандартна картинка
              </div>
            </div>

            {/* Підпис */}
            <div className="studio-form-group">
              <label className="studio-form-label">Підпис до картинки</label>
              <textarea
                className="studio-form-textarea"
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
            <div className="studio-form-group">
              <label className="studio-form-label">Фото з майстер-класу</label>

              <div className="studio-photo-add-row">
                <input
                  className="studio-form-input"
                  value={newPhotoUrl}
                  onChange={e => setNewPhotoUrl(e.target.value)}
                  placeholder="https://example.com/photo.jpg"
                />
                <button
                  type="button"
                  className="studio-add-url"
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

              <ul className="studio-photo-list">
                {formData.images.photo.map((img, index) => (
                  <li key={index}>
                    {img}
                    <button
                      type="button"
                      className="studio-url-delete"
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

            {/* Світч */}
            <div className="studio-switch-group">
              <label className="studio-switch">
                <input
                  type="checkbox"
                  checked={formData.is_regular}
                  onChange={e => setFormData({ ...formData, is_regular: e.target.checked })}
                />
                <span className="studio-slider"></span>
                <span className="studio-switch-label">Регулярне заняття</span>
              </label>
            </div>

            <div className="studio-submit-wrapper">
              <button className="studio-form-submit-btn" disabled={loading}>
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