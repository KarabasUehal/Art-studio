import React, { useState, useEffect, useContext } from 'react';
import api from '../../utils/api';
import { AuthContext } from '../../context/AuthContext';
import ReactPaginate from 'react-paginate';
import '@styles/List.css'; 

const ClientRecords = ({ isAuthenticated }) => {
  const [records, setRecords] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [size] = useState(9);
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

  const getKidEmoji = (gender) => gender === 'male' ? '👦' : '👧';

  return (
  <div className="list-page">
    <h2 className="list-title">
      Мої записи 
    </h2>

    <div className="list-grid">
      {records.map((rec) => (
        <div key={rec.id} className="list-grid-item">
         <div className="list-card">
          <div className="list-card-body">
            <h5 className="list-card-title">
              Запис #{rec.id}
            </h5>

            <p className="list-text">
              <strong>Дата створення:</strong> {formatStartTime(rec.created_at)}
            </p>

            <p className="list-text">
              <strong>Загальна сума:</strong> {rec.total_price} грн.
            </p>

            <div className="list-details">
              <h5 className="list-details-title">Деталі:</h5>

              <div className="list-item">
                <p>
                  <strong >Майстер-клас:</strong > <strong className='list-strong'>{rec.details.activity_name}</strong>
                </p>
                <p>
                  <strong>Кiлькiсть дiтей:</strong> {rec.details.number_of_kids}
                </p>
                <p>
                  <strong>Дата заняття:</strong> {formatSlotTime(rec.details.date)}
                </p>

                <ul className="list-item-elements">
                  {rec.details.kids.map((kid, kIdx) => (
                    <li key={kIdx}>
                      {getKidEmoji(kid.gender)} {kid.name}, {kid.age} років
                    </li>
                  ))}
                </ul>
              </div>
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
    </div>
  );
};

export default ClientRecords;