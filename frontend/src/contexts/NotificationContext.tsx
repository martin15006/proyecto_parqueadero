import React, { createContext, useContext, useState, useCallback } from 'react';

type NotificationType = 'success' | 'error' | 'warning' | 'info';

interface Notification {
  id: string;
  type: NotificationType;
  message: string;
}

interface NotificationContextType {
  showNotification: (message: string, type?: NotificationType) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const showNotification = useCallback((message: string, type: NotificationType = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setNotifications((prev) => [...prev, { id, type, message }]);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 5000);
  }, []);

  return (
    <NotificationContext.Provider value={{ showNotification }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {notifications.map((n) => (
          <div
            key={n.id}
            className={`px-6 py-4 rounded-xl shadow-2xl border-l-4 transform transition-all animate-bounce-in flex items-center justify-between min-w-[300px] ${
              n.type === 'success' ? 'bg-emerald-50 border-emerald-600 text-emerald-900' :
              n.type === 'error' ? 'bg-rose-50 border-rose-600 text-rose-900' :
              n.type === 'warning' ? 'bg-amber-50 border-amber-600 text-amber-900' :
              'bg-sky-50 border-sky-600 text-sky-900'
            }`}
          >
            <span className="font-bold text-xs uppercase tracking-widest">{n.message}</span>
            <button 
              onClick={() => setNotifications((prev) => prev.filter((notif) => notif.id !== n.id))}
              className="ml-4 opacity-60 hover:opacity-100 font-black transition-opacity duration-200"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification debe usarse dentro de un NotificationProvider');
  }
  return context;
};
