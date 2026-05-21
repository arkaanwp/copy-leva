import { useEffect, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import AppIcon from '../components/AppIcon';
import { bookmarkService } from '../services/bookmarkService';
import { taskService } from '../services/taskService';
import { toolService } from '../services/toolService';

// --- Category tag color helper
const tagClass = (cat) => {
  const map = {
    Research: 'tag tag-research', Writing: 'tag tag-writing',
    Coding: 'tag tag-coding', Data: 'tag tag-data',
    Academic: 'tag tag-academic', Productivity: 'tag tag-productivity',
  };
  return map[cat] || 'tag tag-research';
};

const pricingMeta = (pricingType, t) => {
  const normalizedType = pricingType === 'open_source' ? 'opensource' : pricingType;
  const map = {
    free: { label: t('tool.free'), bg: '#DCFCE7', color: '#15803D' },
    freemium: { label: t('tool.freemium'), bg: '#FEF3C7', color: '#B45309' },
    paid: { label: t('tool.paid'), bg: '#FEE2E2', color: '#B91C1C' },
    opensource: { label: t('tool.openSource'), bg: '#DBEAFE', color: '#1D4ED8' },
  };

  return map[normalizedType] || map.free;
};

const iconByCategory = {
  Research: 'search',
  Writing: 'pencil',
  Coding: 'task',
  Data: 'dashboard',
  Academic: 'book',
  Productivity: 'folder',
};

const resolveToolUrl = (url) => {
  if (!url) return '';
  return url.startsWith('http://') || url.startsWith('https://') ? url : `https://${url}`;
};

const displayToolUrl = (url) => (url ? url.replace(/^https?:\/\//, '') : '');

const normalizeTool = (tool) => {
  const pricingTypeRaw = tool.pricing_type ?? tool.pricingType ?? 'free';
  const pricingType = typeof pricingTypeRaw === 'string'
    ? pricingTypeRaw.toLowerCase()
    : 'free';
  return {
    id: tool.id,
    name: tool.name,
    url: tool.url,
    category: tool.category,
    pricingType,
    rating: Number(tool.rating ?? 0),
    desc: tool.description ?? tool.desc ?? '',
    detailDesc: tool.description ?? tool.detailDesc ?? tool.desc ?? '',
    iconKey: iconByCategory[tool.category] ?? 'sparkles',
  };
};

const getCategoryLabel = (cat, t) => {
  if (!cat) return '';
  if (cat === 'Semua' || cat === 'All') return t('category.all');
  return t(`category.${cat.toLowerCase()}`) || cat;
};

function PricingBadge({ pricingType }) {
  const { t } = useApp();
  const price = pricingMeta(pricingType, t);
  const tooltipByType = {
    free: t('tool.freeTooltip'),
    freemium: t('tool.freemiumTooltip'),
    paid: t('tool.paidTooltip'),
    opensource: t('tool.openSourceTooltip'),
  };
  const tooltipText = tooltipByType[pricingType] || tooltipByType.free;

  return (
    <span className={tooltipText ? 'tooltip-host' : undefined} data-tooltip={tooltipText || undefined} style={{ display: 'inline-flex' }}>
      <span
        style={{
          fontSize: 11,
          fontWeight: 700,
          padding: '3px 9px',
          borderRadius: 999,
          background: price.bg,
          color: price.color,
        }}
      >
        {price.label}
      </span>
    </span>
  );
}

function ToolTooltip({ tool, show }) {
  const { t } = useApp();
  const price = pricingMeta(tool.pricingType, t);
  const detailText = tool.detailDesc || tool.desc;

  return (
    <div className={`tool-tooltip ${show ? 'visible' : ''}`}>
      {/* UI/UX Fix: Step 7 — Tooltip/balloon tip sebagai presentation control untuk info harga. Survei: 33,9% user terbentur paywall; Persona Bima butuh filter harga instan. */}
      <p className="tool-tooltip-title">{tool.name}</p>
      <p className="tool-tooltip-line">{t('tool.status')}: <strong style={{ color: price.color }}>{price.label}</strong></p>
      <p className="tool-tooltip-line">{t('tool.website')}: {displayToolUrl(tool.url)}</p>
      <p className="tool-tooltip-desc">{detailText}</p>
      <span className="tool-tooltip-arrow" />
    </div>
  );
}

// --- Star rating display
function StarRating({ rating }) {
  return (
    <span style={{ fontSize: 12, color: '#F59E0B', fontWeight: 600 }}>
      {'★'.repeat(Math.floor(rating))}{'☆'.repeat(5 - Math.floor(rating))}
      <span style={{ color: 'var(--color-text-secondary)', fontWeight: 400, marginLeft: 4 }}>{rating}</span>
    </span>
  );
}

// --- Featured Tool Card (large, horizontal scroll)
function FeaturedToolCard({ tool, onSave, isSaved, isSaving }) {
  const { t } = useApp();
  const [showTooltip, setShowTooltip] = useState(false);
  const tooltipTimerRef = useRef(null);
  const handleSave = () => {
    if (isSaved || isSaving) return;
    onSave(tool);
  };

  useEffect(() => () => {
    if (tooltipTimerRef.current) clearTimeout(tooltipTimerRef.current);
  }, []);

  useEffect(() => {
    const handleEscape = () => setShowTooltip(false);
    window.addEventListener('leva:escape', handleEscape);

    return () => window.removeEventListener('leva:escape', handleEscape);
  }, []);

  const handleMouseEnter = (event) => {
    event.currentTarget.style.transform = 'translateY(-4px)';
    event.currentTarget.style.boxShadow = '0 8px 24px rgba(108,99,255,0.15)';

    if (tooltipTimerRef.current) clearTimeout(tooltipTimerRef.current);
    tooltipTimerRef.current = setTimeout(() => setShowTooltip(true), 300);
  };

  const handleMouseLeave = (event) => {
    event.currentTarget.style.transform = 'translateY(0)';
    event.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.06)';

    if (tooltipTimerRef.current) clearTimeout(tooltipTimerRef.current);
    setShowTooltip(false);
  };

  return (
    <div
      className="card"
      style={{
        width: '100%', minWidth: 0, padding: 22,
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        cursor: 'default',
        position: 'relative',
        overflow: 'visible',
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <ToolTooltip tool={tool} show={showTooltip} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
        <span className={tagClass(tool.category)}>{getCategoryLabel(tool.category, t)}</span>
        <PricingBadge pricingType={tool.pricingType} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6, gap: 10 }}>
        <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>{tool.name}</h3>
        <span style={{ display: 'flex', flexShrink: 0 }}><AppIcon name={tool.iconKey} size={24} /></span>
      </div>

      <p style={{ margin: '0 0 10px', fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.55 }}>
        {tool.desc}
      </p>
      <StarRating rating={tool.rating} />

      <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
        <button
          disabled={isSaved || isSaving}
          onClick={handleSave}
          style={{
            flex: 1,
            padding: '8px',
            fontSize: 12,
            borderRadius: 10,
            border: isSaved ? '1px solid #CBD5E1' : 'none',
            background: isSaved ? '#E2E8F0' : 'var(--color-primary-light)',
            color: isSaved ? '#64748B' : 'var(--color-primary)',
            fontWeight: 600,
            cursor: isSaved || isSaving ? 'not-allowed' : 'pointer',
          }}
        >
          {/* UI/UX Fix: Step 6 — Output device harus memberi respond jelas ke aksi user. Step 7 — Aksi destruktif (hapus) harus ada safeguard/konfirmasi. Survei: 52,5% user sulit temukan referensi. */}
          {isSaved ? t('tool.saved') : isSaving ? t('tool.saving') : t('tool.save')}
        </button>
        <a
          href={resolveToolUrl(tool.url)} target="_blank" rel="noreferrer"
          style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'var(--color-primary)', color: '#fff',
            borderRadius: 10, fontSize: 12, fontWeight: 600, textDecoration: 'none',
            padding: '8px', transition: 'background 0.2s',
          }}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            {t('tool.open')} <AppIcon name="external-link" size={14} color="#fff" />
          </span>
        </a>
      </div>
    </div>
  );
}

