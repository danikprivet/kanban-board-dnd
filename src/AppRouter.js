import React, { useState, createContext, useContext } from 'react';
import { Routes, Route } from 'react-router-dom';
import Projects from './pages/Projects';
import Header from './components/Header';
import Board from './pages/Board';
import Users from './pages/Users';
import { useTheme } from './hooks/useTheme';

const SearchContext = createContext();
export const useSearch = () => useContext(SearchContext);

export default function AppRouter() {
  const [globalSearch, setGlobalSearch] = useState('');
  const { theme, switchTheme } = useTheme();

  const handleSearch = (query) => {
    setGlobalSearch(query);
  };

  const toggleTheme = () => {
    switchTheme();
  };

  return (
    <SearchContext.Provider value={{ globalSearch, setGlobalSearch }}>
      <div className="app-container">
        <Header onSearch={handleSearch} onThemeToggle={toggleTheme} theme={theme} />
        <main className="app-main">
          <Routes>
            <Route path="/" element={<Projects />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/board/:projectId" element={<Board globalSearch={globalSearch} />} />
            <Route path="/users" element={<Users />} />
          </Routes>
        </main>
      </div>
    </SearchContext.Provider>
  );
}
