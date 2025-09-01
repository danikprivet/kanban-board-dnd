import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { useAuth } from '../auth/AuthContext';
import { Link } from 'react-router-dom';
import Modal from '../components/Modal';

export default function Projects() {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openCreate, setOpenCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', code: '' });

  async function loadProjects() {
    setLoading(true);
    setError(null);
    
    try {
      const response = await api.get('/projects');
      
      if (response.success) {
        setProjects(response.data);
      } else {
        setError(response.error || 'Ошибка загрузки проектов');
      }
    } catch (error) {
      console.error('Error loading projects:', error);
      setError(error.message || 'Ошибка загрузки проектов');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { 
    loadProjects(); 
  }, []);

  async function handleDelete(projectId) {
    if (!window.confirm('Вы уверены, что хотите удалить этот проект? Это действие нельзя отменить.')) {
      return;
    }
    
    try {
      const response = await api.delete(`/projects/${projectId}`);
      
      if (response.success) {
        setProjects(prev => prev.filter(p => p.id !== projectId));
        alert('Проект успешно удален');
        
        // Trigger event to update projects list in Header
        window.dispatchEvent(new Event('projectUpdated'));
      } else {
        alert(response.error || 'Ошибка удаления проекта');
      }
    } catch (error) {
      alert(error.message || 'Ошибка удаления проекта');
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    
    const name = createForm.name.trim();
    const code = createForm.code.trim().toUpperCase();
    
    if (name.length < 3) {
      alert('Название проекта должно содержать минимум 3 символа');
      return;
    }
    
    if (!/^[A-Z0-9-]{2,10}$/.test(code)) {
      alert('Код проекта должен содержать 2-10 символов (A-Z, 0-9, -)');
      return;
    }
    
    try {
      const response = await api.post('/projects', { name, code });
      
      if (response.success) {
        const newProject = response.data;
        setProjects(prev => [newProject, ...prev]);
        setOpenCreate(false);
        setCreateForm({ name: '', code: '' });
        alert('Проект успешно создан');
        
        // Trigger event to update projects list in Header
        window.dispatchEvent(new Event('projectUpdated'));
      } else {
        alert(response.error || 'Ошибка создания проекта');
      }
    } catch (error) {
      alert(error.message || 'Ошибка создания проекта');
    }
  }

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '50vh',
        flexDirection: 'column',
        gap: '16px'
      }}>
        <div style={{ fontSize: '18px', color: 'var(--text-secondary)' }}>
          Загрузка проектов...
        </div>
        <div style={{ 
          width: '32px', 
          height: '32px', 
          border: '3px solid var(--border)', 
          borderTop: '3px solid var(--primary)', 
          borderRadius: '50%', 
          animation: 'spin 1s linear infinite' 
        }}></div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '50vh',
        flexDirection: 'column',
        gap: '16px'
      }}>
        <div style={{ 
          fontSize: '18px', 
          color: 'var(--error)', 
          textAlign: 'center',
          maxWidth: '400px'
        }}>
          {error instanceof Error ? error.message : String(error)}
        </div>
        <button 
          onClick={loadProjects}
          style={{
            padding: '12px 24px',
            background: 'var(--primary)',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '16px'
          }}
        >
          Попробовать снова
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '32px',
        paddingBottom: '16px'
      }}>
        <div>
          <h1 style={{ 
            margin: 0, 
            fontSize: '32px', 
            fontWeight: '700',
            color: 'var(--text)',
            marginBottom: '8px'
          }}>
            Проекты
          </h1>
          <p style={{ 
            margin: 0, 
            color: 'var(--text-secondary)', 
            fontSize: '16px' 
          }}>
            Управление проектами и задачами
          </p>
        </div>
        
        {user?.role === 'admin' && (
          <button 
            onClick={() => setOpenCreate(true)}
            style={{
              padding: '12px 24px',
              background: 'var(--primary)',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s ease'
            }}

          >
            <span>+</span>
            Создать проект
          </button>
        )}
      </div>

      {/* Projects List */}
      {projects.length === 0 ? (
        <div style={{ 
          textAlign: 'center', 
          padding: '60px 20px',
          color: 'var(--text-secondary)'
        }}>
          <div style={{ fontSize: '18px', marginBottom: '8px' }}>
            Проекты не найдены
          </div>
          <div style={{ fontSize: '14px' }}>
            {user?.role === 'admin' ? 'Создайте первый проект для начала работы' : 'Обратитесь к администратору для создания проекта'}
          </div>
        </div>
      ) : (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', 
          gap: '24px' 
        }}>
          {projects.map(project => (
            <div key={project.id} style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              padding: '24px',
              transition: 'all 0.2s ease'
            }}

            >
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'flex-start',
                marginBottom: '16px'
              }}>
                <div>
                  <h3 style={{ 
                    margin: 0, 
                    fontSize: '20px', 
                    fontWeight: '600',
                    color: 'var(--text)',
                    marginBottom: '8px'
                  }}>
                    {project.name}
                  </h3>
                  <div style={{ 
                    fontSize: '14px', 
                    color: 'var(--text-secondary)',
                    fontFamily: 'Monaco, Menlo, Ubuntu Mono, monospace'
                  }}>
                    {project.code}
                  </div>
                </div>
                
                {user?.role === 'admin' && (
                  <button
                    onClick={() => handleDelete(project.id)}
                    style={{
                      padding: '6px 12px',
                      background: 'var(--error)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: '500',
                      transition: 'background 0.2s ease'
                    }}
                    onMouseEnter={(e) => e.target.style.background = 'var(--error-hover)'}
                    onMouseLeave={(e) => e.target.style.background = 'var(--error)'}
                  >
                    Удалить
                  </button>
                )}
              </div>
              
              <div style={{ 
                display: 'flex', 
                gap: '8px',
                marginBottom: '16px'
              }}>
                <span style={{ 
                  fontSize: '12px', 
                  padding: '4px 8px', 
                  borderRadius: '4px',
                  background: 'var(--primary-light)',
                  color: 'var(--primary)',
                  fontWeight: '600'
                }}>
                  {project.status || 'Активный'}
                </span>
                
                {project.created_at && (
                  <span style={{ 
                    fontSize: '12px', 
                    padding: '4px 8px', 
                    borderRadius: '4px',
                    background: 'var(--surface-alt)',
                    color: 'var(--text-secondary)',
                    fontWeight: '500'
                  }}>
                    {new Date(project.created_at).toLocaleDateString('ru-RU')}
                  </span>
                )}
              </div>
              
              <div style={{ 
                display: 'flex', 
                gap: '12px',
                justifyContent: 'flex-end'
              }}>
                <Link
                  to={`/board/${project.id}`}
                  style={{
                    padding: '8px 16px',
                    background: 'var(--primary)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                    textDecoration: 'none',
                    transition: 'background 0.2s ease'
                  }}
                  onMouseEnter={(e) => e.target.style.background = 'var(--primary-hover)'}
                  onMouseLeave={(e) => e.target.style.background = 'var(--primary)'}
                >
                  Открыть доску
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Project Modal */}
      {openCreate && (
        <Modal 
          title="Создать проект"
          open={openCreate} 
          onClose={() => setOpenCreate(false)}
        >
          <div style={{ padding: '24px', maxWidth: '400px' }}>
            <form onSubmit={handleCreate}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '6px', 
                  color: 'var(--text-secondary)',
                  fontSize: '14px',
                  fontWeight: '500'
                }}>
                  Название проекта *
                </label>
                <input
                  type="text"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  placeholder="Введите название проекта"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    background: 'var(--surface)',
                    color: 'var(--text)',
                    fontSize: '16px',
                    boxSizing: 'border-box'
                  }}
                  required
                />
              </div>
              
              <div style={{ marginBottom: '16px' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '6px', 
                  color: 'var(--text-secondary)',
                  fontSize: '14px',
                  fontWeight: '500'
                }}>
                  Код проекта *
                </label>
                <input
                  type="text"
                  value={createForm.code}
                  onChange={(e) => setCreateForm({ ...createForm, code: e.target.value.toUpperCase() })}
                  placeholder="PROJ-001"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    background: 'var(--surface)',
                    color: 'var(--text)',
                    fontSize: '16px',
                    boxSizing: 'border-box',
                    fontFamily: 'Monaco, Menlo, Ubuntu Mono, monospace'
                  }}
                  required
                />
                <div style={{ 
                  fontSize: '12px', 
                  color: 'var(--text-muted)', 
                  marginTop: '4px' 
                }}>
                  Только буквы, цифры и дефис (2-10 символов)
                </div>
              </div>
              
              <div style={{ 
                display: 'flex', 
                gap: '12px', 
                justifyContent: 'flex-end' 
              }}>
                <button
                  type="button"
                  onClick={() => setOpenCreate(false)}
                  style={{
                    padding: '12px 20px',
                    background: 'var(--surface-alt)',
                    color: 'var(--text)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '16px',
                    fontWeight: '500'
                  }}
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '12px 20px',
                    background: 'var(--primary)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '16px',
                    fontWeight: '600'
                  }}
                >
                  Создать
                </button>
              </div>
            </form>
          </div>
        </Modal>
      )}
    </div>
  );
}
