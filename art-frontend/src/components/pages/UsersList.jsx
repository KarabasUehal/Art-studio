import React, { useState, useEffect, useContext } from 'react';
import api from '../../utils/api.jsx';
import { AuthContext } from '../../context/AuthContext.jsx';
import ReactPaginate from 'react-paginate';
import '@styles/List.css'; 

const UsersList = ({ isAuthenticated }) => {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [size] = useState(9);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const { role } = useContext(AuthContext);

  const [searchQuery, setSearchQuery] = useState('');
  const [filteredUsers, setFilteredUsers] = useState([]);

  useEffect(() => {
  if (isAuthenticated && role === 'owner') {
    fetchUsers(page, size);
  }
}, [page, size, isAuthenticated, role]);

useEffect(() => {
  if (!searchQuery.trim()) {
    setFilteredUsers(users); // поиск пустой → показываем всех
    return;
  }

  const query = searchQuery.toLowerCase().trim();

  const filtered = users.filter(user => {
    const fullName = `${(user.name || '').toLowerCase()} ${(user.surname || '').toLowerCase()}`;
    const phone = (user.phone_number || '').toLowerCase();

    return fullName.includes(query) || phone.includes(query);
  });

  setFilteredUsers(filtered);
}, [searchQuery, users]);

  const fetchUsers = async (pageNum = page, sizeNum = size) => {
    setLoading(true);
    try {
      const params = {
      page: pageNum,
      size: sizeNum,
    };

      const response = await api.get('/admin/users', { params });
      const fetchedUsers = response.data.users || [];
      setUsers(fetchedUsers);
      setTotalPages(response.data.total_pages || 1);
      setTotalCount(response.data.total_count || 0);
      setPage(response.data.current_page || pageNum);
    } catch (error) {
      console.error('Помилка при завантаженні всіх записів:', error);
      setError('Неможливо завантажити записи. Спробуйте пізніше.');
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated || role !== 'owner') {
    return <div className="text-center mt-5">Доступ лише для власника студії! 🔐</div>;
  }

  if (error) return <div className="alert alert-danger text-center">{error}</div>;
  if (loading) return <div className="text-center mt-5">Завантаження користувачів...</div>;
  if (users.length === 0 && totalCount === 0) return <div className="text-center mt-5">Користувачів не знайдено</div>;

  const handlePageChange = ({ selected }) => {
    const newPage = selected + 1;
    setPage(newPage);
    fetchUsers(newPage); 
  };

  const getKidEmoji = (gender) => gender === 'male' ? '👦' : '👧';

  const formatTime = (timeStr) => {
    if (!timeStr) return 'Не вказана';
    const date = new Date(timeStr);
    if (isNaN(date.getTime())) return 'Не вказана';
    return date.toLocaleString('uk-UA', { 
      dateStyle: 'short',  
      timeStyle: 'short',
      timeZone: "UTC"      
    });
  };

  return (
  <div className="list-page" lang="uk">
    <h2 className="list-title">Усі клієнти студії</h2>
    
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
      ) : filteredUsers.length === 0 ? (
        <div className="text-center mt-5">
          {searchQuery.trim() 
            ? `Користувачів за запитом "${searchQuery}" не знайдено` 
            : 'Користувачів не знайдено'}
        </div>
      ) : (
    <div className="list-grid">
      {filteredUsers.map((user) => (
        <div key={user.id} className="list-grid-item">
          <div className="list-card">
            <div className="list-card-body">
              <h5 className="list-card-title"><strong>{user.name} {user.surname}</strong></h5>
              
              <p className="list-text"><strong>Телефон:</strong> {user.phone_number}</p>
              <p className="list-text"><strong>З нами з:</strong> {formatTime(user.created_at)}</p>
              <p className="list-text">
                   <strong>Дiти: </strong> 
                   {user.user_kids && Array.isArray(user.user_kids) && user.user_kids.length > 0 ? (
                     <ul>
                       {user.user_kids.map((kid, kIdx) => (
                         <li key={kIdx}>
                           {getKidEmoji(kid.gender)} {kid.name}, {kid.age} років
                         </li>
                       ))}
                     </ul>
                   ) : (
                     <span>Немає дітей</span>
                   )}
              </p>

            </div>
          </div>
        </div>
      ))}
    </div>
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
 );
};

export default UsersList;