// --- Small Tool Card (grid)
function SmallToolCard({ tool, onSave, isSaved, isSaving }) {
  const { t } = useApp();
  const [showTooltip, setShowTooltip] = useState(false);
  const tooltipTimerRef = useRef(null);
  const handleSave = () => {
    if (isSaved || isSaving) return;
    onSave(tool);
  };

  useEffect(() => () => {
    if (tooltipTimerRef.current) clearTimeout(tooltipTimerRef.current);
  }, []);

  useEffect(() => {
    const handleEscape = () => setShowTooltip(false);
    window.addEventListener('leva:escape', handleEscape);

    return () => window.removeEventListener('leva:escape', handleEscape);
  }, []);

  const handleMouseEnter = (event) => {
    event.currentTarget.style.transform = 'translateY(-2px)';
    event.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.1)';

    if (tooltipTimerRef.current) clearTimeout(tooltipTimerRef.current);
    tooltipTimerRef.current = setTimeout(() => setShowTooltip(true), 300);
  };

  const handleMouseLeave = (event) => {
    event.currentTarget.style.transform = 'translateY(0)';
    event.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.06)';

    if (tooltipTimerRef.current) clearTimeout(tooltipTimerRef.current);
    setShowTooltip(false);
  };

  return (
    <div
      className="card"
      style={{
        padding: 16, transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        position: 'relative',
        overflow: 'visible',
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <ToolTooltip tool={tool} show={showTooltip} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span className={tagClass(tool.category)}>{getCategoryLabel(tool.category, t)}</span>
        <PricingBadge pricingType={tool.pricingType} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ display: 'flex' }}><AppIcon name={tool.iconKey} size={20} /></span>
          <span style={{ fontWeight: 700, fontSize: 14 }}>{tool.name}</span>
        </div>
        <button
          disabled={isSaved || isSaving}
          onClick={handleSave}
          title={t('tool.save') || "Simpan ke Library"}
          style={{
            background: isSaved ? '#E2E8F0' : 'var(--color-primary-light)',
            color: isSaved ? '#64748B' : 'var(--color-primary)',
            border: isSaved ? '1px solid #CBD5E1' : '1px solid #D7D2FF',
            borderRadius: 8,
            padding: '5px 9px',
            cursor: isSaved || isSaving ? 'not-allowed' : 'pointer',
            fontSize: 11,
            fontWeight: 700,
          }}
        >
          {isSaved ? t('tool.saved') : isSaving ? t('tool.saving') : t('tool.save')}
        </button>
      </div>
      <p style={{ margin: '0 0 10px', fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
        {tool.desc}
      </p>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-secondary)' }}>{displayToolUrl(tool.url)}</span>
        <StarRating rating={tool.rating} />
      </div>
    </div>
  );
}

