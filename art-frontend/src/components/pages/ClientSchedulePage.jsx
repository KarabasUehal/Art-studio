import React, { useEffect, useState, useContext, useLayoutEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../utils/api";
import { AuthContext } from "../../context/AuthContext";
import DeleteSlotModal from './DeleteSlotModal';
import "@styles/Schedule.css";

const ClientSchedulePage = () => {
  const { isAuthenticated, role } = useContext(AuthContext);
  const navigate = useNavigate();
  const [days, setDays] = useState([]);
  const [activities, setActivities] = useState([]);
  const [error, setError] = useState("");
  const [currentStartDate, setCurrentStartDate] = useState(new Date());  // Добавлено: Начало текущей недели

  const [showDeleteSlotModal, setShowDeleteSlotModal] = useState(false);
  const [slotToDelete, setSlotToDelete] = useState(null);

  const topScrollRef = useRef(null);
  const mainScrollRef = useRef(null);
  const isSyncingRef = useRef(false);

  useEffect(() => {
    // Добавлено: Генерация дней от currentStartDate (7 дней)
    const generateDays = () => {
      const daysArray = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(currentStartDate);
        d.setDate(currentStartDate.getDate() + i);
        return d;
      });
      setDays(daysArray);
    };

    generateDays();
    loadActivities();
  }, [currentStartDate]);  // Добавлено: Зависимость от currentStartDate

useEffect(() => {
  const top = topScrollRef.current;
  const main = mainScrollRef.current;
  if (!top || !main) return;

  const inner = top.querySelector(".top-scroll-inner");
  if (!inner) return;

  requestAnimationFrame(() => {
    inner.style.width = `${main.scrollWidth}px`;  
  });
}, [days, activities]);

useEffect(() => {
  const top = topScrollRef.current;
  const main = mainScrollRef.current;
  if (!top || !main) return;

  let isSyncing = false;

  const syncFromTop = (e) => {
    if (isSyncing) return;
    isSyncing = true;

    main.scrollTo({
      left: top.scrollLeft,
      behavior: 'auto'  
    });

    requestAnimationFrame(() => {
      isSyncing = false;
    });
  };

  const syncFromMain = () => {
    if (isSyncing) return;
    isSyncing = true;

    top.scrollTo({
      left: main.scrollLeft,
      behavior: 'auto'
    });

    requestAnimationFrame(() => {
      isSyncing = false;
    });
  };

  // Увеличиваем частоту обновлений — слушаем больше событий
  top.addEventListener("scroll", syncFromTop, { passive: true });
  main.addEventListener("scroll", syncFromMain, { passive: true });

  // Дополнительно: ловим touch/move для мобильных
  top.addEventListener("touchmove", syncFromTop, { passive: true });
  main.addEventListener("touchmove", syncFromMain, { passive: true });

  return () => {
    top.removeEventListener("scroll", syncFromTop);
    main.removeEventListener("scroll", syncFromMain);
    top.removeEventListener("touchmove", syncFromTop);
    main.removeEventListener("touchmove", syncFromMain);
  };
}, []);

  const loadActivities = async () => {
    try {
      const res = await api.get("/activities");
      const data = await Promise.all(
        res.data.activity.map(async (a) => {
          const slotsRes = await api.get(`/activity/${a.id}/slots`);
          return { ...a, slots: slotsRes.data };
        })
      );
      setActivities(data);
      setError("");
    } catch (err) {
      setError("Не удалось загрузить расписание");
    }
  };

  // Предыдущая неделя
  const prevWeek = () => {
    const newStart = new Date(currentStartDate);
    newStart.setDate(currentStartDate.getDate() - 7);
    setCurrentStartDate(newStart);
  };

  // Следующая неделя
  const nextWeek = () => {
    const newStart = new Date(currentStartDate);
    newStart.setDate(currentStartDate.getDate() + 7);
    setCurrentStartDate(newStart);
  };

  // Обработчик клика: Навигация в форму
  const handleBookSlot = (activity, slot) => {
    console.log("Debug Auth: isAuthenticated =", isAuthenticated, "Role =", role);
    console.log("Debug Slot structure:", slot);  // Лог для проверки id/ID

    if (!isAuthenticated) {
      setError("Войдите для записи");
      return;
    }

    // Fallback на slot.ID (GORM uppercase) или slot.id
    const slotId = slot.ID || slot.id || slot.slot_id;  
    if (!slotId) {
      console.error("Slot ID not found! Check backend response.");
      setError("Ошибка: ID слота не найден");
      return;
    }

    if (slot.capacity - slot.booked <= 0) {
      alert("Нет доступных мест");
      return;
    }

    navigate(`/record/${activity.id}/${slotId}`);
  };

