import React, { useEffect, useState, useContext } from "react";
import api from "../utils/api";
import { AuthContext } from "../context/AuthContext";
import DeleteSlotModal from './DeleteSlotModal';
import "./AdminSchedulePage.css";  // ← новый файл стилей

const AdminSchedulePage = () => {
  const { role } = useContext(AuthContext);

  const [activities, setActivities] = useState([]);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [slots, setSlots] = useState([]);
  const [form, setForm] = useState({ start_time: "", capacity: 10 });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showDeleteSlotModal, setShowDeleteSlotModal] = useState(false);
  const [slotToDelete, setSlotToDelete] = useState(null);

  useEffect(() => {
    fetchActivities();
  }, []);

  const fetchActivities = async () => {
    try {
      const res = await api.get("/activities");
      const oneTimeActivities = (res.data.activity || []).filter(act => !act.is_regular);
      setActivities(oneTimeActivities);
      if (oneTimeActivities.length === 0) {
        setError("Нет разовых мастер-классов. Сначала создайте их в разделе 'Добавить направление'");
      }
    } catch (err) {
      setError("Не удалось загрузить активности");
    }
  };

  const fetchSlots = async (activityId) => {
    setLoading(true);
    try {
      const res = await api.get(`/activity/${activityId}/slots`);
      setSlots(res.data);
    } catch (err) {
      setError("Не удалось загрузить слоты");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectActivity = (activity) => {
    setSelectedActivity(activity);
    fetchSlots(activity.id);
    setForm({ start_time: "", capacity: 10 });
  };

  const handleAddSlot = async () => {
    if (!form.start_time || form.capacity < 1) {
      setError("Введіть дату, час та місткість!");
      return;
    }
    try {
      const localStartTime = form.start_time + ":00";
      const payload = { start_time: localStartTime, capacity: Number(form.capacity) };
      const res = await api.post(`/activity/${selectedActivity.id}/slots`, payload);
      setSlots([...slots, res.data.slot]);
      setForm({ start_time: "", capacity: 10 });
      setError("");
    } catch (err) {
      setError("Помилка при додаванні слота");
    }
  };

  const handleDeleteSlot = (slot) => {
    setSlotToDelete({
      id: slot.id || slot.ID,
      activityName: selectedActivity.name,
      time: new Date(slot.start_time).toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' })
    });
    setShowDeleteSlotModal(true);
  };

  const handleDeleteConfirmSlot = async (id) => {
    try {
      await api.delete(`/activity/${selectedActivity.id}/slots/${id}`);
      setSlots(slots.filter((s) => (s.id || s.ID) !== id));
      setShowDeleteSlotModal(false);
    } catch (err) {
      setError("Помилка при видаленні слота");
    }
  };

  if (role !== "owner") {
    return <div className="access-denied">Доступ заборонено</div>;
  }

  return (
    <div className="admin-schedule-page">
      <div className="admin-schedule-card">
        <h2 className="admin-title">
          Управління слотами разових занять
        </h2>

        {error && <div className="admin-error">{error}</div>}

        <div className="admin-grid">
          {/* Левая колонка — список активностей */}
          <div className="activities-sidebar">
            <h4 className="sidebar-title">Особливі події:</h4>
            {activities.length === 0 ? (
              <p className="no-activities">
                Немає разових подій.<br />
                Створіть їх у розділі <strong>«Додати заняття» → «Разове»</strong>
              </p>
            ) : (
              <div className="activities-list">
                {activities.map((a) => (
                  <button
                    key={a.id}
                    className={`activity-btn ${selectedActivity?.id === a.id ? "active" : ""}`}
                    onClick={() => handleSelectActivity(a)}
                  >
                    {a.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Правая часть — слоты и форма */}
          <div className="slots-content">
            {selectedActivity ? (
              <>
                <h3 className="selected-activity-title">
                  Слоти для: <span>{selectedActivity.name}</span>
                </h3>

                {/* Форма добавления слота */}
                <div className="add-slot-form">
                  <div className="form-row">
                    <div className="input-group">
                      <label>Дата та час початку</label>
                      <input
                        type="datetime-local"
                        value={form.start_time}
                        onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                        className="admin-input"
                      />
                    </div>
                    <div className="input-group">
                      <label>Місткість</label>
                      <input
                        type="number"
                        min="1"
                        value={form.capacity}
                        onChange={(e) => setForm({ ...form, capacity: +e.target.value })}
                        className="admin-input"
                      />
                    </div>
                    <button onClick={handleAddSlot} className="btn-add-slot">
                      Додати слот
                    </button>
                  </div>
                </div>

                {/* Список слотов */}
                {loading ? (
                  <div className="loading">Завантаження слотів...</div>
                ) : slots.length === 0 ? (
                  <p className="no-slots">Немає активних слотів</p>
                ) : (
                  <div className="slots-grid">
                    {slots.map((s) => {
                      const free = s.capacity - s.booked;
                      return (
                        <div key={s.id || s.ID} className="slot-card">
                          <div className="slot-time">
                            {new Date(s.start_time).toLocaleString('uk-UA', {
                              dateStyle: 'short',
                              timeStyle: 'short',
                            })}
                          </div>
                          <div className="slot-places">
                            Місць: <strong style={{ color: free > 0 ? '#7fdb7f' : '#ff6b6b' }}>
                              {free}/{s.capacity}
                            </strong>
                          </div>
                          <button
                            onClick={() => handleDeleteSlot(s)}
                            className="btn-delete-slot"
                            title="Видалити слот"
                          >
                            Видалити
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            ) : (
              <div className="placeholder">
                Оберіть заняття зліва
              </div>
            )}
          </div>
        </div>
      </div>

      <DeleteSlotModal
        show={showDeleteSlotModal}
        onHide={() => setShowDeleteSlotModal(false)}
        onDelete={handleDeleteConfirmSlot}
        slotId={slotToDelete?.id}
        slotInfo={{ activityName: selectedActivity?.name, time: slotToDelete?.time }}
      />
    </div>
  );
};

export default AdminSchedulePage;