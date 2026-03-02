import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api.jsx';
import { AuthContext } from '../../context/AuthContext.jsx';
import DeleteModal from './modals/DeleteModal.jsx';
import ReactPaginate from 'react-paginate';
import '@styles/List.css'; 

const AdminKidsList = ({ isAuthenticated }) => {
  const [kids, setKids] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [size] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const { role } = useContext(AuthContext);
  const navigate = useNavigate();

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [kidToDelete, setKidToDelete] = useState(null);

  useEffect(() => {
    if (isAuthenticated && role === 'owner') {
      fetchKids(page, size);
    }
  }, [page, size, isAuthenticated, role]);

  const fetchKids = async (pageNum, sizeNum) => {
    setLoading(true);
    try {
      const response = await api.get('/admin/kids', { params: { page: pageNum, size: sizeNum } });
      setKids(response.data.user_kids || []);
      setTotalPages(response.data.total_pages || 1);
      setTotalCount(response.data.total_count || 0);
    } catch (error) {
      console.error('Помилка при завантаженні даних дітей:', error);
      setError('Неможливо завантажити дані дітей. Спробуйте пізніше.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/client/kids/${kidToDelete.ID}`);
      fetchKids(page, size);  // Refetch после удаления
      setShowDeleteModal(false);  // Закрыть модал
    } catch (err) {
      const msg = err.response?.status === 404 ? "Дитина не знайдена" : err.response?.data?.error || "Помилка видалення";
      alert(`Помилка при видаленні: ${msg}`);
    }
  };

  if (!isAuthenticated || role !== 'owner') {
    return <div className="text-center mt-5">Доступ лише для власника студії! 🔐</div>;
  }

  if (error) return <div className="alert alert-danger text-center">{error}</div>;
  if (loading) return <div className="text-center mt-5">Завантаження даних дітей...</div>;

  const handlePageChange = ({ selected }) => setPage(selected + 1);

  const getKidEmoji = (gender) => gender === 'male' ? '👦' : '👧';

  return (
    <div className="list-page">
    <h2 className="list-title">Усі діти студії</h2>
     {kids.length === 0 && totalCount === 0 ? (
        <p className="empty-message">
          Дітей не знайдено
        </p>
     ) : (
      <div className="list-grid">
        {kids.map((kid) => (
          <div key={kid.id} className="list-grid-item">
            <div className="list-card">
            <div className="list-card-body">
              <h5 className="list-card-title">
                <strong className="list-strong">
                  {kid.name}
                </strong>
              </h5>
                <p className="list-text"><strong>Вiк:</strong> {kid.age}</p>
                <p className="list-text"><strong>Стать:</strong> {kid.gender === 'male' ? 'Хлопчик' : kid.gender === 'female' ? 'Дівчинка' : 'Неизвестно'} {getKidEmoji(kid.gender)}</p>
                <p className="list-text"><strong>Батько:</strong> {kid.parent_name}</p>
                <div className="list-buttons">
                  <button
                    onClick={() => navigate(`/client/kids/edit/${kid.ID}`)}
                    className="list-edit-btn"
                  >
                    Редагувати
                  </button>
                  <button 
                    onClick={() => { setKidToDelete(kid); setShowDeleteModal(true); }}
                    className="list-delete-btn"
                  >
                    Видалити
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>)

     }
      
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

      <DeleteModal
        show={showDeleteModal}
        onHide={() => setShowDeleteModal(false)}
        onDelete={handleDelete}
        modalTitle={`Видалити данi дитини?`}
        modalElementName={`${kidToDelete?.name}?`}
        modalQuestion="Ви впевнені, що хочете видалити данi дитини"
        modalWarning="Після видалення цю дію неможливо буде скасувати."
      />
    </div>
  );
};

export default AdminKidsList;