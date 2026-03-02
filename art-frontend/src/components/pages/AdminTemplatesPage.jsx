import React, { useState, useEffect, useContext } from 'react';
import api from '../../utils/api';
import { AuthContext } from '../../context/AuthContext';
import AddEditTemplateModal from './modals/AddEditTemplateModal'; 
import DeleteModal from './modals/DeleteModal'; 
import ScheduleExtendModal from './modals/ScheduleExtendModal.jsx'; 
import InfoModal from './modals/InfoModal.jsx';
import '@styles/TemplatesSchedule.css';


const AdminTemplatesPage = () => {
  const { role } = useContext(AuthContext);
  const [templates, setTemplates] = useState([]); // Все шаблоны
  const [sortedTemplates, setSortedTemplates] = useState([]);
  const [activities, setActivities] = useState([]); // Регулярные активности
  const [searchQuery, setSearchQuery] = useState(''); // Поиск по имени активности
  const [selectedTemplate, setSelectedTemplate] = useState(null); // Для редактирования/удаления
  const [showAddEditModal, setShowAddEditModal] = useState(false); // Модалка add/edit
  const [showDeleteModal, setShowDeleteModal] = useState(false);// Модалка удаления
  const [showScheduleExtendModal, setShowScheduleExtendModal] = useState(false);// Модалка продления
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const daysOfWeek = {
    1: 'Понеділок',
    2: 'Вівторок',
    3: 'Сeреда',
    4: 'Четвер',
    5: 'П\'ятниця',
  };


const formatTime = (iso) => {
  if (!iso) return '--:--';
  // если iso выглядит как "15:00" — вернём как есть
  if (iso.length === 5 && iso[2] === ':') return iso;
  // иначе ISO string
  return iso.slice(11,16);
};

  useEffect(() => {
    if (role !== 'owner') return;
    fetchRegularActivities();
    fetchAllTemplates();
  }, [role]);

  useEffect(() => {
    if (templates.length > 0) {
      const sorted = [...templates].sort((a, b) => {
        return a.start_time.localeCompare(b.start_time);
      });
      setSortedTemplates(sorted);
    } else {
      setSortedTemplates([]);
    }
  }, [templates]);

  const fetchRegularActivities = async () => {
    try {
      const res = await api.get('/activities?regular=true');
      setActivities(res.data.activity || []);
    } catch (err) {
      setError('Неможливо завантажити регулярні напрямки');
    }
  };

  const fetchAllTemplates = async () => {
  setLoading(true);
  try {
    const res = await api.get('/templates');
    
    let templatesData = [];
    if (Array.isArray(res.data)) {
      templatesData = res.data;
    } else if (res.data && Array.isArray(res.data.templates)) {
      templatesData = res.data.templates; 
    }

    setTemplates(templatesData);
  } catch (err) {
    setError('Не вдалося завантажити шаблони');
    console.error(err);
  } finally {
    setLoading(false);
  }
};

  const fetchTemplatesByActivity = async (activityId) => {
    try {
      const res = await api.get(`/templates/by-activity/${activityId}`);
      return res.data; // Возвращаем список шаблонов
    } catch (err) {
      setError('Не вдалося завантажити шаблони для напрямку');
      return [];
    }
  };

  const handleAddTemplate = () => {
    setSelectedTemplate(null); // Новый шаблон
    setShowAddEditModal(true);
  };

  const handleEditTemplate = (template) => {
    setSelectedTemplate(template);
    setShowAddEditModal(true);
  };

  const handleSaveTemplate = async (templateData) => {
    try {
      templateData.activity_id = Number(templateData.activity_id);

      if (selectedTemplate) {
        // Редактирование
        await api.put(`/templates/${selectedTemplate.id}`, templateData);
      } else {
        // Добавление (activity_id из формы)
        await api.post(`/templates/by-activity/${templateData.activity_id}`, templateData);
      }
      fetchAllTemplates(); // Обновляем список
      setShowAddEditModal(false);
    } catch (err) {
    if (err.response?.status === 409) {
      setError(err.response.data.error || 'Такий шаблон вже існує');
    } else {
      setError('Помилка збереження шаблону');
    }
  }
};

const handleDeleteTemplate = (template) => {
    const activity = activities.find(a => a.id === template.activity_id);
    setSelectedTemplate({
      id: template.id,
      activityName: activity?.name || 'Невідома активність',
      time: formatTime(template.start_time),
    });
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    try {
      await api.delete(`/templates/${selectedTemplate.id}`);
      fetchAllTemplates();
      setShowDeleteModal(false);
    } catch (err) {
      setError('Помилка видалення шаблону');
    }
  };

  const handleExtendSchedule = () => {
  setShowScheduleExtendModal(true);
};

  const handleConfirmExtend = async (weeks = 1) => {
    try {
      await api.post(`/schedule/extend?weeks=${weeks}`);
      setShowInfoModal(true)
    } catch (err) {
      setError('Помилка продовження розкладу');
    }
    setShowScheduleExtendModal(false)
  };

  // Фильтрованные шаблоны по поиску (по имени активности)
    const filteredTemplates = sortedTemplates.filter(tmpl => {
    const act = activities.find(a => a.id === tmpl.activity_id);
    return act && act.name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  // Группировка шаблонов по дням
  const groupedByDay = {};
  Object.keys(daysOfWeek).forEach(dayNum => {
    groupedByDay[dayNum] = filteredTemplates.filter(tmpl => tmpl.day_of_week === parseInt(dayNum));
  });

  if (role !== 'owner') return <div>Доступ заборонено</div>;
  if (error) return <div className="alert alert-danger">{error}</div>;
  if (loading) return <div>Завантаження...</div>;

  return (
  <div className="template-page">
    <h2>Управління шаблонами розкладу</h2>

    <input
      type="text"
      placeholder="Пошук за назвою активності..."
      value={searchQuery}
      onChange={(e) => setSearchQuery(e.target.value)}
      className="template-search"
    />

    <div className="template-actions">
      <button
        onClick={handleAddTemplate}
        className="template-btn-add"
      >
        Додати шаблон
      </button>

      <button
        onClick={handleExtendSchedule}
        className="template-btn-extend"
      >
        Продовжити розклад
      </button>
    </div>

    <div className="template-table-container">
      <table className="template-table">
        <thead>
          <tr>
            {Object.entries(daysOfWeek).map(([num, name]) => (
              <th key={num}>{name}</th>
            ))}
          </tr>
        </thead>

        <tbody>
          <tr>
            {Object.keys(daysOfWeek).map((dayNum) => (
              <td key={dayNum}>
                {groupedByDay[dayNum].length === 0 ? (
                  <p className="template-empty-message">Немає шаблонів</p>
                ) : (
                  groupedByDay[dayNum].map((tmpl) => {
                    const act = activities.find(
                      (a) => a.id === tmpl.activity_id
                    );

                    return (
                      <div key={tmpl.id} className="template-card">
                        <div className="template-card-inner">
                          <div className="template-card-title">
                            {act?.name || "—"}
                          </div>

                          <div className="template-card-time">
                            Час: {formatTime(tmpl.start_time)}
                          </div>

                          <div className="template-card-capacity">
                            Місткість: {tmpl.capacity}
                          </div>

                          <div className="template-card-buttons">
                            <button
                              onClick={() => handleEditTemplate(tmpl)}
                              className="template-btn-edit"
                            >
                              🖊️
                            </button>

                            <button
                              onClick={() => handleDeleteTemplate(tmpl)}
                              className="template-btn-delete"
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>

    {/* МОДАЛКИ — БЕЗ ИЗМЕНЕНИЙ */}
    <AddEditTemplateModal
        show={showAddEditModal}
        onHide={() => setShowAddEditModal(false)}
        onSave={handleSaveTemplate}
        template={selectedTemplate}
        activities={activities} 
      />

      {/* Модалка предпросмотра */}
      <ScheduleExtendModal
        show={showScheduleExtendModal}
        onHide={() => setShowScheduleExtendModal(false)}
        onExtend={handleConfirmExtend}
      />

          {selectedTemplate && (
            <DeleteModal
              show={showDeleteModal}
              onHide={() => setShowDeleteModal(false)}
              onDelete={handleConfirmDelete}
              modalTitle={`Видалити шаблон для ${selectedTemplate?.activityName}?`}
              modalElementName={`${selectedTemplate?.activityName} на ${selectedTemplate?.time}?`}
              modalQuestion="Ви впевнені, що хочете видалити шаблон для "
              modalWarning="Після видалення цю дію неможливо буде скасувати."
            />
          )}

      <InfoModal 
      show={showInfoModal} 
      onHide={() => setShowInfoModal(false)} 
      onSuccess={() => setShowInfoModal(false)}
      modalInfo='Розклад продовжено!'
      />

    </div>
  );
};

export default AdminTemplatesPage;