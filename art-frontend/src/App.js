import React, { useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate, useParams } from 'react-router-dom';
import Activities from './components/Activities';
import ActivityForm from './components/ActivityForm';
import Login from './components/Login';
import Register from './components/Register';
import RecordForm from './components/RecordForm';
import RecordsList from './components/RecordsList';
import ClientRecords from './components/ClientRecords';
import AdminSchedulePage from './components/AdminSchedulePage';
import ClientSchedulePage from './components/ClientSchedulePage';
import { AuthProvider, AuthContext } from './context/AuthContext';
/*import backgroundImage from './assets_2/background.jpg';*/
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';
import AdminRegister from './components/AdminRegister';
/*import logoImage from './assets_2/Dushka.jpg';*/

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
    const { isAuthenticated, role, logout } = useContext(AuthContext);
    console.log('AppContent: isAuthenticated =', isAuthenticated);

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
      <div className="container mt-4 position-relative" style={{ zIndex: 1 }}>

        <nav className="mb-4 d-flex flex-wrap justify-content-center gap-2 btn-buttons nav-buttons">
          {isAuthenticated && role ? (
            <>
              {role === 'owner' && (
                <>
                  <Link to="/client/records" className="btn btn-sm btn-primary">Мої записи</Link>
                  <Link to="/records" className="btn btn-sm btn-info">All records</Link>
                  <Link to="/admin/slots" className="btn btn-sm btn-warning">Add Activity Slots</Link>
                  <Link to="/admin/register" className="btn btn-sm btn-warning">Register New User</Link>
                </>
              )}
              {role === 'client' && (
                <Link to="/client/records" className="btn btn-sm btn-primary">Мої записи</Link>
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
            alt="Логотип Арт-студии для юных талантов"
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
          <h1 className="text-center mb-4">Арт-студія для дитячої творчості! 🎨✨</h1>
        </div>

         <nav className="mb-3 d-flex flex-wrap gap-2 justify-content-center">
          <Link to="/" className="btn btn-sm btn-success">Майстер-класи</Link>
          <Link to="/schedule" className="btn btn-sm btn-success">Графік занять</Link>
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
          <Route path="/schedule" element={<ClientSchedulePage />} />
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