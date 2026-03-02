import React, { useState, useEffect, useContext } from 'react';
import api from '../../utils/api.jsx';
import { AuthContext } from '../../context/AuthContext.jsx';
import DeleteModal from './modals/DeleteModal.jsx';
import ReactPaginate from 'react-paginate';
import '@styles/List.css'; 

const AdminRecordsList = ({ isAuthenticated }) => {
  const [records, setRecords] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [size] = useState(9);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const { role } = useContext(AuthContext);

  const [selectedDate, setSelectedDate] = useState('');

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [modalDate, setModalDate] = useState('');
  const [recordToDelete, setRecordToDelete] = useState(null);

  useEffect(() => {
  if (isAuthenticated && role === 'owner') {
    fetchRecords(page, size);
  }
}, [page, size, isAuthenticated, role, selectedDate]);

useEffect(() => {
  if (selectedDate) {
    setPage(1);
  }
}, [selectedDate]);

  const fetchRecords = async (pageNum = page, sizeNum = size) => {
    setLoading(true);
    try {
      const params = {
      page: pageNum,
      size: sizeNum,
    };
    if (selectedDate) {
      params.date = selectedDate; 
    }

      const response = await api.get('/records', { params });
      const fetchedRecords = response.data.records || [];
      setRecords(fetchedRecords);
      setTotalPages(response.data.total_pages || 1);
      setTotalCount(response.data.total_count || 0);
      setPage(response.data.current_page || pageNum);
    } catch (error) {
      console.error('Помилка при завантаженні всіх записів:', error);
      setError('Неможливо завантажити записи. Спробуйте пізніше.');
    } finally {
      setLoading(false);
    }
  };

  const formatSlotTime = (timeStr) => {
    if (!timeStr) return 'Не указана';
    const date = new Date(timeStr);
    if (isNaN(date.getTime())) return 'Не указана';
    return date.toLocaleString('uk-UA', { 
      dateStyle: 'short',  
      timeStyle: 'short',
      timeZone: "UTC"   
    });
  };

    const formatStartTime = (timeStr) => {
    if (!timeStr) return 'Не указана';
    const date = new Date(timeStr);
    if (isNaN(date.getTime())) return 'Не указана';
    return date.toLocaleString('uk-UA', { 
      dateStyle: 'short',  
      timeStyle: 'short',   
    });
  };

  const handleDeleteConfirm = async () => {
    try {
      await api.delete(`/records/${recordToDelete.id}`);
      fetchRecords(page, size);  // Refetch после удаления
      setShowDeleteModal(false);  // Закрыть модал
    } catch (err) {
      const msg = err.response?.status === 404 ? "Запись не найдена" : err.response?.data?.error || "Ошибка удаления";
      alert(`Помилка при видаленні: ${msg}`);
    }
  };

  if (!isAuthenticated || role !== 'owner') {
    return <div className="text-center mt-5">Доступ лише для власника студії! 🔐</div>;
  }

  if (error) return <div className="alert alert-danger text-center">{error}</div>;
  if (loading) return <div className="text-center mt-5">Завантаження записів...</div>;

  const handlePageChange = ({ selected }) => {
    const newPage = selected + 1;
    setPage(newPage);
    fetchRecords(newPage); 
  };

  const getKidEmoji = (gender) => gender === 'male' ? '👦' : '👧';

  return (
  <div className="list-page" lang="uk">
    <h2 className="list-title">Усі записи до студії</h2>
    
    {/* Фильтр по дате */}
      <div className="list-filter">
        <label className="list-filter-label">
          Фільтр за датою заняття:
        </label>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="list-filter-input"
        />
        {selectedDate && (
          <button
            onClick={() => setSelectedDate('')}
            className="list-filter-clear-button"
          >
            Очистити
          </button>
        )}
      </div>

      {records.length === 0 ? (
        <p className="empty-message">
          {selectedDate ? 'Записів на обрану дату не знайдено' : 'Записів не знайдено'}
        </p>
      ) : (
    <div className="list-grid">
      {records.map((rec) => (
        <div key={rec.id} className="list-grid-item">
          <div className="list-card">
            <div className="list-card-body">
              <h5 className="list-card-title">Запис #{rec.id}</h5>
              
              <p className="list-text"><strong>Хто з батьків записав:</strong> {rec.parent_name}</p>
              <p className="list-text"><strong>Телефон:</strong> {rec.phone_number}</p>
              <p className="list-text"><strong>Дата створення:</strong> {formatStartTime(rec.created_at)}</p>
              <p className="list-text"><strong>Загальна сума:</strong> {rec.total_price} грн.</p>

              <div className="list-details">
                <h5 className="list-details-title">Деталі:</h5>
                
                
                  <div className="list-item">
                    <p><strong>Майстер-клас:</strong> <strong className='list-strong'>{rec.details.activity_name}</strong></p>
                    <p><strong>Кількість дітей:</strong> {rec.details.number_of_kids}</p>
                    <p><strong>Дата заняття:</strong> {formatSlotTime(rec.details.date)}</p>
                    <ul className="list-item-elements">
                      {rec.details.kids.map((kid, kIdx) => (
                        <li key={kIdx}>
                          {getKidEmoji(kid.gender)} {kid.name}, {kid.age} років
                        </li>
                      ))}
                    </ul>
                  </div>
                
                
                <button 
                  onClick={() => { 
                    setRecordToDelete(rec);
                    setModalDate(formatSlotTime(rec?.details?.date));
                    setShowDeleteModal(true); 
                  }}
                  className="list-delete-btn"
                >
                  Видалити
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
      )}

    {totalPages > 1 && (
        <ReactPaginate
          previousLabel="← Назад"
          nextLabel="Вперед →"
          pageCount={totalPages}
          onPageChange={handlePageChange}
          forcePage={page - 1}
          containerClassName="pagination justify-content-center"
          pageClassName="list-page-item"
          pageLinkClassName="list-page-link"
          previousClassName="list-page-item"
          nextClassName="list-page-item"
          previousLinkClassName="list-page-link"
          nextLinkClassName="list-page-link"
          activeClassName="active"
          disabledClassName="disabled"
        />
      )}

    {recordToDelete && (
    <DeleteModal
      show={showDeleteModal}
      onHide={() => setShowDeleteModal(false)}
      onDelete={handleDeleteConfirm}
      modalTitle={`Видалити запис для ${recordToDelete?.parent_name}?`}
      modalElementName={`${recordToDelete?.parent_name} на ${modalDate} на ${recordToDelete?.details?.activity_name}?`}
      modalQuestion="Ви впевнені, що хочете видалити запис для"
      modalWarning="Після видалення цю дію неможливо буде скасувати."
    />
    )}
  </div>
 );
};

export default AdminRecordsList;