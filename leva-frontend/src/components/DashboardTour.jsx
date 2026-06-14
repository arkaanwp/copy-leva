import { useEffect, useMemo, useRef, useState } from 'react';

const TOUR_COMPLETED_KEY = 'leva_tour_completed_v2';
const TOUR_REOPEN_EVENT = 'leva:open-dashboard-tour';
const STEP_COUNT = 4;

const TOUR_STEPS = [
  {
    id: 1,
    target: 'dashboard-featured-tools',
    title: '👋 Selamat datang di Leva!',
    message: "Ini tools AI yang kami pilihkan khusus untukmu setiap hari. Klik 'Simpan' untuk menyimpan ke Library-mu.",
    placement: 'bottom',
  },
  {
    id: 2,
    target: 'sidebar-chat',
    title: '💬 Mulai dari sini!',
    message: 'Ceritakan tugasmu dan Leva akan memecahnya jadi langkah-langkah kecil, lengkap dengan rekomendasi tools AI.',
    placement: 'right',
  },
  {
    id: 3,
    target: 'sidebar-library',
    title: '📚 Koleksi Tools-mu',
    message: 'Semua tools yang kamu simpan akan tersimpan rapi di sini. Kamu bisa cari, filter, dan kelola kapan saja.',
    placement: 'right',
  },
  {
    id: 4,
    target: 'sidebar-new-chat',
    title: '🚀 Siap memulai?',
    message: "Klik 'New Chat' kapan saja untuk memulai tugas baru. Selamat belajar!",
    placement: 'bottom',
  },
];

const getTargetRect = (targetName) => {
  const targetEl = document.querySelector(`[data-tour="${targetName}"]`);
  if (!targetEl) return null;

  const rect = targetEl.getBoundingClientRect();
  return {
    top: rect.top,
    left: rect.left,
    width: rect.width,
    height: rect.height,
    right: rect.right,
    bottom: rect.bottom,
  };
};

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const getCalloutPosition = (rect, placement) => {
  if (!rect) {
    return {
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
    };
  }

  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const calloutWidth = 320;
  const calloutHeight = 190;
  const margin = 16;
  const gap = 14;

  let top = rect.bottom + gap;
  let left = rect.left;

  if (placement === 'right') {
    left = rect.right + gap;
    top = rect.top + rect.height / 2 - calloutHeight / 2;

    if (left + calloutWidth > viewportWidth - margin) {
      left = rect.left - calloutWidth - gap;
    }
  }

  if (placement === 'bottom') {
    top = rect.bottom + gap;
    left = rect.left + rect.width / 2 - calloutWidth / 2;

    if (top + calloutHeight > viewportHeight - margin) {
      top = rect.top - calloutHeight - gap;
    }
  }

  left = clamp(left, margin, viewportWidth - calloutWidth - margin);
  top = clamp(top, margin, viewportHeight - calloutHeight - margin);

  return {
    top,
    left,
    transform: 'none',
  };
};

export default function DashboardTour({ isActive }) {
  const [isOpen, setIsOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState(null);
  const pendingReopenRef = useRef(false);

  const currentStep = TOUR_STEPS[stepIndex];

  const markTourCompleted = () => {
    try {
      window.localStorage.setItem(TOUR_COMPLETED_KEY, 'true');
    } catch {
      // noop
    }
  };

  const closeTour = () => {
    markTourCompleted();
    setIsOpen(false);
  };

  const openTourFromStart = () => {
    setStepIndex(0);
    setIsOpen(true);
  };

  useEffect(() => {
    if (!isActive) {
      setIsOpen(false);
      return;
    }

    if (pendingReopenRef.current) {
      pendingReopenRef.current = false;
      openTourFromStart();
      return;
    }

    let isCompleted = false;
    try {
      isCompleted = window.localStorage.getItem(TOUR_COMPLETED_KEY) === 'true';
    } catch {
      isCompleted = false;
    }

    if (isCompleted) return;

    const timer = setTimeout(() => {
      setStepIndex(0);
      setIsOpen(true);
    }, 320);

    return () => clearTimeout(timer);
  }, [isActive]);

  useEffect(() => {
    const handleReopenTour = () => {
      if (isActive) {
        openTourFromStart();
        return;
      }

      pendingReopenRef.current = true;
    };

    window.addEventListener(TOUR_REOPEN_EVENT, handleReopenTour);
    return () => window.removeEventListener(TOUR_REOPEN_EVENT, handleReopenTour);
  }, [isActive]);

  useEffect(() => {
    if (!isOpen || !currentStep) return;

    const refreshTarget = () => {
      setTargetRect(getTargetRect(currentStep.target));
    };

    refreshTarget();

    const rafHandle = requestAnimationFrame(refreshTarget);
    window.addEventListener('resize', refreshTarget);
    window.addEventListener('scroll', refreshTarget, true);

    return () => {
      cancelAnimationFrame(rafHandle);
      window.removeEventListener('resize', refreshTarget);
      window.removeEventListener('scroll', refreshTarget, true);
    };
  }, [isOpen, currentStep]);

  const calloutPosition = useMemo(() => {
    if (currentStep?.id === 1) {
      return {
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
      };
    }

    return getCalloutPosition(targetRect, currentStep?.placement || 'bottom');
  }, [targetRect, currentStep]);

  const goNextStep = () => {
    if (stepIndex === STEP_COUNT - 1) {
      closeTour();
      return;
    }

    setStepIndex((prev) => Math.min(prev + 1, STEP_COUNT - 1));
  };

  if (!isOpen || !currentStep) return null;

  const highlightPadding = currentStep.target === 'dashboard-featured-tools' ? 10 : 6;
  const highlightStyle = targetRect
    ? {
        top: targetRect.top - highlightPadding,
        left: targetRect.left - highlightPadding,
        width: targetRect.width + highlightPadding * 2,
        height: targetRect.height + highlightPadding * 2,
      }
    : {
        top: -9999,
        left: -9999,
        width: 0,
        height: 0,
      };

  const isLastStep = stepIndex === STEP_COUNT - 1;
  const primaryLabel = isLastStep ? 'Mulai Jelajahi! 🎉' : 'Selanjutnya →';
  const isStepOneModal = currentStep.id === 1;
  const isCompactViewport = typeof window !== 'undefined' && window.innerWidth <= 1100;
  const shouldUseBlurBackdrop = isStepOneModal || (isCompactViewport && currentStep.id === 4);
  const shouldShowHighlight = !isStepOneModal;
  const mergedHighlightStyle = shouldUseBlurBackdrop
    ? {
        ...highlightStyle,
        boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.36)',
      }
    : highlightStyle;

  return (
    <div className="dashboard-tour-layer" role="dialog" aria-modal="true" aria-label="Panduan pertama Dashboard">
      {shouldUseBlurBackdrop && <div className="dashboard-tour-backdrop-blur" aria-hidden="true" />}
      {shouldShowHighlight && <div className="dashboard-tour-highlight" style={mergedHighlightStyle} />}

      <div key={currentStep.id} className="dashboard-tour-callout" style={calloutPosition}>
        <p className="dashboard-tour-progress">Langkah {stepIndex + 1} dari {STEP_COUNT}</p>
        <h3 className="dashboard-tour-title">{currentStep.title}</h3>
        <p className="dashboard-tour-body">{currentStep.message}</p>

        <button type="button" className="btn-primary" onClick={goNextStep} style={{ width: '100%' }}>
          {primaryLabel}
        </button>
        <button type="button" className="dashboard-tour-skip" onClick={closeTour}>
          Lewati Tour
        </button>
      </div>
    </div>
  );
}
