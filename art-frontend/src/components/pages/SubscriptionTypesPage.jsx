import React, { useState, useEffect, useContext } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import api from '../../utils/api';
import { AuthContext } from '../../context/AuthContext';
import '@styles//SubscriptionTypesPage.css';
import DeleteSubTypeModal from './DeleteSubTypeModal'; 

const SubscriptionTypesPage = () => {
  const { role } = useContext(AuthContext);
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  const [subTypeToDelete, setSubTypeToDelete] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
  fetchTypes();
}, [location.state?.refresh, location.pathname]);

  const fetchTypes = async () => {
  try {
    const res = await api.get('/subscriptions/types');
    const data = res.data;
    console.log('Ответ от бэкенда:', res.data);

    const typesArray = (Array.isArray(data) ? data : data.subscription_types || [])
      .map(type => ({
        ...type,
        id: Number(type.id) || Number(type.ID) || Number(type.Id) 
      }));

    setTypes(typesArray);
  } catch (err) {
    console.error(err);
    setTypes([]);
  } finally {
    setLoading(false);
  }
};

  const handleDelete = async (id) => {
  if (!id || id === 'undefined' || isNaN(id)) {
    alert('ID абонемента не найден');
    console.error('Invalid ID:', id);
    return;
  }

  try {
    await api.delete(`/subscriptions/types/${id}`);

    setTypes(prev => prev.filter(type => type.id !== id));
    fetchTypes(); 
    setShowDeleteModal(false);
  } catch (err) {
    alert('Ошибка удаления');
    console.error(err);
  }
};

  if (loading) return <div className="text-center py-5 text-white">Завантаження...</div>;

  const filteredSubTypes  = types.filter(type => {
  return role === "client" || !role ? type.is_active : type
});

  return (
    <div className="subscription-types-page">
      <div className="subscription-types-container">
        <h1 className="subscription-types-title">Типи абонементів</h1>

        {role === 'owner' && (
          <div className="text-center mb-5">
            <Link to="/admin/subscriptions/types/add" className="btn-add-subtype">
              Додати абонемент
            </Link>
          </div>
        )}

        <div className="row g-4">
          {types.length === 0 ? (
            <p className="empty-message">
            Поки немає виданих абонементів
          </p>
          ) : (
            filteredSubTypes.map((type) => (
              <div key={type.id} className="subtype-col">
                <div className="subscription-type-card">
                  <h4 className="subscription-type-name">{type.name}</h4>
                  <p className="subscription-type-info">
                    <strong>Ціна:</strong> {type.price} грн
                  </p>
                  <p className="subscription-type-info">
                    <strong>Кількість занять:</strong> {type.visits_count}
                  </p>
                  <p className="subscription-type-info">
                    <strong>Термін дії:</strong> {type.duration_days} днів
                  </p>
                  <p className="subscription-type-price">
                    {type.price} ₴
                  </p>

                  {role === 'owner' && (
                    <>
                    <div className="admin-subtype-buttons">
                      <Link
                        to={`/admin/subscriptions/types/edit/${type.id}`}
                        className="btn-subtype-edit"
                      >
                        Редагувати
                      </Link>
                      <button
                      onClick={() => {
                        setSubTypeToDelete(type);
                        setShowDeleteModal(true);
                      }}
                      className="btn-subtype-delete">
                      Видалити
                    </button>
                    </div>
                    <p className="list-text">  
                      {type.is_active ? <strong className="strong-active">Активний</strong> : <strong className="strong-not-active">Неактивний</strong>}
                    </p>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        <DeleteSubTypeModal
        show={showDeleteModal}
        onHide={() => setShowDeleteModal(false)}
        onDelete={handleDelete}
        subTypeId={subTypeToDelete?.id}
        subTypeName={subTypeToDelete?.name || 'тип абонементу'}
      />
      </div>
    </div>
  );
};

export default SubscriptionTypesPage;