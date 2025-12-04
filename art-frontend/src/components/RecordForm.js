import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import SuccessModal from './SuccessModal';
import api from '../utils/api';
import './RecordForm.css';

const RecordForm = () => {
  const { activityId, slotId } = useParams();

  const [activity, setActivity] = useState(null);
  const [slots, setSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [formData, setFormData] = useState({
    numberOfKids: 1,
    kids: [{ name: '', age: 5, gender: '' }],
    slotId: slotId || '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);

  // Загрузка активности и слотов
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
          const slotRes = await api.get(`/activity/${activityId}/slots/${slotId}`);
          const fetchedSlot = slotRes.data;
          setSelectedSlot(fetchedSlot);
          setFormData(prev => ({ ...prev, slotId }));
        }
      } catch (err) {
        setError('Не вдалося завантажити дані активності');
      }
    };
    fetchData();
  }, [activityId, slotId]);

  // Форматирование времени
  const formatSlotTime = (timeStr) => {
    if (!timeStr) return 'Не вказано';
    const date = new Date(timeStr);
    return date.toLocaleString('uk-UA', {
      dateStyle: 'short',
      timeStyle: 'short',
      timeZone: 'Europe/Kiev',
    });
  };

  // === ВСЕ НЕДОСТАЮЩИЕ ФУНКЦИИ ===
  const addKid = () => {
    setFormData({
      ...formData,
      kids: [...formData.kids, { name: '', age: 5, gender: '' }],
    });
  };

  const updateKid = (index, field, value) => {
    const kids = [...formData.kids];
    kids[index][field] = value;
    setFormData({ ...formData, kids });
  };

  const removeKid = (index) => {
    setFormData({
      ...formData,
      kids: formData.kids.filter((_, i) => i !== index),
      numberOfKids: formData.numberOfKids - 1,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const currentSlotId = formData.slotId || slotId;
    if (!currentSlotId) {
      setError('Виберіть час заняття!');
      return;
    }

    const currentSlot = selectedSlot || slots.find(s => (s.id || s.ID) == +currentSlotId);
    if (currentSlot && currentSlot.booked >= currentSlot.capacity) {
      setError('Вибраний слот вже заповнений!');
      return;
    }

    if (formData.kids.length !== formData.numberOfKids) {
      setError('Додайте дані для всіх дітей!');
      return;
    }

    for (let i = 0; i < formData.kids.length; i++) {
      const kid = formData.kids[i];
      if (!kid.name.trim()) return setError(`Введіть ім'я для дитини ${i + 1}!`);
      if (kid.age < 3 || kid.age > 17) return setError(`Вік дитини ${i + 1} має бути від 3 до 17 років!`);
      if (!kid.gender) return setError(`Виберіть стать для дитини ${i + 1}!`);
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
      // Сброс формы
      setFormData({
        numberOfKids: 1,
        kids: [{ name: '', age: 5, gender: '' }],
        slotId: '',
      });
    } catch (err) {
      setError('Помилка запису: ' + (err.response?.data?.error || 'Спробуйте пізніше'));
    } finally {
      setLoading(false);
    }
  };

  if (!activity) return <div className="record-loading">Завантаження...</div>;

  const availablePlaces = selectedSlot
    ? selectedSlot.capacity - selectedSlot.booked
    : slots.find(s => (s.id || s.ID) == +formData.slotId)?.capacity -
      slots.find(s => (s.id || s.ID) == +formData.slotId)?.booked || 0;

  return (
    <div className="record-page">
      <div className="record-card">
        <h2 className="record-title">
          Запис на «{activity.name}»
          <span className="record-price">{activity.price} грн / мiсце</span>
        </h2>

        {/* Предвыбранный слот */}
        {slotId && selectedSlot && (
          <div className="slot-info">
            <strong>Обраний час:</strong> {formatSlotTime(selectedSlot.start_time)}
            <span className="places-left">
              — вільно {selectedSlot.capacity - selectedSlot.booked} місць
            </span>
          </div>
        )}

        {/* Выбор слота */}
        {!slotId && (
          <div className="form-group">
            <label className="record-label">Оберіть час заняття</label>
            <select
              className="record-select"
              value={formData.slotId}
              onChange={(e) => setFormData({ ...formData, slotId: e.target.value })}
              required
            >
              <option value="">— Оберіть час —</option>
              {slots.map((slot) => {
                const free = slot.capacity - slot.booked;
                return (
                  <option key={slot.id || slot.ID} value={slot.id || slot.ID} disabled={free <= 0}>
                    {formatSlotTime(slot.start_time)} — вільно {free} місць
                  </option>
                );
              })}
            </select>
          </div>
        )}

        <div className="form-group">
          <label className="record-label">Кількість дітей</label>
          <input
            type="number"
            min="1"
            max={availablePlaces}
            className="record-input"
            value={formData.numberOfKids}
            onChange={(e) => {
              let num = Math.max(1, Math.min(+e.target.value || 1, availablePlaces));
              setFormData({
                ...formData,
                numberOfKids: num,
                kids: Array.from({ length: num }, (_, i) => formData.kids[i] || { name: '', age: 5, gender: '' }),
              });
            }}
          />
          <div className="places-hint">Доступно місць: {availablePlaces}</div>
        </div>

        <h3 className="kids-title">Дані дітей</h3>

        {formData.kids.map((kid, i) => (
          <div key={i} className="kid-card">
            <input
              placeholder="Ім'я дитини"
              className="record-input"
              value={kid.name}
              onChange={(e) => updateKid(i, 'name', e.target.value)}
              required
            />
            <input
              type="number"
              placeholder="Вік"
              min="3"
              max="17"
              className="record-input"
              value={kid.age}
              onChange={(e) => updateKid(i, 'age', +e.target.value)}
              required
            />
            <select
              className="record-select"
              value={kid.gender}
              onChange={(e) => updateKid(i, 'gender', e.target.value)}
              required
            >
              <option value="">Стать</option>
              <option value="male">Хлопчик</option>
              <option value="female">Дівчинка</option>
            </select>

            {formData.kids.length > 1 && (
              <button type="button" className="btn-remove-kid" onClick={() => removeKid(i)}>
                Видалити дитину
              </button>
            )}
          </div>
        ))}

        {formData.kids.length < formData.numberOfKids && (
          <button type="button" className="btn-add-kid" onClick={addKid}>
            + Додати дитину
          </button>
        )}

        {error && <div className="record-error">{error}</div>}

      <div className="submit-wrapper">
        <button
          type="submit"
          disabled={loading || !formData.slotId}
          className="btn-record-submit"
          onClick={handleSubmit}
        >
          {loading ? 'Записуємо...' : `Записатися (${activity.price * formData.numberOfKids} грн)`}
        </button>
        </div>
      </div>

      <SuccessModal show={showSuccess} onHide={() => setShowSuccess(false)} />
    </div>
  );
};

export default RecordForm;