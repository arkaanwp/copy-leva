import { useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import AppIcon from '../components/AppIcon';
import Modal from '../components/Modal';
import { authService } from '../services/authService';
import { profileService } from '../services/profileService';
import { mapOnboardingToApi } from '../utils/fieldMapper';
import { playSoundEffect } from '../utils/sound';

const JURUSAN_OPTIONS = [
  'Teknik Informatika',
  'Sistem Informasi',
  'Sains Data',
  'Rekayasa Perangkat Lunak',
  'Teknik Elektro',
  'Teknik Mesin',
  'Ilmu Komunikasi',
  'Psikologi',
  'Hukum',
  'Kedokteran',
  'Manajemen',
  'Akuntansi',
  'Desain Komunikasi Visual',
  'Sastra Inggris',
  'Ilmu Politik',
  'Farmasi',
  'Arsitektur',
  'Teknik Sipil',
];

const SEMESTER_OPTIONS = Array.from({ length: 8 }, (_, i) => `${i + 1}`);
const LEARNING_STYLE_OPTIONS = [
  {
    key: 'visual',
    label: 'Visual',
    description: 'Lebih nyaman belajar lewat gambar, diagram, atau warna.',
    icon: 'news',
  },
  {
    key: 'auditory',
    label: 'Auditori',
    description: 'Lebih mudah paham lewat diskusi, audio, atau penjelasan lisan.',
    icon: 'message',
  },
  {
    key: 'kinesthetic',
    label: 'Kinestetik',
    description: 'Paham lewat praktik langsung dan latihan aktif.',
    icon: 'flame',
  },
];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function OnboardingView() {
  const { setUser, setActiveView, showToast, soundEnabled } = useApp();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    passwordConfirm: '',
    jurusan: '',
    semester: '',
    bahasa: 'Indonesia',
    learning_style: 'visual',
  });
  const [errors, setErrors] = useState({});
  const [stepAnimationClass, setStepAnimationClass] = useState('');
  const [showStep3Confetti, setShowStep3Confetti] = useState(false);
  const [jurusanQuery, setJurusanQuery] = useState('');
  const [isJurusanOpen, setIsJurusanOpen] = useState(false);
  const [jurusanHighlightIndex, setJurusanHighlightIndex] = useState(-1);
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [loginErrors, setLoginErrors] = useState({});
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [isLoginSubmitting, setIsLoginSubmitting] = useState(false);
  const nameInputRef = useRef(null);
  const emailInputRef = useRef(null);
  const passwordInputRef = useRef(null);
  const passwordConfirmInputRef = useRef(null);
  const jurusanBoxRef = useRef(null);
  const jurusanInputRef = useRef(null);
  const semesterChipRefs = useRef([]);
  const bahasaToggleRefs = useRef([]);

  const step3ConfettiPieces = useMemo(
    () => Array.from({ length: 24 }, (_, index) => {
      const colors = ['#6C63FF', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4'];
      return {
        id: `step3-confetti-${index}`,
        left: `${(index * 11) % 100}%`,
        delay: `${(index % 7) * 0.08}s`,
        duration: `${1.2 + (index % 5) * 0.18}s`,
        color: colors[index % colors.length],
      };
    }),
    []
  );

  const filteredJurusan = useMemo(() => {
    const normalizedQuery = jurusanQuery.trim().toLowerCase();
    if (!normalizedQuery) return JURUSAN_OPTIONS;
    return JURUSAN_OPTIONS.filter((option) => option.toLowerCase().includes(normalizedQuery));
  }, [jurusanQuery]);

  useEffect(() => {
    if (!form.jurusan) {
      setJurusanQuery('');
      return;
    }

    setJurusanQuery(form.jurusan);
  }, [form.jurusan]);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (!jurusanBoxRef.current?.contains(event.target)) {
        setIsJurusanOpen(false);
        setJurusanHighlightIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  useEffect(() => {
    if (step === 1) nameInputRef.current?.focus();
  }, [step]);

  useEffect(() => {
    if (!stepAnimationClass) return;

    const clearTimer = setTimeout(() => setStepAnimationClass(''), 320);
    return () => clearTimeout(clearTimer);
  }, [stepAnimationClass]);

  useEffect(() => {
    if (step !== 4) {
      setShowStep3Confetti(false);
      return;
    }

    /* UI/UX Fix: Step 6 — Output device speaker (sound feedback) untuk positive reinforcement. Micro-animations memberikan reward psikologis, mendukung habit loop. 47,5% user bekerja larut malam — dopamine hit kecil membantu. */
    if (soundEnabled) playSoundEffect('chime');
    setShowStep3Confetti(true);

    const confettiTimer = setTimeout(() => setShowStep3Confetti(false), 2000);
    return () => clearTimeout(confettiTimer);
  }, [step, soundEnabled]);

  useEffect(() => {
    const handleGlobalEscape = () => {
      setIsJurusanOpen(false);
      setJurusanHighlightIndex(-1);
    };

    window.addEventListener('leva:escape', handleGlobalEscape);
    return () => window.removeEventListener('leva:escape', handleGlobalEscape);
  }, []);

  useEffect(() => {
    const openLogin = () => setShowLoginModal(true);
    window.addEventListener('leva:open-login', openLogin);
    return () => window.removeEventListener('leva:open-login', openLogin);
  }, []);

  const update = (key, val) => {
    setForm(f => ({ ...f, [key]: val }));
    setErrors(e => ({ ...e, [key]: '' }));
  };

  const selectJurusan = (jurusan) => {
    update('jurusan', jurusan);
    setJurusanQuery(jurusan);
    setIsJurusanOpen(false);
    setJurusanHighlightIndex(-1);
  };

  const clearJurusan = () => {
    update('jurusan', '');
    setJurusanQuery('');
    setIsJurusanOpen(false);
    setJurusanHighlightIndex(-1);
    jurusanInputRef.current?.focus();
  };

  const handleJurusanTyping = (value) => {
    setJurusanQuery(value);
    setIsJurusanOpen(true);
    setJurusanHighlightIndex(0);
    setErrors((prev) => ({ ...prev, jurusan: '' }));
    setForm((prev) => ({ ...prev, jurusan: prev.jurusan.toLowerCase() === value.trim().toLowerCase() ? prev.jurusan : '' }));
  };

  const handleJurusanKeyDown = (event) => {
    if (!isJurusanOpen && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
      setIsJurusanOpen(true);
      setJurusanHighlightIndex(0);
      event.preventDefault();
      return;
    }

    if (event.key === 'ArrowDown' && filteredJurusan.length > 0) {
      event.preventDefault();
      setJurusanHighlightIndex((prev) => Math.min(prev + 1, filteredJurusan.length - 1));
      return;
    }

    if (event.key === 'ArrowUp' && filteredJurusan.length > 0) {
      event.preventDefault();
      setJurusanHighlightIndex((prev) => Math.max(prev - 1, 0));
      return;
    }

    if (event.key === 'Enter' && isJurusanOpen && jurusanHighlightIndex >= 0 && filteredJurusan[jurusanHighlightIndex]) {
      event.preventDefault();
      selectJurusan(filteredJurusan[jurusanHighlightIndex]);
      return;
    }

    if (event.key === 'Escape') {
      setIsJurusanOpen(false);
      setJurusanHighlightIndex(-1);
    }
  };

  const handleSemesterKeyDown = (event, index) => {
    const columns = window.matchMedia('(max-width: 768px)').matches ? 1 : 4;
    let nextIndex = index;

    if (event.key === 'ArrowRight') nextIndex = Math.min(index + 1, SEMESTER_OPTIONS.length - 1);
    if (event.key === 'ArrowLeft') nextIndex = Math.max(index - 1, 0);
    if (event.key === 'ArrowDown') nextIndex = Math.min(index + columns, SEMESTER_OPTIONS.length - 1);
    if (event.key === 'ArrowUp') nextIndex = Math.max(index - columns, 0);

    if (nextIndex !== index) {
      event.preventDefault();
      update('semester', SEMESTER_OPTIONS[nextIndex]);
      semesterChipRefs.current[nextIndex]?.focus();
      return;
    }

    if (event.key === 'Enter' || event.key === ' ' || event.key === 'Spacebar') {
      event.preventDefault();
      update('semester', SEMESTER_OPTIONS[index]);
    }
  };

  const handleBahasaKeyDown = (event, index) => {
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      event.preventDefault();
      const nextIndex = Math.min(index + 1, 1);
      const nextValue = nextIndex === 0 ? 'Indonesia' : 'English';
      update('bahasa', nextValue);
      bahasaToggleRefs.current[nextIndex]?.focus();
      return;
    }

    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault();
      const nextIndex = Math.max(index - 1, 0);
      const nextValue = nextIndex === 0 ? 'Indonesia' : 'English';
      update('bahasa', nextValue);
      bahasaToggleRefs.current[nextIndex]?.focus();
      return;
    }

    if (event.key === 'Enter' || event.key === ' ' || event.key === 'Spacebar') {
      event.preventDefault();
      update('bahasa', index === 0 ? 'Indonesia' : 'English');
    }
  };

  const validateStep1 = () => {
    const nextErrors = {};

    if (!form.name.trim()) {
      nextErrors.name = 'Nama tidak boleh kosong. Silakan isi nama lengkapmu untuk melanjutkan.';
    }

    if (!form.email.trim()) {
      nextErrors.email = 'Email wajib diisi.';
    } else if (!EMAIL_REGEX.test(form.email.trim())) {
      nextErrors.email = 'Format email tidak valid.';
    }

    if (!form.password) {
      nextErrors.password = 'Password wajib diisi.';
    } else if (form.password.length < 8) {
      nextErrors.password = 'Password minimal 8 karakter.';
    }

    if (!form.passwordConfirm) {
      nextErrors.passwordConfirm = 'Konfirmasi password wajib diisi.';
    } else if (form.passwordConfirm !== form.password) {
      nextErrors.passwordConfirm = 'Konfirmasi password tidak sama.';
    }

    setErrors(nextErrors);

    if (nextErrors.name) {
      nameInputRef.current?.focus();
      return false;
    }
    if (nextErrors.email) {
      emailInputRef.current?.focus();
      return false;
    }
    if (nextErrors.password) {
      passwordInputRef.current?.focus();
      return false;
    }
    if (nextErrors.passwordConfirm) {
      passwordConfirmInputRef.current?.focus();
      return false;
    }

    return true;
  };

  const validateStep2 = () => {
    const e = {};
    if (!form.jurusan)  e.jurusan  = 'Silakan pilih jurusanmu terlebih dahulu.';
    if (!form.semester) e.semester = 'Silakan pilih semestermu.';
    if (Object.keys(e).length) { setErrors(e); return false; }
    return true;
  };

  const validateStep3 = () => {
    if (!form.learning_style) {
      setErrors((prev) => ({ ...prev, learning_style: 'Silakan pilih gaya belajar yang paling cocok.' }));
      return false;
    }

    return true;
  };

  const handleNext = () => {
    if (step === 1 && validateStep1()) {
      setStepAnimationClass('onboarding-slide-next');
      setStep(2);
    }

    if (step === 2 && validateStep2()) {
      setStepAnimationClass('onboarding-slide-next');
      setStep(3);
    }

    if (step === 3 && validateStep3()) {
      setStepAnimationClass('onboarding-slide-next');
      setStep(4);
    }
  };

  const goToPreviousStep = (nextStep) => {
    setStepAnimationClass('onboarding-slide-back');
    setStep(nextStep);
  };

  const handleGoogleContinue = () => {
    showToast('Fitur Google Sign-In segera hadir!', 'info');
  };

  const handleStart = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      await authService.register(form.name, form.email, form.password);
      const user = await authService.login(form.email, form.password);

      if (user.status === 'PENDING') {
        await profileService.create(mapOnboardingToApi(form));
      }

      const fullUser = await authService.me();
      setUser(fullUser);
      setActiveView('dashboard');
      showToast('Selamat datang di Leva!', 'success');
    } catch (error) {
      const msg = error.response?.data?.message ?? 'Pendaftaran gagal. Coba lagi.';
      showToast(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openLoginModal = () => {
    setLoginErrors({});
    setShowLoginModal(true);
  };

  const closeLoginModal = () => {
    if (isLoginSubmitting) return;
    setShowLoginModal(false);
  };

  const handleLogin = async (event) => {
    event.preventDefault();

    const nextErrors = {};
    if (!loginForm.email.trim()) {
      nextErrors.email = 'Email wajib diisi.';
    }
    if (!loginForm.password) {
      nextErrors.password = 'Password wajib diisi.';
    }

    setLoginErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setIsLoginSubmitting(true);

    try {
      await authService.login(loginForm.email, loginForm.password);
      const me = await authService.me();
      setUser(me);
      setActiveView('dashboard');
      setShowLoginModal(false);
      showToast('Selamat datang kembali!', 'success');
    } catch (error) {
      const msg = error.response?.data?.message ?? 'Login gagal. Periksa email dan password.';
      showToast(msg, 'error');
    } finally {
      setIsLoginSubmitting(false);
    }
  };

  // -- Shared input style
  const inputStyle = (hasError) => ({
    width: '100%', padding: '12px 14px',
    border: `1.5px solid ${hasError ? '#DC2626' : 'var(--color-border)'}`,
    borderRadius: 10, fontSize: 14,
    outline: 'none', color: 'var(--color-text-primary)',
    background: '#fff',
    transition: 'border 0.2s, box-shadow 0.2s',
    boxSizing: 'border-box',
  });

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

  const isStep1Complete = Boolean(
    form.name.trim()
    && form.email.trim()
    && form.password
    && form.passwordConfirm
  );
  const isStep2Complete = Boolean(form.jurusan && form.semester);
  const isStep3Complete = Boolean(form.learning_style);
  const STEP_DOT_TOOLTIP = {
    1: '1. Nama',
    2: '2. Info Akademik',
    3: '3. Gaya Belajar',
    4: '4. Konfirmasi',
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #6C63FF 0%, #8B5CF6 50%, #A78BFA 100%)',
      padding: 20,
    }}>
      <div className="card" style={{ width: '100%', maxWidth: 460, padding: 36, position: 'relative', overflow: 'hidden' }}>

        {step === 4 && showStep3Confetti && (
          <div className="onboarding-confetti-layer" aria-hidden="true">
            {step3ConfettiPieces.map((piece) => (
              <span
                key={piece.id}
                className="onboarding-confetti-piece"
                style={{
                  left: piece.left,
                  background: piece.color,
                  animationDelay: piece.delay,
                  animationDuration: piece.duration,
                }}
              />
            ))}
          </div>
        )}

        <div className={`onboarding-step-panel ${stepAnimationClass}`}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 6 }}><AppIcon name="sparkles" size={30} /></div>
          <span style={{ fontSize: 26, fontWeight: 800, color: 'var(--color-primary)', letterSpacing: '-0.5px' }}>
            Leva
          </span>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--color-text-secondary)' }}>
            Your Cognitive Lever for Academic Excellence
          </p>
          <p style={{ margin: '3px 0 0', fontSize: 13, color: '#4B5563', fontWeight: 600 }}>
            Asisten Akademik Cerdasmu
          </p>
        </div>

        {/* Step Dots */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 28 }}>
          {[1, 2, 3, 4].map(s => (
            <span
              key={s}
              className={`tooltip-host ${s === step ? 'tooltip-active' : ''}`}
              data-tooltip={STEP_DOT_TOOLTIP[s]}
              tabIndex={0}
              aria-label={STEP_DOT_TOOLTIP[s]}
              style={{ display: 'inline-flex' }}
            >
              <span style={{
                width: s === step ? 24 : 8, height: 8, borderRadius: 4,
                background: s <= step ? 'var(--color-primary)' : 'var(--color-border)',
                transition: 'all 0.3s ease',
                cursor: 'help',
              }} />
            </span>
          ))}
        </div>

        {/* --- STEP 1 --- */}
        {step === 1 && (
          <div>
            <h2 style={{ margin: '0 0 6px', fontSize: 22, fontWeight: 700 }}>Hei! Perkenalkan dirimu dulu</h2>
            <p style={{ margin: '0 0 24px', fontSize: 14, color: 'var(--color-text-secondary)' }}>
              Leva butuh sedikit info untuk mempersonalisasi pengalaman belajarmu.
            </p>

            <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)', display: 'block', marginBottom: 6 }}>
              Nama lengkap kamu
            </label>
            <input
              ref={nameInputRef}
              autoFocus
              autoComplete="name"
              value={form.name}
              onChange={e => update('name', e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleNext()}
              placeholder="Contoh: Renisa Assyifa Putri"
              aria-invalid={!!errors.name}
              style={inputStyle(!!errors.name)}
              onFocus={(event) => {
                event.target.style.borderColor = 'var(--color-primary)';
                event.target.style.boxShadow = '0 0 0 4px rgba(196, 181, 253, 0.55)';
              }}
              onBlur={(event) => {
                event.target.style.borderColor = errors.name ? '#DC2626' : 'var(--color-border)';
                event.target.style.boxShadow = 'none';
              }}
            />
            {errText('name')}

            <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)', display: 'block', margin: '14px 0 6px' }}>
              Email aktif
            </label>
            <input
              ref={emailInputRef}
              autoComplete="email"
              value={form.email}
              onChange={e => update('email', e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleNext()}
              placeholder="nama@email.com"
              aria-invalid={!!errors.email}
              style={inputStyle(!!errors.email)}
            />
            {errText('email')}

            <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)', display: 'block', margin: '14px 0 6px' }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                ref={passwordInputRef}
                autoComplete="new-password"
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={e => update('password', e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleNext()}
                placeholder="Minimal 8 karakter"
                aria-invalid={!!errors.password}
                style={{ ...inputStyle(!!errors.password), paddingRight: 50 }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                style={{
                  position: 'absolute',
                  right: 10,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--color-text-secondary)',
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                {showPassword ? 'Sembunyikan' : 'Lihat'}
              </button>
            </div>
            {errText('password')}

            <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)', display: 'block', margin: '14px 0 6px' }}>
              Konfirmasi password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                ref={passwordConfirmInputRef}
                autoComplete="new-password"
                type={showPasswordConfirm ? 'text' : 'password'}
                value={form.passwordConfirm}
                onChange={e => update('passwordConfirm', e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleNext()}
                placeholder="Ulangi password"
                aria-invalid={!!errors.passwordConfirm}
                style={{ ...inputStyle(!!errors.passwordConfirm), paddingRight: 50 }}
              />
              <button
                type="button"
                onClick={() => setShowPasswordConfirm((prev) => !prev)}
                aria-label={showPasswordConfirm ? 'Sembunyikan password' : 'Tampilkan password'}
                style={{
                  position: 'absolute',
                  right: 10,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--color-text-secondary)',
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                {showPasswordConfirm ? 'Sembunyikan' : 'Lihat'}
              </button>
            </div>
            {errText('passwordConfirm')}

            <button
              className="btn-primary"
              onClick={handleNext}
              aria-disabled={!isStep1Complete}
              style={{
                width: '100%',
                padding: '13px',
                marginTop: 20,
                fontSize: 15,
                opacity: isStep1Complete ? 1 : 0.6,
                cursor: isStep1Complete ? 'pointer' : 'not-allowed',
              }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                Lanjut <AppIcon name="arrow-right" size={14} color="#fff" />
              </span>
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '16px 0 12px' }}>
              <div style={{ flex: 1, height: 1, background: 'var(--color-border)' }} />
              <span style={{ fontSize: 12, color: 'var(--color-text-secondary)', fontWeight: 600 }}>atau</span>
              <div style={{ flex: 1, height: 1, background: 'var(--color-border)' }} />
            </div>

            <button
              type="button"
              onClick={handleGoogleContinue}
              style={{
                width: '100%',
                padding: '12px 14px',
                marginTop: 2,
                borderRadius: 10,
                border: '1px solid #D1D5DB',
                background: '#fff',
                color: '#374151',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                transition: 'background 0.2s ease',
              }}
              onMouseEnter={(event) => {
                event.currentTarget.style.background = '#F9FAFB';
              }}
              onMouseLeave={(event) => {
                event.currentTarget.style.background = '#fff';
              }}
            >
              <AppIcon name="google" size={14} /> Atau lanjutkan dengan Google
            </button>

            <div style={{ marginTop: 16, textAlign: 'center', fontSize: 13, color: 'var(--color-text-secondary)' }}>
              Sudah punya akun?{' '}
              <button
                type="button"
                onClick={openLoginModal}
                style={{
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--color-primary)',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                Login
              </button>
            </div>
          </div>
        )}

        {/* --- STEP 2 --- */}
        {step === 2 && (
          <div>
            <h2 style={{ margin: '0 0 6px', fontSize: 22, fontWeight: 700 }}>Info Akademik Kamu</h2>
            <p style={{ margin: '0 0 24px', fontSize: 14, color: '#4B5563' }}>
              Ini membantu Leva merekomendasikan tools yang paling relevan untukmu.
            </p>

            {/* Jurusan */}
            <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Jurusan</label>
            {/* UI/UX Fix: Step 7 — Combo box menggabungkan text entry + list box untuk pencarian cepat. Radio button grid menampilkan semua opsi sekaligus (display as many choices as possible). */}
            <div ref={jurusanBoxRef} style={{ position: 'relative' }}>
              <input
                ref={jurusanInputRef}
                value={jurusanQuery}
                onChange={(event) => handleJurusanTyping(event.target.value)}
                onFocus={() => {
                  setIsJurusanOpen(true);
                  setJurusanHighlightIndex(filteredJurusan.length ? 0 : -1);
                }}
                onKeyDown={handleJurusanKeyDown}
                onBlur={(event) => {
                  if (!jurusanBoxRef.current?.contains(event.relatedTarget)) {
                    setIsJurusanOpen(false);
                    setJurusanHighlightIndex(-1);
                  }
                }}
                placeholder="Ketik atau pilih jurusan..."
                role="combobox"
                aria-expanded={isJurusanOpen}
                aria-controls="jurusan-combobox-list"
                aria-autocomplete="list"
                aria-invalid={!!errors.jurusan}
                style={{ ...inputStyle(!!errors.jurusan), paddingRight: 66 }}
              />

              {jurusanQuery && (
                <button
                  type="button"
                  onClick={clearJurusan}
                  aria-label="Reset jurusan"
                  style={{
                    position: 'absolute',
                    right: 34,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    border: 'none',
                    background: 'transparent',
                    color: 'var(--color-text-secondary)',
                    cursor: 'pointer',
                    padding: 0,
                    display: 'flex',
                  }}
                >
                  <AppIcon name="x" size={14} />
                </button>
              )}

              <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-secondary)', pointerEvents: 'none', display: 'flex' }}>
                <AppIcon name="chevron-down" size={14} />
              </span>

              {isJurusanOpen && (
                <div
                  id="jurusan-combobox-list"
                  role="listbox"
                  style={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    top: 'calc(100% + 6px)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 10,
                    background: '#fff',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                    maxHeight: 210,
                    overflowY: 'auto',
                    zIndex: 20,
                  }}
                >
                  {filteredJurusan.length === 0 ? (
                    <div style={{ padding: '10px 12px', fontSize: 13, color: 'var(--color-text-secondary)' }}>
                      Jurusan tidak ditemukan
                    </div>
                  ) : (
                    filteredJurusan.map((jurusan, index) => {
                      const isHighlighted = index === jurusanHighlightIndex;
                      return (
                        <button
                          key={jurusan}
                          type="button"
                          role="option"
                          aria-selected={form.jurusan === jurusan}
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => selectJurusan(jurusan)}
                          style={{
                            width: '100%',
                            textAlign: 'left',
                            border: 'none',
                            background: isHighlighted ? 'var(--color-primary-light)' : '#fff',
                            color: isHighlighted ? 'var(--color-primary)' : 'var(--color-text-primary)',
                            padding: '10px 12px',
                            cursor: 'pointer',
                            fontSize: 13,
                          }}
                        >
                          {jurusan}
                        </button>
                      );
                    })
                  )}
                </div>
              )}
            </div>
            <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--color-text-secondary)' }}>
              Ketik nama jurusanmu untuk mencari lebih cepat
            </p>
            {errText('jurusan')}

            {/* Semester */}
            <label style={{ fontSize: 13, fontWeight: 600, display: 'block', margin: '16px 0 8px' }}>Semester</label>
            <div className="onboarding-semester-grid" role="radiogroup" aria-label="Pilih semester" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
              {SEMESTER_OPTIONS.map((semester, index) => {
                const isSelected = form.semester === semester;
                return (
                  <button
                    key={semester}
                    ref={(element) => { semesterChipRefs.current[index] = element; }}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    tabIndex={form.semester ? (isSelected ? 0 : -1) : (index === 0 ? 0 : -1)}
                    onKeyDown={(event) => handleSemesterKeyDown(event, index)}
                    onClick={() => update('semester', semester)}
                    style={{
                      padding: '10px 8px',
                      borderRadius: 10,
                      border: `1.5px solid ${isSelected ? 'var(--color-primary)' : 'var(--color-border)'}`,
                      background: isSelected ? 'var(--color-primary)' : '#fff',
                      color: isSelected ? '#fff' : 'var(--color-text-secondary)',
                      cursor: 'pointer',
                      fontSize: 13,
                      fontWeight: 600,
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(event) => {
                      if (!isSelected) event.currentTarget.style.borderColor = '#C4B5FD';
                    }}
                    onMouseLeave={(event) => {
                      if (!isSelected) event.currentTarget.style.borderColor = 'var(--color-border)';
                    }}
                  >
                    Semester {semester}
                  </button>
                );
              })}
            </div>
            {errText('semester')}

            {/* Bahasa */}
            <label style={{ fontSize: 13, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6, margin: '16px 0 8px' }}>
              <span>Preferensi Bahasa</span>
              <span
                className="tooltip-host tooltip-help-icon"
                data-tooltip="Pilih bahasa yang kamu inginkan untuk rekomendasi tools dan tips dari Leva."
                aria-label="Info preferensi bahasa"
                tabIndex={0}
              >
                ?
              </span>
            </label>
            <div role="radiogroup" aria-label="Preferensi bahasa" style={{ display: 'flex', gap: 10 }}>
              {['Indonesia', 'English'].map((lang, index) => (
                <button
                  key={lang}
                  ref={(element) => { bahasaToggleRefs.current[index] = element; }}
                  type="button"
                  role="radio"
                  aria-checked={form.bahasa === lang}
                  tabIndex={form.bahasa === lang ? 0 : -1}
                  onClick={() => update('bahasa', lang)}
                  onKeyDown={(event) => handleBahasaKeyDown(event, index)}
                  style={{
                    flex: 1, padding: '10px', borderRadius: 10, fontSize: 14, fontWeight: 500,
                    cursor: 'pointer', transition: 'all 0.2s',
                    background: form.bahasa === lang ? 'var(--color-primary)' : 'var(--color-bg)',
                    color: form.bahasa === lang ? '#fff' : 'var(--color-text-secondary)',
                    border: `1.5px solid ${form.bahasa === lang ? 'var(--color-primary)' : 'var(--color-border)'}`,
                  }}
                >
                  {lang === 'Indonesia' ? 'ID Indonesia' : 'EN English'}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
              <button className="btn-ghost" onClick={() => goToPreviousStep(1)} style={{ flex: 1, padding: '13px' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <AppIcon name="arrow-left" size={14} /> Kembali
                </span>
              </button>
              <button
                className="btn-primary"
                onClick={handleNext}
                aria-disabled={!isStep2Complete}
                style={{
                  flex: 2,
                  padding: '13px',
                  fontSize: 15,
                  opacity: isStep2Complete ? 1 : 0.6,
                  cursor: isStep2Complete ? 'pointer' : 'not-allowed',
                  transition: 'filter 0.2s ease',
                }}
                onMouseEnter={(event) => {
                  if (isStep2Complete) event.currentTarget.style.filter = 'brightness(1.04)';
                }}
                onMouseLeave={(event) => {
                  if (isStep2Complete) event.currentTarget.style.filter = 'none';
                }}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  Lanjut <AppIcon name="arrow-right" size={14} color="#fff" />
                </span>
              </button>
            </div>
          </div>
        )}

        {/* --- STEP 3 --- */}
        {step === 3 && (
          <div>
            <h2 style={{ margin: '0 0 6px', fontSize: 22, fontWeight: 700 }}>Gaya Belajar Favoritmu</h2>
            <p style={{ margin: '0 0 22px', fontSize: 14, color: 'var(--color-text-secondary)' }}>
              Pilih gaya belajar yang paling sering kamu gunakan agar rekomendasi Leva lebih tepat.
            </p>

            <div role="radiogroup" aria-label="Pilih gaya belajar" style={{ display: 'grid', gap: 12 }}>
              {LEARNING_STYLE_OPTIONS.map((option) => {
                const isSelected = form.learning_style === option.key;
                return (
                  <button
                    key={option.key}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    onClick={() => update('learning_style', option.key)}
                    style={{
                      display: 'flex',
                      gap: 12,
                      alignItems: 'flex-start',
                      textAlign: 'left',
                      padding: '12px 14px',
                      borderRadius: 12,
                      border: `1.5px solid ${isSelected ? 'var(--color-primary)' : 'var(--color-border)'}`,
                      background: isSelected ? 'var(--color-primary-light)' : '#fff',
                      cursor: 'pointer',
                    }}
                  >
                    <span style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: isSelected ? 'var(--color-primary)' : 'var(--color-bg)',
                      color: isSelected ? '#fff' : 'var(--color-text-secondary)',
                      flexShrink: 0,
                    }}>
                      <AppIcon name={option.icon} size={18} color={isSelected ? '#fff' : 'var(--color-text-secondary)'} />
                    </span>
                    <span>
                      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text-primary)' }}>{option.label}</div>
                      <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 4 }}>{option.description}</div>
                    </span>
                  </button>
                );
              })}
            </div>
            {errText('learning_style')}

            <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
              <button className="btn-ghost" onClick={() => goToPreviousStep(2)} style={{ flex: 1, padding: '13px' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <AppIcon name="arrow-left" size={14} /> Kembali
                </span>
              </button>
              <button
                className="btn-primary"
                onClick={handleNext}
                aria-disabled={!isStep3Complete}
                style={{
                  flex: 2,
                  padding: '13px',
                  fontSize: 15,
                  opacity: isStep3Complete ? 1 : 0.6,
                  cursor: isStep3Complete ? 'pointer' : 'not-allowed',
                }}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  Lanjut <AppIcon name="arrow-right" size={14} color="#fff" />
                </span>
              </button>
            </div>
          </div>
        )}

        {/* --- STEP 4 --- */}
        {step === 4 && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}><AppIcon name="graduation-cap" size={56} /></div>
            <h2 style={{ margin: '0 0 12px', fontSize: 22, fontWeight: 700, lineHeight: 1.35 }}>
              Siap, <span style={{ color: 'var(--color-primary)' }}>{form.name.split(' ')[0]}</span>!
            </h2>
            <p style={{ margin: '0 0 20px', fontSize: 14, color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
              Kamu mahasiswa jurusan <strong>{form.jurusan}</strong>, semester <strong>{form.semester}</strong>.<br />
              Leva siap jadi asisten akademikmu. Mulai jelajahi sekarang!
            </p>

            {/* Summary card */}
            <div style={{
              background: 'var(--color-primary-light)', borderRadius: 12,
              padding: '14px 18px', marginBottom: 24, textAlign: 'left',
            }}>
              {[
                { label: 'Nama',    val: form.name },
                { label: 'Email',   val: form.email },
                { label: 'Jurusan', val: form.jurusan },
                { label: 'Semester',val: `Semester ${form.semester}` },
                { label: 'Bahasa',  val: form.bahasa },
                { label: 'Gaya Belajar', val: LEARNING_STYLE_OPTIONS.find((item) => item.key === form.learning_style)?.label ?? form.learning_style },
              ].map(row => (
                <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '5px 0', borderBottom: '1px solid rgba(108,99,255,0.15)' }}>
                  <span style={{ color: 'var(--color-text-secondary)' }}>{row.label}</span>
                  <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{row.val}</span>
                </div>
              ))}
            </div>

            <p style={{ margin: '-8px 0 18px', fontSize: 13, color: '#6B7280', fontStyle: 'italic' }}>
              Tenang, data ini bisa kamu ubah kapan saja di halaman Profil.
            </p>

            <button
              onClick={handleStart}
              disabled={isSubmitting}
              style={{
                width: '100%', padding: '14px', borderRadius: 12, border: 'none',
                background: 'var(--color-secondary)', color: '#fff',
                fontSize: 16, fontWeight: 700, cursor: isSubmitting ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
                opacity: isSubmitting ? 0.7 : 1,
              }}
              onMouseEnter={e => {
                if (!isSubmitting) e.currentTarget.style.background = '#059669';
              }}
              onMouseLeave={e => {
                if (!isSubmitting) e.currentTarget.style.background = 'var(--color-secondary)';
              }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                {isSubmitting ? (
                  <>
                    <AppIcon name="loader" size={16} color="#fff" className="animate-spin" />
                    Memproses...
                  </>
                ) : (
                  <>
                    Masuk ke Dashboard <AppIcon name="arrow-right" size={14} color="#fff" />
                  </>
                )}
              </span>
            </button>

            <button className="btn-ghost" onClick={() => goToPreviousStep(3)} style={{ width: '100%', marginTop: 10 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <AppIcon name="arrow-left" size={14} /> Edit Data
              </span>
            </button>
          </div>
        )}
        </div>
      </div>

      {showLoginModal && (
        <Modal title="Masuk ke Leva" onClose={closeLoginModal}>
          <form onSubmit={handleLogin}>
            <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)', display: 'block', marginBottom: 6 }}>
              Email
            </label>
            <input
              autoComplete="email"
              value={loginForm.email}
              onChange={(event) => {
                setLoginForm((prev) => ({ ...prev, email: event.target.value }));
                setLoginErrors((prev) => ({ ...prev, email: '' }));
              }}
              placeholder="nama@email.com"
              aria-invalid={!!loginErrors.email}
              style={inputStyle(!!loginErrors.email)}
            />
            {loginErrors.email && (
              <p className="field-error-message" role="alert">
                <span style={{ display: 'inline-flex', alignItems: 'center', marginTop: 1 }}>
                  <AppIcon name="warning" size={12} color="#DC2626" />
                </span>
                <span>{loginErrors.email}</span>
              </p>
            )}

            <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)', display: 'block', margin: '14px 0 6px' }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                autoComplete="current-password"
                type={showLoginPassword ? 'text' : 'password'}
                value={loginForm.password}
                onChange={(event) => {
                  setLoginForm((prev) => ({ ...prev, password: event.target.value }));
                  setLoginErrors((prev) => ({ ...prev, password: '' }));
                }}
                placeholder="Masukkan password"
                aria-invalid={!!loginErrors.password}
                style={{ ...inputStyle(!!loginErrors.password), paddingRight: 50 }}
              />
              <button
                type="button"
                onClick={() => setShowLoginPassword((prev) => !prev)}
                aria-label={showLoginPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                style={{
                  position: 'absolute',
                  right: 10,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--color-text-secondary)',
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                {showLoginPassword ? 'Sembunyikan' : 'Lihat'}
              </button>
            </div>
            {loginErrors.password && (
              <p className="field-error-message" role="alert">
                <span style={{ display: 'inline-flex', alignItems: 'center', marginTop: 1 }}>
                  <AppIcon name="warning" size={12} color="#DC2626" />
                </span>
                <span>{loginErrors.password}</span>
              </p>
            )}

            <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
              <button
                type="button"
                className="btn-ghost"
                onClick={closeLoginModal}
                style={{ flex: 1 }}
                disabled={isLoginSubmitting}
              >
                Batal
              </button>
              <button
                type="submit"
                className="btn-primary"
                disabled={isLoginSubmitting}
                style={{ flex: 2, opacity: isLoginSubmitting ? 0.7 : 1, cursor: isLoginSubmitting ? 'not-allowed' : 'pointer' }}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  {isLoginSubmitting ? (
                    <>
                      <AppIcon name="loader" size={16} color="#fff" className="animate-spin" />
                      Masuk...
                    </>
                  ) : (
                    <>
                      Login <AppIcon name="arrow-right" size={14} color="#fff" />
                    </>
                  )}
                </span>
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