function DailyProgressWidget({
  greeting,
  greetIcon,
  firstName,
  dateLabel,
  stats,
  isLoading,
  hasLatestTask,
  onContinue,
}) {
  const { t } = useApp();
  const progressPct = isLoading ? 0 : stats.progressPct;
  const statValue = (value) => (isLoading ? '--' : value);

  const statItems = [
    { label: t('dashboard.todayTasks'), value: statValue(stats.tasksToday) },
    { label: t('dashboard.completedSubtasks'), value: statValue(stats.doneToday) },
    { label: t('dashboard.pendingSubtasks'), value: statValue(stats.pendingToday) },
  ];

  return (
    <section className="card" style={{ padding: 24, marginBottom: 28 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
            {greeting}, {firstName}! <AppIcon name={greetIcon} size={20} />
          </h1>
          <p style={{ margin: '6px 0 0', fontSize: 14, color: 'var(--color-text-secondary)' }}>
            {t('dashboard.summarySubtitle')}
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--color-text-secondary)' }}>{dateLabel}</p>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 4, fontSize: 11, fontWeight: 600,
            background: 'var(--color-secondary-light)', color: 'var(--color-secondary)',
            padding: '3px 10px', borderRadius: 999,
          }}>
            <AppIcon name="refresh" size={12} /> {t('dashboard.autoUpdatedDaily')}
          </span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginTop: 20 }}>
        {statItems.map((item) => (
          <div key={item.label} style={{ padding: '12px 14px', borderRadius: 12, background: 'var(--color-bg)' }}>
            <p style={{ margin: 0, fontSize: 12, color: 'var(--color-text-secondary)' }}>{item.label}</p>
            <p style={{ margin: '6px 0 0', fontSize: 20, fontWeight: 700, color: 'var(--color-text-primary)' }}>{item.value}</p>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 6 }}>
          <span>{t('dashboard.todayProgress')}</span>
          <span>{progressPct}% {t('dashboard.completed')}</span>
        </div>
        <div style={{ height: 8, borderRadius: 999, background: 'var(--color-border)', overflow: 'hidden' }}>
          <div style={{ width: `${progressPct}%`, height: '100%', background: 'var(--color-secondary)', transition: 'width 0.4s ease' }} />
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginTop: 20, flexWrap: 'wrap' }}>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--color-text-secondary)' }}>
          {hasLatestTask ? t('dashboard.continuePrompt') : t('dashboard.noTaskToContinue')}
        </p>
        <button
          type="button"
          className="btn-primary"
          onClick={onContinue}
          disabled={!hasLatestTask}
          style={{ padding: '10px 16px', fontSize: 13, opacity: hasLatestTask ? 1 : 0.6, cursor: hasLatestTask ? 'pointer' : 'not-allowed' }}
        >
          {t('dashboard.continueLastTask')}
        </button>
      </div>
    </section>
  );
}

