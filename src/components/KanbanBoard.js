import { useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  defaultDropAnimationSideEffects,
} from "@dnd-kit/core";
import { SortableContext } from "@dnd-kit/sortable";
import { createPortal } from "react-dom";
import { DndColumn } from "./DndColumn";
import { DndCard } from "./DndCard";
import { DND_CONFIG } from "../constants";

export function KanbanBoard({ columns, tasksByColumn, onTaskMove, onColumnMove, onTaskClick, onTaskDelete, onColumnDelete, users = [] }) {

  
  const [activeColumn, setActiveColumn] = useState(null);
  const [activeTask, setActiveTask] = useState(null);
  const columnsId = useMemo(() => columns.map((col) => col.id), [columns]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: DND_CONFIG.ACTIVATION_DISTANCE,
      },
    })
  );

  // Улучшенная анимация для drop с более плавными переходами
  const dropAnimationConfig = {
    sideEffects: defaultDropAnimationSideEffects({
      styles: {
        active: {
          opacity: '0.5',
        },
      },
    }),
    duration: DND_CONFIG.DROP_ANIMATION_DURATION,
    easing: DND_CONFIG.DROP_ANIMATION_EASING,
  };

  function onDragStart(event) {
    if (event.active.data.current?.type === "Column") {
      setActiveColumn(event.active.data.current.column);
      return;
    }

    if (event.active.data.current?.type === "Task") {
      setActiveTask(event.active.data.current.task);
      return;
    }
  }

  function onDragEnd(event) {
    setActiveColumn(null);
    setActiveTask(null);

    const { active, over } = event;
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    if (activeId === overId) return;

    const isActiveAColumn = active.data.current?.type === "Column";
    const isOverAColumn = over.data.current?.type === "Column";
    
    if (isActiveAColumn && isOverAColumn) {
      onColumnMove(activeId, overId);
      return;
    }

    const isActiveATask = active.data.current?.type === "Task";
    const isOverATask = over.data.current?.type === "Task";

    if (isActiveATask && isOverATask) {
      onTaskMove(activeId, overId, "task");
      return;
    }

    if (isActiveATask && isOverAColumn) {
      onTaskMove(activeId, overId, "column");
      return;
    }
  }

  function onDragOver(event) {
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
    >
      <div style={{ 
        margin: 'auto', 
        display: 'flex', 
        gap: '16px',
        padding: '8px'
      }}>
        <SortableContext items={columnsId}>
          {columns.map((col) => (
            <DndColumn
              key={col.id}
              column={col}
              tasks={tasksByColumn[col.id] || []}
              onTaskClick={onTaskClick}
              onTaskDelete={onTaskDelete}
              onColumnDelete={onColumnDelete}
              users={users}
            />
          ))}
        </SortableContext>
      </div>

      {createPortal(
        <DragOverlay dropAnimation={dropAnimationConfig}>
          {activeColumn && (
            <DndColumn
              isOverlay
              column={activeColumn}
              tasks={tasksByColumn[activeColumn.id] || []}
              users={users}
            />
          )}
          {activeTask && <DndCard isOverlay task={activeTask} users={users} />}
        </DragOverlay>,
        document.body
      )}
    </DndContext>
  );
}
