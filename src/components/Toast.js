import React, { createContext, useContext, useMemo, useState } from 'react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const api = useMemo(() => ({
    show(message, type = 'info', timeout = 3000) {
      const id = Date.now() + Math.random();
      setToasts((t) => [...t, { id, message, type }]);
      if (timeout) setTimeout(() => api.dismiss(id), timeout);
      return id;
    },
    dismiss(id) { setToasts((t) => t.filter(x => x.id !== id)); }
  }), []);
  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="ToastContainer">
        {toasts.map(t => (
          <div key={t.id} className={`Toast Toast-${t.type}`}>{t.message}</div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}



