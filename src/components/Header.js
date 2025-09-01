import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import ProfileModal from './ProfileModal';
import { api } from '../api';

export default function Header({ children, onSearch, onThemeToggle, theme }) {
  const { user, logout, refreshUser } = useAuth();
  const [open, setOpen] = useState(false);
  
  const [openProfile, setOpenProfile] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [projects, setProjects] = useState([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [projectsOpen, setProjectsOpen] = useState(false);
  const [createProjectOpen, setCreateProjectOpen] = useState(false);
  const [lastProjectId, setLastProjectId] = useState(null);
  const projectsRef = useRef(null);
  const [createForm, setCreateForm] = useState({ name: '', code: '' });
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (user?.theme) {
      document.documentElement.setAttribute('data-theme', user.theme);
      localStorage.setItem('theme', user.theme);
    }
  }, [user]);

  // Load projects for dropdown
  useEffect(() => {
    async function loadProjects() {
      if (!user) {
        return;
      }
      
      setProjectsLoading(true);
      try {
        const response = await api.get('/projects');
        if (response.success) {
          const data = response.data;
          setProjects(data || []);
          
          // Set last project from localStorage or first project
          const saved = localStorage.getItem('lastProjectId');
          if (saved && data?.find(p => p.id === saved)) {
            setLastProjectId(saved);
          } else if (data?.length > 0) {
            setLastProjectId(data[0].id);
            localStorage.setItem('lastProjectId', data[0].id);
          }
        } else {
          console.error('Header: Failed to load projects:', response.error);
          setProjects([]);
        }
      } catch (e) {
        console.error('Header: Failed to load projects:', e);
        setProjects([]);
      } finally {
        setProjectsLoading(false);
      }
    }
    loadProjects();
  }, [user]);

  // Update last project when navigating to board
  useEffect(() => {
    if (location.pathname.startsWith('/board/')) {
      const projectId = location.pathname.split('/')[2];
      setLastProjectId(projectId);
      localStorage.setItem('lastProjectId', projectId);
    } else if (location.pathname === '/projects') {
      // Reload projects when visiting projects page (in case projects were deleted)
      // This will trigger the main projects loading effect
      setProjectsLoading(true);
    }
  }, [location.pathname]);

  // Reload projects when visiting projects page
  useEffect(() => {
    if (location.pathname === '/projects' && projectsLoading) {
      async function reloadProjects() {
        if (!user) return;
        
        try {
          const response = await api.get('/projects');
          if (response.success) {
            const data = response.data;
            setProjects(data || []);
            
            // Update last project if current one was deleted
            const saved = localStorage.getItem('lastProjectId');
            if (saved && !data?.find(p => p.id === saved) && data?.length > 0) {
              setLastProjectId(data[0].id);
              localStorage.setItem('lastProjectId', data[0].id);
            }
          } else {
            console.error('Header: Failed to reload projects:', response.error);
            setProjects([]);
          }
        } catch (e) {
          console.error('Header: Failed to reload projects:', e);
          setProjects([]);
        } finally {
          setProjectsLoading(false);
        }
      }
      reloadProjects();
    }
  }, [location.pathname, projectsLoading, user]);

  // Close projects dropdown on outside click or Esc
  useEffect(() => {
    function handleClickOutside(event) {
      if (!projectsRef.current) return;
      if (!projectsRef.current.contains(event.target)) {
        setProjectsOpen(false);
      }
    }
    function handleKeyDown(event) {
      if (event.key === 'Escape') setProjectsOpen(false);
    }
    if (projectsOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [projectsOpen]);

  const handleSearch = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    if (onSearch) {
      onSearch(query);
    }
  };

  const handleCreateProject = async (e) => {
    e.preventDefault();
    try {
      const name = createForm.name.trim();
      let code = createForm.code.trim().toUpperCase();
      if (name.length < 3) throw new Error('Название минимум 3 символа');
      if (!/^[A-Z0-9-]{2,10}$/.test(code)) throw new Error('Код 2-10 символов, A-Z, 0-9, -');
      const payload = { name, code };
      const response = await api.post('/projects', payload);
      if (response.success) {
        const created = response.data;
        setProjects(p => [created, ...p]);
        setCreateProjectOpen(false);
        setCreateForm({ name: '', code: '' });
        navigate(`/board/${created.id}`);
      } else {
        throw new Error(response.error || 'Ошибка создания проекта');
      }
    } catch (e) {
      alert(e.message || 'Ошибка создания проекта');
    }
  };

  // Убираем локальную функцию toggleTheme - используем переданную из AppRouter
  const handleThemeToggle = () => {
    if (onThemeToggle) {
      onThemeToggle();
    }
  };

  const renderAvatar = () => {
    if (user?.avatar_url?.startsWith('emoji:')) {
      return <span style={{ fontSize: 16 }}>{user.avatar_url.replace('emoji:', '')}</span>;
    } else if (user?.avatar_url?.startsWith('/uploads/')) {
      return <img alt="avatar" src={user.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />;
    } else if (user?.avatar_url) {
      return <img alt="avatar" src={user.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />;
    } else {
      return <span style={{ fontSize: 16 }}>👤</span>;
    }
  };

  return (
    <>
      <div className="header">
        <div className="header__left">
          {user && (
            <div style={{ position: 'relative' }} ref={projectsRef}>
              <button 
                onClick={() => setProjectsOpen(o => !o)}
                className="btn dropdown__trigger"
              >
                <span>Проекты</span>
                {lastProjectId && projects.length > 0 && (
                  <span className="dropdown__code">
                    ({projects.find(p => p.id === lastProjectId)?.code || '...'})
                  </span>
                )}
                <span className={`dropdown__arrow ${projectsOpen ? 'dropdown__arrow--open' : ''}`}>
                  ▼
                </span>
              </button>
              
              {projectsOpen && (
                <div 
                  className="dropdown__content"
                  role="menu"
                >
                  {projectsLoading ? (
                    <div className="dropdown__loading">
                      <div className="loader"></div>
                    </div>
                  ) : projects.length === 0 ? (
                    <div className="dropdown__empty">
                      Нет проектов
                    </div>
                  ) : (
                    <>
                      {projects.map(p => (
                        <button
                          key={p.id}
                          onClick={() => {
                            navigate(`/board/${p.id}`);
                            setProjectsOpen(false);
                          }}
                          className={`dropdown__item ${lastProjectId === p.id ? 'dropdown__item--active' : ''}`}
                        >
                          <div className="dropdown__item-header">
                            <span>{p.name}</span>
                            {lastProjectId === p.id && (
                              <span className="dropdown__item-check">
                                ✓
                              </span>
                            )}
                          </div>
                          <div className="dropdown__item-code">{p.code}</div>
                        </button>
                      ))}
                      {user?.role === 'admin' && (
                        <button
                          onClick={() => {
                            setCreateProjectOpen(true);
                            setProjectsOpen(false);
                          }}
                          className="dropdown__item dropdown__item--create"
                        >
                          Создать проект
                        </button>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Кнопка "Доска" - всегда видна если есть проекты */}
          {lastProjectId && projects.length > 0 && (
            <Link 
              to={`/board/${lastProjectId}`}
              className={`nav-link ${location.pathname.startsWith('/board/') ? 'nav-link--active' : ''}`}
            >
              Доска
            </Link>
          )}
          
          {user?.role === 'admin' && (
            <>
              <Link 
                to="/projects" 
                className={`nav-link ${location.pathname === '/projects' ? 'nav-link--active' : ''}`}
              >
                Управление проектами
              </Link>
              <Link 
                to="/users" 
                className={`nav-link ${location.pathname === '/users' ? 'nav-link--active' : ''}`}
              >
                Пользователи
              </Link>
            </>
          )}
        </div>
        
        {/* Search Bar - по центру, только на странице доски */}
        {location.pathname.startsWith('/board/') && (
          <div className="search-container" style={{ 
            position: 'absolute', 
            left: '50%', 
            transform: 'translateX(-50%)',
            zIndex: 10
          }}>
            <input
              type="text"
              placeholder="Поиск по названию, описанию, тегам..."
              value={searchQuery}
              onChange={handleSearch}
              className="search-input"
            />
            <div className="search-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <path d="m21 21-4.35-4.35"></path>
              </svg>
            </div>
          </div>
        )}

        <div className="header__right">
          <button
            onClick={handleThemeToggle}
            style={{
              width: 64,
              height: 36,
              borderRadius: 18,
              border: '2px solid var(--border)',
              background: theme === 'dark' ? 'var(--primary)' : 'var(--surface-alt)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: theme === 'dark' ? 'flex-end' : 'flex-start',
              padding: '3px',
              transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
              position: 'relative',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
            }}
            title={theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme'}
            onMouseEnter={(e) => {
              e.target.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
            }}
            onMouseLeave={(e) => {
              e.target.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
            }}
          >
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 16,
                transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: '0 2px 6px rgba(0, 0, 0, 0.15)',
                lineHeight: 1
              }}
            >
              {theme === 'light' ? '☀️' : '🌙'}
            </div>
          </button>

          <div className="user-email">{user?.email}</div>
          
          <div className="user-menu">
            <button 
              onClick={() => setOpen(o => !o)} 
              className="user-avatar"
            >
              {renderAvatar()}
            </button>
            {open && (
              <div 
                onMouseLeave={() => setOpen(false)} 
                className="user-dropdown"
              >
                <button 
                  onClick={() => setOpenProfile(true)} 
                  className="user-dropdown__item"
                >
                  ⚙️ Профиль
                </button>
                <button 
                  onClick={logout} 
                  className="user-dropdown__item"
                >
                  🚪 Выйти
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create Project Modal */}
      {createProjectOpen && (
        <div 
          className="modal-overlay" 
          onClick={() => setCreateProjectOpen(false)}
        >
          <div 
            className="modal modal--create-project" 
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal__header">
              <div className="modal__title">Создать новый проект</div>
              <button 
                onClick={() => setCreateProjectOpen(false)} 
                className="modal__close"
              >
                ×
              </button>
            </div>
            <form onSubmit={handleCreateProject}>
              <div className="form-group">
                <label className="form-label">Название проекта</label>
                <input 
                  required 
                  minLength={3} 
                  value={createForm.name} 
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })} 
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Код проекта (уникальный)</label>
                <input 
                  required 
                  minLength={2} 
                  value={createForm.code} 
                  onChange={(e) => setCreateForm({ ...createForm, code: e.target.value.toUpperCase() })} 
                  placeholder="например, DEMO" 
                  className="form-input"
                />
              </div>
              <div className="form-actions">
                <button 
                  type="button" 
                  onClick={() => setCreateProjectOpen(false)} 
                  className="btn"
                >
                  Отмена
                </button>
                <button 
                  type="submit" 
                  className="btn btn--primary"
                >
                  Создать проект
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ProfileModal open={openProfile} onClose={() => setOpenProfile(false)} />
    </>
  );
}
