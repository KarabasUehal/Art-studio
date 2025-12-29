import React, { useState, useEffect, useContext } from 'react';
import api from '../../utils/api.jsx';
import { AuthContext } from '../../context/AuthContext.jsx';
import DeleteRecordModal from './DeleteRecordModal.jsx';
import ReactPaginate from 'react-paginate';
import '@styles/List.css'; 

const RecordsList = ({ isAuthenticated }) => {
  const [records, setRecords] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [size] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const { role } = useContext(AuthContext);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState(null);

  useEffect(() => {
    if (isAuthenticated && role === 'owner') {
      fetchRecords(page, size);
    }
  }, [page, size, isAuthenticated, role]);

  const fetchRecords = async (pageNum, sizeNum) => {
    setLoading(true);
    try {
      const response = await api.get('/records', { params: { page: pageNum, size: sizeNum } });
      setRecords(response.data.records || []);
      setTotalPages(response.data.total_pages || 1);
      setTotalCount(response.data.total_count || 0);
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

  const handleDeleteConfirm = async (id) => {
    try {
      await api.delete(`/records/${id}`);
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
  if (records.length === 0 && totalCount === 0) return <div className="text-center mt-5">Записів не знайдено</div>;

  const handlePageChange = ({ selected }) => setPage(selected + 1);

  const getKidEmoji = (gender) => gender === 'male' ? '👦' : '👧';

  return (
  <div className="list-page">
    <h2 className="list-title">Усі записи до студії</h2>

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
                
                {rec.items.map((item, idx) => (
                  <div key={idx} className="list-item">
                    <p><strong>Майстер-клас:</strong> <strong className='list-strong'>{item.activity_name}</strong></p>
                    <p><strong>Кількість дітей:</strong> {item.number_of_kids}</p>
                    <p><strong>Дата заняття:</strong> {formatSlotTime(item.date)}</p>
                    <ul className="list-item-elements">
                      {item.kids.map((kid, kIdx) => (
                        <li key={kIdx}>
                          {getKidEmoji(kid.gender)} {kid.name}, {kid.age} років
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
                
                <button 
                  onClick={() => { setRecordToDelete(rec); setShowDeleteModal(true); }}
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

    {totalPages > 1 && (
      <ReactPaginate
        previousLabel="← Назад"
        nextLabel="Вперед →"
        pageCount={totalPages}
        onPageChange={handlePageChange}
        containerClassName="records-pagination"
        pageLinkClassName="records-page-link"
        activeClassName="active"
        forcePage={page - 1}
      />
    )}

    <DeleteRecordModal
      show={showDeleteModal}
      onHide={() => setShowDeleteModal(false)}
      onDelete={handleDeleteConfirm}
      recordId={recordToDelete?.id}
      recordName={`${recordToDelete?.items?.[0]?.activity_name || 'запис'}`}
    />
  </div>
 );
};

export default RecordsList;