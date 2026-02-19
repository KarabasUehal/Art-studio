import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import ReactPaginate from 'react-paginate';
import api from '../../utils/api';
import { AuthContext } from '../../context/AuthContext.jsx';
import DeleteModal from './DeleteModal';
import SuccessModal from './SuccessModal';
import '@styles//List.css';
import '@styles//SubscriptionsPage.css';
import '@styles//Checkbox.css';


const SubscriptionsPage = () => {
  const [subs, setSubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [size] = useState(9);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedIds, setSelectedIds] = useState([]);
  const [selectedSub, setSelectedSub] = useState(null); // Для модалки продления
  const [showSuccessModal, setShowSuccessModal] = useState(false); // Модалка продления
  const [showDeleteModal, setShowDeleteModal] = useState(false); // Модалка удаления
  const [bulk, setBulk] = useState(false);
  const [error, setError] = useState('');
  const { role } = useContext(AuthContext);

  const [searchQuery, setSearchQuery] = useState('');
  const [filteredSubs, setFilteredSubs] = useState([]);

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredSubs(subs); // поиск пустой → показываем всех
      return;
    }
const query = searchQuery.toLowerCase().trim();

  const filtered = subs.filter(sub => {
    const subName = `${(sub.subscription_type?.name || '').toLowerCase()}`;
    const userName = (sub.user?.name || '').toLowerCase();

    return subName.includes(query) || userName.includes(query);
  });

  setFilteredSubs(filtered);
}, [searchQuery, subs]);

  const fetchSubscriptions = async () => {
    setLoading(true);
    try {
      const res = await api.get('/subscriptions');
      setSubs(res.data.subscriptions || res.data || []);
    } catch (err) {
      console.error('Ошибка загрузки абонементов:', err);
      alert('Не вдалося завантажити абонементи');
    } finally {
      setLoading(false);
    }
  };

    const handlePageChange = ({ selected }) => {
    const newPage = selected + 1;
    setPage(newPage);
    fetchSubscriptions(newPage); 
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === subs.length && subs.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredSubs.map(s => s.ID));
    }
  };

  const handleBulkExtend = () => {
  if (selectedIds.length === 0) return;
  setSelectedSub(null); 
  setBulk(true);
  setShowSuccessModal(true);
};

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    setSelectedSub(null); 
    setBulk(true);
    setShowDeleteModal(true);
  };

  const handleExtendConfirm = async () => {
    console.log('Продовжуємо абонементи з ID:', selectedIds);
    
    try {
      await Promise.all(
        selectedIds.map(id => api.patch(`/subscriptions/${id}/extend`))
      );
      setSelectedIds([]);
      fetchSubscriptions();
      setShowSuccessModal(false);
    } catch (err) {
      alert('Помилка продовження');
    }
  };

  const handleDeleteConfirm = async () => {
    console.log('Видаляємо абонементи з ID:', selectedIds);
    try {
      await Promise.all(
        selectedIds.map(id => api.delete(`/subscriptions/${id}`))
      );
      setSelectedIds([]);
      fetchSubscriptions();
      setShowDeleteModal(false);
    } catch (err) {
      alert('Помилка видалення');
    }
    };

  if (loading) {
    return <div className="text-center py-5 text-white">Завантаження...</div>;
  }

  const hasSelection = selectedIds.length > 0;

  return (
    <div className="admin-subscriptions-page">
      <div className="admin-subscriptions-container">

        <div className="sub-wrapper">
                  <Link to="/admin/subscriptions/add" className="list-btn-add">
                    Оформити абонемент
                  </Link>
                </div>
        
                {hasSelection && (
                  <div className="has-selection-block">
                    <strong className="selection-text-warning">
                      Вибрано: {selectedIds.length}
                    </strong>
                    <div className="actions">
                      <button
                        onClick={handleBulkExtend}
                        className="list-success-btn"
                      >
                        Продовжити усі
                      </button>
                      <button
                        onClick={handleBulkDelete}
                        className="list-delete-btn"
                      >
                        Видалити усі
                      </button>
                    </div>
                  </div>
                )}
        

    <div className="list-page" lang="uk">
    
      <input
      type="text"
      placeholder="Пошук..."
      value={searchQuery}
      onChange={(e) => setSearchQuery(e.target.value)}
      className="templates-search"
    />

      {loading ? (
      <div className="text-center mt-5">Завантаження користувачів...</div>
      ) : error ? (
        <div className="alert alert-danger text-center">{error}</div>
      ) : filteredSubs.length === 0 ? (
          <p className="empty-message">
          {searchQuery.trim() 
            ? `Придбаних абонементів за запитом "${searchQuery}" не знайдено` 
            : 'Придбаних абонементів не знайдено'}
          </p>
      ) : (
        <>
        <div className="select-all">
  <label className="custom-checkbox">
    <input
      type="checkbox"
      checked={
        filteredSubs.length > 0 &&
        selectedIds.length === filteredSubs.length
      }
      onChange={toggleSelectAll}
    />
    <span className="checkmark"></span>
    <span className="checkbox-text">Вибрати усі</span>
  </label>
</div>
    <div className="list-grid">
      {filteredSubs.map((sub) => (
        
        <div key={sub.ID} className="list-grid-item">
          <div className="list-card">

            <div className="list-card-body">
                  <label className="custom-checkbox card-checkbox">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(sub.ID)}
                    onChange={() => toggleSelect(sub.ID)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <span className="checkmark"></span>
                  </label>

              <h5 className="list-card-title"><strong>{sub.user?.name} {sub.user?.surname}</strong></h5>
              
              <p className="list-text"><strong>Напрям:</strong> {sub.subscription_type?.name || '—'}</p>
              <p className="list-text"><strong>Дитина:</strong> {sub.sub_kids && sub.sub_kids.length > 0
                          ? sub.sub_kids
                              .map(k => `${k.name} (${k.age} років)`)
                              .join(', ')
                          : '—'}
              </p>
              <p className="list-text"><strong>Занять:</strong> {sub.visits_used}/{sub.visits_total}</p>
              <p className="list-text"><strong>Почався:</strong> {new Date(sub.start_date).toLocaleDateString('uk-UA')}</p>
              <p className="list-text"><strong>Спливає:</strong> {new Date(sub.end_date).toLocaleDateString('uk-UA')}</p>

                    <div className="admin-list-buttons">
                      <button
                        onClick={() => {
                          setSelectedIds([sub.ID]);    
                          setSelectedSub(sub);
                          setShowSuccessModal(true);
                        }}
                          className="list-success-btn"
                        >
                      Продовжити
                      </button>
                      <button
                      onClick={() => {
                        setSelectedIds([sub.ID]);    
                        setSelectedSub(sub);
                        setShowDeleteModal(true);
                      }}
                      className="list-delete-btn">
                      Видалити
                    </button>
                    </div>
            </div>
          </div>
        </div>
      ))}
    </div>
    </>
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
  </div>

        <SuccessModal
              show={showSuccessModal}
              onHide={() => setShowSuccessModal(false)}
              onSuccess={handleExtendConfirm}
              modalTitle={
                selectedSub
                  ? `Продовжити абонемент?`
                  : `Продовжити ${selectedIds.length} абонементів?`
              }
              modalElementName={
                selectedSub
                  ? `абонемент для ${selectedSub.sub_kids[0]?.name}`
                  : `${selectedIds.length} абонементів`
              }
              modalQuestion="Ви впевнені, що хочете продовжити"
              modalWarning="Після продовження цю дію неможливо буде скасувати."
        />

        <DeleteModal
              show={showDeleteModal}
              onHide={() => setShowDeleteModal(false)}
              onDelete={handleDeleteConfirm}
              modalTitle={
                selectedSub
                  ? `Видалити абонемент?`
                  : `Видалити ${selectedIds.length} абонементів?`
              }
              modalElementName={
                selectedSub
                  ? `абонемент для ${selectedSub.sub_kids[0]?.name}`
                  : `${selectedIds.length} абонементів`
              }
              modalQuestion="Ви впевнені, що хочете видалити "
              modalWarning="Після видалення цю дію неможливо буде скасувати."
            />

   </div>
    </div>
  );
};

export default SubscriptionsPage;
