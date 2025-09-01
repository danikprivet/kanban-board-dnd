import React, { useState, useEffect, useMemo, createContext, useContext } from 'react';
import './App.css';
import { DragDropContext } from 'react-beautiful-dnd';

import Column from './components/Column';
import Card from './components/Card';

const ThemeContext = createContext({ theme: 'light', setTheme: () => {} });
export const useTheme = () => useContext(ThemeContext);

function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);
  const value = useMemo(() => ({ theme, setTheme }), [theme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

function Header() {
  const { theme, setTheme } = useTheme();
  return (
    <div style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
      <h1 style={{ margin: 0 }}>Kanban Board</h1>
      <div>
        <button
          onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
          style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', cursor: 'pointer' }}
        >
          {theme === 'light' ? 'Dark' : 'Light'} theme
        </button>
      </div>
    </div>
  );
}

function AppInner() {
  const [columns, setColumns] = useState({
    todo: {
      title: 'To Do',
      items: [
        { id: '1', content: 'Task 1' },
        { id: '2', content: 'Task 2' },
      ],
    },
    inProgress: {
      title: 'In Progress',
      items: [
        { id: '3', content: 'Task 3' },
      ],
    },
    done: {
      title: 'Done',
      items: [
        { id: '4', content: 'Task 4' },
      ],
    },
  });

  const onDragEnd = (result) => {
    const { source, destination } = result;
    if (!destination) return;
    const startColumnId = source.droppableId;
    const endColumnId = destination.droppableId;

    if (startColumnId === endColumnId) {
      setColumns(prevColumns => {
        const column = prevColumns[startColumnId];
        const newItems = Array.from(column.items);
        const [reorderedItem] = newItems.splice(source.index, 1);
        newItems.splice(destination.index, 0, reorderedItem);
        return {
          ...prevColumns,
          [startColumnId]: {
            ...column,
            items: newItems,
          },
        };
      });
    } else {
      setColumns(prevColumns => {
        const startColumn = prevColumns[startColumnId];
        const endColumn = prevColumns[endColumnId];
        const newStartItems = Array.from(startColumn.items);
        const [movedItem] = newStartItems.splice(source.index, 1);
        const newEndItems = Array.from(endColumn.items);
        newEndItems.splice(destination.index, 0, movedItem);
        return {
          ...prevColumns,
          [startColumnId]: { ...startColumn, items: newStartItems },
          [endColumnId]: { ...endColumn, items: newEndItems },
        };
      });
    }
  };

  return (
    <div className="App" style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
      <Header />
      <div style={{ display: 'flex' }}>
        <DragDropContext onDragEnd={onDragEnd}>
          {Object.keys(columns).map(columnId => (
            <Column key={columnId} columnId={columnId} title={columns[columnId].title}>
              {columns[columnId].items.map((item, index) => (
                <Card key={item.id} id={item.id} index={index}>
                  {item.content}
                </Card>
              ))}
            </Column>
          ))}
        </DragDropContext>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppInner />
    </ThemeProvider>
  );
}