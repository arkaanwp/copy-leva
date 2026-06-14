import { useEffect, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import Modal from './Modal';
import AppIcon from './AppIcon';
import { taskService } from '../services/taskService';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'sidebar.dashboard', icon: 'home' },
  { id: 'chat',      label: 'sidebar.chat',      icon: 'message' },
  { id: 'library',   label: 'sidebar.library',    icon: 'library' },
  { id: 'profile',   label: 'sidebar.profile',    icon: 'user' },
];

export default function Sidebar() {
  const {
    user,
    activeView,
    activeTask,
    setActiveView,
    setActiveTask,
    historyTasks,
    refreshHistoryTasks,
    soundEnabled,
    setSoundEnabled,
    isDarkMode,
    toggleTheme,
    t,
    showToast,
  } = useApp();
  const [showSettings, setShowSettings] = useState(false);
  const [notif, setNotif]       = useState(true);
  const [searchVal, setSearchVal] = useState('');
  const searchInputRef = useRef(null);
  const [hoveredTaskId, setHoveredTaskId] = useState(null);
  const [isDeletingTaskId, setIsDeletingTaskId] = useState(null);
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);

  const handleDeleteTask = async (e, taskId) => {
    e.stopPropagation();
    if (isDeletingTaskId) return;

    const taskTitle = historyTasks.find(task => (task.task_id ?? task.id) === taskId)?.title ?? '';
    const confirmDelete = window.confirm(
      (t('library.deleteConfirm') || 'Apakah kamu yakin ingin menghapus') + ` "${taskTitle}"?`
    );
    if (!confirmDelete) return;

    setIsDeletingTaskId(taskId);
    try {
      await taskService.deleteTask(taskId);
      
      if (showToast) {
        showToast(
          t('sidebar.taskDeleted') === 'sidebar.taskDeleted'
            ? 'Tugas berhasil dihapus'
            : t('sidebar.taskDeleted'),
          'info'
        );
      }

      if (refreshHistoryTasks) {
        await refreshHistoryTasks();
      }

      if (activeTaskId === taskId) {
        setActiveTask(null);
        setActiveView('dashboard');
      }
    } catch (error) {
      if (showToast) {
        showToast('Gagal menghapus tugas. Silakan coba lagi.', 'error');
      }
    } finally {
      setIsDeletingTaskId(null);
    }
  };

  const activeTaskId = activeTask?.task_id ?? activeTask?.id;

  const formatHistoryDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
  };

  const filteredHistory = historyTasks.filter((task) =>
    (task.title ?? '').toLowerCase().includes(searchVal.toLowerCase())
  );

  useEffect(() => {
    const handleFocusSearch = () => {
      searchInputRef.current?.focus();
      searchInputRef.current?.select();
    };

    const handleEscape = () => {
      setShowSettings(false);
    };

    window.addEventListener('leva:focus-sidebar-search', handleFocusSearch);
    window.addEventListener('leva:escape', handleEscape);

    return () => {
      window.removeEventListener('leva:focus-sidebar-search', handleFocusSearch);
      window.removeEventListener('leva:escape', handleEscape);
    };
  }, []);

  useEffect(() => {
    if (!user || !refreshHistoryTasks) return;
    refreshHistoryTasks().catch(() => {});
  }, [user, refreshHistoryTasks]);

  const handleHistoryClick = (task) => {
    setActiveTask(task);
    setActiveView('chat');
  };

  const handleNewChat = () => {
    window.dispatchEvent(new CustomEvent('leva:new-chat'));
    setActiveTask(null);
    setActiveView('chat');
  };

  const handleOpenTutorial = () => {
    const didNavigate = setActiveView('dashboard');
    if (!didNavigate) return;

    window.dispatchEvent(new CustomEvent('leva:open-dashboard-tour'));
  };

  return (
    <>
      <aside className="sidebar-desktop" style={{
        width: 240, minWidth: 240, height: '100vh',
        background: 'var(--color-sidebar)',
        display: 'flex', flexDirection: 'column',
        padding: '20px 12px 14px 12px',
        position: 'sticky', top: 0,
        overflow: 'hidden',
      }}>

        {/* Scrollable Container */}
        <div style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          paddingRight: 4,
          marginRight: -4,
        }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, paddingLeft: 4 }}>
            <AppIcon name="sparkles" size={20} color="#fff" />
            <span style={{ color: '#fff', fontSize: 20, fontWeight: 800, letterSpacing: '-0.5px' }}>Leva</span>
          </div>

          {/* New Chat Button */}
          <button
            onClick={handleNewChat}
            data-tour="sidebar-new-chat"
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: 10, color: '#fff',
              padding: '9px 12px', fontSize: 13, fontWeight: 600,
              cursor: 'pointer', marginBottom: 12,
              transition: 'all 0.2s ease',
              flexShrink: 0,
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <AppIcon name="plus" size={16} color="#fff" /> {t('sidebar.newChat')}
          </button>

          {/* Search */}
          <div style={{ position: 'relative', marginBottom: 16, flexShrink: 0 }}>
            <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', opacity: 0.5, display: 'flex' }}>
              <AppIcon name="search" size={14} color="#fff" />
            </span>
            <input
              ref={searchInputRef}
              value={searchVal}
              onChange={e => setSearchVal(e.target.value)}
              placeholder={t('sidebar.searchHistory')}
              style={{
                width: '100%', background: 'rgba(255,255,255,0.07)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 9, padding: '8px 10px 8px 30px',
                color: '#fff', fontSize: 13,
                outline: 'none',
              }}
            />
          </div>

          {activeView === 'dashboard' && searchVal.trim().length > 0 && filteredHistory.length === 0 && (
            <div style={{ marginTop: -6, marginBottom: 14, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 10px', flexShrink: 0 }}>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--color-sidebar-text)', lineHeight: 1.5 }}>
                {t('sidebar.noHistory')}
              </p>
              <button
                type="button"
                onClick={handleNewChat}
                style={{ marginTop: 8, border: 'none', background: 'transparent', color: '#C4B5FD', fontSize: 12, fontWeight: 700, cursor: 'pointer', padding: 0 }}
              >
                {t('sidebar.startNewChat')}
              </button>
            </div>
          )}

          {/* Navigation */}
          <nav style={{ marginBottom: 20, flexShrink: 0 }}>
            {NAV_ITEMS.map(item => (
              <button
                key={item.id}
                className={`sidebar-item ${activeView === item.id ? 'active' : ''}`}
                data-tour={item.id === 'chat' ? 'sidebar-chat' : item.id === 'library' ? 'sidebar-library' : undefined}
                onClick={() => setActiveView(item.id)}
                type="button"
                style={{ width: '100%', background: 'transparent', border: 'none', textAlign: 'left' }}
              >
                <span style={{ display: 'flex' }}><AppIcon name={item.icon} size={16} /></span>
                {t(item.label)}
              </button>
            ))}
            <button
              type="button"
              className="sidebar-item"
              onClick={() => setShowSettings(true)}
              style={{ width: '100%', background: 'transparent', border: 'none', textAlign: 'left' }}
            >
              <span style={{ display: 'flex' }}><AppIcon name="settings" size={16} /></span> {t('sidebar.settings')}
            </button>
            <button
              type="button"
              className="sidebar-item"
              onClick={handleOpenTutorial}
              style={{ width: '100%', background: 'transparent', border: 'none', textAlign: 'left' }}
            >
              <span style={{ display: 'flex' }}><AppIcon name="sparkles" size={16} /></span> {t('sidebar.viewTutorial')}
            </button>
          </nav>

          {/* Divider */}
          <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', marginBottom: 14, flexShrink: 0 }} />

          {/* History */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-sidebar-text-muted)', letterSpacing: '0.08em', marginBottom: 8, paddingLeft: 4 }}>
              {t('sidebar.taskHistory')}
            </p>
            {(isHistoryExpanded ? filteredHistory : filteredHistory.slice(0, 4)).map(task => {
              const taskId = task.task_id ?? task.id;
              const isActive = taskId && taskId === activeTaskId;
              const dateLabel = formatHistoryDate(task.created_at ?? task.date);
              const isHovered = taskId && taskId === hoveredTaskId;
              const isDeleting = taskId && taskId === isDeletingTaskId;

              return (
                <div
                  key={taskId ?? task.title}
                  onMouseEnter={() => setHoveredTaskId(taskId)}
                  onMouseLeave={() => setHoveredTaskId(null)}
                  style={{
                    position: 'relative',
                    width: '100%',
                    marginBottom: 2,
                    borderRadius: 9,
                    background: isActive ? 'rgba(108,99,255,0.25)' : (isHovered ? 'rgba(255,255,255,0.05)' : 'transparent'),
                    transition: 'background 0.2s ease',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => handleHistoryClick(task)}
                    disabled={isDeleting}
                    style={{
                      width: '100%',
                      border: 'none',
                      textAlign: 'left',
                      padding: '8px 36px 8px 10px', 
                      borderRadius: 9, 
                      cursor: isDeleting ? 'not-allowed' : 'pointer',
                      background: 'transparent',
                      opacity: isDeleting ? 0.5 : 1,
                      transition: 'all 0.2s ease',
                      display: 'block',
                    }}
                  >
                    <p style={{
                      margin: 0, fontSize: 13, fontWeight: isActive ? 600 : 400,
                      color: isActive ? '#fff' : 'var(--color-sidebar-text)',
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>
                      {task.title}
                    </p>
                    <p style={{ margin: 0, fontSize: 11, color: 'var(--color-sidebar-text-muted)', marginTop: 2 }}>
                      {dateLabel}
                    </p>
                  </button>

                  {taskId && (isHovered || isDeleting) && (
                    <button
                      type="button"
                      onClick={(e) => handleDeleteTask(e, taskId)}
                      disabled={isDeleting}
                      title="Hapus tugas"
                      style={{
                        position: 'absolute',
                        right: 8,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'transparent',
                        border: 'none',
                        cursor: isDeleting ? 'not-allowed' : 'pointer',
                        padding: 4,
                        borderRadius: 4,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: isDeleting ? 'var(--color-sidebar-text-muted)' : 'rgba(255, 100, 100, 0.85)',
                        transition: 'color 0.2s, background 0.2s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.color = '#ff4d4d'; e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
                      onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255, 100, 100, 0.85)'; e.currentTarget.style.background = 'transparent'; }}
                    >
                      {isDeleting ? (
                        <AppIcon name="loader" size={14} className="animate-spin" />
                      ) : (
                        <AppIcon name="trash" size={14} />
                      )}
                    </button>
                  )}
                </div>
              );
            })}
            
            {filteredHistory.length > 4 && (
              <button
                type="button"
                onClick={() => setIsHistoryExpanded(!isHistoryExpanded)}
                style={{
                  width: '100%',
                  marginTop: 6,
                  padding: '8px 10px',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1.5px dashed rgba(255,255,255,0.15)',
                  borderRadius: 9,
                  color: 'var(--color-sidebar-text)',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  textAlign: 'center',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                  e.currentTarget.style.borderColor = 'var(--color-primary)';
                  e.currentTarget.style.color = '#fff';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)';
                  e.currentTarget.style.color = 'var(--color-sidebar-text)';
                }}
              >
                <span style={{ display: 'inline-flex', transform: isHistoryExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }}>
                  <AppIcon name="chevron-down" size={14} />
                </span>
                {isHistoryExpanded ? t('sidebar.showLess') : t('sidebar.showMore')}
              </button>
            )}
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', margin: '14px 0' }} />

        {/* User Profile Footer */}
        <button
          type="button"
          style={{
            display: 'flex',
            width: '100%',
            alignItems: 'center',
            gap: 10,
            cursor: 'pointer',
            padding: '4px 4px',
            border: 'none',
            background: 'transparent',
            textAlign: 'left',
          }}
          onClick={() => setActiveView('profile')}
        >
          <div style={{
            width: 34, height: 34, borderRadius: '50%',
            background: 'var(--color-primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontWeight: 700, fontSize: 14, flexShrink: 0,
          }}>
            {user ? user.name.charAt(0).toUpperCase() : 'R'}
          </div>
          <div style={{ overflow: 'hidden' }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user ? user.name : 'Renisa Mahardika'}
            </p>
            <p style={{ margin: 0, fontSize: 11, color: 'var(--color-sidebar-text-muted)' }}>
              {user ? `${user.jurusan} · Sem ${user.semester}` : 'Teknik Informatika · Sem 6'}
            </p>
          </div>
        </button>
      </aside>

      {/* Settings Modal */}
      {showSettings && (
        <Modal title="Pengaturan" onClose={() => setShowSettings(false)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

            {/* Toggle row helper */}
            {[
              { label: t('settings.darkMode'), sublabel: t('settings.darkModeSub'), val: isDarkMode, onToggle: toggleTheme },
              { label: t('settings.notif'), sublabel: t('settings.notifSub'), val: notif, set: setNotif },
              { label: t('settings.sound'), sublabel: t('settings.soundSub'), val: soundEnabled, set: setSoundEnabled },
            ].map(item => (
              <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)' }}>{item.label}</p>
                  <p style={{ margin: 0, fontSize: 12, color: 'var(--color-text-secondary)' }}>{item.sublabel}</p>
                </div>
                <button
                  type="button"
                  aria-label={`Toggle ${item.label}`}
                  aria-pressed={item.val}
                  onClick={() => item.onToggle ? item.onToggle() : item.set(v => !v)}
                  style={{
                    width: 44, height: 24, borderRadius: 12, cursor: 'pointer',
                    background: item.val ? 'var(--color-primary)' : 'var(--color-border)',
                    position: 'relative', transition: 'background 0.2s',
                    border: 'none',
                  }}
                >
                  <div style={{
                    position: 'absolute', top: 3, left: item.val ? 22 : 3,
                    width: 18, height: 18, borderRadius: '50%', background: '#fff',
                    transition: 'left 0.2s',
                  }} />
                </button>
              </div>
            ))}

            <div style={{ height: 1, background: 'var(--color-border)' }} />

            <p style={{ margin: 0, fontSize: 12, color: 'var(--color-text-secondary)', textAlign: 'center' }}>
              {t('sidebar.version')}
            </p>

            <button className="btn-primary" onClick={() => setShowSettings(false)} style={{ width: '100%' }}>
              {t('sidebar.close')}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
