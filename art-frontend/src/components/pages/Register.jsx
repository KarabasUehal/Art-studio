import React, { useState } from 'react';
import api from '../../utils/api.jsx';
import { useNavigate } from 'react-router-dom';
import '@styles/Register.css';

const Register = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [phone_number, setPhoneNumber] = useState('');
    const [name, setName] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        console.log('Register form data:', { username, password, phone_number, name });

        if (!password || password.length < 6) {
        setError('Пароль повинен бути не менше 6 символів');
        return;
    }

        try {
            await api.post('/register', { username, password, phone_number, name});
            navigate('/login');
        } catch (err) {
            console.error('Register error:', err.response?.data);
            setError(err.response?.data?.error || 'Registration error');
        }
    };

    const Back = () => {
    navigate('/');
  };

    return (

    <div className="register-form-page">
      <div className="register-form-container">
        <h1 className="register-form-title">
          Реєстрація
        </h1>
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
                <input type="tel" value={phone_number} onChange={(e) => setPhoneNumber(e.target.value)} className="register-form-input" placeholder="+3" required />
            </div>
            <div className="register-form-group">
                <label className="register-form-label">Iм'я:</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="register-form-input" placeholder="Ваше iм'я" />
            </div>
            {error && <div className="alert alert-danger">{error}</div>}

            <div className="form-actions">
            <button onClick={Back} className="btn btn-primary">Назад</button>
            <button type="submit" className="btn btn-primary">Створити профіль</button>
            </div>
        </form>
       </div>
     </div>
    );
};

export default Register;