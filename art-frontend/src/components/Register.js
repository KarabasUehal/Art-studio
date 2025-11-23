import React, { useState } from 'react';
import api from '../utils/api';
import { useNavigate } from 'react-router-dom';

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
        <form onSubmit={handleSubmit}>
            <div className="mb-3">
                <label>Логiн:</label>
                <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} className="form-control" required />
            </div>
            <div className="mb-3">
                <label>Пароль:</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="form-control" minLength="6" required />
            </div>
            <div className="mb-3">
                <label>Номер телефону:</label>
                <input type="tel" value={phone_number} onChange={(e) => setPhoneNumber(e.target.value)} className="form-control" placeholder="+3" required />
            </div>
            <div className="mb-3">
                <label>Iм'я:</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="form-control" placeholder="Ваше iм'я" />
            </div>
            {error && <div className="alert alert-danger">{error}</div>}
            <button type="submit" className="btn btn-primary">Створити профіль</button>
            <button onClick={Back} className="btn btn-primary">Назад</button>
        </form>
    );
};

export default Register;