import React, { useState, useEffect, useContext } from 'react';
import api from '../../utils/api';
import { AuthContext } from '../../context/AuthContext';
import AddEditTemplateModal from './AddEditTemplateModal'; 
import DeleteTemplateModal from './DeleteTemplateModal'; 
import SuccessScheduleModal from './SuccessScheduleModal.jsx';
import '@styles/TemplatesSchedule.css';


const AdminTemplatesPage = () => {
  const { role } = useContext(AuthContext);
  const [templates, setTemplates] = useState([]); // Все шаблоны
  const [sortedTemplates, setSortedTemplates] = useState([]);
  const [activities, setActivities] = useState([]); // Регулярные активности
  const [searchQuery, setSearchQuery] = useState(''); // Поиск по имени активности
  const [selectedTemplate, setSelectedTemplate] = useState(null); // Для редактирования/удаления
  const [showAddEditModal, setShowAddEditModal] = useState(false); // Модалка add/edit
  const [showDeleteTemplateModal, setShowDeleteTemplateModal] = useState(false);// Модалка delete
  const [showExtendConfirm, setShowExtendConfirm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showSuccess, setShowSuccess] = useState(false);

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

 const handleDeleteTemplate = (template) => {
    const activity = activities.find(a => a.id === template.activity_id);
    setSelectedTemplate({
      id: template.id,
      activityName: activity?.name || 'Невідома активність',
      time: formatTime(template.start_time),
    });
    setShowDeleteTemplateModal(true);
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

  const handleConfirmDelete = async () => {
    try {
      await api.delete(`/templates/${selectedTemplate.id}`);
      fetchAllTemplates();
      setShowDeleteTemplateModal(false);
    } catch (err) {
      setError('Помилка видалення шаблону');
    }
  };

  const handleExtendSchedule = () => {
  setShowExtendConfirm(true);
};

  const handleConfirmExtend = async (weeks = 1) => {
    try {
      await api.post(`/schedule/extend?weeks=${weeks}`);
      setShowSuccess(true)
    } catch (err) {
      setError('Помилка продовження розкладу');
    }
    setShowExtendConfirm(false)
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
    <div className="container my-card">
      <h2>Управління шаблонами розкладу</h2>
      <input
        type="text"
        placeholder="Поиск по имени активности..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="form-control mb-3"
      />
      <button onClick={handleAddTemplate} className="btn btn-little-success mb-3">Додати шаблон</button>
      <button onClick={handleExtendSchedule} className="btn btn-little-success mb-3 ml-2">Продовжити розклад</button>

      {/* Схема недели */}
      <div className="table-container">
        <table className="table table-transparent table-striped mb-0">
          <thead>
            <tr>
              {Object.entries(daysOfWeek).map(([num, name]) => (
                <th key={num} className="text-center align-middle">
                  {name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              {Object.keys(daysOfWeek).map(dayNum => (
                <td key={dayNum} className="align-top p-3">
                  {groupedByDay[dayNum].length === 0 ? (
                    <p className="no-templates text-center my-4">Немає шаблонів</p>
                  ) : (
                    groupedByDay[dayNum].map(tmpl => {
                      const act = activities.find(a => a.id === tmpl.activity_id);
                      return (
                        <div key={tmpl.id} className="template-card mb-4">
                          <div className="template-card-inner">
                            <h5 className="template-card-title">{act?.name || 'Неизвестно'}</h5>
                            <p className="template-card-time mb-1">Час: {formatTime(tmpl.start_time)}</p>
                            <p className="template-card-capacity mb-2">Місткість: {tmpl.capacity}</p>
                            <div className="template-card-buttons">
                              <button
                                onClick={() => handleEditTemplate(tmpl)}
                                className="btn-little-success btn-sm me-2"
                              >
                                Редагувати
                              </button>
                              <button
                                onClick={() => handleDeleteTemplate(tmpl)}
                                className="btn-little-danger btn-sm"
                              >
                                Видалити
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

      {/* Модалки */}
      <AddEditTemplateModal
        show={showAddEditModal}
        onHide={() => setShowAddEditModal(false)}
        onSave={handleSaveTemplate}
        template={selectedTemplate}
        activities={activities} 
      />

      {/* Модалка предпросмотра */}
      {showExtendConfirm && (
  <div className="modal-overlay">
    <div className="modal-container">
      <label className="modal-label">Продовжити розклад на тиждень?</label>

      <div className="modal-buttons">
        <button className="btn btn-cancel-modal" onClick={() => setShowExtendConfirm(false)}>
          Відмінити
        </button>
        <button className="btn btn-success-modal" onClick={() => handleConfirmExtend(1)}>
          Так, продовжити
        </button>
      </div>
    </div>
  </div>
)}

<DeleteTemplateModal
        show={showDeleteTemplateModal}
        onHide={() => {
          setShowDeleteTemplateModal(false);
          setSelectedTemplate(null);
        }}
        onDelete={handleConfirmDelete}
        templateId={selectedTemplate?.id}
        templateInfo={{
          activityName: selectedTemplate?.activityName || '—',
          time: selectedTemplate?.time || '--:--'
        }}
      />

      <SuccessScheduleModal show={showSuccess} onHide={() => setShowSuccess(false)} />

    </div>
  );
};

export default AdminTemplatesPage;