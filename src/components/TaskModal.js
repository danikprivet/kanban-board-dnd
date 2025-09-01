import React, { useState, useEffect, useCallback } from 'react';
import Modal from './Modal';

import { api } from '../api';
import { useAuth } from '../auth/AuthContext';

export default function TaskModal({ task, open, onClose, onSave, onDelete }) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('details');
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [users, setUsers] = useState([]);
  const [showDeleteButton, setShowDeleteButton] = useState(false);
  const [taskHistory, setTaskHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    if (open && task) {
      // Parse tag correctly
      let tagsString = task.tag || '';
      
      const formData = {
        title: task.title || '',
        description: task.description || '',
        priority: task.priority || 'medium',
        story_points: task.story_points || '',
        tags: tagsString,
        assignee_id: task.assignee_id || ''
      };
      
      setEditForm(formData);
    } else if (open && !task) {
      setEditForm({
        title: '',
        description: '',
        priority: 'medium',
        story_points: '',
        tags: '',
        assignee_id: ''
      });
    }
  }, [open, task]);

  const loadUsers = useCallback(async () => {
    try {
      const response = await api.get('/users');
      if (response.success) {
        setUsers(response.data);
      } else {
        console.error('Failed to load users:', response.error);
        setUsers([]);
      }
    } catch (e) {
      console.error('Failed to load users:', e);
      setUsers([]);
    }
  }, []);

  const loadTaskHistory = useCallback(async () => {
    if (!task?.id) return;
    
    setHistoryLoading(true);
    try {
      const response = await api.get(`/task-history/${task.id}`);
      if (response.success) {
        setTaskHistory(response.data || []);
      } else {
        console.error('Failed to load task history:', response.error);
        setTaskHistory([]);
      }
    } catch (e) {
      console.error('Failed to load task history:', e);
      setTaskHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }, [task?.id]);

  const loadComments = useCallback(async () => {
    if (!task?.id) return;
    try {
      const response = await api.get(`/comments/by-task/${task.id}`);
      if (response.success) {
        setComments(response.data);
      } else {
        console.error('Failed to load comments:', response.error);
        setComments([]);
      }
    } catch (e) {
      console.error('Failed to load comments:', e);
      setComments([]);
    }
  }, [task?.id]);

  useEffect(() => {
    if (open && task?.id) {
      loadComments();
      loadUsers();
      loadTaskHistory();
    }
  }, [open, task?.id, loadComments, loadUsers, loadTaskHistory]);

  // Close delete menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (showDeleteButton && !event.target.closest('[data-delete-menu]')) {
        setShowDeleteButton(false);
      }
    }
    
    if (showDeleteButton) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDeleteButton]);

  const addComment = useCallback(async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    if (!task?.id) return;
    
    setLoading(true);
    try {
      const response = await api.post('/comments', {
        taskId: task.id,
        content: newComment.trim()
      });
      if (response.success) {
        setComments(prev => [response.data, ...prev]);
        setNewComment('');
      } else {
        console.error('Error adding comment:', response.error);
      }
    } catch (e) {
      console.error('Error adding comment:', e);
    } finally {
      setLoading(false);
    }
  }, [task, newComment]);

  const saveTask = useCallback(async (e) => {
    e.preventDefault();
    if (!task || !task.id) return;
    
    setLoading(true);
    try {
      const payload = {
        ...editForm,
        tag: editForm.tags ? editForm.tags.trim() : ''
      };
      
      console.log('TaskModal: Saving task with payload:', payload);
      
      const response = await api.put(`/tasks/${task.id}`, payload);
      
      console.log('TaskModal: Task saved successfully:', response.data);
      
      if (onSave) {
        onSave(response.data);
      }
      setEditMode(false);
    } catch (e) {
      console.error('Error saving task:', e);
      console.error('TaskModal: Full error details:', {
        message: e.message,
        stack: e.stack,
        taskId: task?.id,
        payload: editForm
      });
    } finally {
      setLoading(false);
    }
  }, [task, editForm, onSave]);



  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'low': return 'var(--priority-low)';
      case 'high': return 'var(--priority-high)';
      default: return 'var(--priority-medium)';
    }
  };

  const getPriorityText = (priority) => {
    switch (priority) {
      case 'low': return 'Низкий';
      case 'high': return 'Высокий';
      default: return 'Средний';
    }
  };

  const getHistoryActionText = (action) => {
    switch (action) {
      case 'task_created': return 'Задача создана';
      case 'task_updated': return 'Задача обновлена';
      case 'task_deleted': return 'Задача удалена';
      case 'task_moved': return 'Задача перемещена';
      case 'comment_added': return 'Добавлен комментарий';
      default: return 'Действие выполнено';
    }
  };

  const getHistoryDetails = (action, payload) => {
    try {
      const data = typeof payload === 'string' ? JSON.parse(payload) : payload;
      
      switch (action) {
        case 'task_created':
          return `Создана задача "${data.title}" с приоритетом "${getPriorityText(data.priority)}"`;
        case 'task_updated':
          if (data.changes && Array.isArray(data.changes)) {
            const changeDescriptions = data.changes.map(change => {
              let fieldName = '';
              let fromValue = change.oldValue;
              let toValue = change.newValue;

              switch (change.field) {
                case 'title': fieldName = 'Название'; break;
                case 'description': fieldName = 'Описание'; break;
                case 'priority':
                  fieldName = 'Приоритет';
                  fromValue = getPriorityText(change.oldValue);
                  toValue = getPriorityText(change.newValue);
                  break;
                case 'assignee_id':
                  fieldName = 'Исполнитель';
                  fromValue = change.oldAssigneeName || 'Не назначен';
                  toValue = change.newAssigneeName || 'Не назначен';
                  break;
                case 'tag': fieldName = 'Тег'; break;
                case 'story_points': fieldName = 'Story Points'; break;
                case 'column_id':
                  fieldName = 'Столбец';
                  fromValue = change.oldColumnName || 'Неизвестно';
                  toValue = change.newColumnName || 'Неизвестно';
                  break;
                default: fieldName = change.field;
              }
              
              // Handle empty values and undefined
              if (fromValue === undefined || fromValue === null) fromValue = 'пусто';
              if (toValue === undefined || toValue === null) toValue = 'пусто';
              if (fromValue === '') fromValue = 'пусто';
              if (toValue === '') toValue = 'пусто';
              
              return `${fieldName}: ${fromValue} → ${toValue}`;
            });
            return `Обновлены поля: ${changeDescriptions.join(', ')}`;
          }
          return 'Обновлены поля (детали недоступны)';
        case 'task_deleted':
          return `Удалена задача "${data.taskTitle}"`;
        case 'task_moved':
          return `Перемещена из "${data.fromColumn}" в "${data.toColumn}"`;
        case 'comment_added':
          return `Комментарий: ${data.content}`;
        default:
          return JSON.stringify(data);
      }
    } catch (e) {
      return 'Детали недоступны';
    }
  };

  if (!task) return null;

  return (
    <Modal 
      open={open} 
      onClose={onClose} 
      title={task.title || 'Задача'}
      style={{ width: '700px', height: '650px' }}
    >
      <div style={{ height: '100%', paddingTop: '0', display: 'flex', flexDirection: 'column' }}>
        {/* Tabs */}
        <div style={{ 
          display: 'flex', 
          marginBottom: '16px',
          gap: '4px'
        }}>
          <button
            onClick={() => setActiveTab('details')}
            style={{
              padding: '12px 20px',
              border: 'none',
              background: activeTab === 'details' ? 'var(--primary)' : 'transparent',
              color: activeTab === 'details' ? 'white' : 'var(--text)',
              cursor: 'pointer',
              fontWeight: '600',
              borderBottom: 'none',
              transition: 'all 0.2s ease',
              borderRadius: '8px 8px 0 0',
              textAlign: 'center',
              minWidth: '140px',
              maxWidth: '140px',
              width: '140px'
            }}
          >
            Детали
          </button>
          <button
            onClick={() => setActiveTab('comments')}
            style={{
              padding: '12px 20px',
              border: 'none',
              background: activeTab === 'comments' ? 'var(--primary)' : 'transparent',
              color: activeTab === 'comments' ? 'white' : 'var(--text)',
              cursor: 'pointer',
              fontWeight: '600',
              borderBottom: 'none',
              transition: 'all 0.2s ease',
              borderRadius: '8px 8px 0 0',
              textAlign: 'center',
              minWidth: '140px',
              maxWidth: '140px',
              width: '140px'
            }}
          >
            Комментарии ({comments.length})
          </button>
          <button
            onClick={() => setActiveTab('history')}
            style={{
              padding: '12px 20px',
              border: 'none',
              background: activeTab === 'history' ? 'var(--primary)' : 'transparent',
              color: activeTab === 'history' ? 'white' : 'var(--text)',
              cursor: 'pointer',
              fontWeight: '600',
              borderBottom: 'none',
              transition: 'all 0.2s ease',
              borderRadius: '8px 8px 0 0',
              textAlign: 'center',
              minWidth: '140px',
              maxWidth: '140px',
              width: '140px'
            }}
          >
            История
          </button>
        </div>

        {/* Tab Content */}
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          {activeTab === 'details' && (
            <div style={{ flex: 1, overflow: 'auto', paddingRight: '8px', minHeight: 0 }}>
              {/* Edit/View Toggle */}
              <div style={{ 
                display: 'flex', 
                justifyContent: 'flex-end', 
                alignItems: 'center', 
                marginBottom: '16px',
                paddingBottom: '12px',
                position: 'sticky',
                top: 0,
                background: 'var(--surface)',
                zIndex: 10
              }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  {editMode ? (
                    <>
                      <button
                        type="button"
                        onClick={() => setEditMode(false)}
                        style={{
                          padding: '8px 12px',
                          borderRadius: '6px',
                          border: '1px solid var(--border)',
                          background: 'var(--surface)',
                          color: 'var(--text)',
                          cursor: 'pointer',
                          fontSize: '12px',
                          fontWeight: '500',
                          outline: 'none',
                          boxShadow: 'none'
                        }}
                      >
                        Отмена
                      </button>
                      <button
                        type="button"
                        onClick={saveTask}
                        disabled={loading}
                        style={{
                          padding: '8px 12px',
                          borderRadius: '6px',
                          border: '1px solid var(--primary)',
                          background: 'var(--primary)',
                          color: 'white',
                          cursor: 'pointer',
                          fontSize: '12px',
                          fontWeight: '500',
                          opacity: loading ? 0.5 : 1,
                          outline: 'none',
                          boxShadow: 'none'
                        }}
                      >
                        {loading ? 'Сохранение...' : 'Сохранить'}
                      </button>
                    </>
                  ) : (
                    <>
                      {user?.role === 'admin' && (
                        <button
                          type="button"
                          onClick={() => setEditMode(true)}
                          style={{
                            padding: '8px 12px',
                            borderRadius: '6px',
                            border: '1px solid var(--primary)',
                            background: 'transparent',
                            color: 'var(--primary)',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: '500',
                            outline: 'none',
                            boxShadow: 'none'
                          }}
                        >
                          Редактировать
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Description */}
              <div className="modal-form-group" style={{ marginBottom: '20px' }}>
                <label className="modal-label" style={{ marginBottom: '8px', display: 'block' }}>Описание</label>
                {editMode ? (
                  <textarea
                    className="modal-textarea"
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    placeholder="Введите описание задачи"
                    rows={4}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      borderRadius: '8px',
                      border: '2px solid var(--border)',
                      background: 'var(--surface)',
                      color: 'var(--text)',
                      fontSize: '14px',
                      outline: 'none',
                      transition: 'all 0.3s ease',
                      boxSizing: 'border-box',
                      resize: 'vertical',
                      minHeight: '100px',
                      lineHeight: '1.5'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = 'var(--primary)';
                      e.target.style.boxShadow = '0 0 0 4px rgba(0, 123, 255, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = 'var(--border)';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                ) : (
                  <div style={{
                    padding: '12px 16px',
                    background: 'var(--surface-alt)',
                    borderRadius: '8px',
                    color: 'var(--text)',
                    minHeight: '80px',
                    whiteSpace: 'pre-wrap'
                  }}>
                    {task.description || 'Описание не указано'}
                  </div>
                )}
              </div>

              {/* Priority, Story Points, Tags, Assignee - Grouped in 2 rows */}
              <div style={{ marginBottom: '20px' }}>
                {/* Row 1: Priority and Story Points */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                  <div className="modal-form-group" style={{ marginBottom: '0' }}>
                    <label className="modal-label" style={{ marginBottom: '8px', display: 'block' }}>Приоритет</label>
                    {editMode ? (
                      <select
                        className="modal-select"
                        value={editForm.priority}
                        onChange={(e) => setEditForm({ ...editForm, priority: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '12px 16px',
                          borderRadius: '8px',
                          border: '2px solid var(--border)',
                          background: 'var(--surface)',
                          color: 'var(--text)',
                          fontSize: '14px',
                          outline: 'none',
                          transition: 'all 0.3s ease',
                          boxSizing: 'border-box',
                          appearance: 'none',
                          backgroundImage: 'url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'currentColor\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3e%3cpolyline points=\'6,9 12,15 18,9\'%3e%3c/polyline%3e%3c/svg%3e")',
                          backgroundRepeat: 'no-repeat',
                          backgroundPosition: 'right 12px center',
                          backgroundSize: '16px',
                          paddingRight: '40px'
                        }}
                        onFocus={(e) => {
                          e.target.style.borderColor = 'var(--primary)';
                          e.target.style.boxShadow = '0 0 0 4px rgba(0, 123, 255, 0.1)';
                        }}
                        onBlur={(e) => {
                          e.target.style.borderColor = 'var(--border)';
                          e.target.style.boxShadow = 'none';
                        }}
                      >
                        <option value="low">Низкий</option>
                        <option value="medium">Средний</option>
                        <option value="high">Высокий</option>
                      </select>
                    ) : (
                      <div style={{
                        padding: '8px 12px',
                        background: getPriorityColor(task.priority || 'medium'),
                        color: 'white',
                        borderRadius: '6px',
                        fontWeight: '600',
                        textAlign: 'center',
                        textTransform: 'uppercase',
                        fontSize: '12px'
                      }}>
                        {getPriorityText(task.priority || 'medium')}
                      </div>
                    )}
                  </div>
                  <div className="modal-form-group" style={{ marginBottom: '0' }}>
                    <label className="modal-label" style={{ marginBottom: '8px', display: 'block' }}>Story Points</label>
                    {editMode ? (
                      <input
                        className="modal-input"
                        type="number"
                        min="0"
                        value={editForm.story_points}
                        onChange={(e) => setEditForm({ ...editForm, story_points: e.target.value })}
                        placeholder="0"
                        style={{
                          width: '100%',
                          padding: '12px 16px',
                          borderRadius: '8px',
                          border: '2px solid var(--border)',
                          background: 'var(--surface)',
                          color: 'var(--text)',
                          fontSize: '14px',
                          outline: 'none',
                          transition: 'all 0.3s ease',
                          boxSizing: 'border-box'
                        }}
                        onFocus={(e) => {
                          e.target.style.borderColor = 'var(--primary)';
                          e.target.style.boxShadow = '0 0 0 4px rgba(0, 123, 255, 0.1)';
                        }}
                        onBlur={(e) => {
                          e.target.style.borderColor = 'var(--border)';
                          e.target.style.boxShadow = 'none';
                        }}
                      />
                    ) : (
                      <div style={{
                        padding: '8px 12px',
                        background: 'var(--primary)',
                        color: 'white',
                        borderRadius: '6px',
                        fontWeight: '600',
                        textAlign: 'center'
                      }}>
                        {task.story_points || 'Не указано'}
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Row 2: Tags and Assignee */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="modal-form-group" style={{ marginBottom: '0' }}>
                    <label className="modal-label" style={{ marginBottom: '8px', display: 'block' }}>Тег</label>
                    {editMode ? (
                      <input
                        className="modal-input"
                        value={editForm.tags}
                        onChange={(e) => setEditForm({ ...editForm, tags: e.target.value })}
                        placeholder="Введите тег"
                        style={{
                          width: '100%',
                          padding: '12px 16px',
                          borderRadius: '8px',
                          border: '2px solid var(--border)',
                          background: 'var(--surface)',
                          color: 'var(--text)',
                          fontSize: '14px',
                          outline: 'none',
                          transition: 'all 0.3s ease',
                          boxSizing: 'border-box'
                        }}
                        onFocus={(e) => {
                          e.target.style.borderColor = 'var(--primary)';
                          e.target.style.boxShadow = '0 0 0 4px rgba(0, 123, 255, 0.1)';
                        }}
                        onBlur={(e) => {
                          e.target.style.borderColor = 'var(--border)';
                          e.target.style.boxShadow = 'none';
                        }}
                      />
                    ) : (
                      <div style={{
                        padding: '8px 12px',
                        background: 'var(--surface-alt)',
                        borderRadius: '6px',
                        color: 'var(--text)',
                        fontWeight: '500'
                      }}>
                        {task.tag || 'Не указано'}
                      </div>
                    )}
                  </div>
                  <div className="modal-form-group" style={{ marginBottom: '0' }}>
                    <label className="modal-label" style={{ marginBottom: '8px', display: 'block' }}>Исполнитель</label>
                    {editMode ? (
                      <select
                        className="modal-select"
                        value={editForm.assignee_id}
                        onChange={(e) => setEditForm({ ...editForm, assignee_id: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '12px 16px',
                          borderRadius: '8px',
                          border: '2px solid var(--border)',
                          background: 'var(--surface)',
                          color: 'var(--text)',
                          fontSize: '14px',
                          outline: 'none',
                          transition: 'all 0.3s ease',
                          boxSizing: 'border-box',
                          appearance: 'none',
                          backgroundImage: 'url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'currentColor\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3e%3cpolyline points=\'6,9 12,15 18,9\'%3e%3c/polyline%3e%3c/svg%3e")',
                          backgroundRepeat: 'no-repeat',
                          backgroundPosition: 'right 12px center',
                          backgroundSize: '16px',
                          paddingRight: '40px'
                        }}
                        onFocus={(e) => {
                          e.target.style.borderColor = 'var(--primary)';
                          e.target.style.boxShadow = '0 0 0 4px rgba(0, 123, 255, 0.1)';
                        }}
                        onBlur={(e) => {
                          e.target.style.borderColor = 'var(--border)';
                          e.target.style.boxShadow = 'none';
                        }}
                      >
                        <option value="">Не назначен</option>
                        {users.map(user => (
                          <option key={user.id} value={user.id}>
                            {user.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 12px',
                        background: 'var(--surface-alt)',
                        borderRadius: '6px',
                        color: 'var(--text)',
                        fontWeight: '500'
                      }}>
                        {task.assignee_name ? (
                          <>
                                                         <div style={{
                               width: '24px',
                               height: '24px',
                               borderRadius: '50%',
                                                                background: (() => {
                                   // Try to get fresh avatar from users array first
                                   const freshUser = users.find(u => {
                                     // Convert both IDs to strings for comparison
                                     const userId = String(u.id);
                                     const taskAssigneeId = String(task.assignee_id);
                                     return userId === taskAssigneeId;
                                   });
                                   
                                   let avatarUrl = freshUser?.avatar_url || task.assignee_avatar;
                                   

                                   
                                   // Check for emoji avatars first
                                   if (avatarUrl && avatarUrl.startsWith('emoji:')) {
                                     // For emoji avatars, extract the emoji and show it
                                     const emoji = avatarUrl.replace('emoji:', '');
                                     return `url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y="50%" x="50%" dominant-baseline="middle" text-anchor="middle" font-size="60">${emoji}</text></svg>') center/contain`;
                                   }
                                   
                                   // Check for uploaded avatars
                                   if (avatarUrl && avatarUrl.startsWith('/uploads/')) {
                                     return `url(${avatarUrl}) center/cover`;
                                   }
                                   
                                   // Filter out other invalid avatar URLs
                                   if (!avatarUrl || avatarUrl === 'emoji:' || avatarUrl.trim() === '') {
                                     avatarUrl = null;
                                   }
                                   
                                   return avatarUrl 
                                     ? `url(${avatarUrl}) center/cover` 
                                     : 'var(--primary)';
                                 })(),
                               display: 'flex',
                               alignItems: 'center',
                               justifyContent: 'center',
                               fontSize: '12px',
                               fontWeight: '600',
                               color: 'white'
                             }}>
                               {(() => {
                                 // Try to get fresh avatar from users array first
                                 const freshUser = users.find(u => {
                                   // Convert both IDs to strings for comparison
                                   const userId = String(u.id);
                                   const taskAssigneeId = String(task.assignee_id);
                                   return userId === taskAssigneeId;
                                 });
                                 
                                 let avatarUrl = freshUser?.avatar_url || task.assignee_avatar;
                                 
                                 // Check for emoji avatars first
                                 if (avatarUrl && avatarUrl.startsWith('emoji:')) {
                                   // For emoji avatars, don't show initial - emoji will be shown as background
                                   return '';
                                 }
                                 
                                 // Filter out other invalid avatar URLs
                                 if (!avatarUrl || avatarUrl === 'emoji:' || avatarUrl.trim() === '') {
                                   avatarUrl = null;
                                 }
                                 
                                 return !avatarUrl && task.assignee_name.charAt(0).toUpperCase();
                               })()}
                             </div>
                            {task.assignee_name}
                          </>
                        ) : (
                          'Не назначен'
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'comments' && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, height: '100%' }}>
              {/* Add Comment Form */}
              <div style={{ marginBottom: '16px', flexShrink: 0 }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '12px', 
                  fontWeight: '600', 
                  color: 'var(--text)',
                  fontSize: '14px'
                }}>
                  Добавить комментарий
                </label>
                <form onSubmit={addComment} style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Введите комментарий..."
                    style={{
                      flex: 1,
                      padding: '12px 16px',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                      background: 'var(--surface)',
                      color: 'var(--text)',
                      fontSize: '14px',
                      outline: 'none',
                      transition: 'all 0.2s ease'
                    }}
                    onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
                    onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
                  />
                  <button
                    type="submit"
                    disabled={!newComment.trim() || loading}
                    style={{
                      padding: '12px 16px',
                      borderRadius: '8px',
                      border: 'none',
                      background: newComment.trim() ? 'var(--primary)' : 'var(--border)',
                      color: 'white',
                      cursor: newComment.trim() ? 'pointer' : 'not-allowed',
                      fontSize: '14px',
                      fontWeight: '500',
                      opacity: newComment.trim() ? 1 : 0.5
                    }}
                  >
                    {loading ? '...' : '→'}
                  </button>
                </form>
              </div>

              {/* Comments List */}
              <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, maxHeight: '400px', paddingBottom: '16px', paddingRight: '16px' }}>
                {comments.length > 0 ? (
                  [...comments].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).map((comment) => (
                    <div key={comment.id} style={{
                      padding: '16px',
                      borderBottom: '1px solid var(--border)',
                      background: 'var(--surface-alt)',
                      borderRadius: '8px',
                      marginBottom: '8px'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                        <span style={{ fontWeight: '600', color: 'var(--text)' }}>
                          {comment.user_name || 'Пользователь'}
                        </span>
                        <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                          {new Date(comment.created_at).toLocaleString()}
                        </span>
                      </div>
                      <div style={{ color: 'var(--text)', lineHeight: '1.5' }}>
                        {comment.content}
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{ 
                    textAlign: 'center', 
                    color: 'var(--text-secondary)', 
                    padding: '40px 20px',
                    fontSize: '14px'
                  }}>
                    Комментариев пока нет
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
              <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, maxHeight: '500px', paddingBottom: '16px', paddingRight: '16px' }}>
                {historyLoading ? (
                  <div style={{ 
                    textAlign: 'center', 
                    color: 'var(--text-secondary)', 
                    padding: '40px 20px',
                    fontSize: '14px'
                  }}>
                    Загрузка истории...
                  </div>
                ) : taskHistory.length > 0 ? (
                  taskHistory.map((entry) => (
                    <div key={entry.id} style={{
                      padding: '16px',
                      borderBottom: '1px solid var(--border)',
                      background: 'var(--surface-alt)',
                      borderRadius: '8px',
                      marginBottom: '8px'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                        <span style={{ fontWeight: '600', color: 'var(--text)' }}>
                          {entry.user_name || 'Система'}
                        </span>
                        <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                          {new Date(entry.created_at).toLocaleString()}
                        </span>
                      </div>
                      <div style={{ color: 'var(--text)', lineHeight: '1.5' }}>
                        {getHistoryDetails(entry.action, entry.payload)}
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{ 
                    textAlign: 'center', 
                    color: 'var(--text-secondary)', 
                    padding: '40px 20px',
                    fontSize: '14px'
                  }}>
                    История изменений пуста
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
