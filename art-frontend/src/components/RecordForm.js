import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import SuccessModal from './SuccessModal';
import api from '../utils/api';

const RecordForm = () => {
  const { activityId, slotId } = useParams();  // slotId может быть undefined
  const navigate = useNavigate();
  const [activity, setActivity] = useState(null);
  const [formData, setFormData] = useState({
    numberOfKids: 1,
    kids: [{ name: '', age: 5, gender: '' }],
    date: '',
    slotId: slotId || '',  // Предзаполнение из params
  });
  const [loading, setLoading] = useState(false);
  const [slots, setSlots] = useState([]);
  const [error, setError] = useState('');
  const [selectedSlot, setSelectedSlot] = useState(null);  // Для предзаполненного слота
  const [showSuccess, setShowSuccess] = useState(false);

  const availablePlaces = selectedSlot 
    ? selectedSlot.capacity - selectedSlot.booked
    : formData.slotId
        ? (slots.find(s => (s.id || s.ID) === +formData.slotId)?.capacity || 0) -
          (slots.find(s => (s.id || s.ID) === +formData.slotId)?.booked || 0)
        : 0;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [activityRes, slotsRes] = await Promise.all([
          api.get(`/activities/${activityId}`),
          api.get(`/activity/${activityId}/slots`),  
        ]);

        setActivity(activityRes.data);
        setSlots(slotsRes.data);

        if (slotId) {
          console.log("Debug: Fetching slotId =", slotId);  
          const slotRes = await api.get(`/activity/${activityId}/slots/${slotId}`);
          const fetchedSlot = slotRes.data;
          setSelectedSlot(fetchedSlot);
          setFormData(prev => ({ ...prev, slotId }));  // Предзаполнение

          // Проверка доступности
          if (fetchedSlot.booked >= fetchedSlot.capacity) {
            setError('Вибраний слот вже заповнений!');
            return;
          }
        }
      } catch (err) {
        console.error("Fetch error:", err);  // Лог для дебага
        setError('Не вдалося завантажити дані активності');
      }
    };
    fetchData();
  }, [activityId, slotId]);

  const addKid = () => setFormData({
    ...formData,
    kids: [...formData.kids, { name: '', age: 5, gender: '' }],
  });

  const updateKid = (index, field, value) => {
    const kids = [...formData.kids];
    kids[index][field] = value;
    setFormData({ ...formData, kids });
  };

  const removeKid = (index) => setFormData({
    ...formData,
    kids: formData.kids.filter((_, i) => i !== index),
  });

  // Функция для форматирования времени слота без локального сдвига 
  const formatSlotTime = (timeStr) => {
    if (!timeStr) return 'Не указана';
    const date = new Date(timeStr);
    if (isNaN(date.getTime())) return 'Не указана';
    return date.toLocaleString('uk-UA', { 
      dateStyle: 'short', 
      timeStyle: 'short', 
      timeZone: 'UTC'  // Ключ: UTC, чтобы не добавлять +3ч локали (показывает "оригинальное" время)
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Валидация слота (fallback на ID или id)
    const currentSlotId = formData.slotId || slotId;
    if (!currentSlotId) {
      setError('Виберіть час заняття!');
      return;
    }

    // Поиск слота с fallback на s.ID (GORM uppercase)
    const currentSlot = selectedSlot || slots.find(s => (s.id || s.ID) === +currentSlotId);
    if (currentSlot && currentSlot.booked >= currentSlot.capacity) {
      setError('Вибраний слот вже заповнений!');
      return;
    }

    // Валидация детей
    if (formData.kids.length !== formData.numberOfKids) return alert('Додайте дані для всіх дітей!');
    for (let i = 0; i < formData.kids.length; i++) {
      const kid = formData.kids[i];
      if (!kid.name.trim()) {
        setError(`Введіть ім'я для дитини ${i + 1}!`);
        return;
      }
      if (kid.age < 3 || kid.age > 17) {
        setError(`Вік дитини ${i + 1} має бути від 3 до 17 років!`);
        return;
      }
      if (!kid.gender) {
        setError(`Виберіть стать для дитини ${i + 1}!`);
        return;
      }
    }

    setLoading(true);
    try {
      const req = {
        items: [{
          activity_id: +activityId,
          slot_id: +currentSlotId,
          number_of_kids: formData.numberOfKids,
          kids: formData.kids,
        }],
      };
      await api.post('/record', req);

      setShowSuccess(true);

      setFormData({
        numberOfKids: 1,
        kids: [{ name: '', age: 5, gender: '' }],
        date: '',
        slotId: '',
      });
    } catch (err) {
      console.error("Submit error:", err);  // Лог для дебага
      alert('Помилка запису: ' + (err.response?.data?.error || 'Спробуйте пізніше'));
    } finally {
      setLoading(false);
    }
  };

  if (!activity) return <div>Завантаження...</div>;

  return (
    <div className="card p-4 mx-auto" style={{ maxWidth: '600px' }}>
      <h2> Запис на "{activity.name}" ({activity.price} грн./дитина) </h2>
      <form onSubmit={handleSubmit}>
        {/* Select только если !slotId (для роута /record/:activityId без slotId) */}
        {!slotId && (
          <>
            <label>Час заняття:</label>
            <select
              value={formData.slotId}
              onChange={(e) => setFormData({ ...formData, slotId: e.target.value })}
              className="form-control mb-3"
              required
            >
              <option value="">-- Оберіть час --</option>
              {slots.length === 0 && <option disabled>Немає доступних слотів</option>}
              {slots.map((slot) => {
                const available = slot.capacity - slot.booked;
                return (
                  <option key={slot.id || slot.ID} value={slot.id || slot.ID} disabled={available <= 0}>
                    {formatSlotTime(slot.start_time)} — вільно місць: {available}  {/* Исправлено: formatSlotTime без +3ч */}
                  </option>
                );
              })}
            </select>
          </>
        )}

        {/* Отображение предвыбранного слота (для /record/:activityId/:slotId) */}
        {slotId && selectedSlot && (
          <div className="alert alert-info mb-3">
            <strong>Вибраний слот:</strong> {formatSlotTime(selectedSlot.start_time)} — вільно місць: {selectedSlot.capacity - selectedSlot.booked}  {/* Исправлено: formatSlotTime */}
          </div>
        )}
        {slotId && !selectedSlot && (
          <p className="text-warning">Слот не знайдено — виберіть заново</p>
        )}

        <div className="mb-3">
        <label>Кiлькiсть дiтей:</label>
        <input
          type="number"
          min="1"
          max={availablePlaces}  
          value={formData.numberOfKids}
          onChange={(e) => {
            let num = +e.target.value;
            if (num > availablePlaces) num = availablePlaces;
            setFormData({
              ...formData,
              numberOfKids: num,
              kids: Array(num).fill().map((_, i) => formData.kids[i] || { name: '', age: 5, gender: '' }),
            });
          }}
          className="form-control mb-3"
          required
        />
        <div className="form-text">
         Доступно {availablePlaces} місць
        </div>
        </div>

        <h5>Дані дітей:</h5>
        {formData.kids.map((kid, index) => (
          <div key={index} className="border p-3 mb-2 rounded">
            <input
              placeholder="Iм'я"
              value={kid.name}
              onChange={(e) => updateKid(index, 'name', e.target.value)}
              className="form-control mb-2"
              required
            />
            <input
              type="number"
              placeholder="Вiк"
              value={kid.age}
              onChange={(e) => updateKid(index, 'age', +e.target.value)}
              className="form-control mb-2"
              min="3"
              max="17"
              required
            />
            <select
              value={kid.gender}
              onChange={(e) => updateKid(index, 'gender', e.target.value)}
              className="form-control mb-2"
              required
            >
              <option value="">-- Оберіть стать --</option>
              <option value="male">Хлопчик</option>
              <option value="female">Дівчинка</option>
            </select>
            {formData.kids.length > 1 && (
              <button type="button" onClick={() => removeKid(index)} className="btn btn-sm btn-outline-danger">
                Видалити
              </button>
            )}
          </div>
        ))}

        {formData.kids.length < formData.numberOfKids && (
          <button type="button" onClick={addKid} className="btn btn-outline-secondary">
            + Додати дитину
          </button>
        )}

        {error && <p className="text-danger mt-2">{error}</p>}
        <button type="submit" disabled={loading} className="btn btn-success w-100 mt-3">
          {loading ? 'Запис...' : `Записатися (${activity.price * formData.numberOfKids} грн.)`}
        </button>
      </form>

      <SuccessModal
        show={showSuccess}
        onHide={() => setShowSuccess(false)}
      />
    </div>
  );
};

export default RecordForm;