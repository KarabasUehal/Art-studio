import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import './Activities.css';

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
    <div className="container py-5">
      <div className="card shadow-lg border-0 my-card" style={{ maxWidth: '650px', margin: '0 auto', borderRadius: '20px' }}>
        <div className="card-body p-5">
          <h2 className="text-center mb-5 fw-bold text-primary">
            {id ? 'Редагувати майстер-клас:' : 'Створити новий майстер-клас:'}
          </h2>

          <form onSubmit={handleSubmit}>

            {/* Назва */}
            <div className="mb-4">
              <label htmlFor="name" className="form-label fw-bold text-dark">
                Назва майстер-класу
              </label>
              <input
                type="text"
                id="name"
                className="form-control form-control-lg"
                placeholder="Наприклад: Малювання аквареллю для дітей 5+"
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                required
              />
            </div>

            {/* Опис */}
            <div className="mb-4">
              <label htmlFor="description" className="form-label fw-bold text-light">
                Опис (що будуть робити діти?)
              </label>
              <textarea
                id="description"
                className="form-control"
                rows="5"
                placeholder="Розкажіть, який це майстер-клас!"
                value={formData.description}
                onChange={e => setFormData({...formData, description: e.target.value})}
                required
              />
            </div>

            {/* Ціна та тривалість — в одному рядку */}
            <div className="row mb-4">
              <div className="col-md-6">
                <label htmlFor="price" className="form-label fw-bold text-dark">
                  Ціна за заняття
                </label>
                <div className="input-group">
                  <input
                    type="number"
                    id="price"
                    className="form-control form-control-lg"
                    value={formData.price}
                    onChange={e => setFormData({...formData, price: +e.target.value})}
                    required
                    min="0"
                  />
                  <span className="input-group-text fw-bold">грн</span>
                </div>
              </div>

              <div className="col-md-6">
                <label htmlFor="duration" className="form-label fw-bold text-dark">
                  Тривалість
                </label>
                <div className="input-group">
                  <input
                    type="number"
                    id="duration"
                    className="form-control form-control-lg"
                    value={formData.duration}
                    onChange={e => setFormData({...formData, duration: +e.target.value})}
                    required
                    min="15"
                    max="480"
                  />
                  <span className="input-group-text fw-bold">хв</span>
                </div>
              </div>
            </div>

            <div className="mb-4">
              <label htmlFor="image_url" className="form-label fw-bold text-dark">
                Головна картинка майстер-класу
              </label>
              <input
              type="url"
               className="form-control form-control-lg"
               placeholder="https://example.com/image.jpg"
               value={formData.images.main_image_url}
               onChange={e =>
                setFormData({
                    ...formData,
                      images: { ...formData.images, main_image_url: e.target.value }
                           })
                        }
              />
              <div className="form-text">
                Якщо залишити порожнім — буде стандартна картинка
              </div>
              
              <label htmlFor="caption" className="form-label fw-bold text-dark mt-3">
              Пiдпис до картинки
              </label>
              <textarea
              className="form-control form-control-lg"
                 value={formData.images.caption}
              onChange={e =>
               setFormData({
                  ...formData,
                   images: { ...formData.images, caption: e.target.value }
                  })
                 }
              />

          <label htmlFor="photo" className="form-label fw-bold text-dark mt-3">
                Фото з майстер-класу
          </label>
          <input
             type="url"
             className="form-control form-control-lg"
             placeholder="https://example.com/photo.jpg"
             value={newPhotoUrl}
             onChange={e => setNewPhotoUrl(e.target.value)}
          />
               <button
               type="button"
               className="btn btn-little-warning mt-3"
              onClick={() => {
                if (newPhotoUrl.trim() !== "") {
                setFormData({
                  ...formData,
                images: {
                   ...formData.images,
                  photo: [...(formData.images.photo ?? []), newPhotoUrl.trim()]
                     }
               });
               setNewPhotoUrl(""); 
              }
              }}
                >
                Додати фото
               </button>

              <ul className="photo-list">
              {(formData.images?.photo ?? []).map((img, index) => (
              <li key={index}>
                {img}
               <button
                 type="button"
                 className="btn btn-sm btn-little-danger ms-3"
                 onClick={() => {
                   setFormData({
                     ...formData,
                      images: {
                     ...formData.images,
                     photo: formData.images.photo.filter((_, i) => i !== index)
                      }
                     });
                   }}
                  >
                  Видалити
                </button>
                 </li>
                ))}
                </ul>
            </div>

            <hr className="my-5" />

            <div className="row">
              <div className="col-md-6 mb-4">
                <div className="form-check form-switch">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="availabilitySwitch"
                    checked={formData.availability}
                    onChange={e => setFormData({...formData, availability: e.target.checked})}
                  />
                  <label className="form-check-label fw-bold text-success" htmlFor="availabilitySwitch">
                    Доступний для запису
                  </label>
                </div>
                <small className="switch-hint">Вимкніть, якщо заняття ще недоступно для запису</small>
              </div>

              <div className="col-md-6 mb-4">
                <div className="form-check form-switch">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="regularSwitch"
                    checked={formData.is_regular}
                    onChange={e => setFormData({...formData, is_regular: e.target.checked})}
                  />
                  <label className="form-check-label fw-bold text-primary" htmlFor="regularSwitch">
                    Регулярне заняття
                  </label>
                </div>
                <small className="switch-hint">Увімкніть, якщо це нове заняття стане регулярним у студії</small>
              </div>
            </div>

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
                  <>Зберегти майстер-клас</>
                )}
              </button>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
};

export default ActivityForm;