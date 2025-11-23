import React, { useState, useEffect, useContext } from 'react';
import api from '../utils/api';
import { AuthContext } from '../context/AuthContext';
import ReactPaginate from 'react-paginate';
import './Activities.css'; 

const ClientRecords = ({ isAuthenticated }) => {
  const [records, setRecords] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [size] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    if (isAuthenticated) {
      fetchRecords(page, size);
    }
  }, [page, size, isAuthenticated]);

  const fetchRecords = async (pageNum, sizeNum) => {
    setLoading(true);
    try {
      const response = await api.get('/client/records', { params: { page: pageNum, size: sizeNum } });
      setRecords(response.data.records || []);
      setTotalPages(response.data.total_pages || 1);
      setTotalCount(response.data.total_count || 0);
    } catch (error) {
      console.error('Ошибка при загрузке записей:', error);
      setError('Не удалось загрузить ваши записи. Попробуйте позже.');
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) {
    return <div className="text-center mt-5">Увійдіть, щоб побачити свої записи! 🌟</div>;
  }

  if (error) return <div className="alert alert-danger text-center">{error}</div>;
  if (loading) return <div className="text-center mt-5">Завантажуємо ваші записи...🎨</div>;
  if (records.length === 0 && totalCount === 0) return <div className="text-center mt-5">Поки що немає записів. Виберіть майстер-клас та запишіться!</div>;

  const handlePageChange = ({ selected }) => setPage(selected + 1);

  const formatSlotTime = (timeStr) => {
    if (!timeStr) return 'Не указана';
    const date = new Date(timeStr);
    if (isNaN(date.getTime())) return 'Не указана';
    return date.toLocaleString('uk-UA', { 
      dateStyle: 'short',  
      timeStyle: 'short'   
    });
  };

  const getKidEmoji = (gender) => gender === 'male' ? '👦' : '👧';

  return (
    <div>
      <h2 className="text-center mb-4" style={{ color: '#ff9ff3' }}>Мої записи на майстер-класи ✨</h2>
      <div className="row">
        {records.map((rec) => (
          <div key={rec.id} className="col-md-6 col-lg-4 mb-4">
            <div className="card h-100 shadow-sm" style={{ borderRadius: '15px', overflow: 'hidden', border: '2px solid #ff6b6b' }}>
              <div className="card-body d-flex flex-column">
                <h5 className="card-title text-primary">Запис #{rec.id}</h5>
                <p className="card-text"><strong>Дата створення:</strong> {formatSlotTime(rec.created_at)}</p>
                <p className="card-text"><strong>Загальна сума:</strong> {rec.total_price} грн.</p>
                <div className="mt-auto">
                  <h6 className="card-title text-primary">Деталі:</h6>
                  {rec.items.map((item, idx) => (
                    <div key={idx} className="mb-2 p-2 bg-light rounded">
                      <p><strong>Майстер-клас:</strong> {item.activity_name} </p>
                      <p><strong>Кiлькiсть дiтей:</strong> {item.number_of_kids}</p>
                      <p><strong>Дата заняття:</strong> {formatSlotTime(item.date)}</p>
                      <ul className="list-unstyled small">
                        {item.kids.map((kid, kIdx) => (
                          <li key={kIdx}>
                            {getKidEmoji(kid.gender)} {kid.name}, {kid.age} років 
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
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
        />
      )}
    </div>
  );
};

export default ClientRecords;