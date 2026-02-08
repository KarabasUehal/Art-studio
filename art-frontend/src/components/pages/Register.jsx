import React, { useState, useContext, useEffect } from 'react';
import api from '../../utils/api.jsx';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import '@styles/Register.css';

const Register = ({ adminMode = false }) => {
    const { user, isAuthenticated } = useContext(AuthContext);
    const [isAdminMode, setIsAdminMode] = useState(adminMode || (isAuthenticated && user?.role === 'owner'));

    const navigate = useNavigate();
    const [error, setError] = useState('');

    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [phone_number, setPhoneNumber] = useState('');
    const [name, setName] = useState('');
    const [surname, setSurname] = useState('');
    const [role, setRole] = useState('client');

    useEffect(() => {
    setIsAdminMode(adminMode || (isAuthenticated && user?.role === 'owner'));
    setRole(isAdminMode ? '' : 'client');
  }, [adminMode, isAuthenticated, user?.role]);

    // Только латиница + цифры
    const latinRegex = /^[a-zA-Z0-9]+$/;

    // Кириллица (рус + укр)
    const cyrillicRegex = /^[а-яА-ЯёЁіІїЇєЄґҐ\s-]+$/;

    const strongPasswordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{6,}$/;

    const handleUsernameChange = (e) => {
    const value = e.target.value.replace(/[^a-zA-Z0-9]/g, '');
    setUsername(value);
  };

  const handlePasswordChange = (e) => {
    const value = e.target.value.replace(/[^a-zA-Z0-9]/g, '');
    setPassword(value);
  };

  const handleNameChange = (e) => {
    const value = e.target.value.replace(/[^а-яА-ЯёЁіІїЇєЄґҐ\s-]/g, '');
    setName(value);
  };

  const handleSurnameChange = (e) => {
    const value = e.target.value.replace(/[^а-яА-ЯёЁіІїЇєЄґҐ\s-]/g, '');
    setSurname(value);
  };

    const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Валидация (добавил проверку фамилии)
    if (!username || username.length < 6) return setError('Логін повинен бути не менше 6 символів');
    if (!latinRegex.test(username)) return setError('Логін може містити лише латинські літери та цифри');

    if (!password || password.length < 6) return setError('Пароль повинен бути не менше 6 символів');
    if (!strongPasswordRegex.test(password)) return setError('Пароль повинен містити латинські літери та хоча б одну цифру');
    if (!latinRegex.test(password)) return setError('Пароль може містити лише латинські літери та цифри');

    if (!phone_number || phone_number.length < 13) return setError('У номері повинно бути 13 символів');

    if (!name) return setError('Введіть ім\'я');
    if (!cyrillicRegex.test(name)) return setError('Ім\'я може містити лише кирилицю (укр / рус)');

    if (!surname) return setError('Введіть прізвище');
    if (!cyrillicRegex.test(surname)) return setError('Прізвище може містити лише кирилицю (укр / рус)');

    // Для обычных пользователей роль фиксирована, для админа — обязательна
    if (isAdminMode && !role) return setError('Оберіть роль');

    try {
      const endpoint = isAdminMode ? '/admin/register' : '/register';
      await api.post(endpoint, { username, password, phone_number, name, surname, role });
      
      if (isAdminMode) { // Очистка формы для следующего пользователя
        setUsername('');
        setPassword('');
        setPhoneNumber('');
        setName('');
        setSurname('');
        setRole('');
        setError('');
        navigate('/admin/users');
      } else {
        navigate('/login');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Помилка створення профілю');
    }
  };

    const Back = () => {
    navigate('/');
  };

    return (

    <div className="register-form-page">
      <div className="register-form-container">
        <h2 className="register-form-title">
          {isAdminMode ? 'Створення нового користувача' : 'Реєстрація'}
        </h2>
        <form onSubmit={handleSubmit}>
            <div className="register-form-group">
                <label className="register-form-label">Логiн:</label>
                <input type="text" value={username} onChange={(e) => handleUsernameChange(e)} className="register-form-input" required />
            </div>
            <div className="register-form-group">
                <label className="register-form-label">Пароль:</label>
                <input type="password" value={password} onChange={(e) => handlePasswordChange(e)} className="register-form-input" minLength="6" required />
            </div>
            <div className="register-form-group">
                <label className="register-form-label">Номер телефону:</label>
                <input 
                type="tel" 
                value={phone_number} 
                onChange={(e) => {
                // Оставляем только цифры и + (остальное отфильтровываем)
                const onlyDigits = e.target.value.replace(/[^\d+]/g, '');
                setPhoneNumber(onlyDigits);
                }} 
                pattern="\+?[0-9]{10,13}"
                className="register-form-input" 
                placeholder="+380 (XX) XXX-XX-XX"
                maxLength={13} 
                required 
                />
            </div>
            <div className="register-form-group">
                <label className="register-form-label">Iм'я:</label>
                <input type="text" value={name} onChange={(e) => handleNameChange(e)} className="register-form-input" placeholder="Ваше iм'я" required />
            </div>
            <div className="register-form-group">
                <label className="register-form-label">Прізвище:</label>
                <input type="text" value={surname} onChange={(e) => handleSurnameChange(e)} className="register-form-input" placeholder="Ваше прізвище" required />
            </div>
            {isAdminMode && (
            <div className="register-form-group">
              <label htmlFor="role" className="register-form-label">Роль користувача</label>
              <select
                id="role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="register-form-input"
                required
              >
                <option value="">Оберіть роль</option>
                <option value="client">Клієнт</option>
                <option value="owner">Адміністратор</option>
              </select>
            </div>
          )}
            
            {error && <div className="alert alert-danger">{error}</div>}

            <div className="form-actions">
            <button type="button" onClick={Back} className="btn-register-cancel">Назад</button>
            <button type="submit" className="btn-register-submit">{isAdminMode ? 'Створити користувача' : 'Зареєструватися'}</button>
            </div>
        </form>
       </div>
     </div>
    );
};

export default Register;