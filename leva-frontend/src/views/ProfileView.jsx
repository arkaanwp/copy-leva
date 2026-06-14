import { useEffect, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import { profileService } from '../services/profileService';
import { normalizeLanguage } from '../utils/i18n';
import AppIcon from '../components/AppIcon';
import Modal from '../components/Modal';

const JURUSAN_OPTIONS = ['Teknik Informatika', 'Sistem Informasi', 'Hukum', 'Kedokteran', 'Psikologi', 'Bisnis & Manajemen', 'Desain Komunikasi Visual', 'Akuntansi', 'Ilmu Komunikasi', 'Lainnya'];
const SEMESTER_OPTIONS = Array.from({ length: 8 }, (_, i) => `${i + 1}`);

export default function ProfileView() {
  const {
    user,
    setUser,
    setActiveView,
    savedTools,
    setSavedTools,
    setActiveTask,
    setHistoryTasks,
    soundEnabled,
    setSoundEnabled,
    setProfileHasUnsavedChanges,
    showToast,
    setLanguage,
    theme,
    setTheme,
    t,
  } = useApp();
  const [editMode, setEditMode] = useState(false);
  const [notif1, setNotif1] = useState(true);
  const [notif2, setNotif2] = useState(true);
  const [notif3, setNotif3] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [showJurusanChangeModal, setShowJurusanChangeModal] = useState(false);
  const [pendingSaveMode, setPendingSaveMode] = useState(null);
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  const [pendingLeaveTarget, setPendingLeaveTarget] = useState(null);
  const [hoveredStat, setHoveredStat] = useState('');
  const [form, setForm] = useState({
    name: user?.name ?? 'Renisa Mahardika',
    jurusan: user?.jurusan ?? 'Teknik Informatika',
    semester: user?.semester ?? '6',
    bahasa: normalizeLanguage(user?.language_preference ?? user?.profile?.language_preference ?? user?.bahasa ?? 'id'),
  });
  const [errors, setErrors] = useState({});
  const initialProfileRef = useRef({
    form: {
      name: user?.name ?? 'Renisa Mahardika',
      jurusan: user?.jurusan ?? 'Teknik Informatika',
      semester: user?.semester ?? '6',
      bahasa: normalizeLanguage(user?.language_preference ?? user?.profile?.language_preference ?? user?.bahasa ?? 'id'),
    },
    notifications: {
      soundEnabled,
      notif1: true,
      notif2: true,
      notif3: false,
    },
  });
  const hasUnsavedProfileRef = useRef(false);
  const hasPushedBackGuardRef = useRef(false);
  const allowExternalLeaveRef = useRef(false);

  const update = (key, val) => {
    setForm(f => ({ ...f, [key]: val }));
    setErrors(e => ({ ...e, [key]: '' }));
  };

  const validateProfileForm = () => {
    const nextErrors = {};
    const trimmedName = form.name.trim();

    if (!trimmedName) {
      nextErrors.name = t('profile.nameEmpty');
    } else if (trimmedName.length < 2) {
      nextErrors.name = t('profile.nameMin');
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const commitProfileChanges = async () => {
    if (!validateProfileForm()) return false;

    try {
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        throw new Error('Koneksi tidak tersedia');
      }

      const sanitizedForm = { ...form, name: form.name.trim() };

      // Persist to backend
      try {
        await profileService.update({
          major: sanitizedForm.jurusan,
          semester: sanitizedForm.semester,
          language_preference: sanitizedForm.bahasa,
        });
      } catch { /* best-effort — profile still updates locally */ }

      setUser((prev) => ({
        ...prev,
        ...sanitizedForm,
        language_preference: sanitizedForm.bahasa,
      }));
      setLanguage(sanitizedForm.bahasa);
      setForm(sanitizedForm);
      initialProfileRef.current = {
        form: sanitizedForm,
        notifications: {
          soundEnabled,
          notif1,
          notif2,
          notif3,
        },
      };

      setErrors({});
      setEditMode(false);
      showToast(t('profile.saveSuccess'), 'success');
      return true;
    } catch {
      showToast(t('profile.saveFail'), 'error');
      return false;
    }
  };

  const requestProfileSave = (mode = 'save') => {
    const previousJurusan = initialProfileRef.current.form.jurusan;
    const hasJurusanChanged = form.jurusan !== previousJurusan;

    if (hasJurusanChanged) {
      setPendingSaveMode(mode);
      setShowJurusanChangeModal(true);
      return false;
    }

    const saveSuccess = commitProfileChanges();
    if (!saveSuccess) return false;

    if (mode === 'save-and-leave') {
      setProfileHasUnsavedChanges(false);
      continueLeaveAfterDecision();
      setPendingLeaveTarget(null);
    }

    return true;
  };

  const handleSave = () => {
    requestProfileSave('save');
  };

  const resetProfileDraft = () => {
    const baseline = initialProfileRef.current;

    setForm(baseline.form);
    setSoundEnabled(baseline.notifications.soundEnabled);
    setNotif1(baseline.notifications.notif1);
    setNotif2(baseline.notifications.notif2);
    setNotif3(baseline.notifications.notif3);
    setErrors({});
    setEditMode(false);
  };

  const handleLogoutOnly = () => {
    setProfileHasUnsavedChanges(false);
    setUser(null);
    setActiveView('onboarding', { force: true });
  };

  const handleResetDemo = () => {
    setProfileHasUnsavedChanges(false);
    setSavedTools([]);
    setHistoryTasks([]);
    setActiveTask(null);
    setUser(null);
    setShowResetModal(false);
    setActiveView('onboarding', { force: true });
  };

  const handleStatCardClick = (label) => {
    if (label === 'Tasks Selesai') {
      setActiveTask(null);
      setActiveView('chat');
      return;
    }

    if (label === 'Tools Tersimpan') {
      setActiveView('library');
    }
  };

  const hasUnsavedProfileChanges =
    form.name !== initialProfileRef.current.form.name
    || form.jurusan !== initialProfileRef.current.form.jurusan
    || form.semester !== initialProfileRef.current.form.semester
    || form.bahasa !== initialProfileRef.current.form.bahasa
    || soundEnabled !== initialProfileRef.current.notifications.soundEnabled
    || notif1 !== initialProfileRef.current.notifications.notif1
    || notif2 !== initialProfileRef.current.notifications.notif2
    || notif3 !== initialProfileRef.current.notifications.notif3;

  useEffect(() => {
    hasUnsavedProfileRef.current = hasUnsavedProfileChanges;
    setProfileHasUnsavedChanges(hasUnsavedProfileChanges);
  }, [hasUnsavedProfileChanges, setProfileHasUnsavedChanges]);

  useEffect(() => () => {
    setProfileHasUnsavedChanges(false);
  }, [setProfileHasUnsavedChanges]);

  useEffect(() => {
    if (!hasUnsavedProfileChanges || hasPushedBackGuardRef.current) return;

    window.history.pushState({ levaProfileUnsavedGuard: true }, '', window.location.href);
    hasPushedBackGuardRef.current = true;
  }, [hasUnsavedProfileChanges]);

  useEffect(() => {
    if (hasUnsavedProfileChanges) return;
    hasPushedBackGuardRef.current = false;
  }, [hasUnsavedProfileChanges]);

  useEffect(() => {
    const handleBackNavigation = () => {
      if (!hasUnsavedProfileRef.current || allowExternalLeaveRef.current) return;

      window.history.pushState({ levaProfileUnsavedGuard: true }, '', window.location.href);
      setPendingLeaveTarget('__history_back__');
      setShowUnsavedModal(true);
    };

    window.addEventListener('popstate', handleBackNavigation);
    return () => window.removeEventListener('popstate', handleBackNavigation);
  }, []);

  useEffect(() => {
    if (!hasUnsavedProfileChanges) return;

    const handleBeforeUnload = (event) => {
      if (allowExternalLeaveRef.current) return;
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedProfileChanges]);

  useEffect(() => {
    const handleConfirmLeaveProfile = (event) => {
      const nextView = event.detail?.nextView;
      if (!hasUnsavedProfileRef.current || !nextView) return;

      setPendingLeaveTarget(nextView);
      setShowUnsavedModal(true);
    };

    window.addEventListener('leva:confirm-leave-profile', handleConfirmLeaveProfile);
    return () => window.removeEventListener('leva:confirm-leave-profile', handleConfirmLeaveProfile);
  }, []);

  const closeUnsavedModal = () => {
    setShowUnsavedModal(false);
    setPendingLeaveTarget(null);
  };

  const continueLeaveAfterDecision = () => {
    if (!pendingLeaveTarget) return;

    if (pendingLeaveTarget === '__history_back__') {
      allowExternalLeaveRef.current = true;

      setTimeout(() => {
        window.history.back();
      }, 0);

      return;
    }

    setActiveView(pendingLeaveTarget, { force: true });
  };

  const handleSaveAndLeave = () => {
    setShowUnsavedModal(false);
    requestProfileSave('save-and-leave');
  };

  const handleCancelJurusanChange = () => {
    const previousJurusan = initialProfileRef.current.form.jurusan;

    setForm((prev) => ({ ...prev, jurusan: previousJurusan }));
    setShowJurusanChangeModal(false);
    setPendingSaveMode(null);
  };

  const handleConfirmJurusanChange = () => {
    const saveMode = pendingSaveMode;
    const saveSuccess = commitProfileChanges();
    if (!saveSuccess) return;

    setShowJurusanChangeModal(false);
    setPendingSaveMode(null);

    if (saveMode === 'save-and-leave') {
      setProfileHasUnsavedChanges(false);
      continueLeaveAfterDecision();
      setPendingLeaveTarget(null);
    }
  };

  const handleDiscardAndLeave = () => {
    resetProfileDraft();
    setShowUnsavedModal(false);
    setProfileHasUnsavedChanges(false);
    continueLeaveAfterDecision();
    setPendingLeaveTarget(null);
  };

  const handleThemeChange = (nextTheme) => {
    if (theme === nextTheme) return;
    setTheme(nextTheme);
    showToast(t('profile.themeUpdated'), 'success');
  };

  const inputStyle = {
    width: '100%', padding: '10px 13px',
    border: '1px solid var(--color-border)', borderRadius: 9,
    background: 'var(--color-surface)', color: 'var(--color-text-primary)',
    fontSize: 13, outline: 'none', boxSizing: 'border-box',
  };

  const errText = (key) => errors[key]
    ? (
      <p className="field-error-message" role="alert">
        <span style={{ display: 'inline-flex', alignItems: 'center', marginTop: 1 }}>
          <AppIcon name="warning" size={12} color="#DC2626" />
        </span>
        <span>{errors[key]}</span>
      </p>
    )
    : null;

  const Toggle = ({ val, set }) => (
    <button
      type="button"
      aria-pressed={val}
      onClick={() => set(v => !v)}
      style={{
        width: 44,
        height: 24,
        borderRadius: 12,
        cursor: 'pointer',
        background: val ? 'var(--color-primary)' : 'var(--color-border)',
        position: 'relative',
        transition: 'background 0.2s',
        flexShrink: 0,
        border: 'none',
      }}
    >
      <div style={{ position: 'absolute', top: 3, left: val ? 22 : 3, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
    </button>
  );

  const initial = (form.name || 'R').charAt(0).toUpperCase();

  return (
    <div className="main-content view-enter" style={{ padding: '32px 36px', maxWidth: 680, margin: '0 auto' }}>

      <h1 style={{ margin: '0 0 24px', fontSize: 24, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
        <AppIcon name="user" size={22} /> {t('profile.title')}
      </h1>

      {/* -- Profile Card */}
      <div className="card" style={{ padding: '28px 28px', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: editMode ? 24 : 0 }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--color-primary), #8B5CF6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontSize: 26, fontWeight: 800, flexShrink: 0,
          }}>
            {initial}
          </div>
          <div style={{ flex: 1 }}>
            <h2 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 700 }}>{form.name}</h2>
            <p style={{ margin: 0, fontSize: 14, color: 'var(--color-text-secondary)' }}>
              {form.jurusan} · Semester {form.semester}
            </p>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--color-text-secondary)' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><AppIcon name="book" size={12} /> {form.bahasa === 'en' ? 'English' : 'Indonesia'}</span>
            </p>
          </div>
          {!editMode && (
            <button className="btn-ghost" onClick={() => { setErrors({}); setEditMode(true); }} style={{ padding: '8px 16px', fontSize: 13 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><AppIcon name="pencil" size={12} /> {t('profile.edit')}</span>
            </button>
          )}
        </div>

        {/* Edit Form */}
        {editMode && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 5 }}>{t('profile.name')}</label>
                <input
                  value={form.name}
                  onChange={e => update('name', e.target.value)}
                  aria-invalid={!!errors.name}
                  style={{ ...inputStyle, borderColor: errors.name ? '#DC2626' : 'var(--color-border)' }}
                  onFocus={e => e.target.style.borderColor = 'var(--color-primary)'}
                  onBlur={e => e.target.style.borderColor = errors.name ? '#DC2626' : 'var(--color-border)'}
                />
                {errText('name')}
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 5 }}>{t('profile.semester')}</label>
                <select value={form.semester} onChange={e => update('semester', e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                  {SEMESTER_OPTIONS.map(s => <option key={s} value={s}>Semester {s}</option>)}
                </select>
              </div>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 5 }}>{t('profile.major')}</label>
              <select value={form.jurusan} onChange={e => update('jurusan', e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                {JURUSAN_OPTIONS.map(j => <option key={j} value={j}>{j}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 8 }}>{t('profile.language')}</label>
              <div style={{ display: 'flex', gap: 10 }}>
                {[{ code: 'id', label: 'ID Indonesia' }, { code: 'en', label: 'EN English' }].map(lang => (
                  <button key={lang.code} onClick={() => update('bahasa', lang.code)} style={{ flex: 1, padding: '9px', borderRadius: 9, fontSize: 13, fontWeight: 500, cursor: 'pointer', transition: 'all 0.2s', background: form.bahasa === lang.code ? 'var(--color-primary)' : 'var(--color-bg)', color: form.bahasa === lang.code ? '#fff' : 'var(--color-text-secondary)', border: `1.5px solid ${form.bahasa === lang.code ? 'var(--color-primary)' : 'var(--color-border)'}` }}>
                    {lang.label}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn-ghost" onClick={resetProfileDraft} style={{ flex: 1 }}>{t('profile.cancel')}</button>
              <button className="btn-primary" onClick={handleSave} style={{ flex: 2, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}><AppIcon name="check" size={14} color="#fff" /> {t('profile.save')}</button>
            </div>
          </div>
        )}
      </div>

      {/* -- Stats Card */}
      <div className="card" style={{ padding: '20px 24px', marginBottom: 20 }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}><AppIcon name="dashboard" size={16} /> {t('profile.stats')}</h3>
        <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
          {[
            {
              icon: 'clipboard',
              val: 12,
              label: 'Tasks Selesai',
              aria: 'Lihat riwayat task di Chat dan Task',
              trendText: '↑ 3 dari minggu lalu',
              trendColor: '#059669',
            },
            {
              icon: 'book',
              val: savedTools.length,
              label: 'Tools Tersimpan',
              aria: 'Lihat daftar tools tersimpan di Library',
              trendText: '↓ 1 dari minggu lalu',
              trendColor: '#DC2626',
            },
            {
              icon: 'calendar-clock',
              val: 8,
              label: 'Hari Berturut-turut',
              aria: 'Lihat progres streak harian',
              trendText: '- sama dengan minggu lalu',
              trendColor: 'var(--color-text-secondary)',
            },
          ].map(stat => {
            const isHovered = hoveredStat === stat.label;
            const statTooltipText = stat.label === 'Hari Berturut-turut'
              ? 'Jumlah hari berturut-turut kamu menggunakan Leva.'
              : '';
            const baseStyle = {
              textAlign: 'center',
              padding: '16px 10px',
              background: isHovered ? 'var(--color-surface)' : 'var(--color-bg)',
              borderRadius: 12,
              border: isHovered ? '1px solid var(--color-primary)' : '1px solid transparent',
              cursor: 'pointer',
              boxShadow: isHovered ? '0 10px 24px rgba(108,99,255,0.14)' : '0 2px 8px rgba(15,23,42,0.06)',
              transform: isHovered ? 'translateY(-2px)' : 'translateY(0)',
              transition: 'transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease, background-color 0.18s ease',
            };
            return (
              <button
                key={stat.label}
                type="button"
                aria-label={stat.aria || stat.label}
                className={statTooltipText ? 'tooltip-host tooltip-block' : undefined}
                data-tooltip={statTooltipText || undefined}
                onClick={() => handleStatCardClick(stat.label)}
                style={baseStyle}
                onMouseEnter={() => setHoveredStat(stat.label)}
                onMouseLeave={() => setHoveredStat('')}
              >
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 6 }}><AppIcon name={stat.icon} size={22} /></div>
                <div style={{ fontSize: 24, fontWeight: 800, color: isHovered ? 'var(--color-primary)' : 'var(--color-text-primary)' }}>{stat.val}</div>
                <div style={{ fontSize: 12, color: isHovered ? 'var(--color-primary)' : 'var(--color-text-secondary)', marginTop: 2 }}>
                  {stat.label}
                </div>
                <div style={{ marginTop: 4, fontSize: 11, fontWeight: 600, color: stat.trendColor }}>
                  {stat.trendText}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* -- Appearance Preferences */}
      <div className="card" style={{ padding: '20px 24px', marginBottom: 20 }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}><AppIcon name="settings" size={16} /> {t('profile.appearanceMode')}</h3>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0' }}>
          <div>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>{t('profile.appearanceMode')}</p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              type="button"
              aria-pressed={theme === 'light'}
              onClick={() => handleThemeChange('light')}
              style={{ padding: '8px 12px', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer', transition: 'all 0.2s', background: theme === 'light' ? 'var(--color-primary)' : 'var(--color-bg)', color: theme === 'light' ? '#fff' : 'var(--color-text-secondary)', border: `1.5px solid ${theme === 'light' ? 'var(--color-primary)' : 'var(--color-border)'}` }}
            >
              {t('profile.lightMode')}
            </button>
            <button
              type="button"
              aria-pressed={theme === 'dark'}
              onClick={() => handleThemeChange('dark')}
              style={{ padding: '8px 12px', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer', transition: 'all 0.2s', background: theme === 'dark' ? 'var(--color-primary)' : 'var(--color-bg)', color: theme === 'dark' ? '#fff' : 'var(--color-text-secondary)', border: `1.5px solid ${theme === 'dark' ? 'var(--color-primary)' : 'var(--color-border)'}` }}
            >
              {t('profile.darkMode')}
            </button>
          </div>
        </div>
      </div>

      {/* -- Notification Preferences */}
      <div className="card" style={{ padding: '20px 24px', marginBottom: 20 }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}><AppIcon name="bell" size={16} /> {t('profile.notifications')}</h3>
        {[
          { label: t('profile.sound'), sub: t('profile.soundSub'), val: soundEnabled, set: setSoundEnabled },
          { label: t('profile.dailyDiscovery'), sub: t('profile.dailyDiscoverySub'), val: notif1, set: setNotif1 },
          { label: t('profile.weeklyReport'), sub: t('profile.weeklyReportSub'), val: notif2, set: setNotif2 },
          { label: t('profile.emailNotif'), sub: t('profile.emailNotifSub'), val: notif3, set: setNotif3 },
        ].map((item, i, arr) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: i < arr.length - 1 ? '1px solid var(--color-border)' : 'none' }}>
            <div>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>{item.label}</p>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--color-text-secondary)' }}>{item.sub}</p>
            </div>
            <Toggle val={item.val} set={item.set} />
          </div>
        ))}
      </div>

      {/* -- Session Actions */}
      {/* UI/UX Fix: Step 6 — Hotspot harus mudah dikenali (accordion). Step 7 — Aksi destruktif (reset) butuh safeguard. Statistik clickable meningkatkan keterhubungan antar layar. */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <button
          onClick={handleLogoutOnly}
          style={{
            width: '100%', padding: '13px', borderRadius: 12, border: '1.5px solid var(--color-border)',
            background: 'var(--color-surface)', color: 'var(--color-text-secondary)', fontSize: 14, fontWeight: 600,
            cursor: 'pointer', transition: 'all 0.2s',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-primary)'; e.currentTarget.style.color = 'var(--color-text-primary)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.color = 'var(--color-text-secondary)'; }}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><AppIcon name="logout" size={14} /> {t('profile.logout')}</span>
        </button>

        <button
          onClick={() => setShowResetModal(true)}
          style={{
            width: '100%', padding: '13px', borderRadius: 12, border: '1.5px solid var(--color-danger)',
            background: 'var(--color-danger-soft)', color: 'var(--color-danger)', fontSize: 14, fontWeight: 600,
            cursor: 'pointer', transition: 'all 0.2s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(220, 38, 38, 0.16)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'var(--color-danger-soft)'; }}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><AppIcon name="trash" size={14} /> {t('profile.resetDemoBtn')}</span>
        </button>
      </div>

      {showResetModal && (
        <Modal title="Reset Semua Data?" onClose={() => setShowResetModal(false)}>
          <p style={{ margin: '0 0 16px', fontSize: 14, color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
            Semua data termasuk riwayat tugas, library tools, dan pengaturan akan dihapus. Aksi ini tidak bisa dibatalkan.
          </p>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn-ghost" onClick={() => setShowResetModal(false)} style={{ flex: 1 }}>
              Batal
            </button>
            <button
              onClick={handleResetDemo}
              style={{
                flex: 1,
                background: '#DC2626',
                color: '#fff',
                border: 'none',
                borderRadius: 10,
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                padding: '10px 16px',
              }}
            >
              Hapus Semua Data
            </button>
          </div>
        </Modal>
      )}

      {showJurusanChangeModal && (
        <Modal title="Ubah Jurusan?" onClose={handleCancelJurusanChange}>
          <p style={{ margin: '0 0 16px', fontSize: 14, color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
            Mengubah jurusan dari <strong>{initialProfileRef.current.form.jurusan}</strong> ke <strong>{form.jurusan}</strong> akan memengaruhi rekomendasi tools di Dashboard. Lanjutkan?
          </p>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn-ghost" onClick={handleCancelJurusanChange} style={{ flex: 1 }}>
              Batal
            </button>
            <button className="btn-primary" onClick={handleConfirmJurusanChange} style={{ flex: 1 }}>
              Ya, Ubah
            </button>
          </div>
        </Modal>
      )}

      {showUnsavedModal && (
        <Modal title="Perubahan Belum Disimpan" onClose={closeUnsavedModal}>
          <p style={{ margin: '0 0 16px', fontSize: 14, color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
            Kamu memiliki perubahan profil/notifikasi yang belum disimpan. Apa yang ingin kamu lakukan?
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 8 }}>
            <button
              type="button"
              onClick={handleSaveAndLeave}
              style={{
                width: '100%',
                border: 'none',
                borderRadius: 10,
                background: '#6C5CE7',
                color: '#fff',
                fontSize: 14,
                fontWeight: 700,
                padding: '10px 14px',
                cursor: 'pointer',
              }}
            >
              Simpan & Lanjut
            </button>
            <button
              type="button"
              onClick={handleDiscardAndLeave}
              style={{
                width: '100%',
                border: '1px solid var(--color-danger)',
                borderRadius: 10,
                background: 'var(--color-surface)',
                color: 'var(--color-danger)',
                fontSize: 14,
                fontWeight: 600,
                padding: '10px 14px',
                cursor: 'pointer',
              }}
            >
              Buang Perubahan
            </button>
            <button className="btn-ghost" onClick={closeUnsavedModal}>
              Batal
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
