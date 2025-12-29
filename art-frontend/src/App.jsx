import React, { useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate, useParams } from 'react-router-dom';
import Activities from './components/pages/Activities';
import ActivityForm from './components/pages/ActivityForm';
import Login from './components/pages/Login';
import Register from './components/pages/Register';
import RecordForm from './components/pages/RecordForm';
import RecordsList from './components/pages/RecordsList';
import ClientRecords from './components/pages/ClientRecords';
import AdminSchedulePage from './components/pages/AdminSchedulePage';
import ClientSchedulePage from './components/pages/ClientSchedulePage';
import { AuthProvider, AuthContext } from './context/AuthContext';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';
import AdminRegister from './components/pages/AdminRegister';
import AdminTemplatesPage from './components/pages/AdminTemplatesPage';
import SubscriptionTypesPage from './components/pages/SubscriptionTypesPage';
import AdminSubscriptionsPage from './components/pages/AdminSubscriptionsPage';
import SubTypeForm from './components/pages/SubTypeForm';
import SubscriptionForm from './components/pages/SubscriptionForm';
import KidForm from './components/pages/KidForm';
import KidsPage from './components/pages/ClientKidsPage';
import KidsList from './components/pages/KidsList';


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
            <>
              {role === 'owner' && (
                <>
                  <Link to="/client/records" className="btn btn-sm btn-primary">Мої записи</Link>
                  <Link to="/records" className="btn btn-sm btn-info">Усi записи</Link>
                  <Link to="/client/kids" className="btn btn-sm btn-success">Мої діти</Link>
                  <Link to="admin/kids" className="btn btn-sm btn-success">Усi діти</Link>
                  <Link to="/admin/register" className="btn btn-sm btn-warning">Зареєструвати новий акаунт</Link>
                </>
              )}
              {role === 'client' && (
                <>
                <Link to="/client/records" className="btn btn-sm btn-primary">Мої записи</Link>
                <Link to="/client/kids" className="btn btn-sm btn-success">Мої діти</Link>
                <Link to="/client/kids/add" className="btn btn-sm btn-success">Додати дитину</Link>
                </>
              )}
              <button onClick={logout} className="btn btn-sm btn-outline-danger">Вийти</button>
            </>
          ) : (
            <>
              <Link to="/register" className="btn btn-sm btn-warning">Зареєструватись</Link>
              <Link to="/login" className="btn btn-sm btn-outline-primary">Увiйти</Link>
            </>
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

         <nav className="mb-3 d-flex flex-wrap gap-2 justify-content-center">
          <Link to="/" className="btn btn-sm btn-success">Майстер-класи</Link>
          <Link to="/schedule" className="btn btn-sm btn-success">Графік занять</Link>
          <Link to="/subscriptions/types" className="btn btn-sm btn-success">Абонементи напрямiв</Link>
          {role === 'owner' && (
          <>
          <Link to="/admin/subscriptions" className="btn btn-sm btn-warning">Куплені абонементи</Link>
          <Link to="/admin/templates" className="btn btn-sm btn-warning">Управління шаблонами</Link>
          <Link to="/admin/slots" className="btn btn-sm btn-warning">Створити слот</Link>
          </>
          )}
         </nav>

        <Routes>
          <Route path="/" element={<Activities isAuthenticated={isAuthenticated} />} /> {/* Замена на Activities */}
          <Route path="/add" element={isAuthenticated && role === 'owner' ? <ActivityForm mode="add" /> : <Navigate to="/login" />} />
          <Route path="/edit/:id" element={isAuthenticated && role === 'owner' ? <EditActivityForm /> : <Navigate to="/login" />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/admin/register" element={isAuthenticated && role === 'owner' ? <AdminRegister /> : <Navigate to="/login" />} />
          <Route path="/records" element={<RecordsList isAuthenticated={isAuthenticated} />} />
          <Route path="/client/records" element={<ClientRecords isAuthenticated={isAuthenticated} />} />
          <Route path="/record/:activityId/:slotId?" element={isAuthenticated ? <RecordForm /> : <Navigate to="/login" />} />
          <Route path="/admin/slots" element={isAuthenticated && role === 'owner' ? <AdminSchedulePage /> : <Navigate to="/login" />} />
          <Route path="/admin/templates" element={isAuthenticated && role === 'owner' ? <AdminTemplatesPage /> : <Navigate to="/login" />} />
          <Route path="/schedule" element={<ClientSchedulePage />} />
          <Route path="/subscriptions/types" element={<SubscriptionTypesPage />} />
          <Route path="/admin/subscriptions" element={role === 'owner' ? <AdminSubscriptionsPage /> : <Navigate to="/" />} />
          <Route path="/admin/subscriptions/types/add" element={role === 'owner' ? <SubTypeForm mode="add" /> : <Navigate to="/" />} />
          <Route path="/admin/subscriptions/types/edit/:id" element={role === 'owner' ? <SubTypeForm mode="edit" /> : <Navigate to="/" />} />
          <Route path="/admin/subscriptions/add" element={role === 'owner' ? <SubscriptionForm /> : <Navigate to="/" />} />

          <Route path="/client/kids" element={isAuthenticated ? <KidsPage /> : <Navigate to="/login" />} />
          <Route path="/client/kids/add" element={isAuthenticated ? <KidForm /> : <Navigate to="/login" />} />
          <Route path="/client/kids/edit/:id" element={isAuthenticated ? <KidForm /> : <Navigate to="/login" />} />
          <Route path="/admin/kids" element={<KidsList isAuthenticated={isAuthenticated} />} />
        </Routes>
      </div>
    </div>
  );
}

function EditActivityForm() {
  const { id } = useParams();
  return <ActivityForm mode="edit" id={id} />;
}

   export default App;