const handleDeleteSlot = (activity, slot) => {
    
    setSlotToDelete({
      id: slot.ID || slot.id || slot.slot_id,  
      activityName: activity.name,
      time: slot.start_time.slice(11, 16)  // Время для текста модала
    });
    setShowDeleteSlotModal(true);
  };

  // Добавлено: Функция подтверждения удаления слота
  const handleDeleteConfirmSlot = async (id) => {
    try {
    
      const activityId = slotToDelete.activityId;  
      await api.delete(`/activity/${activityId}/slots/${id}`);
      
      loadActivities();
      setShowDeleteSlotModal(false); 
    } catch (err) {
      setError("Ошибка при удалении");
    }
  };

  return (
    <div className="schedule-container">
      <h2>Розклад занять</h2>
      {error && <div className="error-message">{error}</div>}

      <div className="week-navigation">
        <button onClick={prevWeek} className="week-button">← Попередній тиждень</button>
        <span className="fw-bold">
          {days[0]?.toLocaleDateString("uk-UA", { weekday: "long", day: "2-digit", month: "2-digit" })} — {days[6]?.toLocaleDateString("uk-UA", { day: "2-digit", month: "2-digit" })}
        </span>
        <button onClick={nextWeek} className="week-button">Наступний тиждень →</button>
      </div>

        <div ref={topScrollRef} className="top-scroll">
          <div className="top-scroll-inner" />
        </div>

      <div ref={mainScrollRef} className="days-grid">
        {days.map((day) => (
          <div key={day.toDateString()} className="day-card">
            <h5>
              {day.toLocaleDateString("uk-UA", { weekday: "short", day: "2-digit", month: "2-digit" })}
            </h5>
            {activities.flatMap((a) =>
              a.slots
                ?.filter((s) => new Date(s.start_time).toDateString() === day.toDateString())
                .map((slot) => {
                  const slotTimeString = slot.start_time.slice(11, 16);
                  return (
                    <div
                      key={slot.id || slot.ID}  
                      className="slot-item"
                      onClick={() => handleBookSlot(a, slot)}  
                      style={{ 
                        opacity: slot.capacity - slot.booked <= 0 ? 0.5 : 1, 
                        cursor: 'pointer',
                        position: 'relative',
                        paddingBottom: '35px'
                      }}
                    >
                      <div className="slot-name">{a.name}</div>
                      <div className="slot-time">{slotTimeString}</div>
                      <div className="slot-places">
                        {slot.capacity - slot.booked}/{slot.capacity} місць
                      </div>

                      {role === 'owner' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();  
                            handleDeleteSlot(a, slot);  
                          }}
                          className="delete-slot-btn"
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  );
                })
            )}
          </div>
        ))}
      </div>
    
      <DeleteSlotModal
        show={showDeleteSlotModal}
        onHide={() => setShowDeleteSlotModal(false)}
        onDelete={handleDeleteConfirmSlot}
        slotId={slotToDelete?.id}
        slotInfo={{ activityName: slotToDelete?.activityName, time: slotToDelete?.time }}
      />
    </div>
  );
};

export default ClientSchedulePage;