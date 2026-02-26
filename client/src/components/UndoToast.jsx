import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

const UndoToastContext = createContext(null);

export function useUndoToasts() {
  return useContext(UndoToastContext);
}

/**
 * UndoToast provider + container.
 * Wrap the app in this component and call addToast() from any child.
 *
 * addToast({ message, onUndo }) -> returns toastId
 * removeToast(id)
 */
export default function UndoToast({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback(({ message, onUndo }) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, onUndo }]);
    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <UndoToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      <div className="undo-toast-container" role="region" aria-label="Notifications">
        {toasts.map(toast => (
          <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
        ))}
      </div>
    </UndoToastContext.Provider>
  );
}

function ToastItem({ toast, onRemove }) {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    const duration = 5000;
    const tickMs = 50;
    const stepPct = (tickMs / duration) * 100;

    const timer = setInterval(() => {
      setProgress(prev => {
        const next = prev - stepPct;
        if (next <= 0) {
          clearInterval(timer);
          onRemove(toast.id);
          return 0;
        }
        return next;
      });
    }, tickMs);

    return () => clearInterval(timer);
  }, [toast.id, onRemove]);

  const handleUndo = () => {
    if (toast.onUndo) toast.onUndo();
    onRemove(toast.id);
  };

  return (
    <div className="undo-toast" role="alert">
      <span className="undo-toast-message">{toast.message}</span>
      <div className="undo-toast-actions">
        {toast.onUndo && (
          <button className="undo-toast-btn" onClick={handleUndo}>
            Undo
          </button>
        )}
        <button
          className="undo-toast-close"
          onClick={() => onRemove(toast.id)}
          aria-label="Dismiss"
        >
          ✕
        </button>
      </div>
      <div
        className="undo-toast-progress"
        style={{ width: `${progress}%` }}
        aria-hidden="true"
      />
    </div>
  );
}
