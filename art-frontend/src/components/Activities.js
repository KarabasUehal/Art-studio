import React, { useState, useEffect, useContext } from 'react';
import api from '../utils/api';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import ReactPaginate from 'react-paginate';
import DeleteActivityModal from './DeleteActivityModal';
import './Activities.css';
import '../App.css';

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
    // ← НОВАЯ ЛОГИКА: вместо filter=regular/one-time используем regular=true/false
    const params = {
      page: pageNum,
      size: sizeNum,
    };

    // Определяем, что показывать
    if (activeTab === 'regular') {
      params.regular = 'true';        // → /activities?regular=true
    } else if (activeTab === 'one-time') {
      params.regular = 'false';       // → /activities?regular=false
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
    
    const response = await api.get('/activities', { params: { page, size } }); // Попытка перезагрузить текущую страницу
    const data = response.data;

    if (data.activity.length === 0 && page > 1) {// Если страница пустая, идём на предыдущую
      fetchActivities(page - 1, size);
      setPage(page - 1);
    } else {
      setActivities(data.activity || []);
      setTotalPages(data.total_pages || 1);
      setTotalCount(data.total_count || 0);
    }

    setShowDeleteModal(false);
  } catch (err) {
    const msg = err.response?.status === 404 ? "Активность не найдена" : err.response?.data?.error || "Ошибка удаления";
    alert(`Ошибка при удалении: ${msg}`);
  }
};

  const renderEmptyState = () => {
    switch (activeTab) {
      case 'regular':
        return <h4>Поки що немає регулярних майстер-класів</h4>;
      case 'one-time':
        return <h4>Поки що немає особливих подій</h4>;
      case 'all':
      default:
        return <h4>Майстер-класи незабаром з'являться!</h4>;
    }
  };

  return (
    <div>
      {isAuthenticated && role === 'owner' && (
        <Link to="/add" className="btn btn-warning mb-3"
          style={{ backgroundColor: 'transparent', color: '#0431f8ff', textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}>
          Add new activity
        </Link>
      )}

      {/* Вкладки */}
      <div className="mb-4 text-center">
        <div className="btn-group btn-group-lg" role="group">
          <button type="button"
            className={`btn ${activeTab === 'all' ? 'btn-primary' : 'btn-outline-primary'}`}
            onClick={() => setActiveTab('all')}>Усі заняття</button>
          <button type="button"
            className={`btn ${activeTab === 'regular' ? 'btn-success' : 'btn-outline-success'}`}
            onClick={() => setActiveTab('regular')}>Регулярні майстер-класи</button>
          <button type="button"
            className={`btn ${activeTab === 'one-time' ? 'btn-warning' : 'btn-outline-warning'}`}
            onClick={() => setActiveTab('one-time')}>Особливі події</button>
        </div>
      </div>

      {error && <div className="alert alert-danger text-center">{error}</div>}
      {loading && <div className="text-center">Завантажуємо майстер-класи... 🎨</div>}

      {/* --- Основной контент --- */}
      {!loading && (
        <>
          {activities.length === 0 ? (
            <div className="text-center py-5">{renderEmptyState()}</div>
          ) : (
            <div className="row">
              {activities.map(act => (
                <div key={act.id} className="col-md-6 col-lg-4 mb-4">
                  <div className="card h-100 shadow-sm" style={{ borderRadius: '15px', overflow: 'hidden' }}>
                    <img
                      src={getImageSrc(act)}
                      className="card-img-top"
                      alt={act.name}
                      style={{ height: '200px', objectFit: 'cover' }}
                      onError={(e) => {
                        console.error(`Image load failed for ${act.name}: ${e.target.src}`);
                        e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjY2NjIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxOCIgZmlsbD0iI2ZmZiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkFydCBFdmVudDwvdGV4dD48L3N2Zz4=';
                        e.target.alt = 'No image available';
                      }}
                    />
                    <div className="card-body d-flex flex-column">
                      <h5 className="card-title">{act.name}</h5>
                      <p className="card-text flex-grow-1">{act.description}</p>
                      {act.is_regular !== undefined && (
                      <div className="badge-right">
                        <span className={`badge rounded-pill ${act.is_regular ? 'bg-success' : 'bg-warning text-dark'}`}>
                          {act.is_regular ? 'Регулярно' : 'Разово'}
                        </span>
                      </div>
                    )}
                      <p className="text-success fw-bold fs-8">{act.price} грн.</p>
                      <p className="text-success fw-bold fs-8">{act.duration} хв.</p>
                      <div className="mt-auto">
                        <button onClick={() => handleSignUp(act.id)} className="btn btn-success w-100 mb-2">Записатись!</button>
                        {isAuthenticated && role === 'owner' && (
                          <div className="d-flex gap-1">
                            <Link to={`/edit/${act.id}`} className="btn btn-sm btn-warning flex-fill"
                              style={{ backgroundColor: 'transparent', color: '#faa200ff', textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}>Edit</Link>
                            <button onClick={() => { setActivityToDelete(act); setShowDeleteModal(true); }}
                              className="btn btn-sm btn-danger"
                              style={{ backgroundColor: 'transparent', color: '#dd150eff', textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}>Delete</button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* --- Пагинация для всех и фильтрованных вкладок --- */}
          {totalPages > 1 && (
            <ReactPaginate
              previousLabel="← Назад"
              nextLabel="Вперёд →"
              pageCount={totalPages}
              onPageChange={handlePageChange}
              containerClassName="pagination justify-content-center"
              pageClassName="page-item"
              pageLinkClassName="page-link"
              previousClassName="page-item"
              nextClassName="page-item"
              previousLinkClassName="page-link"
              nextLinkClassName="page-link"
              activeClassName="active"
              disabledClassName="disabled"
              forcePage={page - 1}
            />
          )}
        </>
      )}

      {/* Модалка удаления */}
      <DeleteActivityModal
        show={showDeleteModal}
        onHide={() => setShowDeleteModal(false)}
        onDelete={handleDeleteConfirm}
        activityId={activityToDelete?.id}
        activityName={activityToDelete?.name || 'активність'}
      />
    </div>
  );
};

export default Activities;