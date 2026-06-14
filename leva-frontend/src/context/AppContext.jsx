import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { authService } from '../services/authService';
import { bookmarkService } from '../services/bookmarkService';
import { taskService } from '../services/taskService';
import { normalizeLanguage, createTranslator } from '../utils/i18n';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  // User persona from onboarding
  const [user, setUser] = useState(null); // null = not onboarded yet
  const [token, setToken] = useState(() => localStorage.getItem('leva_token'));
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState(null);

  // Active view: 'landing' | 'onboarding' | 'dashboard' | 'chat' | 'library' | 'profile'
  const [activeView, setActiveViewState] = useState('landing');

  // Theme support
  const [theme, setThemeState] = useState(() => {
    try {
      const stored = localStorage.getItem('leva_theme');
      if (stored === 'dark' || stored === 'light') return stored;
    } catch { /* */ }
    return 'light';
  });

  const isDarkMode = theme === 'dark';

  const setTheme = useCallback((newTheme) => {
    const validTheme = newTheme === 'dark' ? 'dark' : 'light';
    setThemeState(validTheme);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((currentTheme) => (currentTheme === 'dark' ? 'light' : 'dark'));
  }, []);

  useEffect(() => {
    const validTheme = theme === 'dark' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', validTheme);
    try {
      localStorage.setItem('leva_theme', validTheme);
    } catch { /* */ }
  }, [theme]);

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

  // i18n — language preference
  const [language, setLanguageState] = useState(() => {
    try {
      const stored = localStorage.getItem('leva_language');
      if (stored) return normalizeLanguage(stored);
    } catch { /* */ }
    return 'id';
  });

  const t = useMemo(() => createTranslator(language), [language]);

  const setLanguage = useCallback((lang) => {
    const normalized = normalizeLanguage(lang);
    setLanguageState(normalized);
    try {
      localStorage.setItem('leva_language', normalized);
    } catch { /* */ }
  }, []);

  // UX sound effect preference
  const [soundEnabled, setSoundEnabled] = useState(() => {
    try {
      const prefs = localStorage.getItem('leva_prefs');
      if (prefs) return JSON.parse(prefs).soundEnabled ?? true;
    } catch {
      //
    }
    return true;
  });

  const updateSoundEnabled = (val) => {
    const newVal = typeof val === 'function' ? val(soundEnabled) : val;
    setSoundEnabled(newVal);
    try {
      const prefs = localStorage.getItem('leva_prefs');
      const parsed = prefs ? JSON.parse(prefs) : {};
      parsed.soundEnabled = newVal;
      localStorage.setItem('leva_prefs', JSON.stringify(parsed));
      
      // Emit a toast for visual feedback when manually changed
      if (typeof val !== 'function') {
         // showToast will be available but we can't call it here easily due to deps. 
         // We will call it from ProfileView when toggle happens instead of here.
      }
    } catch {
      //
    }
  };

  useEffect(() => {
    let isMounted = true;

    const bootstrapAuth = async () => {
      if (!token) {
        setIsBootstrapping(false);
        setIsAuthenticated(false);
        return;
      }
      
      try {
        const me = await authService.me();
        if (!isMounted) return;
        setUser(me);
        if (me.status === 'ACTIVE') {
          // Don't auto-navigate — let the user decide via CTA buttons.
          // Only mark as authenticated so LandingView buttons can shortcut.
          setIsAuthenticated(true);
          // Sync language from user profile
          const profileLang = me?.profile?.language_preference ?? me?.language_preference ?? me?.bahasa;
          if (profileLang) setLanguage(profileLang);
        } else {
          setIsAuthenticated(false);
          setActiveViewState('onboarding');
        }
      } catch (error) {
        localStorage.removeItem('leva_token');
        if (!isMounted) return;
        setToken(null);
        setUser(null);
        setIsAuthenticated(false);
        setAuthError(error.message);
        // Don't force to onboarding — stay on landing and let user click
      } finally {
        if (isMounted) setIsBootstrapping(false);
      }
    };

    bootstrapAuth();

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

  const refreshSavedTools = useCallback(async (params = {}) => {
    const data = await bookmarkService.list(params);
    setSavedTools(data.bookmarks ?? []);
    return data;
  }, []);

  const refreshHistoryTasks = useCallback(async (params = {}) => {
    const data = await taskService.list(params);
    setHistoryTasks(data.tasks ?? []);
    return data;
  }, []);

  // Explicit "enter the app" function — used by Landing CTA buttons.
  // If user is already authenticated, go straight to dashboard.
  // Otherwise go to onboarding.
  const enterApp = useCallback((mode = 'login') => {
    if (isAuthenticated && user?.status === 'ACTIVE') {
      setActiveViewState('dashboard');
      return;
    }
    setActiveViewState('onboarding');
    if (mode === 'login') {
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('leva:open-login'));
      }, 50);
    }
  }, [isAuthenticated, user]);

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

  const saveToolToLibrary = async (tool) => {
    const already = savedTools.find((t) => t.tool?.id === tool.id || t.name === tool.name);
    if (already) {
      showToast(`Tool ${tool.name} sudah ada di Library-mu.`, 'info');
      return false;
    }

    try {
      await bookmarkService.create(tool.id);
      showToast(`${tool.name} disimpan! AI sedang men-tag... cek Library beberapa detik lagi.`, 'success');
      refreshSavedTools();
      return true;
    } catch (err) {
      const msg = err.response?.data?.message ?? `Gagal menyimpan ${tool.name}. Coba lagi.`;
      showToast(msg, 'error');
      return false;
    }
  };

  const removeToolFromLibrary = async (toolId) => {
    try {
      await bookmarkService.deleteBookmark(toolId);
      setSavedTools((prev) => prev.filter((t) => (t.tool?.id ?? t.id) !== toolId));
      showToast('Tool berhasil dihapus', 'info');
    } catch (err) {
      const msg = err.response?.data?.message ?? 'Gagal menghapus. Coba lagi.';
      showToast(msg, 'error');
    }
  };

  return (
    <AppContext.Provider
      value={{
        isBootstrapping,
        isAuthenticated,
        authError,
        user,
        setUser,
        token,
        setToken,
        theme,
        setTheme,
        toggleTheme,
        isDarkMode,
        activeView,
        setActiveView,
        setActiveViewState,
        enterApp,
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
        language,
        setLanguage,
        t,
        soundEnabled,
        setSoundEnabled: updateSoundEnabled,
        saveToolToLibrary,
        removeToolFromLibrary,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);
