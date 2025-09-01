import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

export function DndCard({ task, isOverlay, onClick, onDelete, users = [] }) {
  const handleDelete = (e) => {
    e.stopPropagation();
    onDelete(task.id);
  };
  
  const {
    setNodeRef,
    attributes,
    listeners,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    data: {
      type: "Task",
      task,
    },
  });

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

  const style = {
    transition: isDragging ? 'none' : 'transform 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
    transform: CSS.Transform.toString(transform),
    padding: '16px',
    minHeight: '80px',
    display: 'flex',
    flexDirection: 'column',
    textAlign: 'left',
    borderRadius: '8px',
    cursor: isDragging ? 'grabbing' : 'grab',
    position: 'relative',
    fontSize: '14px',
    backgroundColor: 'var(--surface)',
    border: '1px solid var(--border)',
    boxShadow: isDragging 
      ? '0 8px 25px rgba(0,0,0,0.2)' 
      : '0 2px 8px rgba(0,0,0,0.1)',
    opacity: isDragging ? 0.5 : 1,
  };

  const overlayStyle = {
    ...style,
    boxShadow: '0 12px 32px rgba(0,0,0,0.3)',
    opacity: 0.9,
    zIndex: 1000,
    transform: CSS.Transform.toString(transform),
  };

  const finalStyle = isOverlay ? overlayStyle : style;

  return (
    <div
      ref={setNodeRef}
      style={finalStyle}
      {...attributes}
      {...listeners}
      onClick={onClick && !isDragging ? () => onClick(task) : undefined}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
        <span style={{ 
          fontWeight: '600', 
          color: 'var(--text-primary)', 
          fontSize: '15px', 
          lineHeight: '1.3', 
          flex: 1, 
          marginRight: '12px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }}>
          {task.title || task.name || 'Без названия'}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {task.priority && (
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '10px',
              fontWeight: '600',
              textTransform: 'uppercase',
              letterSpacing: '0.3px',
              background: getPriorityColor(task.priority),
              color: 'white',
              transition: 'all 0.2s ease'
            }}>
              {getPriorityText(task.priority)}
            </span>
          )}
          {onDelete && (
            <button
              onClick={handleDelete}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                fontSize: '18px',
                padding: '6px',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease',
                width: '28px',
                height: '28px'
              }}
              onMouseEnter={(e) => {
                e.target.style.color = 'var(--error)';
                e.target.style.background = 'rgba(239, 68, 68, 0.1)';
              }}
              onMouseLeave={(e) => {
                e.target.style.color = 'var(--text-secondary)';
                e.target.style.background = 'none';
              }}
            >
              ×
            </button>
          )}
        </div>
      </div>

      {task.tag && (
        <div style={{ marginBottom: '12px' }}>
          <span style={{
            display: 'inline-block',
            padding: '4px 8px',
            borderRadius: '4px',
            fontSize: '11px',
            fontWeight: '500',
            background: 'var(--surface-alt)',
            color: 'var(--text-secondary)',
            border: '1px solid var(--border)',
            transition: 'all 0.2s ease'
          }}>
            {task.tag}
          </span>
        </div>
      )}

      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '12px'
      }}>
        <div style={{ flex: 1 }}>
          {task.story_points && (
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '11px',
              fontWeight: '600',
              background: 'var(--primary)',
              color: 'white',
              transition: 'all 0.2s ease'
            }}>
              {task.story_points} SP
            </span>
          )}
        </div>
        {task.assignee_name && (
          <div 
            title={task.assignee_name}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px',
              fontWeight: '600',
              color: 'white',
              background: (() => {
                const freshUser = users.find(u => {
                  const userId = String(u.id);
                  const taskAssigneeId = String(task.assignee_id || task.assignee_id);
                  return userId === taskAssigneeId;
                });
                
                let avatarUrl = freshUser?.avatar_url || task.assignee_avatar;
                
                if (avatarUrl && avatarUrl.startsWith('emoji:')) {
                  const emoji = avatarUrl.replace('emoji:', '');
                  return `url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y="50%" x="50%" dominant-baseline="middle" text-anchor="middle" font-size="60">${emoji}</text></svg>') center/contain`;
                }
                
                if (avatarUrl && avatarUrl.startsWith('/uploads/')) {
                  return `url(${avatarUrl}) center/cover`;
                }
                
                if (!avatarUrl || avatarUrl === 'emoji:' || avatarUrl.trim() === '') {
                  avatarUrl = null;
                }
                
                const finalStyle = avatarUrl 
                  ? `url(${avatarUrl}) center/cover` 
                  : 'var(--primary)';
                return finalStyle;
              })(),
              border: 'none',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              transition: 'all 0.2s ease',
              cursor: 'default',
              flexShrink: 0
            }}
          >
            {(() => {
              const freshUser = users.find(u => {
                const userId = String(u.id);
                const taskAssigneeId = String(task.assignee_id || task.assignee_id);
                return userId === taskAssigneeId;
              });
              
              let avatarUrl = freshUser?.avatar_url || task.assignee_avatar;
              
              if (avatarUrl && avatarUrl.startsWith('emoji:')) {
                return '';
              }
              
              if (!avatarUrl || avatarUrl === 'emoji:' || avatarUrl.trim() === '') {
                avatarUrl = null;
              }
              
              const shouldShowInitial = !avatarUrl && task.assignee_name;
              return shouldShowInitial ? task.assignee_name.charAt(0).toUpperCase() : '';
            })()}
          </div>
        )}
      </div>
    </div>
  );
}
