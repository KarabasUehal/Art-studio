import React, { useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate, useParams } from 'react-router-dom';
import Activities from './components/pages/Activities';
import ActivityForm from './components/pages/forms/ActivityForm';
import Login from './components/pages/auth/Login';
import Register from './components/pages/auth/Register';
import RecordForm from './components/pages/forms/RecordForm';
import AdminRecordsList from './components/pages/AdminRecordsList';
import ClientRecords from './components/pages/ClientRecords';
import AdminSchedulePage from './components/pages/AdminSchedulePage';
import ClientSchedulePage from './components/pages/ClientSchedulePage';
import { AuthProvider, AuthContext } from './context/AuthContext';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';
import AdminTemplatesPage from './components/pages/AdminTemplatesPage';
import SubscriptionTypesPage from './components/pages/SubscriptionTypesPage';
import SubscriptionsPage from './components/pages/SubscriptionsPage';
import SubTypeForm from './components/pages/forms/SubTypeForm';
import SubscriptionForm from './components/pages/forms/SubscriptionForm';
import KidForm from './components/pages/forms/KidForm';
import KidsPage from './components/pages/ClientKidsPage';
import AdminKidsList from './components/pages/AdminKidsList';
import AdminUsersList from './components/pages/AdminUsersList';
import AdminErrorsList from './components/pages/AdminErrorsList';


