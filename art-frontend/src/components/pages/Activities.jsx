import React, { useState, useEffect, useContext } from 'react';
import api from '../../utils/api';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import ReactPaginate from 'react-paginate';
import DeleteActivityModal from './DeleteActivityModal';
import '@styles/Activities.css'; 

const Activities = ({ isAuthenticated }) => {
  const [activities, setActivities] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [size] = useState(9);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [activeTab, setActiveTab] = useState('all');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [activityToDelete, setActivityToDelete] = useState(null);

  const { role } = useContext(AuthContext);
  const navigate = useNavigate();

   const imageMapping = {
    1: 'https://i.postimg.cc/5y0Qyvng/Lipka.jpg',
    2: 'https://i.postimg.cc/x8CN8Htv/Jivopis5.jpg',
    3: 'https://i.postimg.cc/T1w51mCq/Jivopis_Rozvitok.jpg',
    4: 'https://i.postimg.cc/fL50M5jX/Fashion_illustration.jpg',
    5: 'https://i.postimg.cc/TwcnpTxz/Vyazanie.jpg',
    6: 'https://i.postimg.cc/W3SJsS6D/Actor.jpg',
    7: 'https://i.postimg.cc/0jQKjmc4/STEM.jpg',
    8: 'https://i.postimg.cc/Y98mt8fN/English.jpg',
    9: 'https://i.postimg.cc/1XtVX6JJ/Shahi.jpg'
  };

  useEffect(() => {
    setPage(1); 
    fetchActivities(1);
}, [activeTab]);  

  const fetchActivities = async (pageNum = page, sizeNum = size) => {
  setLoading(true);
  try {
    const params = {
      page: pageNum,
      size: sizeNum,
    };

    // Определяем, что показывать
    if (activeTab === 'regular') {
      params.regular = 'true';        
    } else if (activeTab === 'one-time') {
      params.regular = 'false';       
    }

    const response = await api.get('/activities', { params });
    const data = response.data;

    setActivities(data.activity || []);
    setTotalPages(data.total_pages || 1);
    setTotalCount(data.total_count || 0);
    setPage(data.current_page || 1);

  } catch (err) {
    console.error('Ошибка загрузки активностей:', err);
    setError('Не удалось загрузить мастер-классы.');
  } finally {
    setLoading(false);
  }
};

  const handlePageChange = ({ selected }) => {
    const newPage = selected + 1;
    setPage(newPage);
    fetchActivities(newPage); 
  };

  const getImageSrc = (act) => {
    if (act.images && act.images.main_image_url) return act.images.main_image_url;
    return imageMapping[act.id] || '';
  };

  const handleSignUp = (activityId) => {
    if (!isAuthenticated) {
      alert('Войдите в аккаунт для записи!');
      return;
    }
    navigate(`/record/${activityId}`);
  };

  const handleDeleteConfirm = async (id) => {
  try {
    await api.delete(`/activities/${id}`);
    
    const params = {
      page: page,
      size: size,
    };

    if (activeTab === 'regular') params.regular = 'true';
    if (activeTab === 'one-time') params.regular = 'false';

    const response = await api.get('/activities', { params });
    const data = response.data;

    // Если на текущей странице что-то осталось — просто обновляем список
    if (data.activity.length > 0) {
      setActivities(data.activity || []);
      setTotalPages(data.total_pages || 1);
      setTotalCount(data.total_count || 0);
      setPage(data.current_page || 1);
      setShowDeleteModal(false);
      return;
    }

    // Если текущая страница пуста и это не первая страница — пробуем предыдущую
    if (page > 1) {
      await fetchActivities(page - 1);
      setPage(page - 1);
      setShowDeleteModal(false);
      return;
    }

    // Если и на первой странице текущей вкладки ничего нет
    // значит в этой вкладке (regular или one-time) больше нет активностей
    if (activeTab !== 'all') {
      // Переключаемся на вкладку "Усі заняття" и загружаем первую страницу
      setActiveTab('all');
      setPage(1);
      await fetchActivities(1);
    } else {
      setActivities([]);
      setTotalPages(1);
      setTotalCount(0);
    }

    setShowDeleteModal(false);
    if (data.activity.length === 0 && page > 1) {// Если страница пустая, идём на предыдущую
      activeTab === 'all';
      fetchActivities(1);
    }
  } catch (err) {
    const msg = err.response?.status === 404 ? "Активность не найдена" : err.response?.data?.error || "Ошибка удаления";
    alert(`Ошибка при удалении: ${msg}`);
  }
};

  const renderEmptyState = () => {
    switch (activeTab) {
      case 'regular':
        return <h1>Поки що немає регулярних майстер-класів</h1>;
      case 'one-time':
        return <h1>Поки що немає особливих подій</h1>;
      case 'all':
      default:
        return <h1>Майстер-класи незабаром з'являться!</h1>;
    }
  };

  return (
  <div className="activities-page">
    <div className="activities-container">

      {isAuthenticated && role === 'owner' && (
        <div className="activities-wrapper">
          <Link to="/add" className="btn-add-activity">Додати напрям</Link>
        </div>
      )}

      <div className="activities-tabs">
        <button className={`tab-btn ${activeTab === 'all' ? 'active' : ''}`} onClick={() => setActiveTab('all')}>
          Усі заняття
        </button>
        <button className={`tab-btn ${activeTab === 'regular' ? 'active' : ''}`} onClick={() => setActiveTab('regular')}>
          Регулярні
        </button>
        <button className={`tab-btn ${activeTab === 'one-time' ? 'active' : ''}`} onClick={() => setActiveTab('one-time')}>
          Особливі події
        </button>
      </div>

      {error && <div className="alert alert-danger text-center">{error}</div>}
      {loading && <div className="text-center py-5" style={{ color: '#fbff00', fontSize: '1.5em' }}>Завантажуємо...</div>}

      {!loading && activities.length === 0 && (
        <div className="empty-state">
          {renderEmptyState()}
        </div>
      )}

      <div className="activities-grid">
        {activities.map(act => (
          <div key={act.id} className="activity-grid-item">
            <div className="activity-card">

              <img src={getImageSrc(act)} alt={act.name} onError={(e) => {
                e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjI0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjMjIyIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtc2l6ZT0iMjQiIGZpbGw9IiNmYmZmMDAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIu8ZW0iPkFydCBFdmVudDwvdGV4dD48L3N2Zz4=';
              }} />

              {/* Бейдж "Регулярно" / "Разово" */}
              {act.is_regular !== undefined && (
            <span
              className={`activity-badge ${
                act.is_regular ? 'activity-badge--regular' : 'activity-badge--one-time'
              }`}
            >
              {act.is_regular ? 'Регулярно' : 'Разово'}
            </span>
          )}

              <div className="activity-card-body">
                <h5 className="activity-card-title">{act.name}</h5>
                <p className="activity-card-text">{act.description}</p>

                <div className="activity-info">
                  <span>{act.price} грн</span>
                  <span>{act.duration} хв</span>
                </div>

                {/* Кнопка записи */}
                <div className="activity-card-footer">
                <button onClick={() => handleSignUp(act.id)} className="btn-signup mb-3">
                  Записатись!
                </button>
                </div>

                {/* Кнопки Edit / Delete — только для owner */}
                {isAuthenticated && role === 'owner' && (
                  <div className="activity-admin-actions">
                    <Link to={`/edit/${act.id}`} className="btn-admin btn-admin-edit">
                      Редагувати
                          </Link>
                    <button
                      onClick={() => {
                        setActivityToDelete(act);
                        setShowDeleteModal(true);
                      }}
                      className="btn-admin btn-admin-delete">
                      Видалити
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Пагинация */}
      {totalPages > 1 && (
        <ReactPaginate
          previousLabel="←"
          nextLabel="→"
          pageCount={totalPages}
          onPageChange={handlePageChange}
          containerClassName="pagination"
          pageLinkClassName="page-link"
          activeClassName="active"
          forcePage={page - 1}
        />
      )}

      {/* Модалка удаления активности */}
      <DeleteActivityModal
        show={showDeleteModal}
        onHide={() => setShowDeleteModal(false)}
        onDelete={handleDeleteConfirm}
        activityId={activityToDelete?.id}
        activityName={activityToDelete?.name || 'активність'}
      />
    </div>
  </div>
 );
};

export default Activities;