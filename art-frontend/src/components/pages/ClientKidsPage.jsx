import React, { useState, useEffect, useContext } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import api from '../../utils/api';
import { AuthContext } from '../../context/AuthContext';
import DeleteKidModal from './DeleteKidModal';
import '@styles/ClientKidsPage.css';

const ClientKidsPage = () => {
  const { role } = useContext(AuthContext);
  const navigate = useNavigate();
  const [kids, setKids] = useState([]);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  const [kidToDelete, setKidToDelete] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    fetchKids();
  }, [location.state?.refresh, location.pathname]);

  const fetchKids = async () => {
    try {
      const res = await api.get('/client/kids');
      const data = res.data;
      if (data && Array.isArray(data.user_kids)) {
      setKids(data.user_kids);  // Используем данные из user_kids
    } else {
      console.error('Полученные данные не соответствуют ожидаемому формату:', data);
      setKids([]);  // Если данные некорректные, устанавливаем пустой массив
    }
  } catch (err) {
    console.error('Ошибка при загрузке детей:', err);
    setKids([]);  // Если ошибка при запросе, очищаем список детей
  } finally {
    setLoading(false);
  }
};

  const handleDelete = async (id) => {
    if (!id || id === 'undefined' || isNaN(id)) {
      alert('ID ребёнка не найден');
      console.error('Invalid ID:', id);
      return;
    }

    try {
      await api.delete(`/client/kids/${id}`);
      setKids((prev) => prev.filter((kid) => kid.ID !== id)); // Обновляем список детей
    } catch (err) {
      alert('Ошибка удаления');
      console.error('Ошибка удаления ребёнка:', err);
    }
  };

  if (loading) return <div className="text-center py-5 text-white">Завантаження...</div>;

  return (
    <div className="kids-page">
      <div className="kids-container">
        <h1 className="kids-title">Діти користувача</h1>

        {(role === 'owner' ||  role === 'client') && (
          <div className="text-center mb-5">
            <Link to="/client/kids/add" className="btn-add-kid">
              Додати дитину
            </Link>
          </div>
        )}

        <div className="row g-4">
          {kids.length === 0 ? (
            <p className="text-center text-white fs-3">Поки немає дітей</p>
          ) : (
            kids.map((kid) => (
              <div key={kid.ID} className="col-md-6 col-lg-4">
                <div className="kid-card">
                  <h4 className="kid-name">{kid.name}</h4>
                  <p className="kid-info">
                    <strong>Вік:</strong> {kid.age} років
                  </p>
                 <p className="kid-info">
                 <strong>Стать:</strong> {kid.gender === 'male' ? 'Хлопчик' : kid.gender === 'female' ? 'Дівчинка' : 'Неизвестно'}
                 </p>

                  {role === 'owner' && (
                    <div className="admin-kid-buttons">
                      <Link
                        to={`/client/kids/edit/${kid.ID}`}
                        className="btn-kid btn-kid-edit"
                      >
                        Редагувати
                      </Link>
                      <button
                      onClick={() => {
                        setKidToDelete(kid);
                        setShowDeleteModal(true);
                      }}
                      className="btn-admin btn-admin-delete">
                      Видалити
                    </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        <DeleteKidModal
        show={showDeleteModal}
        onHide={() => setShowDeleteModal(false)}
        onDelete={handleDelete}
        kidId={kidToDelete?.ID}
        kidName={kidToDelete?.name || 'дитину'}
      />
      </div>
    </div>
  );
};

export default ClientKidsPage;
