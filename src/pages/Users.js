import React, { useEffect, useState } from 'react';
import { api } from '../api';
import Modal from '../components/Modal';
import { useAuth } from '../auth/AuthContext';

export default function Users() {
  const { user, refreshUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [openCreate, setOpenCreate] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', role: 'developer', password: '', projects: [] });
  const [showPassword, setShowPassword] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [edit, setEdit] = useState({ id: '', name: '', email: '', role: 'developer', password: '', avatar_url: '', projects: [] });
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [availableProjects, setAvailableProjects] = useState([]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [usersResponse, projectsResponse] = await Promise.all([
        api.get('/users'),
        api.get('/projects')
      ]);
      
      if (usersResponse.success && projectsResponse.success) {
        // Sort by ID numerically for consistent ordering
        const sortedUsers = usersResponse.data.sort((a, b) => parseInt(a.id) - parseInt(b.id));
        setUsers(sortedUsers);
        setFilteredUsers(sortedUsers);
        setAvailableProjects(projectsResponse.data);
      } else {
        const errorMessage = usersResponse.error || projectsResponse.error || 'Ошибка загрузки данных';
        setError(errorMessage);
      }
    } catch (error) {
      setError(error.message || 'Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  }

  // Filter users based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredUsers(users);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = users.filter(u => 
        u.id.toString().includes(query) ||
        u.email.toLowerCase().includes(query)
      );
      setFilteredUsers(filtered);
    }
  }, [users, searchQuery]);

  useEffect(() => { load(); }, []);

  async function createUser(e) {
    e.preventDefault();
    try {
      const response = await api.post('/users', form);
      if (response.success) {
        const created = response.data;
        const newUsers = [...users, created].sort((a, b) => parseInt(a.id) - parseInt(b.id));
        setUsers(newUsers);
        setFilteredUsers(newUsers);
        setOpenCreate(false);
        setForm({ name: '', email: '', role: 'developer', password: '', projects: [] });
      } else {
        alert(response.error || 'Ошибка создания пользователя');
      }
    } catch (error) {
      alert(error.message || 'Ошибка создания пользователя');
    }
  }

  // удаление отключено для админа по ТЗ

  async function openEditUser(u) {
    try {
      // Load user's projects
      const userProjectsResponse = await api.get(`/project-users/user/${u.id}`);
      const userProjects = userProjectsResponse.success ? userProjectsResponse.data : [];
      setEdit({ 
        id: u.id, 
        name: u.name || '', 
        email: u.email || '', 
        role: u.role || 'developer', 
        password: '', 
        avatar_url: u.avatar_url || '',
        projects: userProjects.map(p => p.id) || []
      });
      setOpenEdit(true);
    } catch (error) {
      console.error('Error loading user projects:', error);
      setEdit({ 
        id: u.id, 
        name: u.name || '', 
        email: u.email || '', 
        role: u.role || 'developer', 
        password: '', 
        avatar_url: u.avatar_url || '',
        projects: []
      });
      setOpenEdit(true);
    }
  }

  async function saveEdit(e) {
    e.preventDefault();
    try {
      const payload = { name: edit.name, role: edit.role };
      if (edit.password) payload.password = edit.password;
      // Always include avatar_url, even if it's empty (for deletion)
      payload.avatar_url = edit.avatar_url || '';
      const response = await api.put(`/users/${edit.id}`, payload);
      if (response.success) {
        const updated = response.data;
        setUsers(prev => prev.map(u => u.id === updated.id ? updated : u));
        
        // Update project access
        if (edit.projects && availableProjects) {
          console.log('Users: Updating project access for user:', edit.id);
          console.log('Users: Available projects:', availableProjects);
          console.log('Users: Selected projects:', edit.projects);
          
          // Get current user projects
          const currentUserProjectsResponse = await api.get(`/project-users/user/${edit.id}`);
          const currentUserProjects = currentUserProjectsResponse.success ? currentUserProjectsResponse.data : [];
          const currentProjectIds = currentUserProjects.map(p => p.id);
          console.log('Users: Current user projects:', currentUserProjects);
          console.log('Users: Current project IDs:', currentProjectIds);
          
          // Remove from projects not in the new list
          for (const projectId of currentProjectIds) {
            if (!edit.projects.includes(projectId)) {
              console.log('Users: Removing user from project:', projectId);
              await api.delete(`/project-users/${projectId}/${edit.id}`);
            }
          }
          
          // Add to new projects
          for (const projectId of edit.projects) {
            if (!currentProjectIds.includes(projectId)) {
              console.log('Users: Adding user to project:', projectId);
              await api.post('/project-users', { projectId, userId: edit.id });
            }
          }
        }
        
        // If we updated the current logged-in user, refresh the auth context
        if (user && user.id === updated.id) {
          await refreshUser();
        }
        
        setOpenEdit(false);
      } else {
        alert(response.error || 'Ошибка обновления пользователя');
      }
    } catch (error) {
      alert(error.message || 'Ошибка обновления пользователя');
    }
  }

  async function deleteUser(userId) {
    if (!window.confirm('Вы уверены, что хотите удалить этого пользователя?')) return;
    
    try {
      const response = await api.delete(`/users/${userId}`);
      if (response.success) {
        setUsers(prev => prev.filter(u => u.id !== userId));
      } else {
        alert(response.error || 'Ошибка удаления пользователя');
      }
    } catch (error) {
      alert(error.message || 'Ошибка удаления пользователя');
    }
  }

  if (user?.role !== 'admin') {
    return <div style={{ padding: 20 }}>403 — доступ запрещён</div>;
  }

  return (
    <div style={{ width: '100%', maxWidth: 1200, margin: '0 auto', padding: '32px 24px' }}>
      {/* Заголовок и действия */}
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
            fontSize: '28px', 
            fontWeight: '700',
            color: 'var(--text)',
            marginBottom: '4px'
          }}>
            Пользователи
          </h1>
          <p style={{ 
            margin: 0, 
            color: 'var(--text-secondary)', 
            fontSize: '16px' 
          }}>
            Управление пользователями системы
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
                              placeholder="Поиск по ID или Email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                padding: '12px 16px 12px 40px',
                borderRadius: '12px',
                border: '2px solid var(--border)',
                background: 'var(--surface)',
                color: 'var(--text)',
                fontSize: '14px',
                width: '280px',
                outline: 'none',
                transition: 'all 0.3s ease',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = 'var(--primary)';
                e.target.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'var(--border)';
                e.target.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.05)';
              }}
            />
            <div style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-secondary)',
              fontSize: '16px'
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <path d="m21 21-4.35-4.35"></path>
              </svg>
            </div>
          </div>
          <button 
            onClick={() => setOpenCreate(true)} 
            style={{ 
              padding: '12px 20px', 
              borderRadius: '8px', 
              border: 'none', 
              background: 'var(--primary)', 
              color: '#fff', 
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '14px',
              boxShadow: 'var(--shadow)',
              transition: 'all 0.2s ease'
            }}

          >
            + Создать пользователя
          </button>
        </div>
      </div>

      {/* Состояния загрузки и ошибок */}
      {loading && (
        <div style={{
          background: 'var(--surface)',
          borderRadius: '12px',
          border: '1px solid var(--border)',
          overflow: 'hidden',
          boxShadow: 'var(--shadow)'
        }}>
          {/* Заголовки столбцов */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '250px 1fr 1fr 120px 200px',
            gap: '16px',
            padding: '16px 24px',
            background: 'var(--surface-alt)',
            fontWeight: '600',
            fontSize: '14px',
            color: 'var(--text-secondary)'
          }}>
            <div style={{ paddingLeft: '0' }}>ID</div>
            <div style={{ paddingLeft: '0' }}>Имя</div>
            <div style={{ paddingLeft: '0' }}>Email</div>
            <div style={{ paddingLeft: '0' }}>Роль</div>
            <div style={{ paddingLeft: '0' }}>Действия</div>
          </div>

          {/* Shimmer rows */}
          {[1, 2, 3].map(i => (
            <div 
              key={i}
              style={{
                display: 'grid',
                gridTemplateColumns: '250px 1fr 1fr 120px 200px',
                gap: '16px',
                padding: '16px 24px'
              }}
            >
              <div className="shimmer" style={{ height: '20px', borderRadius: '4px' }}></div>
              <div className="shimmer" style={{ height: '20px', borderRadius: '4px' }}></div>
              <div className="shimmer" style={{ height: '20px', borderRadius: '4px' }}></div>
              <div className="shimmer" style={{ height: '20px', borderRadius: '4px' }}></div>
              <div className="shimmer" style={{ height: '32px', borderRadius: '6px', width: '100px' }}></div>
            </div>
          ))}
        </div>
      )}
      
      {error && (
        <div style={{ 
          color: 'var(--error)', 
          background: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '8px',
          padding: '16px',
          marginBottom: '24px',
          fontWeight: '500'
        }}>
          {error instanceof Error ? error.message : String(error)}
        </div>
      )}

      {/* Таблица пользователей */}
      {!loading && !error && (
        <div style={{
          background: 'var(--surface)',
          borderRadius: '12px',
          border: '1px solid var(--border)',
          overflow: 'hidden',
          boxShadow: 'var(--shadow)'
        }}>
          {/* Заголовки столбцов */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '250px 1fr 1fr 120px 200px',
            gap: '16px',
            padding: '16px 24px',
            background: 'var(--surface-alt)',
            fontWeight: '600',
            fontSize: '14px',
            color: 'var(--text-secondary)'
          }}>
            <div style={{ paddingLeft: '0' }}>ID</div>
            <div style={{ paddingLeft: '0' }}>Имя</div>
            <div style={{ paddingLeft: '0' }}>Email</div>
            <div style={{ paddingLeft: '0' }}>Роль</div>
            <div style={{ paddingLeft: '0' }}>Действия</div>
          </div>

          {/* Список пользователей */}
          {filteredUsers.map(u => (
            <div 
              key={u.id} 
              style={{
                display: 'grid',
                gridTemplateColumns: '250px 1fr 1fr 120px 200px',
                gap: '16px',
                padding: '16px 24px',
                transition: 'all 0.2s ease'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = 'var(--surface-alt)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = 'var(--surface)';
              }}
            >
              <div style={{ 
                fontFamily: 'Monaco, Menlo, Ubuntu Mono, monospace', 
                fontSize: '12px', 
                color: 'var(--text-secondary)',
                wordBreak: 'break-all'
              }}>
                {u.id}
              </div>
              <div style={{ fontWeight: '500' }}>{u.name}</div>
              <div style={{ color: 'var(--text-secondary)' }}>{u.email}</div>
              <div>
                <span style={{
                  display: 'inline-block',
                  padding: '4px 8px',
                  borderRadius: '6px',
                  background: u.role === 'admin' ? 'var(--primary-bg)' : 'transparent',
                  color: u.role === 'admin' ? 'var(--primary)' : 'var(--text-secondary)',
                  fontSize: '12px',
                  fontWeight: '600'
                }}>
                  {u.role === 'admin' ? 'Администратор' : 'Разработчик'}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  onClick={() => openEditUser(u)} 
                  style={{ 
                    padding: '8px 12px', 
                    borderRadius: '6px', 
                    border: '1px solid var(--primary)', 
                    background: 'transparent', 
                    color: 'var(--primary)', 
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: '500',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseOver={(e) => {
                    e.target.style.background = 'var(--primary)';
                    e.target.style.color = '#fff';
                  }}
                  onMouseOut={(e) => {
                    e.target.style.background = 'transparent';
                    e.target.style.color = 'var(--primary)';
                  }}
                >
                  Редактировать
                </button>
                {u.role !== 'admin' && (
                  <button 
                    onClick={() => deleteUser(u.id)}
                    style={{ 
                      padding: '8px 12px', 
                      borderRadius: '6px', 
                      border: '1px solid var(--error)', 
                      background: 'transparent', 
                      color: 'var(--error)', 
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: '500',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseOver={(e) => {
                      e.target.style.background = 'var(--error)';
                      e.target.style.color = '#fff';
                    }}
                    onMouseOut={(e) => {
                      e.target.style.background = 'transparent';
                      e.target.style.color = 'var(--error)';
                    }}
                  >
                    Удалить
                  </button>
                )}
              </div>
            </div>
          ))}

          {/* Пустое состояние */}
          {filteredUsers.length === 0 && users.length > 0 && (
            <div style={{
              textAlign: 'center',
              padding: '48px 24px',
              color: 'var(--text-secondary)'
            }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔍</div>
              <h3 style={{ 
                fontSize: '20px', 
                fontWeight: '600', 
                margin: '0 0 8px 0',
                color: 'var(--text)'
              }}>
                Ничего не найдено
              </h3>
              <p style={{ margin: 0, fontSize: '16px' }}>
                Попробуйте изменить поисковый запрос
              </p>
            </div>
          )}

          {/* Пустое состояние - нет пользователей вообще */}
          {users.length === 0 && (
            <div style={{
              textAlign: 'center',
              padding: '48px 24px',
              color: 'var(--text-secondary)'
            }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>👥</div>
              <h3 style={{ 
                fontSize: '20px', 
                fontWeight: '600', 
                margin: '0 0 8px 0',
                color: 'var(--text)'
              }}>
                Нет пользователей
              </h3>
              <p style={{ margin: 0, fontSize: '16px' }}>
                Создайте первого пользователя для начала работы
              </p>
            </div>
          )}
        </div>
      )}

      <Modal title="Создать пользователя" open={openCreate} onClose={() => setOpenCreate(false)}>
        <form onSubmit={createUser}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 6, color: 'var(--text-secondary)' }}>Имя</label>
            <input 
              required 
              value={form.name} 
              onChange={(e) => setForm({ ...form, name: e.target.value })} 
              style={{ 
                width: '100%', 
                padding: '10px 12px', 
                borderRadius: 6, 
                border: '1px solid var(--border)', 
                background: 'var(--surface)', 
                color: 'var(--text)',
                fontSize: 14,
                boxSizing: 'border-box'
              }} 
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 6, color: 'var(--text-secondary)' }}>Email</label>
            <input 
              required 
              type="email" 
              value={form.email} 
              onChange={(e) => setForm({ ...form, email: e.target.value })} 
              style={{ 
                width: '100%', 
                padding: '10px 12px', 
                borderRadius: 6, 
                border: '1px solid var(--border)', 
                background: 'var(--surface)', 
                color: 'var(--text)',
                fontSize: 14,
                boxSizing: 'border-box'
              }} 
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 6, color: 'var(--text-secondary)' }}>Роль</label>
            <select 
              value={form.role} 
              onChange={(e) => setForm({ ...form, role: e.target.value })} 
              style={{ 
                width: '100%', 
                padding: '10px 12px', 
                borderRadius: 6, 
                border: '1px solid var(--border)', 
                background: 'var(--surface)', 
                color: 'var(--text)',
                fontSize: 14,
                boxSizing: 'border-box',
                appearance: 'none',
                backgroundImage: 'none'
              }}
            >
              <option value="admin">Администратор</option>
              <option value="developer">Разработчик</option>
            </select>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 6, color: 'var(--text-secondary)' }}>Пароль</label>
            <div style={{ position: 'relative' }}>
              <input 
                required 
                type={showPassword ? "text" : "password"}
                value={form.password} 
                onChange={(e) => setForm({ ...form, password: e.target.value })} 
                style={{ 
                  width: '100%', 
                  padding: '10px 12px', 
                  paddingRight: '40px',
                  borderRadius: 6, 
                  border: '1px solid var(--border)', 
                  background: 'var(--surface)', 
                  color: 'var(--text)',
                  fontSize: 14,
                  boxSizing: 'border-box'
                }} 
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '8px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                  color: 'var(--text-secondary)',
                  fontSize: '16px'
                }}
              >
                {showPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 6, color: 'var(--text-secondary)' }}>Доступ к проектам</label>
            <div style={{ 
              maxHeight: '120px', 
              overflowY: 'auto', 
              border: '1px solid var(--border)', 
              borderRadius: 6, 
              padding: '8px',
              background: 'var(--surface)'
            }}>
              {availableProjects.map(project => (
                <label key={project.id} style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  marginBottom: '4px',
                  cursor: form.role === 'admin' ? 'default' : 'pointer'
                }}>
                  <input
                    type="checkbox"
                    checked={form.role === 'admin' ? true : (form.projects?.includes(project.id) || false)}
                    disabled={form.role === 'admin'}
                    onChange={(e) => {
                      if (form.role === 'admin') return;
                      const currentProjects = form.projects || [];
                      if (e.target.checked) {
                        setForm({ ...form, projects: [...currentProjects, project.id] });
                      } else {
                        setForm({ ...form, projects: currentProjects.filter(p => p !== project.id) });
                      }
                    }}
                    style={{ 
                      marginRight: '8px',
                      opacity: form.role === 'admin' ? 0.6 : 1
                    }}
                  />
                  <span style={{ fontSize: '14px' }}>
                    {project.name} ({project.code})
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 6, color: 'var(--text-secondary)' }}>Аватар</label>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 12,
              padding: 16,
              border: '1px dashed var(--border)',
              borderRadius: 8,
              background: 'var(--surface-alt)'
            }}>
              <div style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 24,
                overflow: 'hidden',
                flexShrink: 0
              }}>
                {form.avatar_url ? (
                  form.avatar_url.startsWith('emoji:') ? (
                    <span>{form.avatar_url.replace('emoji:', '')}</span>
                  ) : form.avatar_url.startsWith('/uploads/') ? (
                    <img 
                      src={form.avatar_url} 
                      alt="Аватар" 
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <img 
                      src={form.avatar_url} 
                      alt="Аватар" 
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  )
                ) : (
                  <span>👤</span>
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <input
                  type="file"
                  accept="image/*"
                  onChange={async (e) => {
                    const file = e.target.files[0];
                    if (file) {
                      // Check file size (1MB = 1024 * 1024 bytes)
                      if (file.size > 1024 * 1024) {
                        alert('Фото слишком тяжелое. Максимальный размер: 1MB');
                        return;
                      }
                      
                      try {
                        // Create FormData for file upload
                        const formData = new FormData();
                        formData.append('avatar', file);
                        
                        // Upload file to server
                        const uploadResponse = await api.post('/upload/avatar', formData);
                        if (uploadResponse.success) {
                          setForm({ ...form, avatar_url: uploadResponse.data.url });
                        } else {
                          alert('Ошибка загрузки фото: ' + (uploadResponse.error || 'Неизвестная ошибка'));
                        }
                      } catch (error) {
                        alert('Ошибка загрузки фото: ' + error.message);
                      }
                    }
                  }}
                  style={{ display: 'none' }}
                  id="avatar-upload"
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <label 
                    htmlFor="avatar-upload"
                    style={{
                      display: 'inline-block',
                      padding: '6px 10px',
                      borderRadius: 6,
                      background: 'var(--primary)',
                      color: '#fff',
                      cursor: 'pointer',
                      fontWeight: 500,
                      fontSize: 14,
                      transition: 'all 0.2s ease',
                      flexShrink: 0
                    }}
                    onMouseOver={(e) => e.target.style.opacity = '0.9'}
                    onMouseOut={(e) => e.target.style.opacity = '1'}
                  >
                    Загрузить фото
                  </label>
                  {form.avatar_url && (
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, avatar_url: '' })}
                      style={{
                        display: 'inline-block',
                        padding: '6px 10px',
                        borderRadius: 6,
                        border: '1px solid var(--error)',
                        background: 'transparent',
                        color: 'var(--error)',
                        cursor: 'pointer',
                        fontWeight: 500,
                        fontSize: 14,
                        transition: 'all 0.2s ease',
                        flexShrink: 0
                      }}
                      onMouseOver={(e) => {
                        e.target.style.background = 'var(--error)';
                        e.target.style.color = '#fff';
                      }}
                      onMouseOut={(e) => {
                        e.target.style.background = 'transparent';
                        e.target.style.color = 'var(--error)';
                      }}
                    >
                      Удалить
                    </button>
                  )}
                </div>
                <p style={{ 
                  margin: '8px 0 0 0', 
                  color: 'var(--text-secondary)', 
                  fontSize: '12px' 
                }}>
                  или перетащите изображение сюда
                </p>
                <p style={{ 
                  margin: '4px 0 0 0', 
                  color: 'var(--text-muted)', 
                  fontSize: '11px' 
                }}>
                  Максимальный размер: 1MB. Поддерживаются форматы: JPG, PNG, GIF
                </p>
              </div>
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 6, color: 'var(--text-secondary)' }}>Быстрый выбор эмодзи</label>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, 32px)', 
              gap: 6,
              maxWidth: '100%'
            }}>
              {['😀','😎','🧐','🤓','🦊','🐼','🐯','🐵','🐱','🐶','🦄','🐨','🐸','🐙','🐧','🐢'].map((emoji) => (
                <button 
                  key={emoji} 
                  type="button" 
                  onClick={() => setForm({ ...form, avatar_url: `emoji:${emoji}` })}
                  style={{
                    width: 32, 
                    height: 32, 
                    borderRadius: 6, 
                    border: '1px solid var(--border)', 
                    background: form.avatar_url === `emoji:${emoji}` ? 'rgba(59, 130, 246, 0.1)' : 'var(--surface)', 
                    cursor: 'pointer',
                    fontSize: 16,
                    transition: 'all 0.2s ease'
                  }}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          <div style={{ 
            display: 'flex', 
            justifyContent: 'flex-end', 
            gap: '12px',
            marginTop: 12,
            paddingTop: 16,
            borderTop: 'none'
          }}>
            <button 
              type="button" 
              onClick={() => setOpenCreate(false)} 
              style={{ 
                padding: '8px 12px', 
                borderRadius: 6, 
                border: '1px solid var(--border)', 
                background: 'var(--surface-alt)', 
                color: 'var(--text)', 
                cursor: 'pointer',
                fontWeight: 500,
                fontSize: 14,
                transition: 'all 0.2s ease'
              }}
            >
              Отмена
            </button>
            <button 
              type="submit" 
              style={{ 
                padding: '8px 12px', 
                borderRadius: 6, 
                border: '1px solid var(--border)', 
                background: 'var(--primary)', 
                color: '#fff', 
                cursor: 'pointer',
                fontWeight: 500,
                fontSize: 14,
                transition: 'all 0.2s ease'
              }}
            >
              Создать
            </button>
          </div>
        </form>
      </Modal>

      <Modal title="Редактировать пользователя" open={openEdit} onClose={() => setOpenEdit(false)}>
        <form onSubmit={saveEdit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 6, color: 'var(--text-secondary)' }}>Имя</label>
            <input 
              value={edit.name} 
              onChange={(e) => setEdit({ ...edit, name: e.target.value })} 
              style={{ 
                width: '100%', 
                padding: '10px 12px', 
                borderRadius: 6, 
                border: '1px solid var(--border)', 
                background: 'var(--surface)', 
                color: 'var(--text)',
                fontSize: 14,
                boxSizing: 'border-box'
              }} 
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 6, color: 'var(--text-secondary)' }}>Роль</label>
            <select 
              value={edit.role} 
              onChange={(e) => setEdit({ ...edit, role: e.target.value })} 
              style={{ 
                width: '100%', 
                padding: '10px 12px', 
                borderRadius: 6, 
                border: '1px solid var(--border)', 
                background: 'var(--surface)', 
                color: 'var(--text)',
                fontSize: 14,
                boxSizing: 'border-box',
                appearance: 'none',
                backgroundImage: 'none'
              }}
            >
              <option value="admin">Администратор</option>
              <option value="developer">Разработчик</option>
            </select>
          </div>

                    <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 6, color: 'var(--text-secondary)' }}>Пароль (опционально)</label>
            <div style={{ position: 'relative' }}>
              <input 
                type={showEditPassword ? "text" : "password"}
                value={edit.password} 
                onChange={(e) => setEdit({ ...edit, password: e.target.value })} 
                style={{ 
                  width: '100%', 
                  padding: '10px 12px', 
                  paddingRight: '40px',
                  borderRadius: 6, 
                  border: '1px solid var(--border)', 
                  background: 'var(--surface)', 
                  color: 'var(--text)',
                  fontSize: 14,
                  boxSizing: 'border-box',
                  outline: 'none'
                }} 
              />
              <button
                type="button"
                onClick={() => setShowEditPassword(!showEditPassword)}
                style={{
                  position: 'absolute',
                  right: '8px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                  color: 'var(--text-secondary)',
                  fontSize: '16px'
                }}
              >
                {showEditPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 6, color: 'var(--text-secondary)' }}>Доступ к проектам</label>
            <div style={{ 
              maxHeight: '120px', 
              overflowY: 'auto', 
              border: '1px solid var(--border)', 
              borderRadius: 6, 
              padding: '8px',
              background: 'var(--surface)'
            }}>
              {availableProjects.map(project => (
                <label key={project.id} style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  marginBottom: '4px',
                  cursor: edit.role === 'admin' ? 'default' : 'pointer'
                }}>
                  <input
                    type="checkbox"
                    checked={edit.role === 'admin' ? true : (edit.projects?.includes(project.id) || false)}
                    disabled={edit.role === 'admin'}
                    onChange={(e) => {
                      if (edit.role === 'admin') return;
                      const currentProjects = edit.projects || [];
                      if (e.target.checked) {
                        setEdit({ ...edit, projects: [...currentProjects, project.id] });
                      } else {
                        setEdit({ ...edit, projects: currentProjects.filter(p => p !== project.id) });
                      }
                    }}
                    style={{ 
                      marginRight: '8px',
                      opacity: edit.role === 'admin' ? 0.6 : 1
                    }}
                  />
                  <span style={{ fontSize: '14px' }}>
                    {project.name} ({project.code})
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 6, color: 'var(--text-secondary)' }}>Аватар</label>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 12,
              padding: 16,
              border: '1px dashed var(--border)',
              borderRadius: 8,
              background: 'var(--surface-alt)'
            }}>
              <div style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 24,
                overflow: 'hidden',
                flexShrink: 0
              }}>
                {edit.avatar_url ? (
                  edit.avatar_url.startsWith('emoji:') ? (
                    <span>{edit.avatar_url.replace('emoji:', '')}</span>
                  ) : edit.avatar_url.startsWith('/uploads/') ? (
                    <img 
                      src={edit.avatar_url} 
                      alt="Аватар" 
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <img 
                      src={edit.avatar_url} 
                      alt="Аватар" 
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  )
                ) : (
                  <span>👤</span>
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <input
                  type="file"
                  accept="image/*"
                  onChange={async (e) => {
                    const file = e.target.files[0];
                    if (file) {
                      // Check file size (1MB = 1024 * 1024 bytes)
                      if (file.size > 1024 * 1024) {
                        alert('Фото слишком тяжелое. Максимальный размер: 1MB');
                        return;
                      }
                      
                      try {
                        // Create FormData for file upload
                        const formData = new FormData();
                        formData.append('avatar', file);
                        
                        // Upload file to server
                        const uploadResponse = await api.post('/upload/avatar', formData);
                        if (uploadResponse.success) {
                          setEdit({ ...edit, avatar_url: uploadResponse.data.url });
                        } else {
                          alert('Ошибка загрузки фото: ' + (uploadResponse.error || 'Неизвестная ошибка'));
                        }
                      } catch (error) {
                        alert('Ошибка загрузки фото: ' + error.message);
                      }
                    }
                  }}
                  style={{ display: 'none' }}
                  id="avatar-upload-edit"
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <label 
                    htmlFor="avatar-upload-edit"
                    style={{
                      display: 'inline-block',
                      padding: '6px 10px',
                      borderRadius: 6,
                      background: 'var(--primary)',
                      color: '#fff',
                      cursor: 'pointer',
                      fontWeight: 500,
                      fontSize: 14,
                      transition: 'all 0.2s ease',
                      flexShrink: 0
                    }}
                    onMouseOver={(e) => e.target.style.opacity = '0.9'}
                    onMouseOut={(e) => e.target.style.opacity = '1'}
                  >
                    Загрузить фото
                  </label>
                  <button
                    type="button"
                    onClick={() => setEdit({ ...edit, avatar_url: '' })}
                    style={{
                      display: 'inline-block',
                      padding: '6px 10px',
                      borderRadius: 6,
                      border: '1px solid var(--error)',
                      background: 'transparent',
                      color: 'var(--error)',
                      cursor: 'pointer',
                      fontWeight: 500,
                      fontSize: 14,
                      transition: 'all 0.2s ease',
                      flexShrink: 0
                    }}
                    onMouseOver={(e) => {
                      e.target.style.background = 'var(--error)';
                      e.target.style.color = '#fff';
                    }}
                    onMouseOut={(e) => {
                      e.target.style.background = 'transparent';
                      e.target.style.color = 'var(--error)';
                    }}
                  >
                    Удалить
                  </button>
                </div>
                <p style={{ 
                  margin: '8px 0 0 0', 
                  color: 'var(--text-secondary)', 
                  fontSize: '12px' 
                }}>
                  или перетащите изображение сюда
                </p>
                <p style={{ 
                  margin: '4px 0 0 0', 
                  color: 'var(--text-muted)', 
                  fontSize: '11px' 
                }}>
                  Максимальный размер: 1MB. Поддерживаются форматы: JPG, PNG, GIF
                </p>
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 6, color: 'var(--text-secondary)' }}>Быстрый выбор эмодзи</label>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, 32px)', 
                gap: 6,
                maxWidth: '100%'
              }}>
                {['😀','😎','🧐','🤓','🦊','🐼','🐯','🐵','🐱','🐶','🦄','🐨','🐸','🐙','🐧','🐢'].map((emoji) => (
                  <button 
                    key={emoji} 
                    type="button" 
                    onClick={() => setEdit({ ...edit, avatar_url: `emoji:${emoji}` })}
                    style={{
                      width: 32, 
                      height: 32, 
                      borderRadius: 6, 
                      border: '1px solid var(--border)', 
                      background: edit.avatar_url === `emoji:${emoji}` ? 'rgba(59, 130, 246, 0.1)' : 'var(--surface)', 
                      cursor: 'pointer',
                      fontSize: 16,
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div style={{ 
            display: 'flex', 
            justifyContent: 'flex-end', 
            gap: '12px',
            marginTop: 12
          }}>
            <button 
              type="button" 
              onClick={() => setOpenEdit(false)} 
              style={{ 
                padding: '8px 12px', 
                borderRadius: 6, 
                border: '1px solid var(--border)', 
                background: 'var(--surface-alt)', 
                color: 'var(--text)', 
                cursor: 'pointer',
                fontWeight: 500,
                fontSize: 14,
                transition: 'all 0.2s ease'
              }}
            >
              Отмена
            </button>
            <button 
              type="submit" 
              style={{ 
                padding: '8px 12px', 
                borderRadius: 6, 
                border: '1px solid var(--border)', 
                background: 'var(--primary)', 
                color: '#fff', 
                cursor: 'pointer',
                fontWeight: 500,
                fontSize: 14,
                transition: 'all 0.2s ease'
              }}
            >
              Сохранить
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
