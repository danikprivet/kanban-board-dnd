import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { arrayMove } from "@dnd-kit/sortable";
import { api } from '../api';
import { useAuth } from '../auth/AuthContext';
import Modal from '../components/Modal';
import TaskModal from '../components/TaskModal';
import { KanbanBoard } from '../components/KanbanBoard';

export default function Board({ globalSearch = '' }) {
  const { projectId } = useParams();
  const { user } = useAuth();
  const [columns, setColumns] = useState([]);
  const [tasksByColumn, setTasksByColumn] = useState({});
  const [users, setUsers] = useState([]);
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dataLoaded, setDataLoaded] = useState(false);

  const [openCol, setOpenCol] = useState(false);
  const [colName, setColName] = useState('');
  const [openTask, setOpenTask] = useState(false);
  const [task, setTask] = useState({ 
    title: '', 
    description: '', 
    priority: 'medium', 
    assignee_id: '', 
    tags: '', 
    story_points: '' 
  });
  const [taskColumnId, setTaskColumnId] = useState('');

  const [openTaskEdit, setOpenTaskEdit] = useState(false);
  const [editTask, setEditTask] = useState(null);

  async function load() {
    if (!dataLoaded) {
      setLoading(true);
    }
    setError(null);
    try {
      const [tasksResponse, usersResponse, projectResponse] = await Promise.all([
        api.get(`/tasks/by-project/${projectId}`),
        api.get(`/projects/${projectId}/users`),
        api.get(`/projects/${projectId}`)
      ]);
      
      if (tasksResponse.success && usersResponse.success && projectResponse.success) {
        setColumns(tasksResponse.data.columns);
        setTasksByColumn(tasksResponse.data.tasksByColumn);
        setUsers(usersResponse.data);
        setProject(projectResponse.data);
        setDataLoaded(true);
      } else {
        const errorMessage = tasksResponse.error || usersResponse.error || projectResponse.error || 'Ошибка загрузки данных';
        setError(errorMessage);
      }
    } catch (error) {
      setError(error.message || 'Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { 
    setDataLoaded(false);
    load(); 
    // eslint-disable-next-line
  }, [projectId]);

  // Reload users data when user changes (e.g., avatar update)
  useEffect(() => {
    if (dataLoaded && user && projectId) {
      // Reload both users and tasks data to get fresh assignee avatars
      Promise.all([
        api.get(`/projects/${projectId}/users`),
        api.get(`/tasks/by-project/${projectId}`)
      ]).then(([usersResponse, tasksResponse]) => {
        if (usersResponse.success && tasksResponse.success) {
          // Update users data
          if (JSON.stringify(usersResponse.data) !== JSON.stringify(users)) {
            setUsers(usersResponse.data);
          }
          
          // Update tasks data to get fresh assignee avatars
          if (JSON.stringify(tasksResponse.data.tasksByColumn) !== JSON.stringify(tasksByColumn)) {
            setTasksByColumn(tasksResponse.data.tasksByColumn);
          }
        }
      }).catch(error => {
        console.error('Failed to reload data:', error);
      });
    }
  }, [user?.avatar_url, user?.name, projectId, dataLoaded, users, tasksByColumn]);

  const sortedColumns = useMemo(() => columns.slice().sort((a, b) => a.position - b.position), [columns]);

  const filteredTasksByColumn = useMemo(() => {
    if (!globalSearch) return tasksByColumn;
    const copy = {};
    for (const [colId, list] of Object.entries(tasksByColumn)) {
      copy[colId] = (list || []).filter(t => 
        t.title.toLowerCase().includes(globalSearch.toLowerCase()) ||
        (t.description && t.description.toLowerCase().includes(globalSearch.toLowerCase())) ||
        (t.tag && t.tag.toLowerCase().includes(globalSearch.toLowerCase()))
      );
    }
    return copy;
  }, [tasksByColumn, globalSearch]);

  async function createColumn(e) {
    e?.preventDefault();
    if (!colName.trim()) return;
    
    try {
      const response = await api.post('/columns', {
        project_id: projectId,
        name: colName.trim(),
        position: columns.length
      });
      
      if (response.success) {
        const newColumn = response.data;
        setColumns(prev => [...prev, newColumn]);
        setTasksByColumn(prev => ({ ...prev, [newColumn.id]: [] }));
        setColName('');
        setOpenCol(false);
      } else {
        alert(response.error || 'Ошибка создания колонки');
      }
    } catch (error) {
      alert(error.message || 'Ошибка создания колонки');
    }
  }

  async function createTask(e) {
    e?.preventDefault();
    if (!task.title || task.title.trim().length < 3) return;
    if (!taskColumnId) {
      alert('Пожалуйста, выберите колонку для задачи');
      return;
    }
    
    try {
      const taskData = {
        ...task,
        projectId,
        columnId: taskColumnId,
        title: task.title.trim()
      };
      
      const response = await api.post('/tasks', taskData);
      
      if (response.success) {
        const newTask = response.data;
        setTasksByColumn(prev => ({ 
          ...prev, 
          [newTask.column_id]: [...(prev[newTask.column_id] || []), newTask] 
        }));
        setTask({ title: '', description: '', priority: 'medium', assignee_id: '', tags: '', story_points: '' });
        setTaskColumnId('');
        setOpenTask(false);
      } else {
        alert(response.error || 'Ошибка создания задачи');
      }
    } catch (error) {
      alert(error.message || 'Ошибка создания задачи');
    }
  }

  // function openTaskView(t) {
  //   setEditTask({ ...t });
  //   setOpenTaskEdit(true);
  // }

  async function handleColumnMove(activeId, overId) {
    try {
      const activeColumnIndex = columns.findIndex((col) => col.id === activeId);
      const overColumnIndex = columns.findIndex((col) => col.id === overId);
      const newColumns = arrayMove(columns, activeColumnIndex, overColumnIndex);
      
      // Update local state immediately for better UX
      setColumns(newColumns);
      
      // Persist the new order to the backend
      await api.post(`/columns/reorder`, {
        projectId,
        columnOrder: newColumns.map((col, index) => ({ id: col.id, position: index }))
      });
      
      // Reload data to ensure consistency
      await load();
    } catch (error) {
      console.error('Failed to reorder columns:', error);
      // Revert on error
      await load();
    }
  }

  async function handleTaskMove(activeId, overId, type) {
    let activeColumnId, overColumnId;
    let activeIndex, overIndex;

    // Find which column the active task is in
    for (const colId in tasksByColumn) {
      const taskIndex = tasksByColumn[colId].findIndex(t => t.id === activeId);
      if (taskIndex !== -1) {
        activeColumnId = colId;
        activeIndex = taskIndex;
        break;
      }
    }

    const newTasksByColumn = { ...tasksByColumn };

    if (type === "task") { // Moving over a task
      for (const colId in tasksByColumn) {
        const taskIndex = tasksByColumn[colId].findIndex(t => t.id === overId);
        if (taskIndex !== -1) {
          overColumnId = colId;
          overIndex = taskIndex;
          break;
        }
      }

      if (activeColumnId === overColumnId) {
        newTasksByColumn[activeColumnId] = arrayMove(newTasksByColumn[activeColumnId], activeIndex, overIndex);
      } else {
        const [movedTask] = newTasksByColumn[activeColumnId].splice(activeIndex, 1);
        newTasksByColumn[overColumnId].splice(overIndex, 0, movedTask);
      }
    } else { // Moving over a column
      overColumnId = overId;
      const [movedTask] = newTasksByColumn[activeColumnId].splice(activeIndex, 1);
      if(!newTasksByColumn[overColumnId]) newTasksByColumn[overColumnId] = [];
      newTasksByColumn[overColumnId].push(movedTask);
    }
    
    // Update local state immediately for better UX
    setTasksByColumn(newTasksByColumn);
    
    // Persist the changes to the backend
    try {
      const movedTask = newTasksByColumn[overColumnId].find(t => t.id === activeId);
      if (movedTask) {
        await api.post(`/tasks/move`, {
          taskId: activeId,
          destColumnId: overColumnId,
          destIndex: newTasksByColumn[overColumnId].findIndex(t => t.id === activeId)
        });
      }
    } catch (error) {
      console.error('Failed to save task position:', error);
      // Revert on error
      await load();
    }
  }

  async function deleteTask(taskId) {
    if (!window.confirm('Вы уверены, что хотите удалить эту задачу?')) return;
    
    try {
      const response = await api.delete(`/tasks/${taskId}`);
      if (response.success) {
        await load();
      } else {
        alert(response.error || 'Ошибка удаления задачи');
      }
    } catch (error) {
      console.error('Failed to delete task:', error);
      alert(error.message || 'Ошибка удаления задачи');
    }
  }

  async function deleteColumn(columnId) {
    if (!window.confirm('Вы уверены, что хотите удалить эту колонку? Все задачи будут перенесены в колонку "К работе".')) return;
    
    try {
      // Find the "К работе" column
      const toWorkColumn = sortedColumns.find(col => col.name === 'К работе');
      if (!toWorkColumn) {
        alert('Колонка "К работе" не найдена. Удаление отменено.');
        return;
      }

      // Move all tasks from the column to "К работе"
      const tasksInColumn = tasksByColumn[columnId] || [];
      for (const task of tasksInColumn) {
        await api.post(`/tasks/move`, {
          taskId: task.id,
          destColumnId: toWorkColumn.id,
          destIndex: 0
        });
      }

      // Delete the column
      const response = await api.delete(`/columns/${columnId}`);
      if (response.success) {
        await load();
      } else {
        alert(response.error || 'Ошибка удаления колонки');
      }
    } catch (error) {
      console.error('Failed to delete column:', error);
      alert(error.message || 'Ошибка удаления колонки');
    }
  }

  if (loading) return <div>Загрузка…</div>;
        if (error) return <div style={{ color: 'crimson' }}>{error instanceof Error ? error.message : String(error)}</div>;
  
  // Show empty state if no columns
  if (!sortedColumns || sortedColumns.length === 0) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '400px',
        padding: '40px',
        textAlign: 'center'
      }}>
        <div style={{
          fontSize: '48px',
          color: 'var(--text-secondary)',
          marginBottom: '16px'
        }}>
          📋
        </div>
        <h3 style={{
          fontSize: '24px',
          fontWeight: '600',
          color: 'var(--text)',
          margin: '0 0 8px 0'
        }}>
          Доска пуста
        </h3>
        <p style={{
          fontSize: '16px',
          color: 'var(--text-secondary)',
          margin: '0 0 24px 0',
          maxWidth: '400px'
        }}>
          Создайте первую колонку, чтобы начать работу с задачами
        </p>
        {user?.role === 'admin' && (
          <button 
            onClick={() => setOpenCol(true)} 
            style={{
              padding: '12px 24px',
              borderRadius: '8px',
              border: 'none',
              background: 'var(--primary)',
              color: 'white',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '14px',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => e.target.style.background = 'var(--primary-hover)'}
            onMouseLeave={(e) => e.target.style.background = 'var(--primary)'}
          >
            + Создать колонку
          </button>
        )}
        
        {/* Модальное окно создания колонки в пустом состоянии */}
        <Modal 
          title="Новая колонка" 
          open={openCol} 
          onClose={() => setOpenCol(false)}
          style={{ width: '500px' }}
        >
          <form onSubmit={createColumn}>
            <div style={{ marginBottom: '24px' }}>
              <label className="modal-label" style={{ marginBottom: '12px', display: 'block', textAlign: 'left' }}>Название колонки</label>
              <input 
                className="modal-input"
                value={colName} 
                onChange={(e) => setColName(e.target.value)}  
                placeholder="Введите название колонки"
                required
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  textAlign: 'left',
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
            </div>
            <div className="modal-form-actions" style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button 
                type="button" 
                onClick={() => setOpenCol(false)}
                style={{
                  padding: '12px 20px',
                  borderRadius: '6px',
                  border: '1px solid var(--border)',
                  background: 'var(--surface)',
                  color: 'var(--text)',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '14px',
                  transition: 'all 0.2s ease',
                  outline: 'none'
                }}
                onMouseEnter={(e) => e.target.style.background = 'var(--surface-alt)'}
                onMouseLeave={(e) => e.target.style.background = 'var(--surface)'}
              >
                Отмена
              </button>
              <button 
                type="submit"
                style={{
                  padding: '12px 20px',
                  borderRadius: '6px',
                  border: '1px solid var(--primary)',
                  background: 'var(--primary)',
                  color: 'white',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '14px',
                  transition: 'all 0.2s ease'
                }}

              >
                Добавить
              </button>
            </div>
          </form>
        </Modal>
      </div>
    );
  }

  return (
    <div>
      {/* Заголовок доски */}
      <div style={{ 
        marginBottom: '24px',
        paddingBottom: '16px'
      }}>
        <h1 style={{ 
          margin: 0, 
          fontSize: '28px', 
          fontWeight: '700',
          color: 'var(--text)',
          marginBottom: '4px'
        }}>
          Доска
        </h1>
        {project && (
          <p style={{ 
            margin: 0, 
            color: 'var(--text-secondary)', 
            fontSize: '16px' 
          }}>
            {project.name} ({project.code})
          </p>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        {user?.role === 'admin' && (
          <>
            <button 
              onClick={() => setOpenCol(true)} 
              style={{
                padding: '12px 20px',
                borderRadius: '6px',
                border: '1px solid var(--border)',
                background: 'var(--surface)',
                color: 'var(--text)',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '14px',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              onMouseEnter={(e) => e.target.style.background = 'var(--surface-alt)'}
              onMouseLeave={(e) => e.target.style.background = 'var(--surface)'}
            >
              + Колонка
            </button>
            <button 
              onClick={() => { 
                setTaskColumnId(sortedColumns[0]?.id || ''); 
                setOpenTask(true); 
              }}
              style={{
                padding: '12px 20px',
                borderRadius: '6px',
                border: '1px solid var(--border)',
                background: 'var(--surface)',
                color: 'var(--text)',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '14px',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              onMouseEnter={(e) => e.target.style.background = 'var(--surface-alt)'}
              onMouseLeave={(e) => e.target.style.background = 'var(--surface)'}
            >
              + Задача
            </button>
          </>
        )}
      </div>

      <KanbanBoard 
        columns={sortedColumns}
        tasksByColumn={filteredTasksByColumn}
        onColumnMove={handleColumnMove}
        onTaskMove={handleTaskMove}
        onTaskClick={(task) => {
          setEditTask(task);
          setOpenTaskEdit(true);
        }}
        onTaskDelete={user?.role === 'admin' ? deleteTask : undefined}
        onColumnDelete={user?.role === 'admin' ? deleteColumn : undefined}
        users={users}
      />

      {/* Модальное окно создания колонки для основного интерфейса */}
      <Modal 
        title="Новая колонка" 
        open={openCol} 
        onClose={() => setOpenCol(false)}
        style={{ width: '500px' }}
      >
        <form onSubmit={createColumn}>
          <div style={{ marginBottom: '24px' }}>
            <label className="modal-label" style={{ marginBottom: '12px', display: 'block' }}>Название колонки</label>
            <input 
              className="modal-input"
              value={colName} 
              onChange={(e) => setColName(e.target.value)} 
              placeholder="Введите название колонки"
              required
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
          </div>
          <div className="modal-form-actions" style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <button 
              type="button" 
              onClick={() => setOpenCol(false)}
              style={{
                padding: '12px 20px',
                borderRadius: '6px',
                border: '1px solid var(--border)',
                background: 'var(--surface)',
                color: 'var(--text)',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '14px',
                transition: 'all 0.2s ease',
                outline: 'none'
              }}
              onMouseEnter={(e) => e.target.style.background = 'var(--surface-alt)'}
              onMouseLeave={(e) => e.target.style.background = 'var(--surface)'}
            >
              Отмена
            </button>
            <button 
              type="submit"
              style={{
                padding: '12px 20px',
                borderRadius: '6px',
                border: '1px solid var(--primary)',
                background: 'var(--primary)',
                color: 'white',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '14px',
                transition: 'all 0.2s ease'
              }}
              
            >
              Добавить
            </button>
          </div>
        </form>
      </Modal>

      <Modal 
        title="Новая задача" 
        open={openTask} 
        onClose={() => setOpenTask(false)}
        style={{ width: '600px' }}
      >
        <form onSubmit={createTask}>
          <div className="modal-form-group" style={{ marginBottom: '24px' }}>
            <label className="modal-label" style={{ marginBottom: '12px', display: 'block' }}>Колонка</label>
            <select 
              className="modal-select"
              value={taskColumnId} 
              onChange={(e) => setTaskColumnId(e.target.value)}
              required
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
              {sortedColumns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          
          <div className="modal-form-group" style={{ marginBottom: '24px' }}>
            <label className="modal-label" style={{ marginBottom: '12px', display: 'block' }}>Название задачи *</label>
            <input 
              className="modal-input"
              required 
              minLength={3} 
              value={task.title} 
              onChange={(e) => setTask({ ...task, title: e.target.value })} 
              placeholder="Введите название задачи"
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
          </div>

          <div className="modal-form-group" style={{ marginBottom: '24px' }}>
            <label className="modal-label" style={{ marginBottom: '12px', display: 'block' }}>Описание</label>
            <textarea 
              className="modal-textarea"
              value={task.description} 
              onChange={(e) => setTask({ ...task, description: e.target.value })} 
              placeholder="Введите описание задачи"
              rows={3}
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
          </div>

          <div className="modal-form-row" style={{ marginBottom: '24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="modal-form-group" style={{ marginBottom: '0' }}>
              <label className="modal-label" style={{ marginBottom: '12px', display: 'block' }}>Приоритет</label>
              <select 
                className="modal-select"
                value={task.priority} 
                onChange={(e) => setTask({ ...task, priority: e.target.value })}
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
            </div>
            
            <div className="modal-form-group" style={{ marginBottom: '0' }}>
              <label className="modal-label" style={{ marginBottom: '12px', display: 'block' }}>Story Points</label>
              <input 
                className="modal-input"
                type="number"
                min="0"
                value={task.story_points} 
                onChange={(e) => setTask({ ...task, story_points: e.target.value })} 
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
            </div>
          </div>

          <div className="modal-form-group" style={{ marginBottom: '24px' }}>
            <label className="modal-label" style={{ marginBottom: '12px', display: 'block' }}>Теги</label>
            <input 
              className="modal-input"
              value={task.tags} 
              onChange={(e) => setTask({ ...task, tags: e.target.value })} 
              placeholder="Введите свой тег"
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
          </div>

          <div className="modal-form-group" style={{ marginBottom: '24px' }}>
            <label className="modal-label" style={{ marginBottom: '12px', display: 'block' }}>Исполнитель</label>
            <select 
              className="modal-select"
              value={task.assignee_id} 
              onChange={(e) => setTask({ ...task, assignee_id: e.target.value })}
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
              {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>
          
          <div className="modal-form-actions" style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <button 
              type="button" 
              onClick={() => setOpenTask(false)}
              style={{
                padding: '12px 20px',
                borderRadius: '6px',
                border: '1px solid var(--border)',
                background: 'var(--surface)',
                color: 'var(--text)',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '14px',
                transition: 'all 0.2s ease',
                outline: 'none'
              }}
              onMouseEnter={(e) => e.target.style.background = 'var(--surface-alt)'}
              onMouseLeave={(e) => e.target.style.background = 'var(--surface)'}
            >
              Отмена
            </button>
            <button 
              type="submit"
              style={{
                padding: '12px 20px',
                borderRadius: '6px',
                border: '1px solid var(--border)',
                background: 'var(--primary)',
                color: 'white',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '14px',
                transition: 'all 0.2s ease'
              }}
              onMouseOver={(e) => {
                e.target.style.boxShadow = 'var(--shadow-lg)';
              }}
              onMouseOut={(e) => {
                e.target.style.boxShadow = 'var(--shadow)';
              }}
            >
              Создать
            </button>
          </div>
        </form>
      </Modal>

      <TaskModal
        task={editTask}
        open={openTaskEdit}
        onClose={() => setOpenTaskEdit(false)}
        onSave={(updatedTask) => {
          setTasksByColumn(prev => {
            const next = { ...prev };
            Object.keys(next).forEach(colId => {
              next[colId] = next[colId].map(task => 
                task.id === updatedTask.id ? updatedTask : task
              );
            });
            return next;
          });
          setEditTask(updatedTask);
          setOpenTaskEdit(false);
        }}
        onDelete={(taskId) => {
          setTasksByColumn(prev => {
            const next = { ...prev };
            Object.keys(next).forEach(colId => {
              next[colId] = next[colId].filter(task => task.id !== taskId);
            });
            return next;
          });
          setEditTask(null);
          setOpenTaskEdit(false);
        }}
      />
    </div>
  );
}