const backgroundImage = 'https://i.postimg.cc/59R6pXsS/background.jpg';
const logoImage       = 'https://i.postimg.cc/qqSq7FtK/Dushka.jpg';

   function App() {
    return (
        <AuthProvider>
                <Router>
                    <AppContent />
                </Router>
        </AuthProvider>
    );
}

   function AppContent() {
    const { isAuthenticated, role, loading, logout } = useContext(AuthContext);
    console.log('AppContent: isAuthenticated =', isAuthenticated);

    if (loading) {
    return (
      <div className="app-background" style={{
        backgroundImage: `url(${backgroundImage})`,
        backgroundSize: 'cover',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column'
      }}>
        <img 
          src={logoImage} 
          alt="Завантаження..." 
          style={{ 
            width: '120px', 
            borderRadius: '50%', 
            animation: 'spin 3s linear infinite',
            boxShadow: '0 0 20px rgba(100, 238, 8, 0.6)'
          }} 
        />
        <h3 className="mt-4 text-white" style={{ textShadow: '0 0 15px #00ff00' }}>
          Завантаження...
        </h3>
      </div>
    );
  }

    return (
    <div
      className="app-background"
      style={{ 
        backgroundImage: `url(${backgroundImage})`,
        backgroundSize: 'cover',
        minHeight: '100vh',
        position: 'relative' // Для overlay
      }}
    >
      <div 
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.4)',  
          zIndex: 0
        }}
      />
      <div className="container">

        <nav className="mb-4 d-flex flex-wrap justify-content-center gap-2 btn-buttons nav-buttons">
          {isAuthenticated && role ? (
            <div className="studio-buttons-top-wrapper">
              {role === 'owner' && (
                <>
                  <Link to="/admin/register" className="studio-btn-admin">Створити акаунт</Link>
                  <Link to="/admin/users" className="studio-btn-admin">Користувачi</Link>
                  <Link to="/admin/errors" className="studio-btn-admin">Помилки</Link>
                  <Link to="/records" className="studio-btn-admin">Усi записи</Link>
                  <Link to="admin/kids" className="studio-btn-admin">Усi діти</Link>
                </>
              )}
                <Link to="/client/records" className="studio-btn-client">Мої записи</Link>
                <Link to="/client/kids" className="studio-btn-client">Мої діти</Link>
              <button onClick={logout} className="studio-btn-logout">Вийти</button>
            </div>
          ) : (
            <div className="studio-buttons-top-wrapper">
              <Link to="/register" className="studio-btn-client">Зареєструватись</Link>
              <Link to="/login" className="studio-btn-login">Увiйти</Link>
            </div>
          )}
        </nav>

        <div className="text-center mb-4" style={{ marginTop: '100px' }}> 
          <img
            src={logoImage}
            alt="Логотип Арт-студии"
            style={{
              width: '150px',
              height: 'auto',
              boxShadow: '0 4px 8px rgba(255, 107, 107, 0.3)',
              borderRadius: '50%',
              transition: 'transform 0.3s ease'
            }}
            onMouseEnter={(e) => (e.target.style.transform = 'scale(1.05)')}
            onMouseLeave={(e) => (e.target.style.transform = 'scale(1)')}
          />
          <h1>Арт-студія дитячої творчості! 🎨✨</h1>
        </div>

         <div className="studio-buttons-bot-wrapper">
          <Link to="/" className="studio-btn-client-menu">Напрямки</Link>
          <Link to="/schedule" className="studio-btn-client-menu">Графік занять</Link>
          <Link to="/subscriptions/types" className="studio-btn-client-menu">Абонементи напрямкiв</Link>
          {role === 'owner' && (
          <>
          <Link to="/admin/subscriptions" className="studio-btn-admin-menu">Куплені абонементи</Link>
          <Link to="/admin/templates" className="studio-btn-admin-menu">Шаблони тижня</Link>
          <Link to="/admin/slots" className="studio-btn-admin-menu">Створити слот</Link>
          </>
          )}
         </div >

        <Routes>
          <Route path="/" element={<Activities isAuthenticated={isAuthenticated} />} /> 
          <Route path="/add" element={isAuthenticated && role === 'owner' ? <ActivityForm mode="add" /> : <Navigate to="/login" />} />
          <Route path="/edit/:id" element={isAuthenticated && role === 'owner' ? <EditActivityForm /> : <Navigate to="/login" />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/admin/register" element={isAuthenticated && role === 'owner' ? <Register adminMode={true} /> : <Navigate to="/login" />} />
          <Route path="/records" element={<AdminRecordsList isAuthenticated={isAuthenticated} />} />
          <Route path="/client/records" element={<ClientRecords isAuthenticated={isAuthenticated} />} />
          <Route path="/record/:activityId/:slotId?" element={isAuthenticated ? <RecordForm /> : <Navigate to="/login" />} />
          <Route path="/admin/slots" element={isAuthenticated && role === 'owner' ? <AdminSchedulePage /> : <Navigate to="/login" />} />
          <Route path="/admin/templates" element={isAuthenticated && role === 'owner' ? <AdminTemplatesPage /> : <Navigate to="/login" />} />
          <Route path="/schedule" element={<ClientSchedulePage />} />
          <Route path="/subscriptions/types" element={<SubscriptionTypesPage />} />
          <Route path="/admin/subscriptions" element={role === 'owner' ? <SubscriptionsPage /> : <Navigate to="/" />} />
          <Route path="/admin/subscriptions/types/add" element={role === 'owner' ? <SubTypeForm mode="add" /> : <Navigate to="/" />} />
          <Route path="/admin/subscriptions/types/edit/:id" element={role === 'owner' ? <SubTypeForm mode="edit" /> : <Navigate to="/" />} />
          <Route path="/admin/subscriptions/add" element={role === 'owner' ? <SubscriptionForm /> : <Navigate to="/" />} />

          <Route path="/client/kids" element={isAuthenticated ? <KidsPage /> : <Navigate to="/login" />} />
          <Route path="/client/kids/add" element={isAuthenticated ? <KidForm /> : <Navigate to="/login" />} />
          <Route path="/client/kids/edit/:id" element={isAuthenticated ? <KidForm /> : <Navigate to="/login" />} />
          <Route path="/admin/kids" element={<AdminKidsList isAuthenticated={isAuthenticated} />} />
          <Route path="/admin/users" element={<AdminUsersList isAuthenticated={isAuthenticated} />} />
          <Route path="/admin/errors" element={<AdminErrorsList isAuthenticated={isAuthenticated} />} />
        </Routes>

        <div className="faq-section mt-5 mb-5">
  <h2 className="faq-tittle">
    Часті запитання:
  </h2>

  <div className="faq-list">
    {/* Вопрос 1 */}
    <details className="faq-item">
      <summary className="faq-question">
        З якого віку можна записувати дитину?
      </summary>
      <div className="faq-answer">
        З 5 років, залежно від напрямку. Є "Вільні ранки" для дітей від 3 років!
      </div>
    </details>

    {/* Вопрос 2 */}
    <details className="faq-item">
      <summary className="faq-question">
        Чи потрібно щось приносити із собою на заняття?
      </summary>
      <div className="faq-answer">
        Нічого! Все необхідне (фарби, пензлі, фартухи, папір) надаємо. 
        Беріть тільки гарний настрій та змінний одяг про всяк випадок.
      </div>
    </details>

    {/* Вопрос 3 */}
    <details className="faq-item">
      <summary className="faq-question">
        Чи є сертифікати/ліцензія у викладачів?
      </summary>
      <div className="faq-answer">
        Так, студія працює офіційно, всі викладачі мають педагогічну освіту та досвід роботи з дітьми.
      </div>
    </details>

    {/* Вопрос 4 */}
    <details className="faq-item">
      <summary className="faq-question">
        Чи можна прийти на пробне заняття?
      </summary>
      <div className="faq-answer">
        Так, перше заняття є пробним і на нього можна записатися безкоштовно або з 50% знижкою - залежно від напрямку.
      </div>
    </details>

    {/* Вопрос 5 */}
    <details className="faq-item">
      <summary className="faq-question">
        Що буде, якщо дитина пропустить заняття?
      </summary>
      <div className="faq-answer">
        Пропущені з хвороби заняття можна перенести на наступний тиждень – за наявності довідки. 
      </div>
    </details>

  </div>
</div>

<div className="social-footer">
  <p className="text-white mb-3" style={{ fontSize: '1.4em', opacity: 0.9 }}>
    Ми в соцмережах:
  </p>
  
  <div className="social-links">
    <a 
      href="https://www.instagram.com" 
      target="_blank" 
      rel="noopener noreferrer"
      className="social-icon instagram"
      aria-label="Instagram арт-студии"
    >
      <i className="fab fa-instagram"></i>
    </a>

    <a 
      href="https://t.me/@KarabasUehal" 
      target="_blank" 
      rel="noopener noreferrer"
      className="social-icon telegram"
      aria-label="Telegram арт-студии"
    >
      <i className="fab fa-telegram-plane"></i>
    </a>
  </div>
</div>

      </div>
    </div>
  );
}

function EditActivityForm() {
  const { id } = useParams();
  return <ActivityForm mode="edit" id={id} />;
}

   export default App;