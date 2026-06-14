import { useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import AppIcon from '../components/AppIcon';
import Modal from '../components/Modal';
import { bookmarkService } from '../services/bookmarkService';
import { chatService } from '../services/chatService';
import { taskService } from '../services/taskService';
import { playSoundEffect } from '../utils/sound';

// --- Tag color helper
const tagStyle = (cat) => {
  const map = {
    Research:     { bg: '#EDE9FE', color: '#7C3AED' },
    Writing:      { bg: '#FEF9C3', color: '#A16207' },
    Coding:       { bg: '#DBEAFE', color: '#1D4ED8' },
    Data:         { bg: '#DCFCE7', color: '#15803D' },
    Academic:     { bg: '#FFE4E6', color: '#BE123C' },
    Productivity: { bg: '#F0FDFA', color: '#0F766E' },
  };
  return map[cat] || { bg: 'var(--color-bg)', color: 'var(--color-text-secondary)' };
};

const iconByCategory = {
  Research: 'search',
  Writing: 'pencil',
  Coding: 'task',
  Data: 'dashboard',
  Academic: 'book',
  Productivity: 'folder',
};

const MAX_ATTACHMENT_SIZE_BYTES = 10 * 1024 * 1024;
const ACCEPTED_ATTACHMENT_EXTENSIONS = ['pdf', 'txt', 'md'];
const QUICK_PROMPTS_BY_JURUSAN = {
  teknikInformatika: ['Bantu susun skripsi', 'Debug kode Python', 'Review jurnal IEEE', 'Belajar framework baru'],
  ilmuKomunikasi: ['Analisis konten media', 'Susun proposal riset', 'Review teori komunikasi', 'Buat kerangka esai'],
  default: ['Bantu susun skripsi', 'Cara belajar coding dari 0', 'Buat essay etika profesi', 'Analisis jurnal terkait'],
};

const getFileExtension = (fileName = '') => fileName.split('.').pop()?.toLowerCase() || '';

const readFileAsText = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result || '');
    reader.onerror = (e) => reject(e);
    reader.readAsText(file);
  });
};

const validateAttachment = (file) => {
  if (!file) return '__validation:noFile';
  if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
    const fileSizeMb = (file.size / (1024 * 1024)).toFixed(1);
    return `__validation:tooLarge:${fileSizeMb}`;
  }

  const extension = getFileExtension(file.name);
  if (!ACCEPTED_ATTACHMENT_EXTENSIONS.includes(extension)) {
    return '__validation:unsupported';
  }

  return '';
};

const getGeneratedTaskTitle = (text, jurusan, attachedFiles) => {
  const raw = (text ?? '').toLowerCase();

  if (attachedFiles && attachedFiles.length > 0) {
    if (attachedFiles.length === 1) {
      return `Memecah Tugas dari ${attachedFiles[0].name}`;
    }
    return `Memecah Tugas dari ${attachedFiles[0].name} dan ${attachedFiles.length - 1} file lainnya`;
  }
  if (raw.includes('skripsi')) return `Menyusun Skripsi ${jurusan}`;
  if (raw.includes('essay')) return `Menulis Essay ${jurusan}`;
  if (raw.includes('koding') || raw.includes('coding')) return 'Belajar Koding dari Nol';
  if (raw.includes('resume')) return 'Membuat Resume Magang';

  return 'Menyelesaikan Tugas Akademik';
};

const getEstimatedProcessingMs = ({ text, attachedFiles }) => {
  const baseMs = 12000;
  const textComplexityMs = Math.min((text ?? '').trim().length * 45, 15000);
  const attachmentMs = attachedFiles && attachedFiles.length > 0 ? attachedFiles.length * 3000 : 0;
  return Math.min(baseMs + textComplexityMs + attachmentMs, 45000);
};

const getProcessingMessageKey = (elapsedSeconds) => {
  if (elapsedSeconds < 5) return 'chat.processing1';
  if (elapsedSeconds < 15) return 'chat.processing2';
  if (elapsedSeconds < 30) return 'chat.processing3';
  return 'chat.processing4';
};

const resolveToolUrl = (url) => {
  if (!url) return '';
  return url.startsWith('http://') || url.startsWith('https://') ? url : `https://${url}`;
};

const normalizeSubTask = (subTask) => ({
  id: subTask.sub_task_id ?? subTask.id,
  title: subTask.actionable_title ?? subTask.title ?? '',
  deskripsi: subTask.description ?? '',
  tips: subTask.tips ?? '',
  kategori: subTask.category ?? subTask.kategori ?? '',
  estimasi: subTask.estimated_duration ?? subTask.estimasi ?? '',
  status: subTask.status ?? 'next',
  order: subTask.order ?? 0,
  recommended_tools: Array.isArray(subTask.recommended_tools) ? subTask.recommended_tools : [],
});

const RAG_ERROR_MESSAGE_KEY = 'chat.ragErrorMsg';

