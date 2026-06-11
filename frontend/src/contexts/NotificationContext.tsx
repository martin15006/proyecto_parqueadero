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

    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 5000);
  }, []);

  return (
    <NotificationContext.Provider value={{ showNotification }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
        {notifications.map((n) => (
          <div
            key={n.id}
            className={`px-6 py-4 rounded-xl shadow-2xl border-l-4 transform transition-all animate-in slide-in-from-right-4 duration-300 flex items-center justify-between min-w-[320px] ${
              n.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-950/90 border-emerald-600 text-emerald-900 dark:text-emerald-100' :
              n.type === 'error' ? 'bg-rose-50 dark:bg-rose-950/90 border-rose-600 text-rose-900 dark:text-rose-100' :
              n.type === 'warning' ? 'bg-amber-50 dark:bg-amber-950/90 border-amber-600 text-amber-900 dark:text-amber-100' :
              'bg-sky-50 dark:bg-sky-950/90 border-sky-600 text-sky-900 dark:text-sky-100'
            }`}
          >
            <span className="font-bold text-[10px] uppercase tracking-[0.1em]">{n.message}</span>
            <button 
              onClick={() => setNotifications((prev) => prev.filter((notif) => notif.id !== n.id))}
              className="ml-4 opacity-40 hover:opacity-100 font-black transition-opacity duration-200"
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
