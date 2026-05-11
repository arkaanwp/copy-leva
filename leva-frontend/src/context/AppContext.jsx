import { createContext, useContext, useEffect, useState } from 'react';
import { authService } from '../services/authService';
import { bookmarkService } from '../services/bookmarkService';
import { taskService } from '../services/taskService';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  // User persona from onboarding
  const [user, setUser] = useState(null); // null = not onboarded yet
  const [token, setToken] = useState(() => localStorage.getItem('leva_token'));

  // Active view: 'landing' | 'onboarding' | 'dashboard' | 'chat' | 'library' | 'profile'
  const [activeView, setActiveViewState] = useState('landing');

  // Unsaved changes guards
  const [chatHasDraft, setChatHasDraft] = useState(false);
  const [profileHasUnsavedChanges, setProfileHasUnsavedChanges] = useState(false);

  // Active task in ChatWorkspaceView
  const [activeTask, setActiveTask] = useState(null);

  // Saved tools library
  const [savedTools, setSavedTools] = useState([]);

  // Task history in sidebar
  const [historyTasks, setHistoryTasks] = useState([]);

  // Toast notification
  const [toasts, setToasts] = useState([]);

  // UX sound effect preference
  const [soundEnabled, setSoundEnabled] = useState(true);

  useEffect(() => {
    if (!token) return;

    let isMounted = true;

    const bootstrap = async () => {
      try {
        const me = await authService.me();
        if (!isMounted) return;
        setUser(me);
        setActiveViewState('dashboard');
      } catch (error) {
        localStorage.removeItem('leva_token');
        if (!isMounted) return;
        setToken(null);
        setUser(null);
        setActiveViewState('landing');
      }
    };

    bootstrap();

    return () => {
      isMounted = false;
    };
  }, [token]);

  const showToast = (message, type = 'info') => {
    const normalizedType = String(type || 'info').toLowerCase();

    setToasts((prev) => [...prev, {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      message,
      type: normalizedType,
    }]);
  };

  const dismissToast = (toastId) => {
    setToasts((prev) => prev.filter((toastItem) => toastItem.id !== toastId));
  };

  const refreshSavedTools = async (params = {}) => {
    const data = await bookmarkService.list(params);
    setSavedTools(data.bookmarks ?? []);
    return data;
  };

  const refreshHistoryTasks = async (params = {}) => {
    const data = await taskService.list(params);
    setHistoryTasks(data.tasks ?? []);
    return data;
  };

  const setActiveView = (nextView, options = {}) => {
    const forceNavigate = options.force === true;

    if (!nextView || nextView === activeView) return true;

    if (!forceNavigate) {
      if (activeView === 'chat' && chatHasDraft) {
        window.dispatchEvent(new CustomEvent('leva:confirm-leave-chat', {
          detail: { nextView },
        }));
        return false;
      }

      if (activeView === 'profile' && profileHasUnsavedChanges) {
        window.dispatchEvent(new CustomEvent('leva:confirm-leave-profile', {
          detail: { nextView },
        }));
        return false;
      }
    }

    setActiveViewState(nextView);
    return true;
  };

  const saveToolToLibrary = (tool) => {
    const already = savedTools.find((t) => t.name === tool.name);
    if (already) {
      showToast(`Tool ${tool.name} sudah ada di Library-mu.`, 'info');
      return false;
    }

    /* UI/UX Fix: Step 6 — Output device harus memberi respond jelas ke aksi user. Step 7 — Aksi destruktif (hapus) harus ada safeguard/konfirmasi. Survei: 52,5% user sulit temukan referensi. */
    const newEntry = {
      id: Date.now(),
      name: tool.name,
      url: tool.url,
      priority: 'Sangat Bagus',
      priorityKey: 'good',
      pricingType: tool.pricingType ?? 'freemium',
      category: tool.category,
      keywords: [tool.category.toLowerCase(), 'ai tools', 'leva'],
      savedAt: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
      savedTimestamp: Date.now(),
      description: tool.desc || '',
      rating: tool.rating ?? 0,
      note: '',
    };
    setSavedTools((prev) => [newEntry, ...prev]);
    showToast(`${tool.name} berhasil disimpan ke Library!`, 'success');
    return true;
  };

  const removeToolFromLibrary = (toolId) => {
    setSavedTools((prev) => prev.filter((t) => t.id !== toolId));
    showToast('Tool berhasil dihapus', 'info');
  };

  return (
    <AppContext.Provider
      value={{
        user,
        setUser,
        token,
        setToken,
        activeView,
        setActiveView,
        setActiveViewState,
        chatHasDraft,
        setChatHasDraft,
        profileHasUnsavedChanges,
        setProfileHasUnsavedChanges,
        activeTask,
        setActiveTask,
        savedTools,
        setSavedTools,
        refreshSavedTools,
        historyTasks,
        setHistoryTasks,
        refreshHistoryTasks,
        toasts,
        showToast,
        dismissToast,
        soundEnabled,
        setSoundEnabled,
        saveToolToLibrary,
        removeToolFromLibrary,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);