// --- Main Dashboard View
export default function DashboardView() {
  const {
    user,
    setActiveView,
    setActiveTask,
    savedTools,
    refreshSavedTools,
    showToast,
    t,
    language,
  } = useApp();
  const [activeFilter, setActiveFilter] = useState('Semua');
  const [tools, setTools] = useState([]);
  const [isLoadingTools, setIsLoadingTools] = useState(true);
  const [toolsError, setToolsError] = useState('');
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [dailyStats, setDailyStats] = useState({
    tasksToday: 0,
    doneToday: 0,
    pendingToday: 0,
    progressPct: 0,
  });
  const [latestTask, setLatestTask] = useState(null);
  const [showAllFeatured, setShowAllFeatured] = useState(false);
  const [savingToolIds, setSavingToolIds] = useState([]);

  const fetchTools = async (category = activeFilter) => {
    setIsLoadingTools(true);
    setToolsError('');
    setTools([]);

    try {
      const params = { per_page: 12 };
      if (category && category !== 'Semua') {
        params.category = category;
      }

      const data = await toolService.list(params);
      setTools((data.tools ?? []).map(normalizeTool));
    } catch (error) {
      const message = error.response?.data?.message ?? t('dashboard.failedLoadTools');
      setToolsError(message);
    } finally {
      setIsLoadingTools(false);
    }
  };

  useEffect(() => {
    fetchTools(activeFilter);
  }, [activeFilter]);

  useEffect(() => {
    let isMounted = true;

    const fetchStats = async () => {
      setIsLoadingStats(true);
      try {
        const data = await taskService.list();
        const tasks = data.tasks ?? [];
        const today = new Date();
        const todayLabel = today.toDateString();

        const tasksToday = tasks.filter((task) => {
          if (!task.created_at) return false;
          return new Date(task.created_at).toDateString() === todayLabel;
        });

        const totals = tasksToday.reduce(
          (acc, task) => {
            const total = Number(task.sub_tasks_count ?? 0);
            const completed = Number(task.completed_count ?? 0);
            return {
              total: acc.total + total,
              completed: acc.completed + completed,
            };
          },
          { total: 0, completed: 0 }
        );

        const pending = Math.max(totals.total - totals.completed, 0);
        const progressPct = totals.total > 0
          ? Math.round((totals.completed / totals.total) * 100)
          : 0;

        if (!isMounted) return;

        setDailyStats({
          tasksToday: tasksToday.length,
          doneToday: totals.completed,
          pendingToday: pending,
          progressPct,
        });
        setLatestTask(tasks[0] ?? null);
      } catch {
        if (!isMounted) return;
        setDailyStats({ tasksToday: 0, doneToday: 0, pendingToday: 0, progressPct: 0 });
      } finally {
        if (!isMounted) return;
        setIsLoadingStats(false);
      }
    };

    fetchStats();

    if (refreshSavedTools) {
      refreshSavedTools().catch(() => { });
    }

    return () => {
      isMounted = false;
    };
  }, []);

  const firstName = user ? user.name.split(' ')[0] : 'Renisa';
  const jurusan = user ? user.jurusan : 'Teknik Informatika';

  const hour = new Date().getHours();
  const greeting = hour < 11 ? t('dashboard.goodMorning') : hour < 15 ? t('dashboard.goodAfternoon') : hour < 18 ? t('dashboard.goodEvening') : t('dashboard.goodNight');
  const greetIcon = hour < 11 ? 'lamp' : hour < 15 ? 'refresh' : hour < 18 ? 'calendar' : 'sparkles';

  const today = new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  const FILTERS = ['Semua', 'Research', 'Writing', 'Coding', 'Data', 'Academic', 'Productivity'];

  const featuredTools = tools;
  const visibleFeaturedTools = showAllFeatured ? featuredTools : featuredTools.slice(0, 6);
  const filteredTools = tools;
  const savedToolIds = new Set(
    savedTools
      .map((bookmark) => bookmark?.tool?.id ?? bookmark?.tool_id ?? bookmark?.id)
      .filter(Boolean)
  );

  const handleSaveTool = async (tool) => {
    if (savedToolIds.has(tool.id)) {
      showToast(t('dashboard.alreadySaved') ?? 'Tool sudah ada di Library.', 'info');
      return;
    }

    if (savingToolIds.includes(tool.id)) return;
    setSavingToolIds((prev) => [...prev, tool.id]);

    try {
      await bookmarkService.create(tool.id);
      showToast(t('dashboard.aiTagging') ?? 'AI sedang men-tag tool... cek di Library beberapa detik lagi', 'success');
      if (refreshSavedTools) {
        await refreshSavedTools();
      }
    } catch (error) {
      const message = error.response?.data?.message ?? (t('dashboard.saveFail') ?? 'Gagal menyimpan tool. Coba lagi.');
      showToast(message, 'error');
    } finally {
      setSavingToolIds((prev) => prev.filter((toolId) => toolId !== tool.id));
    }
  };

  const handleReplayTour = () => {
    window.dispatchEvent(new CustomEvent('leva:open-dashboard-tour'));
  };

  const handleFilterChange = (filter) => {
    setActiveFilter(filter);
    setShowAllFeatured(false);
  };

  const toolSkeletons = Array.from({ length: 6 }, (_, index) => (
    <div
      key={`tool-skeleton-${index}`}
      style={{ height: 200, background: 'var(--color-border)', borderRadius: 16, animation: 'pulse 1.5s infinite' }}
    />
  ));

  const handleContinueLatestTask = () => {
    if (!latestTask) return;
    setActiveTask({
      id: latestTask.task_id,
      title: latestTask.title,
    });
    setActiveView('chat');
  };

  return (
    <div className="main-content view-enter" style={{ padding: '32px 36px', maxWidth: 1100, margin: '0 auto' }}>
      <DailyProgressWidget
        greeting={greeting}
        greetIcon={greetIcon}
        firstName={firstName}
        dateLabel={today}
        stats={dailyStats}
        isLoading={isLoadingStats}
        hasLatestTask={Boolean(latestTask)}
        onContinue={handleContinueLatestTask}
      />

      {/* UI/UX Fix: Step 7 — Display as many choices as possible (grid vs scroll). Drop-down untuk sorting meminimalisir pencarian manual. Survei: 52,5% kesulitan temukan referensi tersimpan. */}
      {/* -- Featured Tools (responsive grid) */}
      <section data-tour="dashboard-featured-tools" style={{ marginBottom: 36 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <AppIcon name="flame" size={18} />
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{t('dashboard.featuredToolsTitle')}</h2>
            <span style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginLeft: 4 }}>
              - {t('dashboard.featuredToolsSubtitle')} {jurusan}
            </span>
          </div>
          <button
            type="button"
            className="btn-ghost"
            onClick={handleReplayTour}
            style={{ padding: '7px 12px', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <AppIcon name="sparkles" size={12} /> {t('dashboard.startTutorial')}
          </button>
        </div>
        {toolsError ? (
          <div className="card" style={{ padding: '24px 20px', textAlign: 'center' }}>
            <p style={{ margin: '0 0 8px', fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)' }}>
              {toolsError}
            </p>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => fetchTools(activeFilter)}
              style={{ padding: '8px 14px', fontSize: 12 }}
            >
              {t('dashboard.retry')}
            </button>
          </div>
        ) : isLoadingTools ? (
          <div className="tool-grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            {toolSkeletons}
          </div>
        ) : visibleFeaturedTools.length > 0 ? (
          <div className="tool-grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            {visibleFeaturedTools.map(tool => (
              <FeaturedToolCard
                key={tool.id}
                tool={tool}
                onSave={handleSaveTool}
                isSaved={savedToolIds.has(tool.id)}
                isSaving={savingToolIds.includes(tool.id)}
              />
            ))}
          </div>
        ) : (
          <div className="card" style={{ padding: '26px 22px', textAlign: 'center' }}>
            <p style={{ margin: '0 0 6px', fontSize: 15, fontWeight: 700, color: 'var(--color-text-primary)' }}>
              {t('dashboard.noFeatured') || 'Belum ada rekomendasi tools baru hari ini. Cek kembali besok!'}
            </p>
            <p style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--color-text-secondary)' }}>
              {t('dashboard.noFeaturedSub') || 'Sementara itu, jelajahi tools yang sudah kamu simpan di Library.'}
            </p>
            <button
              type="button"
              onClick={() => setActiveView('library')}
              style={{ border: 'none', background: 'transparent', color: 'var(--color-primary)', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
            >
              {t('dashboard.openLibrary') || 'Buka Library →'}
            </button>
          </div>
        )}
        {!showAllFeatured && featuredTools.length > 6 && visibleFeaturedTools.length > 0 && !isLoadingTools && !toolsError && (
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 14 }}>
            <button
              className="btn-ghost"
              onClick={() => setShowAllFeatured(true)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, padding: '9px 14px' }}
            >
              {t('dashboard.viewAll') || 'Lihat Semua'} <AppIcon name="arrow-right" size={14} />
            </button>
          </div>
        )}
      </section>

      {/* -- Filter Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {FILTERS.map(f => (
          <button
            key={f}
            onClick={() => handleFilterChange(f)}
            style={{
              padding: '6px 16px', borderRadius: 999, fontSize: 13, fontWeight: 500,
              cursor: 'pointer', border: 'none', transition: 'all 0.2s',
              background: activeFilter === f ? 'var(--color-primary)' : 'var(--color-surface)',
              color: activeFilter === f ? '#fff' : 'var(--color-text-secondary)',
              boxShadow: activeFilter === f ? '0 2px 8px rgba(108,99,255,0.3)' : '0 1px 4px rgba(0,0,0,0.07)',
            }}
          >
            {getCategoryLabel(f, t)}
          </button>
        ))}
      </div>

      {/* -- All Tools Grid */}
      <section style={{ marginBottom: 36 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <AppIcon name="news" size={18} />
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{t('dashboard.allToolsToday')}</h2>
          <span style={{
            fontSize: 12, fontWeight: 600, background: 'var(--color-primary-light)',
            color: 'var(--color-primary)', padding: '2px 8px', borderRadius: 999,
          }}>
            {isLoadingTools ? t('dashboard.loading') || 'Memuat...' : `${filteredTools.length} ${t('dashboard.toolsCount')}`}
          </span>
        </div>
        {toolsError ? (
          <div className="card" style={{ padding: '24px 20px', textAlign: 'center' }}>
            <p style={{ margin: '0 0 8px', fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)' }}>
              {toolsError}
            </p>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => fetchTools(activeFilter)}
              style={{ padding: '8px 14px', fontSize: 12 }}
            >
              {t('dashboard.retry')}
            </button>
          </div>
        ) : isLoadingTools ? (
          <div className="tool-grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            {toolSkeletons}
          </div>
        ) : filteredTools.length > 0 ? (
          <div className="tool-grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            {filteredTools.map(tool => (
              <SmallToolCard
                key={tool.id}
                tool={tool}
                onSave={handleSaveTool}
                isSaved={savedToolIds.has(tool.id)}
                isSaving={savingToolIds.includes(tool.id)}
              />
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--color-text-secondary)' }}>
            <span style={{ display: 'inline-flex' }}><AppIcon name="search" size={36} /></span>
            <p>{t('dashboard.noCategory') || 'Belum ada tools untuk kategori ini.'}</p>
          </div>
        )}
      </section>

      {/* -- Productivity Tip Banner */}
      <div style={{
        background: 'var(--color-primary-light)',
        border: '1px solid rgba(108,99,255,0.2)',
        borderRadius: 16, padding: '20px 24px',
        display: 'flex', alignItems: 'center', gap: 16,
      }}>
        <span style={{ display: 'flex', flexShrink: 0 }}><AppIcon name="lamp" size={28} /></span>
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, fontWeight: 600, fontSize: 14 }}>{t('dashboard.tipTitle') || 'Tips Produktivitas Hari Ini'}</p>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
            {t('dashboard.tipDesc') || 'Coba ceritakan tugasmu ke Leva:'} <em>{t('dashboard.tipExample') ? t('dashboard.tipExample').replace('{jurusan}', jurusan) : `"Bantu aku buat literature review topik X untuk jurusan ${jurusan}"`}</em> {t('dashboard.tipSuffix') || 'dan Leva akan otomatis memecahnya jadi langkah-langkah kecil plus merekomendasikan tools terbaik!'}
          </p>
        </div>
        <button
          className="btn-primary"
          onClick={() => setActiveView('chat')}
          style={{ flexShrink: 0, whiteSpace: 'nowrap', padding: '10px 18px', fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6 }}
        >
          {t('dashboard.tryNow') || 'Coba Sekarang'} <AppIcon name="arrow-right" size={14} color="#fff" />
        </button>
      </div>
    </div>
  );
}
