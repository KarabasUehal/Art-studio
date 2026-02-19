import React, { useState, useEffect, useContext } from 'react';
import api from '../../utils/api.jsx';
import { AuthContext } from '../../context/AuthContext.jsx';
import ReactPaginate from 'react-paginate';
import '@styles/List.css'; 

const AdminErrorsList = ({ isAuthenticated }) => {
  const [studio_errors, setStudioErrors] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [size] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const { role } = useContext(AuthContext);

  useEffect(() => {
    if (isAuthenticated && role === 'owner') {
      fetchStudioErrors(page, size);
    }
  }, [page, size, isAuthenticated, role]);

  const fetchStudioErrors = async (pageNum, sizeNum) => {
    setLoading(true);
    try {
      const response = await api.get('/admin/errors', { params: { page: pageNum, size: sizeNum } });
      setStudioErrors(response.data.errors || []);
      setTotalPages(response.data.total_pages || 1);
      setTotalCount(response.data.total_count || 0);
    } catch (error) {
      console.error('Помилка при завантаженні помилок:', error);
      setError('Неможливо завантажити помилки. Спробуйте пізніше.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/admin/errors/${id}`);
      fetchStudioErrors(page, size);  // Refetch после удаления
    } catch (err) {
      const msg = err.response?.status === 404 ? "Помилка не знайдена" : err.response?.data?.error || "Не вдалося видалити помилку";
      alert(`Щось трапилось: ${msg}`);
    }
  };

  if (!isAuthenticated || role !== 'owner') {
    return <div className="text-center mt-5">Доступ лише для власника студії! 🔐</div>;
  }

  if (error) return <div className="alert alert-danger text-center">{error}</div>;
  if (loading) return <div className="text-center mt-5">Завантаження помилок...</div>;
  if (studio_errors.length === 0 && totalCount === 0) return <div className="text-center mt-5">Помилок не знайдено</div>;

  const handlePageChange = ({ selected }) => setPage(selected + 1);

  return (
    <div className="list-page">
    <h2 className="list-title">Помилки</h2>
      <div className="list-grid">
        {studio_errors.map((st_err) => (
          <div key={st_err.id} className="list-grid-item">
            <div className="list-card">
            <div className="list-card-body">
              <h5 className="list-card-title">Помилка #{st_err.ID}</h5>
                <p className="list-text">{st_err.Info}</p>
                <div>
                  <button 
                    onClick={() => { handleDelete(st_err.ID) }}
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

export default AdminErrorsList;