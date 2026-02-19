import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../utils/api';
import SuccessExtendSubModal from './SuccessExtendSubModal';
import DeleteSubscriptionModal from './DeleteSubscriptionModal';
import '@styles//SubscriptionsPage.css';
import '@styles//Checkbox.css';


const SubscriptionsPage = () => {
  const [subs, setSubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState([]);
  const [selectedSub, setSelectedSub] = useState(null); // Для модалки продления
  const [showSuccessExtendSubModal, setShowSuccessExtendSubModal] = useState(false); // Модалка продления
  const [showDeleteSubscriptionModal, setShowDeleteSubscriptionModal] = useState(false); // Модалка удаления
  const [bulk, setBulk] = useState(false);

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const fetchSubscriptions = async () => {
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

  const toggleSelect = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === subs.length && subs.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(subs.map(s => s.ID));
    }
  };

  const handleBulkExtend = () => {
  if (selectedIds.length === 0) return;
  setSelectedSub(null); 
  setBulk(true);
  setShowSuccessExtendSubModal(true);
};

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    setSelectedSub(null); 
    setBulk(true);
    setShowDeleteSubscriptionModal(true);
  };

   const handleExtendSub = (sub) => {
  setSelectedIds([sub.ID]);
  setSelectedSub(sub);
  setBulk(false);
  setShowSuccessExtendSubModal(true);
};

  const handleConfirmExtend= async () => {
    console.log('Продовжуємо абонементи з ID:', selectedIds);
    
    try {
      await Promise.all(
        selectedIds.map(id => api.patch(`/subscriptions/${id}/extend`))
      );
      setSelectedIds([]);
      fetchSubscriptions();
    } catch (err) {
      alert('Помилка продовження');
    }
  };

  const handleDelete = (sub) => {
    setSelectedIds([sub.ID]);
    setSelectedSub(sub);
    setBulk(false);
    setShowDeleteSubscriptionModal(true);
  };

  const handleConfirmDelete = async () => {
    console.log('Видаляємо абонементи з ID:', selectedIds);
    try {
      await Promise.all(
        selectedIds.map(id => api.delete(`/subscriptions/${id}`))
      );
      setSelectedIds([]);
      fetchSubscriptions();
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
        <h1 className="admin-subscriptions-title">Усі абонементи</h1>

        <div className="sub-wrapper">
          <Link to="/admin/subscriptions/add" className="btn-issue-sub">
            Оформити абонемент
          </Link>
        </div>

        {hasSelection && (
          <div className="has-selection-block">
            <strong className="text-warning">
              Вибрано: {selectedIds.length}
            </strong>
            <div className="actions">
              <button
                onClick={handleBulkExtend}
                className="btn-admin btn-admin-extend"
              >
                Продовжити усі
              </button>
              <button
                onClick={handleBulkDelete}
                className="btn-admin btn-admin-delete"
              >
                Видалити усі
              </button>
            </div>
          </div>
        )}

        {subs.length === 0 ? (
          <p className="empty-message">
            Поки немає виданих абонементів
          </p>
        ) : (
          <div className="table-responsive">
            <table className="admin-subscriptions-table">
              <thead>
                <tr>
                  <th>
                    <label className="custom-checkbox">
                        <input
                        type="checkbox"
                        checked={
                             subs.length > 0 &&
                             selectedIds.length === subs.length
                                }
                        onChange={toggleSelectAll}
                        />
                        <span className="checkmark"></span>
                        <span className="checkbox-text">Усі</span>
                    </label>
                  </th>
                  <th>Користувач</th>
                  <th>Тип</th>
                  <th>Дитина</th>
                  <th>Занять</th>
                  <th>Почався</th>
                  <th>Спливає</th>
                  <th>Дії</th>
                </tr>
              </thead>
              <tbody>
                {subs.map((sub) => {
                  const isSelected = selectedIds.includes(sub.ID);

                  return (
                    <tr key={sub.ID}>
                      <td onClick={(e) => e.stopPropagation()}>
                        <label className="custom-checkbox">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelect(sub.ID)}
                          />
                          <span className="checkmark"></span>
                        </label>
                      </td>
                      <td>{sub.user?.name || sub.user_id}</td>
                      <td>{sub.subscription_type?.name || '—'}</td>
                      <td>
                        {sub.sub_kids && sub.sub_kids.length > 0
                          ? sub.sub_kids
                              .map(k => `${k.name} (${k.age} років)`)
                              .join(', ')
                          : '—'}
                      </td>
                      <td>{sub.visits_used}/{sub.visits_total}</td>
                      <td>
                        {new Date(sub.start_date).toLocaleDateString('uk-UA')}
                      </td>
                      <td>
                        {new Date(sub.end_date).toLocaleDateString('uk-UA')}
                      </td>

                      <td>
                        <div className="btn-sub-group">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleExtendSub(sub);
                            }}
                            className="btn-admin btn-admin-extend"
                          >
                            Продовжити
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(sub);
                            }}
                            className="btn-admin btn-admin-delete"
                          >
                            Видалити
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <SuccessExtendSubModal
        show={showSuccessExtendSubModal}
        onHide={() => {
          setShowSuccessExtendSubModal(false);
          setSelectedSub(null);
        }}
        bulk={bulk}
        onExtend={handleConfirmExtend}
        subscriptionIds={selectedIds}
        subInfo={{
          subName: selectedSub?.subscription_type?.name || '—',
          kidName: selectedSub?.sub_kids && selectedSub.sub_kids.length > 0
          ? selectedSub.sub_kids.map(k => k.name).join(', ')
          : 'Дитина не вказана'
        }}
        />

        <DeleteSubscriptionModal
        show={showDeleteSubscriptionModal}
        onHide={() => {
          setShowDeleteSubscriptionModal(false);
          setSelectedSub(null);
        }}
        bulk={bulk}
        onDelete={handleConfirmDelete}
        subIds={selectedIds}
        subInfo={{
          subName: selectedSub?.subscription_type?.name || '—',
          kidName: selectedSub?.sub_kids && selectedSub.sub_kids.length > 0
          ? selectedSub.sub_kids.map(k => k.name).join(', ')
          : 'Дитина не вказана'
        }}
        />

      </div>
    </div>
  );

};

export default SubscriptionsPage;
