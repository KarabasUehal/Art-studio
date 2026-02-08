import React, { useState } from 'react';
import api from '../../utils/api';
import { useNavigate } from 'react-router-dom';
import '@styles/Register.css';

function AdminRegister() {
   const [username, setUsername] = useState('');
       const [password, setPassword] = useState('');
       const [phone_number, setPhoneNumber] = useState('');
       const [name, setName] = useState('');
       const [surname, setSurname] = useState('');
       const [role, setRole] = useState('');
       const [error, setError] = useState('');
       const navigate = useNavigate();

   const handleSubmit = async (e) => {
           e.preventDefault();
           setError('');
           console.log('Register form data:', { username, password, phone_number, name, surname, role });
   
           if (!username || username.length < 6) 
           return setError('Логiн повинен бути не менше 6 символів');
           if (!password || password.length < 6) 
           return setError('Пароль повинен бути не менше 6 символів');
           if (!phone_number || phone_number.length < 13) 
           return setError('У номерi повинно бути 13 символів');
           if (!name)
           return setError(`Введіть ім'я`);
           if (!role)
           return setError(`Оберіть роль`);
           
        try {
            const token = localStorage.getItem('token');
            const response = await api.post('/admin/register', { username, password, phone_number, name, surname, role}, {
                headers: { Authorization: `Bearer ${token}` },
            });
            navigate('/login');
        } catch (err) {
            setError(err.response?.data?.error || 'Registration failed');
        }
    };

     const Back = () => {
    navigate('/');
  };

    return (
         <div className="register-form-page">
      <div className="register-form-container">
        <h2 className="register-form-title">
            Реєстрація (адмiнicтратор)
        </h2>
            <form onSubmit={handleSubmit}>
            <div className="register-form-group">
                <label className="register-form-label">Логiн:</label>
                <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} className="register-form-input" required />
            </div>
            <div className="register-form-group">
                <label className="register-form-label">Пароль:</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="register-form-input" minLength="6" required />
            </div>
            <div className="register-form-group">
                <label className="register-form-label">Номер телефону:</label>
                <input type="tel" value={phone_number} onChange={(e) => setPhoneNumber(e.target.value)} className="register-form-input" placeholder="+380 (XX) XXX-XX-XX" required />
            </div>
            <div className="register-form-group">
                <label className="register-form-label">Iм'я:</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="register-form-input" />
            </div>
            <div className="register-form-group">
                <label className="register-form-label">Прізвище:</label>
                <input type="text" value={surname} onChange={(e) => setSurname(e.target.value)} className="register-form-input" />
            </div>
            <div className="register-form-group">
                    <label htmlFor="role" className="register-form-label">Роль</label>
                    <select
                        className="register-form-input"
                        id="role"
                        name="role"
                        value={role} 
                        onChange={(e) => setRole(e.target.value)}
                    >
                        <option value="">Оберіть роль</option>
                        <option value="client">Клієнт</option>
                        <option value="owner">Адмiнicтратор</option>
                    </select>
                </div>
            {error && <div className="alert alert-danger">{error}</div>}

            <div className="form-actions">
            <button type="button" onClick={Back} className="btn-register-cancel">Назад</button>
            <button type="submit" className="btn-register-submit">Створити профіль</button>
            </div>
        </form>
       </div>
     </div>        
    );
}

export default AdminRegister;