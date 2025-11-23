import React, { useEffect, useState, useContext } from "react";
import api from "../utils/api";
import { AuthContext } from "../context/AuthContext";
import DeleteSlotModal from './DeleteSlotModal';
import "./AdminSlots.css";

const AdminSchedulePage = () => {
  const { role } = useContext(AuthContext);
  const [activities, setActivities] = useState([]);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [slots, setSlots] = useState([]);
  const [form, setForm] = useState({
    start_time: "",
    capacity: 10,
  });
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
      setActivities(res.data.activity || []);
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
      console.error("GET slots error:", err);
      setError("Не удалось загрузить слоты");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectActivity = (activity) => {
    setSelectedActivity(activity);
    fetchSlots(activity.id);
  };

  const handleAddSlot = async () => {
    if (!form.start_time || form.capacity === undefined || form.capacity < 1) return alert("Введите время и вместимость!");
    try {
      // Исправлено: Отправка local string без Z ("YYYY-MM-DDTHH:MM:00") — без ISO-универсализации.
      // Бэк спарсит как local время (учтёт зону браузера/MSK).
      const localStartTime = form.start_time + ":00";  // "2025-11-14T17:00:00"
      const payload = { 
        start_time: localStartTime,  // String для бэка
        capacity: Number(form.capacity)
      };
      const res = await api.post(`/activity/${selectedActivity.id}/slots`, payload);
      setSlots([...slots, res.data.slot]);
      setForm({ start_time: "", capacity: 10 });
    } catch (err) {
      console.error("POST slot error:", err.response?.data || err);
      setError("Ошибка при добавлении слота");
    }
  };

  const handleDeleteSlot = (slot) => {
    setSlotToDelete({
      id: slot.id || slot.ID,  // Fallback ID
      activityName: selectedActivity.name,
      time: new Date(slot.start_time).toLocaleString([], { hour: "2-digit", minute: "2-digit" })  // Время для текста модала
    });
    setShowDeleteSlotModal(true);
  };

  // Добавлено: Функция подтверждения удаления слота
  const handleDeleteConfirmSlot = async (id) => {
    try {
      await api.delete(`/activity/${selectedActivity.id}/slots/${id}`);
      setSlots(slots.filter((s) => (s.id || s.ID) !== id));  // Fallback ID в filter
      setShowDeleteSlotModal(false);  // Закрыть модал
    } catch (err) {
      setError("Ошибка при удалении");
    }
  };

  if (role !== "owner") return <div>Доступ запрещён</div>;

  return (
    <div className="admin-slots-container">
      <h2>Управление слотами занятий</h2>
      <div className="admin-slots-wrapper">
        <div className="activities-list">
          <h4>Выберите занятие:</h4>
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

        <div className="slots-panel">
          {selectedActivity ? (
            <>
              <h4>Слоты для: {selectedActivity.name}</h4>

              <div className="slot-form">
                <label>Дата и время начала:</label>
                <input
                  type="datetime-local"
                  value={form.start_time}
                  onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                />
                <label>Вместимость:</label>
                <input
                  type="number"
                  min="1"
                  value={form.capacity}
                  onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })}
                />
                <button onClick={handleAddSlot}>Добавить слот</button>
              </div>

              {loading ? (
                <p>Загружаем слоты...</p>
              ) : slots.length === 0 ? (
                <p>Нет активных слотов</p>
              ) : (
                <ul className="slots-list">
                  {slots.map((s) => (
                    <li key={s.id || s.ID}>  {/* Fallback ID */}
                      <span>
                        {new Date(s.start_time).toLocaleString()} — Мест: {s.capacity - s.booked}/{s.capacity}
                      </span>
                      <button onClick={() => handleDeleteSlot(s)}>🗑️</button>  {/* Теперь модал */}
                    </li>
                  ))}
                </ul>
              )}
            </>
          ) : (
            <p>Выберите занятие слева</p>
          )}
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