// --- Subtask Card
function SubTaskCard({ task, index, isExpanded, onToggle, onMarkDone, isDoneJustNow }) {
  const { t } = useApp();
  const ts = tagStyle(task.kategori);
  const [isHeaderHovered, setIsHeaderHovered] = useState(false);

  const headerBgColor = isExpanded
    ? 'var(--color-primary-light)'
    : isHeaderHovered
      ? 'var(--color-bg)'
      : 'var(--color-surface)';

  return (
    <div className={`card ${isDoneJustNow ? 'subtask-card-highlight' : ''}`} style={{ marginBottom: 10, overflow: 'hidden', transition: 'box-shadow 0.2s' }}>
      {/* Card Header */}
      <div
        onClick={onToggle}
        onMouseEnter={() => setIsHeaderHovered(true)}
        onMouseLeave={() => setIsHeaderHovered(false)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onToggle();
          }
        }}
        role="button"
        tabIndex={0}
        aria-expanded={isExpanded}
        /* UI/UX Fix: Step 6 — Hotspot harus mudah dikenali (accordion). Step 7 — Aksi destruktif (reset) butuh safeguard. Statistik clickable meningkatkan keterhubungan antar layar. */
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', cursor: 'pointer',
          background: headerBgColor,
          transition: 'background 0.2s',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Step number */}
          <div style={{
            width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
            background: task.status === 'done' ? 'var(--color-secondary)' : 'var(--color-primary-light)',
            color: task.status === 'done' ? '#fff' : 'var(--color-primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 700,
          }}>
            {task.status === 'done' ? <AppIcon name="check" size={14} color="#fff" /> : index + 1}
          </div>
          <span style={{ fontWeight: 600, fontSize: 15, color: 'var(--color-text-primary)' }}>
            {task.title}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {task.status === 'done'
            ? <span className={`badge-done ${isDoneJustNow ? 'badge-done-pop' : ''}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>Done <AppIcon name="check" size={12} color="#fff" /></span>
            : (
              <span
                className="badge-next tooltip-host"
                data-tooltip={t('chat.nextSectionTooltip')}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                {t('chat.nextSection')} <AppIcon name="arrow-right" size={12} />
              </span>
            )
          }
          <span style={{
            color: 'var(--color-text-secondary)', fontSize: 18, display: 'flex',
            transform: isExpanded ? 'rotate(180deg)' : 'rotate(0)',
            transition: 'transform 0.3s',
          }}><AppIcon name="chevron-down" size={16} /></span>
        </div>
      </div>

      {/* Expandable Content */}
      <div className={`subtask-content ${isExpanded ? 'open' : ''}`}>
        <div style={{ padding: '20px 20px 20px', borderTop: '1px solid var(--color-border)' }}>
          {/* Meta row */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
            <span style={{ fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 8, ...ts }}>
              {task.kategori}
            </span>
            <span style={{ fontSize: 12, color: 'var(--color-text-secondary)', padding: '3px 10px', background: 'var(--color-bg)', borderRadius: 8 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><AppIcon name="clock" size={12} /> {task.estimasi}</span>
            </span>
          </div>

          {/* Description */}
          <p style={{ margin: '0 0 16px', fontSize: 14, color: 'var(--color-text-secondary)', lineHeight: 1.7 }}>
            {task.deskripsi}
          </p>

          {/* Action button */}
          {task.status !== 'done' ? (
            <button
              className="btn-primary"
              onClick={() => onMarkDone(task.id)}
              style={{ padding: '9px 20px', fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <AppIcon name="check" size={14} color="#fff" /> {t('chat.markDone')}
            </button>
          ) : (
            <button
              className="btn-ghost"
              onClick={() => onMarkDone(task.id)}
              style={{ padding: '9px 20px', fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <AppIcon name="undo" size={14} /> {t('chat.markUndo')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// --- Right Panel: Tool Recommendations
function RightPanel({ task, isOpen, onSave, isToolSaved, onCopyTips, copiedTipsTaskId }) {
  const { t } = useApp();
  const tools = task?.recommended_tools ?? [];

  return (
    <div
      className={`right-panel ${isOpen ? 'open' : ''}`}
      style={{
        width: isOpen ? 280 : 0,
        minWidth: isOpen ? 280 : 0,
        height: '100%',
        background: 'var(--color-surface)',
        borderLeft: isOpen ? '1px solid var(--color-border)' : 'none',
        overflowY: 'auto',
        overflowX: 'hidden',
        position: 'sticky', top: 0,
        padding: isOpen ? '24px 16px' : 0,
        pointerEvents: isOpen ? 'auto' : 'none',
        transition: 'width 0.3s ease, min-width 0.3s ease',
      }}
    >
      {!isOpen || !task ? null : (
        <>
          {/* Rekomendasi Tools */}
          <div style={{ marginBottom: 20 }}>
            <p style={{ margin: '0 0 12px', fontSize: 12, fontWeight: 700, color: 'var(--color-text-secondary)', letterSpacing: '0.07em' }}>
              {t('chat.toolRecommendations')}
            </p>
            {tools.map(tool => {
              const isSaved = isToolSaved(tool);
              const iconKey = iconByCategory[tool.category] ?? 'sparkles';
              const description = tool.description ?? '';

              return (
              <div
                key={tool.id}
                className="card"
                style={{ padding: '12px 14px', marginBottom: 10, border: '1px solid var(--color-border)' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ display: 'flex' }}><AppIcon name={iconKey} size={18} /></span>
                    <span style={{ fontWeight: 600, fontSize: 14 }}>{tool.name}</span>
                  </div>
                  <a
                    href={resolveToolUrl(tool.url)} target="_blank" rel="noreferrer"
                    aria-label={tool.name}
                    style={{ display: 'flex', color: 'var(--color-primary)', textDecoration: 'none' }}
                  ><AppIcon name="external-link" size={14} /></a>
                </div>
                <p style={{ margin: '6px 0 10px', fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                  {description ? `${description.slice(0, 70)}...` : t('chat.noDesc')}
                </p>
                <button
                  disabled={isSaved}
                  onClick={() => onSave(tool)}
                  style={{
                    width: '100%',
                    padding: '7px',
                    fontSize: 12,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    borderRadius: 10,
                    border: isSaved ? '1px solid #86EFAC' : 'none',
                    background: isSaved ? '#DCFCE7' : 'var(--color-primary-light)',
                    color: isSaved ? '#15803D' : 'var(--color-primary)',
                    fontWeight: 600,
                    cursor: isSaved ? 'not-allowed' : 'pointer',
                  }}
                >
                  <AppIcon name={isSaved ? 'check' : 'book'} size={12} /> {isSaved ? t('chat.savedToLib') : t('chat.saveToLib')}
                </button>
              </div>
              );
            })}
          </div>

          {/* Tips Penggunaan */}
          <div style={{
            background: '#FEF3C7',
            border: '1px solid #F59E0B',
            borderRadius: 12, padding: '14px 14px', marginBottom: 16,
          }}>
            <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 700, color: '#92400E' }}>
              {t('chat.howToUse')}
            </p>
            <p style={{ margin: 0, fontSize: 12, color: '#78350F', lineHeight: 1.6 }}>
              {task.tips}
            </p>
          </div>

          {/* Quick Actions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button
              className="btn-ghost"
              style={{ fontSize: 12, padding: '8px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
              onClick={() => onCopyTips(task)}
            >
              <AppIcon name="copy" size={12} /> {copiedTipsTaskId === task.id ? t('chat.tipsCopied') : t('chat.copyTips')}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// --- Main Chat Workspace View
export default function ChatWorkspaceView() {
  const {
    user,
    activeTask,
    setActiveTask,
    setActiveView,
    setChatHasDraft,
    savedTools,
    refreshSavedTools,
    refreshHistoryTasks,
    showToast,
    soundEnabled,
    t,
  } = useApp();
  const firstName = user?.name ? user.name.split(' ')[0] : 'Renisa';
  const jurusan   = user?.jurusan ?? 'Teknik Informatika';

  const [inputVal, setInputVal]         = useState('');
  const [taskTitle, setTaskTitle]       = useState('');
  const [subTasks, setSubTasks]         = useState([]);
  const [expandedId, setExpandedId]     = useState(null);
  const [isLoading, setIsLoading]       = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [followUpVal, setFollowUpVal]   = useState('');
  const [followUpMessages, setFollowUpMessages] = useState([]);
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [fileError, setFileError]       = useState('');
  const [ragError, setRagError]         = useState('');
  const [lastSubmission, setLastSubmission] = useState(null);
  const [currentTaskId, setCurrentTaskId] = useState(null);
  const [loadingElapsedSeconds, setLoadingElapsedSeconds] = useState(0);
  const [estimatedProcessingSeconds, setEstimatedProcessingSeconds] = useState(15);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [copiedTipsTaskId, setCopiedTipsTaskId] = useState(null);
  const [showCompletionOverlay, setShowCompletionOverlay] = useState(false);
  const [showCompletionConfetti, setShowCompletionConfetti] = useState(false);
  const [justCompletedTaskIds, setJustCompletedTaskIds] = useState([]);
  const [showLeaveDraftModal, setShowLeaveDraftModal] = useState(false);
  const [pendingLeaveTarget, setPendingLeaveTarget] = useState(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const dragCounterRef = useRef(0);
  const copyResetTimerRef = useRef(null);
  const followUpTextareaRef = useRef(null);
  const completionPrimaryActionRef = useRef(null);
  const hasUnsentDraftRef = useRef(false);
  const hasPushedBackGuardRef = useRef(false);
  const allowExternalLeaveRef = useRef(false);
  const completionAnimationTimersRef = useRef([]);
  const hasCelebratedAllDoneRef = useRef(false);
  const pollingCleanupRef = useRef(null);

  const clearPolling = () => {
    if (pollingCleanupRef.current) {
      pollingCleanupRef.current();
      pollingCleanupRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      clearPolling();
    };
  }, []);

  const completionConfettiPieces = useMemo(
    () => Array.from({ length: 28 }, (_, index) => {
      const colors = ['#6C63FF', '#10B981', '#F59E0B', '#14B8A6', '#EC4899', '#3B82F6'];
      return {
        id: `completion-confetti-${index}`,
        left: `${(index * 9) % 100}%`,
        delay: `${(index % 8) * 0.07}s`,
        duration: `${1.1 + (index % 6) * 0.16}s`,
        color: colors[index % colors.length],
      };
    }),
    []
  );

  const resetWorkspace = () => {
    setTaskTitle('');
    setSubTasks([]);
    setExpandedId(null);
    setIsLoading(false);
    setIsLoadingHistory(false);
    setInputVal('');
    setFollowUpVal('');
    setFollowUpMessages([]);
    setAttachedFiles([]);
    setFileError('');
    setRagError('');
    setLastSubmission(null);
    setCurrentTaskId(null);
    setLoadingElapsedSeconds(0);
    setEstimatedProcessingSeconds(15);
    setShowLeaveDraftModal(false);
    setPendingLeaveTarget(null);
    setIsDraggingFile(false);
    setCopiedTipsTaskId(null);
    setShowCompletionOverlay(false);
    setShowCompletionConfetti(false);
    setJustCompletedTaskIds([]);
    clearPolling();
    completionAnimationTimersRef.current.forEach((timerId) => clearTimeout(timerId));
    completionAnimationTimersRef.current = [];
    hasCelebratedAllDoneRef.current = false;
  };

  // Load from history task if set
  useEffect(() => {
    let isMounted = true;

    const loadTask = async () => {
      if (!activeTask) {
        resetWorkspace();
        return;
      }

      const taskId = activeTask.task_id ?? activeTask.id;
      if (!taskId) return;

      setIsLoadingHistory(true);
      setRagError('');
      setFollowUpMessages([]);

      try {
        const task = await taskService.get(taskId);
        if (!isMounted) return;

        const normalizedSubTasks = (task.sub_tasks ?? []).map(normalizeSubTask);

        setTaskTitle(task.title ?? activeTask.title ?? '');
        setSubTasks(normalizedSubTasks);
        setExpandedId(normalizedSubTasks[0]?.id ?? null);
        setCurrentTaskId(task.task_id ?? taskId);
      } catch {
        if (!isMounted) return;
        setRagError(t('chat.loadFail'));
      } finally {
        if (!isMounted) return;
        setIsLoadingHistory(false);
      }
    };

    loadTask();

    return () => {
      isMounted = false;
    };
  }, [activeTask]);

  useEffect(() => {
    const handleNewChat = () => resetWorkspace();

    window.addEventListener('leva:new-chat', handleNewChat);
    return () => window.removeEventListener('leva:new-chat', handleNewChat);
  }, []);

  useEffect(() => () => {
    if (copyResetTimerRef.current) clearTimeout(copyResetTimerRef.current);
    completionAnimationTimersRef.current.forEach((timerId) => clearTimeout(timerId));
  }, []);

  const hasUnsentDraft = inputVal.trim().length > 0 || attachedFiles.length > 0;

  useEffect(() => {
    hasUnsentDraftRef.current = hasUnsentDraft;
    setChatHasDraft(hasUnsentDraft);
  }, [hasUnsentDraft, setChatHasDraft]);

  useEffect(() => () => {
    setChatHasDraft(false);
  }, [setChatHasDraft]);

  useEffect(() => {
    if (!hasUnsentDraft || hasPushedBackGuardRef.current) return;

    window.history.pushState({ levaChatDraftGuard: true }, '', window.location.href);
    hasPushedBackGuardRef.current = true;
  }, [hasUnsentDraft]);

  useEffect(() => {
    if (hasUnsentDraft) return;
    hasPushedBackGuardRef.current = false;
  }, [hasUnsentDraft]);

  useEffect(() => {
    const handleBackNavigation = () => {
      if (!hasUnsentDraftRef.current || allowExternalLeaveRef.current) return;

      window.history.pushState({ levaChatDraftGuard: true }, '', window.location.href);
      setPendingLeaveTarget('__history_back__');
      setShowLeaveDraftModal(true);
    };

    window.addEventListener('popstate', handleBackNavigation);
    return () => window.removeEventListener('popstate', handleBackNavigation);
  }, []);

  useEffect(() => {
    if (!hasUnsentDraft) return;

    const handleBeforeUnload = (event) => {
      if (allowExternalLeaveRef.current) return;
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsentDraft]);

  useEffect(() => {
    const handleConfirmLeaveChat = (event) => {
      const nextView = event.detail?.nextView;
      if (!hasUnsentDraftRef.current || !nextView) return;

      setPendingLeaveTarget(nextView);
      setShowLeaveDraftModal(true);
    };

    window.addEventListener('leva:confirm-leave-chat', handleConfirmLeaveChat);
    return () => window.removeEventListener('leva:confirm-leave-chat', handleConfirmLeaveChat);
  }, []);

  useEffect(() => {
    if (!isLoading) return;

    const timer = setInterval(() => {
      setLoadingElapsedSeconds((previous) => previous + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [isLoading]);

  const applyAttachments = (newFiles) => {
    /* UI/UX Fix: Step 6 — Menambah alternatif input device (file upload + drag-drop) untuk mengurangi beban kognitif memecah tugas. */
    const combinedFiles = [...attachedFiles, ...newFiles];

    if (combinedFiles.length > 10) {
      setFileError('Maksimal 10 file PDF diperbolehkan.');
      return;
    }

    for (const file of newFiles) {
      const validationError = validateAttachment(file);
      if (validationError) {
        let errorMsg = validationError;
        if (validationError === '__validation:noFile') errorMsg = t('chat.fileValidation.noFile');
        else if (validationError.startsWith('__validation:tooLarge:')) {
          const size = validationError.split(':')[2];
          errorMsg = t('chat.fileValidation.tooLarge').replace('{size}', size);
        } else if (validationError === '__validation:unsupported') {
          errorMsg = t('chat.fileValidation.unsupported');
        }
        setFileError(errorMsg);
        return;
      }
    }

    setAttachedFiles(combinedFiles);
    setFileError('');
    setRagError('');
  };

  const removeAttachment = (indexToRemove) => {
    /* UI/UX Fix: Step 7 — Kontrol screen-based berupa chip removable membantu pengguna mengecek dan mengoreksi file sebelum mengirim. */
    setAttachedFiles((prev) => prev.filter((_, idx) => idx !== indexToRemove));
    setFileError('');
  };

  const submitTaskToRag = async (submissionPayload) => {
    const trimmedText = (submissionPayload.text ?? '').trim();
    const attachedFiles = submissionPayload.attachedFiles || [];
    const hasFile = attachedFiles.length > 0;
    if ((!trimmedText && !hasFile) || isLoading) return;

    // Filter PDFs and text files
    const pdfFiles = attachedFiles.filter(f => f.name.toLowerCase().endsWith('.pdf'));
    const textFiles = attachedFiles.filter(f => !f.name.toLowerCase().endsWith('.pdf'));

    if (pdfFiles.length > 1) {
      setFileError('Leva hanya dapat menerima maksimal 1 file PDF saat ini.');
      return;
    }

    setIsLoading(true);
    setRagError('');
    setLoadingElapsedSeconds(0);
    setTaskTitle('');
    setSubTasks([]);
    setExpandedId(null);
    setJustCompletedTaskIds([]);

    try {
      // Read text files in the frontend
      let combinedText = trimmedText;
      if (textFiles.length > 0) {
        const textContents = await Promise.all(textFiles.map(file => readFileAsText(file)));
        textContents.forEach((content, idx) => {
          combinedText += `\n\n[Konten dari file: ${textFiles[idx].name}]\n${content}`;
        });
      }

      const fileToSend = pdfFiles[0] || null;
      const estimatedMs = getEstimatedProcessingMs({ text: combinedText, attachedFiles: pdfFiles });
      setEstimatedProcessingSeconds(Math.max(15, Math.round(estimatedMs / 1000)));

      const result = await taskService.submit(combinedText, fileToSend);
      const taskId = result.task_id ?? result.id;
      setCurrentTaskId(taskId ?? null);

      taskService.pollStatus(
        taskId,
        async () => {
          const task = await taskService.get(taskId);
          const normalizedSubTasks = (task.sub_tasks ?? []).map(normalizeSubTask);
          setTaskTitle(task.title ?? getGeneratedTaskTitle(trimmedText, jurusan, pdfFiles));
          setSubTasks(normalizedSubTasks);
          setExpandedId(normalizedSubTasks[0]?.id ?? null);
          setActiveTask({ task_id: task.task_id ?? taskId, title: task.title });
          setInputVal('');
          setAttachedFiles([]);
          setFileError('');
          setRagError('');
          setIsLoading(false);

          if (refreshHistoryTasks) {
            refreshHistoryTasks().catch(() => {});
          }

          if (soundEnabled) playSoundEffect('success');
        },
        (error) => {
          setRagError(error?.message || t(RAG_ERROR_MESSAGE_KEY));
          setIsLoading(false);
        }
      );
    } catch (error) {
      setRagError(error.message === 'timeout' ? error.message : t('chat.sendFail'));
      setIsLoading(false);
    }
  };

  const handlePickAttachment = () => {
    if (isLoading) return;
    fileInputRef.current?.click();
  };

  const handleAttachmentInput = (event) => {
    const files = Array.from(event.target.files || []);
    if (files.length > 0) applyAttachments(files);
    event.target.value = '';
  };

  const handleDragEnter = (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (isLoading) return;

    dragCounterRef.current += 1;
    setIsDraggingFile(true);
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleDragLeave = (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (isLoading) return;

    dragCounterRef.current = Math.max(0, dragCounterRef.current - 1);
    if (dragCounterRef.current === 0) setIsDraggingFile(false);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (isLoading) return;

    dragCounterRef.current = 0;
    setIsDraggingFile(false);

    const files = Array.from(event.dataTransfer.files || []);
    if (files.length > 0) applyAttachments(files);
  };

  const handleSubmit = () => {
    if (isLoading) return;
    if (!inputVal.trim() && attachedFiles.length === 0) return;
    if (fileError) return;

    const submissionPayload = {
      text: inputVal,
      attachedFiles,
    };

    setLastSubmission(submissionPayload);
    submitTaskToRag(submissionPayload);
  };

  const handleRetryLastSubmission = () => {
    if (!lastSubmission || isLoading) return;
    submitTaskToRag(lastSubmission);
  };

  const handleStayInChat = () => {
    setShowLeaveDraftModal(false);
    setPendingLeaveTarget(null);
  };

  const handleLeaveFromChat = () => {
    const target = pendingLeaveTarget;

    setShowLeaveDraftModal(false);
    setPendingLeaveTarget(null);

    if (!target) return;

    if (target === '__history_back__') {
      allowExternalLeaveRef.current = true;
      setInputVal('');
      setAttachedFiles([]);
      setFileError('');
      setRagError('');

      setTimeout(() => {
        window.history.back();
      }, 0);

      return;
    }

    setActiveView(target, { force: true });
  };

  const toggleExpand = (id) => {
    setExpandedId(prev => prev === id ? null : id);
  };

  const toggleDone = async (id) => {
    const activeTaskId = currentTaskId ?? activeTask?.task_id ?? activeTask?.id;
    const target = subTasks.find((taskItem) => taskItem.id === id);
    if (!activeTaskId || !target) return;

    const nextStatus = target.status === 'done' ? 'next' : 'done';

    try {
      const updated = await taskService.updateSubTask(activeTaskId, id, nextStatus);

      setSubTasks(prev =>
        prev.map((taskItem) => (
          taskItem.id === id
            ? { ...taskItem, status: updated.status ?? nextStatus }
            : taskItem
        ))
      );

      const isMarkingDone = nextStatus === 'done';
      if (isMarkingDone && soundEnabled) {
        playSoundEffect('chime');
      }

      if (isMarkingDone) {
        setJustCompletedTaskIds((prev) => (prev.includes(id) ? prev : [...prev, id]));

        const timerId = setTimeout(() => {
          setJustCompletedTaskIds((prev) => prev.filter((taskId) => taskId !== id));
        }, 520);
        completionAnimationTimersRef.current.push(timerId);
      }
    } catch {
      showToast(t('chat.subtaskFail'), 'error');
    }
  };

  const handleFollowUp = async () => {
    const message = followUpVal.trim();
    if (!message) return;

    const activeTaskId = currentTaskId ?? activeTask?.task_id ?? activeTask?.id;
    const userMessage = {
      id: `${Date.now()}-user`,
      role: 'user',
      text: message,
    };

    setFollowUpMessages((prev) => [...prev, userMessage]);
    setFollowUpVal('');

    try {
      const response = await chatService.send(message, activeTaskId ?? null);
      const assistantMessage = {
        id: `${Date.now()}-assistant`,
        role: 'assistant',
        text: response.reply ?? t('chat.chatNoReply'),
        tools: Array.isArray(response.recommended_tools) ? response.recommended_tools : [],
      };

      setFollowUpMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      const messageText = error.response?.data?.message ?? t('chat.chatFail');
      showToast(messageText, 'error');
    }
  };

  const autoResizeFollowUpTextarea = (textareaEl) => {
    if (!textareaEl) return;
    textareaEl.style.height = '44px';
    const nextHeight = Math.min(textareaEl.scrollHeight, 150);
    textareaEl.style.height = `${nextHeight}px`;
    textareaEl.style.overflowY = textareaEl.scrollHeight > 150 ? 'auto' : 'hidden';
  };

  useEffect(() => {
    autoResizeFollowUpTextarea(followUpTextareaRef.current);
  }, [followUpVal]);

  const expandedTask  = subTasks.find(t => t.id === expandedId) ?? null;
  const hasResults    = subTasks.length > 0;
  const canSendMessage = inputVal.trim().length > 0 || attachedFiles.length > 0;
  const processingMessage = t(getProcessingMessageKey(loadingElapsedSeconds));
  const rightPanelOpen = !!expandedTask;
  const savedToolIds = new Set(
    savedTools
      .map((tool) => tool?.tool?.id ?? tool?.tool_id ?? tool?.id)
      .filter(Boolean)
  );
  const savedToolNames = new Set(
    savedTools
      .map((tool) => (tool?.tool?.name ?? tool?.name ?? '').toLowerCase())
      .filter(Boolean)
  );

  const isToolSaved = (tool) => {
    if (!tool) return false;
    if (tool.id && savedToolIds.has(tool.id)) return true;
    if (tool.name) return savedToolNames.has(tool.name.toLowerCase());
    return false;
  };

  const handleSaveTool = async (tool) => {
    if (!tool?.id) return;
    if (isToolSaved(tool)) {
      showToast(t('chat.alreadySaved'), 'info');
      return;
    }

    try {
      await bookmarkService.create(tool.id);
      showToast(t('chat.aiTagging'), 'success');
      if (refreshSavedTools) {
        refreshSavedTools().catch(() => {});
      }
    } catch (error) {
      const messageText = error.response?.data?.message ?? t('chat.saveFail');
      showToast(messageText, 'error');
    }
  };

  const handleCopyTips = async (task) => {
    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error('Clipboard API tidak tersedia');
      }

      await navigator.clipboard.writeText(task.tips);
      setCopiedTipsTaskId(task.id);
      showToast(t('chat.tipsCopiedToast'), 'success');

      if (copyResetTimerRef.current) clearTimeout(copyResetTimerRef.current);
      copyResetTimerRef.current = setTimeout(() => setCopiedTipsTaskId(null), 2000);
    } catch {
      showToast(t('chat.tipsCopyFail'), 'error');
    }
  };

  const completedCount = subTasks.filter(t => t.status === 'done').length;
  const progressPct    = subTasks.length ? Math.round((completedCount / subTasks.length) * 100) : 0;
  const allTasksDone = subTasks.length > 0 && completedCount === subTasks.length;
  const quickPromptChips = useMemo(() => {
    const normalizedJurusan = (jurusan ?? '').trim().toLowerCase();

    /* UI/UX Fix: Step 6 — Keyboard shortcuts minimalisir pergerakan tangan (47,5% user larut malam). Step 7 — Disabled state = "work the way it looks". Quick prompts kontekstual mengurangi 35,6% keluhan AI terlalu generik. */
    if (normalizedJurusan.includes('teknik informatika')) return QUICK_PROMPTS_BY_JURUSAN.teknikInformatika;
    if (normalizedJurusan.includes('ilmu komunikasi')) return QUICK_PROMPTS_BY_JURUSAN.ilmuKomunikasi;

    return QUICK_PROMPTS_BY_JURUSAN.default;
  }, [jurusan]);

  useEffect(() => {
    if (!allTasksDone) {
      hasCelebratedAllDoneRef.current = false;
      setShowCompletionOverlay(false);
      setShowCompletionConfetti(false);
      return;
    }

    if (hasCelebratedAllDoneRef.current) return;
    hasCelebratedAllDoneRef.current = true;

    if (soundEnabled) playSoundEffect('celebration');
    setShowCompletionOverlay(true);
    setShowCompletionConfetti(true);

    const confettiTimer = setTimeout(() => setShowCompletionConfetti(false), 3000);

    return () => {
      clearTimeout(confettiTimer);
    };
  }, [allTasksDone, soundEnabled]);

  useEffect(() => {
    if (!showCompletionOverlay) return;

    completionPrimaryActionRef.current?.focus();
  }, [showCompletionOverlay]);

  const handleViewSummary = () => {
    setShowCompletionOverlay(false);
  };

  const handleStartNewTask = () => {
    window.dispatchEvent(new CustomEvent('leva:new-chat'));
    setActiveTask(null);
    setShowCompletionOverlay(false);
  };

  return (
    <div className="view-enter main-content" style={{ display: 'flex', height: '100%', overflow: 'hidden', position: 'relative' }}>

      {/* -- CENTER PANEL */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 1, padding: hasResults ? '28px 32px' : '0', display: 'flex', flexDirection: 'column' }}>

          {/* -- EMPTY STATE */}
          {!hasResults && !isLoadingHistory && (
            <div style={{
              flex: 1, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              padding: '40px 20px', minHeight: 'calc(100vh - 100px)',
            }}>
              <div style={{ display: 'flex', marginBottom: 16 }}><AppIcon name="sparkles" size={40} /></div>
              <h2 style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 700, textAlign: 'center' }}>
                {t('chat.emptyTitle').replace('{name}', firstName)}
              </h2>
              <p style={{ margin: '0 0 32px', fontSize: 14, color: 'var(--color-text-secondary)', textAlign: 'center', maxWidth: 440, lineHeight: 1.65 }}>
                {t('chat.emptyDesc')}
              </p>

              {/* Main Input */}
              <div style={{ width: '100%', maxWidth: 560, position: 'relative' }}>
                {/* UI/UX Fix: Step 6 — Filter file picker disiapkan untuk skenario dokumen tugas kampus yang paling umum dipakai user. */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  multiple
                  onChange={handleAttachmentInput}
                  style={{ display: 'none' }}
                />

                {attachedFiles.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
                    {attachedFiles.map((file, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 8,
                          background: 'var(--color-primary-light)',
                          color: 'var(--color-primary)', borderRadius: 999, padding: '7px 12px',
                          fontSize: 12, fontWeight: 600,
                        }}
                      >
                        <AppIcon name="paperclip" size={12} />
                        <span>{file.name}</span>
                        <button
                          onClick={() => removeAttachment(idx)}
                          aria-label="Hapus file"
                          style={{
                            border: 'none', background: 'transparent', color: 'var(--color-primary)',
                            cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center',
                          }}
                        >
                          <AppIcon name="x" size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <textarea
                  ref={inputRef}
                  value={inputVal}
                  disabled={isLoading}
                  onChange={e => {
                    setInputVal(e.target.value);
                    if (ragError) setRagError('');
                  }}
                  onKeyDown={e => {
                    /* UI/UX Fix: Step 7 — Menyediakan kontrol keyboard (Enter/Ctrl+Enter) untuk efisiensi pada user laptop/desktop. */
                    const shouldSend = e.key === 'Enter' && (e.ctrlKey || !e.shiftKey);
                    if (shouldSend && !isLoading) {
                      e.preventDefault();
                      handleSubmit();
                    }
                  }}
                  placeholder={t('chat.inputPlaceholder')}
                  rows={3}
                  onDragEnter={handleDragEnter}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  style={{
                    width: '100%', padding: '16px 56px 40px 50px',
                    border: '2px solid var(--color-border)',
                    borderRadius: 16, fontSize: 14, resize: 'none',
                    outline: 'none', color: 'var(--color-text-primary)',
                    lineHeight: 1.6, boxSizing: 'border-box',
                    transition: 'border 0.2s',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.07)',
                    background: isLoading ? 'var(--color-bg)' : 'var(--color-surface)',
                    cursor: isLoading ? 'not-allowed' : 'text',
                  }}
                  onFocus={e => e.target.style.borderColor = 'var(--color-primary)'}
                  onBlur={e  => e.target.style.borderColor = 'var(--color-border)'}
                />

                <button
                  onClick={handlePickAttachment}
                  disabled={isLoading}
                  aria-label="Unggah file"
                  className="tooltip-host"
                  data-tooltip={t('chat.uploadTooltip')}
                  style={{
                    position: 'absolute', left: 12, bottom: 12,
                    background: 'transparent',
                    border: 'none', borderRadius: 10, padding: 6,
                    cursor: isLoading ? 'default' : 'pointer',
                    color: 'var(--color-primary)', fontSize: 16,
                    display: 'flex', opacity: isLoading ? 0.45 : 1,
                  }}
                >
                  <AppIcon name="paperclip" size={16} />
                </button>

                <button
                  onClick={handleSubmit}
                  disabled={isLoading || !canSendMessage || !!fileError}
                  aria-label="Kirim pesan"
                  style={{
                    position: 'absolute', right: 12, bottom: 12,
                    background: canSendMessage ? 'var(--color-primary)' : 'var(--color-border)',
                    border: 'none', borderRadius: 10, padding: '8px 12px',
                    cursor: (isLoading || !canSendMessage || !!fileError) ? 'default' : 'pointer',
                    color: '#fff', fontSize: 16, transition: 'background 0.2s', display: 'flex', opacity: (isLoading || !canSendMessage || !!fileError) ? 0.55 : 1,
                  }}
                >
                  {isLoading
                    ? <AppIcon name="loader" size={16} color="#fff" className="send-spinner" />
                    : <AppIcon name="send" size={16} color="#fff" />}
                </button>

                {isDraggingFile && !isLoading && (
                  <div
                    className="file-drop-overlay"
                    onDragEnter={handleDragEnter}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                  >
                    {t('chat.dropFile')}
                  </div>
                )}
              </div>

              {fileError && (
                <p style={{ marginTop: 10, fontSize: 12, color: '#DC2626', width: '100%', maxWidth: 560 }}>
                  {fileError}
                </p>
              )}

              {isLoading && (
                <div style={{ marginTop: 10, width: '100%', maxWidth: 560, background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 12, padding: '12px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <span style={{ display: 'inline-flex', marginTop: 2 }}>
                      <AppIcon name="loader" size={16} className="send-spinner" />
                    </span>
                    <div>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)' }}>
                        {processingMessage}
                        <span className="processing-indicator" style={{ marginLeft: 3 }}>
                          <span className="processing-dot">.</span>
                          <span className="processing-dot">.</span>
                          <span className="processing-dot">.</span>
                        </span>
                      </p>
                      <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--color-text-secondary)' }}>
                        ({t('chat.estimatedTime').replace('{seconds}', estimatedProcessingSeconds)})
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {ragError && !isLoading && (
                <div style={{ marginTop: 10, width: '100%', maxWidth: 560, background: 'var(--color-danger-soft)', border: '1px solid var(--color-danger)', borderRadius: 12, padding: '12px 14px' }}>
                  <p style={{ margin: 0, fontSize: 12, color: 'var(--color-danger)', lineHeight: 1.6, display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                    <span style={{ display: 'inline-flex', marginTop: 1 }}><AppIcon name="warning" size={13} color="var(--color-danger)" /></span>
                    <span>{ragError}</span>
                  </p>
                  <button
                    type="button"
                    onClick={handleRetryLastSubmission}
                    disabled={!lastSubmission || isLoading}
                    style={{ marginTop: 10, border: '1px solid var(--color-danger)', background: 'var(--color-surface)', color: 'var(--color-danger)', borderRadius: 8, fontSize: 12, fontWeight: 700, padding: '6px 10px', cursor: !lastSubmission || isLoading ? 'not-allowed' : 'pointer', opacity: !lastSubmission || isLoading ? 0.6 : 1 }}
                  >
                    {t('chat.retry')}
                  </button>
                </div>
              )}

              {!isLoading && <p style={{ marginTop: 12, fontSize: 12, color: 'var(--color-text-secondary)' }}>{t('chat.sendHint')}</p>}

              {/* Quick suggestions */}
              <p style={{ margin: '20px 0 8px', fontSize: 13, color: 'var(--color-text-secondary)' }}>
                {t('chat.quickPromptsHint')}
              </p>
              <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
                {quickPromptChips.map(s => (
                  <button
                    key={s}
                    onClick={() => {
                      if (isLoading) return;
                      setInputVal(s);
                      inputRef.current?.focus();
                    }}
                    style={{
                      padding: '7px 14px', borderRadius: 999, fontSize: 12, fontWeight: 500,
                      background: 'var(--color-surface)', border: '1px solid var(--color-border)',
                      cursor: 'pointer', color: 'var(--color-text-secondary)',
                      transition: 'all 0.2s',
                      opacity: isLoading ? 0.55 : 1,
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-primary)'; e.currentTarget.style.color = 'var(--color-primary)'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.color = 'var(--color-text-secondary)'; }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* -- RESULTS */}
          {isLoadingHistory && !hasResults && (
            <div style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '40px 20px',
              minHeight: 'calc(100vh - 100px)',
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                <AppIcon name="loader" size={28} className="send-spinner" />
                <p style={{ margin: 0, fontSize: 13, color: 'var(--color-text-secondary)' }}>{t('chat.loadingTask')}</p>
              </div>
            </div>
          )}

          {hasResults && !isLoading && (
            <>
              {/* Task Title Card */}
              <div style={{
                background: 'linear-gradient(135deg, var(--color-primary) 0%, #8B5CF6 100%)',
                borderRadius: 16, padding: '20px 24px', marginBottom: 20, color: '#fff',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <div>
                  <p style={{ margin: '0 0 4px', fontSize: 12, opacity: 0.75, fontWeight: 600, letterSpacing: '0.06em' }}>{t('chat.activeTask')}</p>
                  <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>{taskTitle}</h2>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ margin: '0 0 6px', fontSize: 12, opacity: 0.75 }}>{completedCount}/{subTasks.length} {t('chat.xOfYDone')}</p>
                  <div style={{ width: 100, height: 6, background: 'rgba(255,255,255,0.25)', borderRadius: 3 }}>
                    <div style={{ width: `${progressPct}%`, height: '100%', background: '#fff', borderRadius: 3, transition: 'width 0.5s ease-in-out' }} />
                  </div>
                </div>
              </div>

              {/* Subtask List */}
              {subTasks.map((task, i) => (
                <SubTaskCard
                  key={task.id}
                  task={task}
                  index={i}
                  isExpanded={expandedId === task.id}
                  onToggle={() => toggleExpand(task.id)}
                  onMarkDone={toggleDone}
                  isDoneJustNow={justCompletedTaskIds.includes(task.id)}
                />
              ))}

              {completedCount === subTasks.length && subTasks.length > 0 && (
                <div style={{
                  background: 'linear-gradient(135deg, var(--color-secondary), #059669)',
                  borderRadius: 16, padding: '24px', textAlign: 'center', marginTop: 16, color: '#fff',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}><AppIcon name="check" size={40} color="#fff" /></div>
                  <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 700 }}>{t('chat.allDoneTitle')}</h3>
                  <p style={{ margin: 0, fontSize: 14, opacity: 0.9 }}>
                    {t('chat.allDoneDesc').replace('{name}', firstName).replace('{title}', taskTitle)}
                  </p>
                </div>
              )}

              {/* Follow-up Input */}
              <div style={{ marginTop: 20, padding: '16px 20px', background: 'var(--color-surface)', borderRadius: 14, border: '1px solid var(--color-border)' }}>
                {followUpMessages.map((msg) => (
                  <div key={msg.id} style={{ display: 'flex', gap: 10, marginBottom: 12, justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                    {msg.role === 'assistant' && (
                      <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12, flexShrink: 0 }}><AppIcon name="sparkles" size={12} color="#fff" /></div>
                    )}
                    <div style={{
                      background: msg.role === 'assistant' ? 'var(--color-primary-light)' : 'var(--color-bg)',
                      borderRadius: 12,
                      padding: '12px 14px',
                      fontSize: 13,
                      lineHeight: 1.65,
                      color: 'var(--color-text-primary)',
                      maxWidth: '75%',
                    }}>
                      {msg.text}
                      {msg.role === 'assistant' && msg.tools?.length > 0 && (
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
                          {msg.tools.map((tool) => (
                            <button
                              key={tool.id}
                              type="button"
                              disabled={isToolSaved(tool)}
                              onClick={() => handleSaveTool(tool)}
                              style={{
                                border: '1px solid var(--color-border)',
                                background: isToolSaved(tool) ? 'var(--color-bg)' : 'var(--color-surface)',
                                color: isToolSaved(tool) ? 'var(--color-text-secondary)' : 'var(--color-text-primary)',
                                borderRadius: 999,
                                padding: '4px 10px',
                                fontSize: 11,
                                fontWeight: 600,
                                cursor: isToolSaved(tool) ? 'not-allowed' : 'pointer',
                              }}
                            >
                              {isToolSaved(tool) ? t('chat.saved') : t('chat.save')} · {tool.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
                  <textarea
                    ref={followUpTextareaRef}
                    value={followUpVal}
                    onChange={e => setFollowUpVal(e.target.value)}
                    onInput={e => autoResizeFollowUpTextarea(e.currentTarget)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleFollowUp();
                      }
                    }}
                    placeholder={t('chat.followUpPlaceholder')}
                    rows={1}
                    style={{
                      flex: 1, padding: '10px 14px',
                      border: '1px solid var(--color-border)',
                      borderRadius: 10, fontSize: 13, outline: 'none',
                      minHeight: 44,
                      maxHeight: 150,
                      resize: 'none',
                      lineHeight: 1.55,
                      overflowY: 'hidden',
                    }}
                    onFocus={e => e.target.style.borderColor = 'var(--color-primary)'}
                    onBlur={e  => e.target.style.borderColor = 'var(--color-border)'}
                  />
                  <button className="btn-primary tooltip-host" data-tooltip={`${t('chat.send')} (Enter)`} onClick={handleFollowUp} style={{ padding: '10px 18px', fontSize: 13 }}>
                    {t('chat.send')}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* -- RIGHT PANEL */}
      <RightPanel
        task={expandedTask}
        isOpen={rightPanelOpen}
        onSave={handleSaveTool}
        isToolSaved={isToolSaved}
        onCopyTips={handleCopyTips}
        copiedTipsTaskId={copiedTipsTaskId}
      />

      {showCompletionOverlay && (
        <div className="completion-overlay">
          {showCompletionConfetti && (
            <div className="completion-confetti-layer" aria-hidden="true">
              {completionConfettiPieces.map((piece) => (
                <span
                  key={piece.id}
                  className="completion-confetti-piece"
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

          <div className="completion-card" role="dialog" aria-modal="true" aria-label="Semua subtask selesai" onClick={(event) => event.stopPropagation()}>
            <div className="completion-icon-wrap">
              <AppIcon name="check" size={44} color="#fff" />
            </div>
            <h3 className="completion-title">{t('chat.completionTitle')}</h3>
            <p className="completion-subtitle">{t('chat.completionDesc').replace('{name}', firstName).replace('{title}', taskTitle)}</p>
            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <button ref={completionPrimaryActionRef} className="btn-primary" onClick={handleViewSummary} style={{ flex: 1 }}>
                {t('chat.viewSummary')}
              </button>
              <button className="btn-ghost" onClick={handleStartNewTask} style={{ flex: 1 }}>
                {t('chat.startNewTask')}
              </button>
            </div>
          </div>
        </div>
      )}

      {showLeaveDraftModal && (
        <Modal title={t('chat.leaveTitle')} onClose={handleStayInChat}>
          <p style={{ margin: '0 0 18px', fontSize: 14, color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
            {t('chat.leaveDesc')}
          </p>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              type="button"
              onClick={handleStayInChat}
              style={{
                flex: 1,
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
              {t('chat.stayHere')}
            </button>
            <button
              type="button"
              onClick={handleLeaveFromChat}
              style={{
                flex: 1,
                border: '1px solid var(--color-border)',
                borderRadius: 10,
                background: 'var(--color-surface)',
                color: 'var(--color-text-secondary)',
                fontSize: 14,
                fontWeight: 600,
                padding: '10px 14px',
                cursor: 'pointer',
              }}
            >
              {t('chat.leave')}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
