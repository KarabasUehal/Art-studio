import React, { useEffect, useState, useContext } from "react";
import api from "../../utils/api";
import { AuthContext } from "../../context/AuthContext";
import DeleteSlotModal from './DeleteSlotModal';
import "@styles//AdminSchedulePage.css";  
import "@styles/Calendar.css";  

const AdminSchedulePage = () => {
  const { role } = useContext(AuthContext);

  const [activities, setActivities] = useState([]);
  const [activityType, setActivityType] = useState("one-time"); 
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [slots, setSlots] = useState([]);
  const [form, setForm] = useState({ start_time: "", capacity: 10 });
  const [error, setError] = useState("");
  const [formError, setFormError] = useState(""); 
  const [loading, setLoading] = useState(false);
  const [showDeleteSlotModal, setShowDeleteSlotModal] = useState(false);
  const [slotToDelete, setSlotToDelete] = useState(null);

  const [selectedDate, setSelectedDate] = useState(
  form.start_time ? new Date(form.start_time) : null
  );

  useEffect(() => {
    fetchActivities();
  }, []);

  useEffect(() => {
  if (form.start_time) {
    setSelectedDate(new Date(form.start_time));
  }
  }, [form.start_time]);

  useEffect(() => {
  if (formError) setFormError("");
  }, [form.start_time, form.capacity]);

  const fetchActivities = async () => {
    try {
      const res = await api.get("/activities");
    setActivities(res.data.activity || []);
      if (res.data.activity.length === 0) {
        setError("Нема разових подій. Спочатку створіть їх у розділі 'Додати напрямок'");
      }
    } catch (err) {
      setError("Не вдалося завантажити напрямки");
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
      setFormError("");

      const localStartTime = form.start_time + ":00";
      const payload = { start_time: localStartTime, capacity: Number(form.capacity) };
      const res = await api.post(`/activity/${selectedActivity.id}/slots`, payload);
      setSlots([...slots, res.data.slot]);
      setForm({ start_time: "", capacity: 10 });
      setFormError("");
    } catch (err) {
      setFormError("Такий слот вже існує");
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

  const filteredActivities = activities.filter(act =>
  activityType === "regular" ? act.is_regular : !act.is_regular
);

const manualSlots = slots.filter(s => s.source === 'manual');

  return (
    <div className="admin-schedule-page">
      <div className="admin-schedule-card">
        <h2 className="admin-title">
          Управління слотами разових занять
        </h2>

        {error && <div className="admin-error">{error}</div>}

            <div className="admin-grid">
          {/* ЛЕВАЯ КОЛОНКА */}
          <div className="activities-sidebar">
            <h4 className="sidebar-title">Події</h4>

            <div className="activities-tabs">
              <button
                className={`tab-btn ${
                  activityType === "one-time" ? "active" : ""
                }`}
                onClick={() => {
                  setActivityType("one-time");
                  setSelectedActivity(null);
                  setSlots([]);
                }}
              >
                Разові
              </button>

              <button
                className={`tab-btn ${
                  activityType === "regular" ? "active" : ""
                }`}
                onClick={() => {
                  setActivityType("regular");
                  setSelectedActivity(null);
                  setSlots([]);
                }}
              >
                Регулярні
              </button>
            </div>

            {filteredActivities.length === 0 ? (
              <p className="no-activities">
                Немає {activityType === "regular" ? "регулярних" : "разових"} подій
              </p>
            ) : (
              <div className="activities-list">
                {filteredActivities.map((a) => (
                  <button
                    key={a.id}
                    className={`activity-btn ${
                      selectedActivity?.id === a.id ? "active" : ""
                    }`}
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
                 {formError && <div className="form-warning">{formError}</div>}

                  <div className="form-row">
                    <div className="input-group">
                      <label>Дата та час початку</label>
                      <input
                        type="datetime-local"
                        value={form.start_time}
                        onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                        className="admin-input"
                        style={{ colorScheme: 'dark' }}
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
                  <div className="loading">Завантаження разових слотів...</div>
                ) : manualSlots.length === 0 ? (
                  <p className="no-slots">Немає активних разових слотів</p>
                ) : (
                  <div className="slots-grid">
                    {manualSlots.map((s) => {
                      const free = s.capacity - s.booked;
                      return (
                        <div key={s.id || s.ID} className="slot-card">
                          <div className="slot-time">
                            {new Date(s.start_time).toLocaleString('uk-UA', {
                              dateStyle: 'short',
                              timeStyle: 'short',
                              timeZone: 'UTC',
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