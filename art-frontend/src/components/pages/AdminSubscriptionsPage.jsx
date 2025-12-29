import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../utils/api';
import '../styles/AdminSubscriptionsPage.css';

const AdminSubscriptionsPage = () => {
  const [subs, setSubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState([]);

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

  const handleBulkExtend = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Продовжити ${selectedIds.length} абонементів?`)) return;

    try {
      await Promise.all(
        selectedIds.map(id => api.patch(`/subscriptions/${id}/extend`))
      );
      alert('Абонементи продовжено!');
      setSelectedIds([]);
      fetchSubscriptions();
    } catch (err) {
      alert('Помилка продовження');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Видалити ${selectedIds.length} абонементів назавжди?`)) return;

    try {
      await Promise.all(
        selectedIds.map(id => api.delete(`/subscriptions/${id}`))
      );
      alert('Абонементи видалено!');
      setSelectedIds([]);
      fetchSubscriptions();
    } catch (err) {
      alert('Помилка видалення');
    }
  };

  const handleExtend = async (id) => {
    console.log('Продовжуємо абонемент з ID:', id);
    if (!window.confirm('Продовжити цей абонемент?')) return;
    try {
      await api.patch(`/subscriptions/${id}/extend`);
      alert('Продовжено!');
      fetchSubscriptions();
    } catch (err) {
      alert('Помилка');
    }
  };

  const handleDelete = async (id) => {
    console.log('Видаляємо абонемент з ID:', id);
    if (!window.confirm('Видалити назавжди?')) return;
    try {
      await api.delete(`/subscriptions/${id}`);
      alert('Видалено!');
      fetchSubscriptions();
    } catch (err) {
      alert('Помилка');
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

        <div className="text-center mb-4">
          <Link to="/admin/subscriptions/add" className="btn-issue-sub">
            Оформити абонемент
          </Link>
        </div>

        {hasSelection && (
          <div className="text-center mb-4 p-3 bg-dark rounded border border-warning">
            <strong className="text-warning">
              Вибрано: {selectedIds.length}
            </strong>
            <div className="d-inline-block ms-4">
              <button
                onClick={handleBulkExtend}
                className="btn btn-success me-3"
              >
                Продовжити всі
              </button>
              <button
                onClick={handleBulkDelete}
                className="btn btn-danger"
              >
                Видалити всі
              </button>
            </div>
          </div>
        )}

        {subs.length === 0 ? (
          <p className="text-center text-white fs-3">
            Поки немає виданих абонементів
          </p>
        ) : (
          <div className="table-responsive">
            <table className="admin-subscriptions-table table table-dark table-striped">
              <thead>
                <tr>
                  <th>
                    <input
                      type="checkbox"
                      checked={
                        subs.length > 0 &&
                        selectedIds.length === subs.length
                      }
                      onChange={toggleSelectAll}
                    />
                  </th>
                  <th>Користувач</th>
                  <th>Тип</th>
                  <th>Дитина</th>
                  <th>Занять</th>
                  <th>Початок</th>
                  <th>Діє до</th>
                  <th>Статус</th>
                  <th>Дії</th>
                </tr>
              </thead>
              <tbody>
                {subs.map((sub) => {
                  const isSelected = selectedIds.includes(sub.ID);

                  return (
                    <tr key={sub.ID}>
                      <td onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(sub.ID)}
                        />
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
                        <span
                          className={
                            sub.is_active
                              ? 'status-active'
                              : 'status-inactive'
                          }
                        >
                          {sub.is_active ? 'Активний' : 'Неактивний'}
                        </span>
                      </td>
                      <td>
                        <div className="btn-group btn-group-sm">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleExtend(sub.ID);
                            }}
                            className="btn btn-outline-success me-2"
                          >
                            Продовжити
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(sub.ID);
                            }}
                            className="btn btn-outline-danger"
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
      </div>
    </div>
  );
};

export default AdminSubscriptionsPage;
