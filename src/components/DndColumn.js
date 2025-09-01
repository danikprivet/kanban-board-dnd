import { SortableContext, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useMemo } from "react";
import { DndCard } from "./DndCard";

export function DndColumn({ column, tasks, isOverlay, onTaskClick, onTaskDelete, onColumnDelete, users = [] }) {
  const tasksIds = useMemo(() => {
    return tasks.map((task) => task.id);
  }, [tasks]);

  const {
    setNodeRef,
    attributes,
    listeners,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: column.id,
    data: {
      type: "Column",
      column,
    },
  });

  const style = {
    transition: isDragging ? 'none' : 'transform 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
    transform: CSS.Transform.toString(transform),
    width: '350px',
    height: '600px',
    maxHeight: '600px',
    borderRadius: '12px',
    display: 'flex',
    flexDirection: 'column',
  };

  const draggingStyle = {
    ...style,
    backgroundColor: 'var(--surface-alt)',
    opacity: 0.5,
    border: '2px dashed var(--primary)',
    boxShadow: '0 8px 32px rgba(0,0,0,0.2), 0 1px 3px rgba(0,0,0,0.1)',
  };

  // Стили для overlay (перетаскиваемый столбец)
  const overlayStyle = {
    ...style,
    boxShadow: '0 12px 32px rgba(0,0,0,0.3), 0 1px 3px rgba(0,0,0,0.1)',
    opacity: 0.9,
    zIndex: 1000,
  };

  if (isDragging && !isOverlay) {
    return (
      <div
        ref={setNodeRef}
        style={draggingStyle}
      >
        <div style={{
          backgroundColor: 'var(--surface-alt)',
          fontSize: '16px',
          height: '60px',
          borderRadius: '12px 12px 0 0',
          padding: '12px',
          fontWeight: 'bold',
          border: '2px dashed var(--primary)',
          borderBottom: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          opacity: 0.7,
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ 
              background: 'var(--primary)', 
              color: 'white', 
              padding: '4px 8px', 
              borderRadius: '12px', 
              fontSize: '12px', 
              fontWeight: '600',
              minWidth: '20px',
              textAlign: 'center'
            }}>
              {tasks.length}
            </span>
            <span style={{ color: 'var(--text-secondary)' }}>
              {column.name}
            </span>
          </div>
        </div>
        <div style={{
          display: 'flex',
          flexGrow: 1,
          flexDirection: 'column',
          gap: '16px',
          padding: '8px',
          overflowX: 'hidden',
          overflowY: 'auto',
          border: '2px dashed var(--primary)',
          borderTop: 'none',
          borderRadius: '0 0 12px 12px',
          backgroundColor: 'var(--surface)',
          opacity: 0.7,
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        }}>
          <SortableContext items={tasksIds}>
            {tasks.map((task) => (
              <DndCard
                key={task.id}
                task={task}
                onClick={onTaskClick}
                onDelete={onTaskDelete}
                users={users}
              />
            ))}
          </SortableContext>
        </div>
      </div>
    );
  }

  if (isOverlay) {
    return (
      <div style={overlayStyle}>
        <div style={{
          backgroundColor: 'var(--surface-alt)',
          fontSize: '16px',
          height: '60px',
          borderRadius: '12px 12px 0 0',
          padding: '12px',
          fontWeight: 'bold',
          border: '2px solid var(--primary)',
          borderBottom: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ 
              background: 'var(--primary)', 
              color: 'white', 
              padding: '4px 8px', 
              borderRadius: '12px', 
              fontSize: '12px', 
              fontWeight: '600',
              minWidth: '20px',
              textAlign: 'center'
            }}>
              {tasks.length}
            </span>
            <span style={{ color: 'var(--text-primary)' }}>
              {column.name}
            </span>
          </div>
        </div>
        <div style={{
          display: 'flex',
          flexGrow: 1,
          flexDirection: 'column',
          gap: '16px',
          padding: '8px',
          overflowX: 'hidden',
          overflowY: 'auto',
          border: '2px solid var(--primary)',
          borderTop: 'none',
          borderRadius: '0 0 12px 12px',
          backgroundColor: 'var(--surface-alt)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        }}>
          <SortableContext items={tasksIds}>
            {tasks.map((task) => (
              <DndCard
                key={task.id}
                task={task}
                onClick={onTaskClick}
                onDelete={onTaskDelete}
                users={users}
              />
            ))}
          </SortableContext>
        </div>
      </div>
    );
  }

  const headerStyle = {
    backgroundColor: 'var(--surface-alt)',
    fontSize: '16px',
    height: '60px',
    cursor: isDragging ? 'grabbing' : 'grab',
    borderRadius: '12px 12px 0 0',
    padding: '12px',
    fontWeight: 'bold',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    outline: 'none',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  };

  const contentStyle = {
    display: 'flex',
    flexGrow: 1,
    flexDirection: 'column',
    gap: '16px',
    padding: '8px',
    overflowX: 'hidden',
    overflowY: 'auto',
    border: '2px solid var(--border)',
    borderTop: 'none',
    borderRadius: '0 0 12px 12px',
    backgroundColor: 'var(--surface)',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  };

  const finalStyle = isOverlay ? overlayStyle : style;

  return (
    <div
      ref={setNodeRef}
      style={finalStyle}
    >
      <div
        {...attributes}
        {...listeners}
        style={headerStyle}
      >
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{ 
            background: 'var(--primary)', 
            color: 'white', 
            padding: '4px 8px', 
            borderRadius: '12px', 
            fontSize: '12px', 
            fontWeight: '600',
            minWidth: '20px',
            textAlign: 'center'
          }}>
            {tasks.length}
          </span>
          <span style={{ color: 'var(--text-primary)' }}>
            {column.name}
          </span>
        </div>
        {onColumnDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onColumnDelete(column.id);
            }}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              fontSize: '16px',
              padding: '4px',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '24px',
              height: '24px'
            }}
            onMouseEnter={(e) => {
              e.target.style.color = 'var(--error)';
              e.target.style.background = 'rgba(239, 68, 68, 0.1)';
            }}
            onMouseLeave={(e) => {
              e.target.style.color = 'var(--text-secondary)';
              e.target.style.background = 'none';
            }}
            title="Удалить столбец"
          >
            ×
          </button>
        )}
      </div>

      <div style={contentStyle}>
        <SortableContext items={tasksIds}>
          {tasks.map((task) => (
            <DndCard
              key={task.id}
              task={task}
              onClick={onTaskClick}
              onDelete={onTaskDelete}
              users={users}
            />
          ))}
        </SortableContext>
      </div>
    </div>
  );
}
