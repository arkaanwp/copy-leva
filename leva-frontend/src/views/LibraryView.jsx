import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { bookmarkService } from '../services/bookmarkService';
import { toolService } from '../services/toolService';
import { PRIORITY_LABELS } from '../utils/fieldMapper';
import Modal from '../components/Modal';
import AppIcon from '../components/AppIcon';

const PRIORITY_KEYS = [
  { value: 'all', key: 'library.priorityAll' },
  { value: 'must_try', key: 'library.priorityMustTry' },
  { value: 'very_good', key: 'library.priorityVeryGood' },
  { value: 'niche', key: 'library.priorityNiche' },
  { value: 'optional', key: 'library.priorityOptional' },
];

const SORT_KEYS = [
  { value: 'latest', key: 'library.sortLatest' },
  { value: 'oldest', key: 'library.sortOldest' },
  { value: 'rating', key: 'library.sortRating' },
  { value: 'az', label: 'A-Z' },
  { value: 'za', label: 'Z-A' },
];

const getNormalizedPriorityKey = (utilityPriority, priorityLabel) => {
  if (utilityPriority) return utilityPriority;
  if (!priorityLabel) return null;
  const lowerLabel = priorityLabel.toLowerCase();
  if (lowerLabel.includes('wajib') || lowerLabel.includes('must')) return 'must_try';
  if (lowerLabel.includes('sangat') || lowerLabel.includes('very')) return 'very_good';
  if (lowerLabel.includes('opsional') || lowerLabel.includes('optional')) return 'optional';
  if (lowerLabel.includes('niche') || lowerLabel.includes('bagus')) return 'niche';
  return null;
};
const CATEGORY_FILTERS = ['all', 'Research', 'Writing', 'Coding', 'Data', 'Academic', 'Productivity'];

const INDONESIAN_MONTH_MAP = {
  jan: 0,
  feb: 1,
  mar: 2,
  apr: 3,
  mei: 4,
  jun: 5,
  jul: 6,
  agu: 7,
  sep: 8,
  okt: 9,
  nov: 10,
  des: 11,
};

const normalizePricingType = (pricingType) => {
  if (!pricingType || typeof pricingType !== 'string') return 'freemium';
  const normalized = pricingType.toLowerCase();
  return normalized === 'open_source' ? 'opensource' : normalized;
};

const pricingMeta = (pricingType) => {
  const normalizedType = normalizePricingType(pricingType);
  const map = {
    free: { label: 'Free', bg: '#DCFCE7', color: '#15803D' },
    freemium: { label: 'Freemium', bg: '#FEF3C7', color: '#B45309' },
    paid: { label: 'Berbayar', bg: '#FEE2E2', color: '#B91C1C' },
    opensource: { label: 'Open-source', bg: '#DBEAFE', color: '#1D4ED8' },
  };

  return map[normalizedType] || map.freemium;
};

const parseSavedAtToTimestamp = (savedAt, fallback = 0) => {
  if (!savedAt || typeof savedAt !== 'string') return fallback;

  const parts = savedAt.trim().split(' ');
  if (parts.length < 3) return fallback;

  const day = Number(parts[0]);
  const month = INDONESIAN_MONTH_MAP[parts[1].slice(0, 3).toLowerCase()];
  const year = Number(parts[2]);

  if (!Number.isFinite(day) || month === undefined || !Number.isFinite(year)) return fallback;

  return new Date(year, month, day).getTime();
};

const formatSavedAtLabel = (savedAt) => {
  if (!savedAt) return '';
  const parsedDate = new Date(savedAt);
  if (!Number.isNaN(parsedDate.getTime())) {
    return parsedDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  }
  return savedAt;
};

const resolveToolUrl = (url) => {
  if (!url) return '#';
  return url.startsWith('http://') || url.startsWith('https://') ? url : `https://${url}`;
};

// Badge component for priority
function PriorityBadge({ priorityKey, label }) {
  const meta = priorityKey ? PRIORITY_LABELS[priorityKey] : null;
  const style = meta
    ? { background: meta.bg, color: meta.color }
    : { background: 'var(--color-bg)', color: 'var(--color-text-secondary)' };
  const text = label || meta?.label || 'Menunggu Label';
  return (
    <span style={{ ...style, fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 999, whiteSpace: 'nowrap' }}>
      {text}
    </span>
  );
}

function PricingBadge({ pricingType }) {
  const pricing = pricingMeta(pricingType);

  return (
    <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 999, background: pricing.bg, color: pricing.color, whiteSpace: 'nowrap' }}>
      {pricing.label}
    </span>
  );
}

// Saved Tool Card
function SavedToolCard({ tool, onDelete, onOpenDetail }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className="card"
      style={{ padding: '18px 20px', transition: 'transform 0.2s, box-shadow 0.2s' }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.1)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.06)'; }}
    >
      {/* Top row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div>
          <h3 
            onClick={() => onOpenDetail(tool.id)}
            style={{ 
              margin: '0 0 4px', 
              fontSize: 15, 
              fontWeight: 700, 
              cursor: 'pointer',
              transition: 'color 0.2s'
            }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--color-primary)'}
            onMouseLeave={e => e.currentTarget.style.color = 'inherit'}
            title="Klik untuk melihat detail"
          >
            {tool.name}
          </h3>
          <p style={{ margin: 0, fontSize: 12, color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <AppIcon name="link" size={12} /> {tool.url}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <PricingBadge pricingType={tool.pricingType} />
          <PriorityBadge priorityKey={tool.priorityKey} label={tool.priority} />
          {tool.taggingStatus === 'pending' && (
            <span style={{
              background: '#FEF3C7',
              color: '#B45309',
              fontSize: 11,
              fontWeight: 700,
              padding: '3px 10px',
              borderRadius: 999,
              whiteSpace: 'nowrap',
              animation: 'pulse 1.5s infinite',
            }}>
              AI sedang men-tag...
            </span>
          )}
        </div>
      </div>

      {/* Category + date */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 10, alignItems: 'center' }}>
        <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 6, background: 'var(--color-primary-light)', color: 'var(--color-primary)' }}>
          {tool.category}
        </span>
        <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>
          Disimpan {tool.savedAt}
        </span>
      </div>

      {/* Note */}
      {tool.note && (
        <p style={{ margin: '0 0 10px', fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
          {tool.note}
        </p>
      )}

      {/* Keywords */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
        {(tool.keywords ?? []).map(kw => (
          <span
            key={kw}
            style={{ fontSize: 11, padding: '2px 8px', background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 6, color: 'var(--color-text-secondary)' }}
          >
            #{kw}
          </span>
        ))}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8 }}>
        <a
          href={resolveToolUrl(tool.url)} target="_blank" rel="noreferrer"
          style={{
            flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'var(--color-primary)', color: '#fff',
            borderRadius: 9, padding: '8px', fontSize: 13, fontWeight: 600,
            textDecoration: 'none', transition: 'background 0.2s',
          }}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            Buka Tool <AppIcon name="external-link" size={14} color="#fff" />
          </span>
        </a>
        <button
          onClick={() => onDelete(tool)}
          style={{
            flex: 1, padding: '8px', borderRadius: 9, border: '1px solid var(--color-danger)',
            background: 'var(--color-danger-soft)', color: 'var(--color-danger)', cursor: 'pointer',
            fontSize: 13, fontWeight: 500, transition: 'all 0.2s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(220, 38, 38, 0.16)'}
          onMouseLeave={e => e.currentTarget.style.background = 'var(--color-danger-soft)'}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <AppIcon name="trash" size={14} /> Hapus
          </span>
        </button>
      </div>
    </div>
  );
}

// Main Library View
export default function LibraryView() {
  const {
    setActiveView,
    showToast,
    refreshSavedTools,
    t,
  } = useApp();
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [searchVal, setSearchVal] = useState('');
  const [debouncedSearchVal, setDebouncedSearchVal] = useState('');
  const [sortBy, setSortBy] = useState('latest');
  const [showAddModal, setShowAddModal] = useState(false);
  const [toolToDelete, setToolToDelete] = useState(null);

  const [searchToolQuery, setSearchToolQuery] = useState('');
  const [debouncedSearchToolQuery, setDebouncedSearchToolQuery] = useState('');
  const [searchToolResults, setSearchToolResults] = useState([]);
  const [isSearchingTool, setIsSearchingTool] = useState(false);
  const [selectedToolToSave, setSelectedToolToSave] = useState(null);
  const [saveToolNote, setSaveToolNote] = useState('');
  const [isSavingTool, setIsSavingTool] = useState(false);
  
  const [bookmarks, setBookmarks] = useState([]);
  const [pagination, setPagination] = useState({ current_page: 1, total: 0, last_page: 1 });
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [tags, setTags] = useState([]);
  const [selectedTag, setSelectedTag] = useState('');
  const requestRef = useRef(0);
  const [selectedDetailTool, setSelectedDetailTool] = useState(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);

  const handleOpenDetail = async (toolId) => {
    setIsDetailLoading(true);
    try {
      const detail = await toolService.getToolDetail(toolId);
      const pricingTypeRaw = detail.pricing_type ?? detail.pricingType ?? 'free';
      const pricingType = typeof pricingTypeRaw === 'string' ? pricingTypeRaw.toLowerCase() : 'free';
      
      setSelectedDetailTool({
        id: detail.id,
        name: detail.name,
        url: detail.url,
        category: detail.category,
        pricingType,
        rating: Number(detail.rating ?? 0),
        desc: detail.description ?? detail.desc ?? '',
        detailDesc: detail.description ?? detail.detailDesc ?? detail.desc ?? '',
      });
    } catch (error) {
      if (showToast) {
        showToast(t('dashboard.failedLoadTools') || 'Gagal memuat detail tool.', 'error');
      }
    } finally {
      setIsDetailLoading(false);
    }
  };

  const displayedTags = useMemo(() => {
    if (tags && tags.length > 0) return tags;
    const extracted = new Set();
    bookmarks.forEach(item => {
      const kw = Array.isArray(item.semantic_keywords) ? item.semantic_keywords : (Array.isArray(item.keywords) ? item.keywords : []);
      kw.forEach(k => { if (k && typeof k === 'string') extracted.add(k.trim().toLowerCase()); });
    });
    return Array.from(extracted);
  }, [tags, bookmarks]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedSearchVal(searchVal.trim());
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchVal]);

  const fetchBookmarks = useCallback(async () => {
    const currentRequestId = ++requestRef.current;
    setIsLoading(true);
    setErrorMessage('');

    try {
      const params = { sort: sortBy };
      if (priorityFilter !== 'all') {
        params.priority = priorityFilter;
      }
      if (categoryFilter !== 'all') {
        params.category = categoryFilter;
      }
      if (debouncedSearchVal) {
        params.q = debouncedSearchVal;
      }

      const data = await bookmarkService.getBookmarks(params);
      
      if (requestRef.current === currentRequestId) {
        setBookmarks(data.bookmarks ?? []);
        setPagination(data.pagination ?? { current_page: 1, total: 0, last_page: 1 });
      }
    } catch (error) {
      if (requestRef.current === currentRequestId) {
        const message = error.response?.data?.message ?? 'Library belum bisa dimuat. Pastikan backend API berjalan.';
        setErrorMessage(message);
      }
    } finally {
      if (requestRef.current === currentRequestId) {
        setIsLoading(false);
      }
    }
  }, [priorityFilter, categoryFilter, debouncedSearchVal, sortBy]);

  const fetchTags = useCallback(async () => {
    try {
      const tagList = await bookmarkService.getTags();
      setTags(Array.isArray(tagList) ? tagList : []);
    } catch {
      setTags([]);
    }
  }, []);

  useEffect(() => {
    fetchBookmarks();
  }, [fetchBookmarks]);

  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedSearchToolQuery(searchToolQuery.trim());
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [searchToolQuery]);

  useEffect(() => {
    if (!showAddModal) return;

    let isMounted = true;
    const fetchSearchTools = async () => {
      setIsSearchingTool(true);
      try {
        let data;
        if (debouncedSearchToolQuery) {
          data = await toolService.searchTools(debouncedSearchToolQuery, 12);
        } else {
          data = await toolService.list({ per_page: 12 });
        }
        if (isMounted) setSearchToolResults(data.tools ?? data.results ?? []);
      } catch {
        if (isMounted) setSearchToolResults([]);
      } finally {
        if (isMounted) setIsSearchingTool(false);
      }
    };

    fetchSearchTools();
    return () => { isMounted = false; };
  }, [debouncedSearchToolQuery, showAddModal]);

  useEffect(() => {
    if (refreshSavedTools) {
      refreshSavedTools().catch(() => {});
    }
  }, [refreshSavedTools]);

  useEffect(() => {
    if (searchVal && selectedTag && searchVal !== selectedTag) {
      setSelectedTag('');
    }
  }, [searchVal, selectedTag]);

  const normalizedSavedTools = useMemo(() => bookmarks.map((item, index) => {
    const baseTool = item?.tool ?? item ?? {};
    const name = baseTool.name ?? item?.name ?? '';
    const pricingTypeRaw = baseTool.pricing_type ?? baseTool.pricingType ?? item?.pricingType ?? 'freemium';
    const pricingType = normalizePricingType(pricingTypeRaw);
    const utilityPriorityRaw = item?.utility_priority ?? item?.priorityKey ?? null;
    const priorityLabel = item?.priority_label
      ?? item?.priority
      ?? (utilityPriorityRaw ? PRIORITY_LABELS[utilityPriorityRaw]?.label : null)
      ?? 'Menunggu Label';
    const utilityPriority = getNormalizedPriorityKey(utilityPriorityRaw, priorityLabel);
    const keywords = Array.isArray(item?.semantic_keywords)
      ? item.semantic_keywords
      : (Array.isArray(item?.keywords) ? item.keywords : []);

    const rawSavedAt = item?.saved_at ?? item?.savedAt ?? '';
    const savedAt = formatSavedAtLabel(rawSavedAt);
    const parsedDate = rawSavedAt ? new Date(rawSavedAt) : null;
    const savedTimestamp = parsedDate && !Number.isNaN(parsedDate.getTime())
      ? parsedDate.getTime()
      : (item?.savedTimestamp ?? parseSavedAtToTimestamp(rawSavedAt, 0));

    return {
      id: item?.id ?? baseTool.id ?? `${name}-${index}`,
      toolId: baseTool.id ?? item?.tool_id ?? item?.id,
      name,
      url: baseTool.url ?? item?.url ?? '',
      category: baseTool.category ?? item?.category ?? 'Research',
      priority: priorityLabel,
      priorityKey: utilityPriority,
      pricingType,
      rating: Number(baseTool.rating ?? item?.rating ?? 0),
      description: baseTool.description ?? item?.description ?? '',
      note: item?.note ?? '',
      keywords,
      savedAt,
      savedTimestamp,
      taggingStatus: item?.tagging_status ?? item?.taggingStatus,
      utilityPriority,
    };
  }), [bookmarks]);

  const filtered = useMemo(() => {
    /* UI/UX Fix: Step 7 — Display as many choices as possible (grid vs scroll). Drop-down untuk sorting meminimalisir pencarian manual. Survei: 52,5% kesulitan temukan referensi tersimpan. */
    const withMeta = normalizedSavedTools.map((tool) => ({
      ...tool,
      _timestamp: tool.savedTimestamp ?? parseSavedAtToTimestamp(tool.savedAt, 0),
      _rating: tool.rating ?? 0,
    }));

    withMeta.sort((a, b) => {
      if (sortBy === 'latest') return b._timestamp - a._timestamp;
      if (sortBy === 'oldest') return a._timestamp - b._timestamp;
      if (sortBy === 'rating') return b._rating - a._rating;
      if (sortBy === 'az') return a.name.localeCompare(b.name, 'id-ID');
      if (sortBy === 'za') return b.name.localeCompare(a.name, 'id-ID');
      return 0;
    });

    return withMeta;
  }, [normalizedSavedTools, sortBy]);

  const hasPendingTags = normalizedSavedTools.some((tool) => tool.taggingStatus === 'pending');

  useEffect(() => {
    if (!hasPendingTags) return;

    const intervalId = setInterval(() => {
      fetchBookmarks();
      fetchTags();
    }, 5000);

    return () => clearInterval(intervalId);
  }, [hasPendingTags, fetchBookmarks, fetchTags]);

  const handleDeleteRequest = (tool) => {
    /* UI/UX Fix: Step 6 — Output device harus memberi respond jelas ke aksi user. Step 7 — Aksi destruktif (hapus) harus ada safeguard/konfirmasi. Survei: 52,5% user sulit temukan referensi. */
    setToolToDelete(tool);
  };

  const handleConfirmDelete = async () => {
    if (!toolToDelete) return;

    try {
      const toolId = toolToDelete.toolId ?? toolToDelete.id;
      await bookmarkService.deleteBookmark(toolId);
      showToast(t('library.deleteSuccess'), 'info');
      setToolToDelete(null);
      fetchBookmarks();
      fetchTags();
      if (refreshSavedTools) {
        refreshSavedTools().catch(() => {});
      }
    } catch (error) {
      const message = error.response?.data?.message ?? t('library.deleteFail');
      showToast(message, 'error');
    }
  };

  const handleAddTool = async () => {
    if (!selectedToolToSave || isSavingTool) return;
    setIsSavingTool(true);
    try {
      await bookmarkService.saveBookmark(selectedToolToSave.id, saveToolNote);
      showToast(t('library.saveSuccess'), 'success');
      fetchBookmarks();
      fetchTags();
      if (refreshSavedTools) {
        refreshSavedTools().catch(() => {});
      }
      setShowAddModal(false);
      setSearchToolQuery('');
      setSelectedToolToSave(null);
      setSaveToolNote('');
    } catch (error) {
      const message = error.response?.data?.message ?? t('library.saveFail');
      showToast(message, 'error');
    } finally {
      setIsSavingTool(false);
    }
  };

  const inputStyle = {
    width: '100%', padding: '10px 12px',
    border: '1px solid var(--color-border)',
    borderRadius: 9, fontSize: 13, outline: 'none',
    boxSizing: 'border-box', marginBottom: 12,
  };

  const handleResetFilters = () => {
    setPriorityFilter('all');
    setCategoryFilter('Semua');
    setSearchVal('');
    setDebouncedSearchVal('');
    setSortBy('latest');
    setSelectedTag('');
  };

  const handleTagClick = (tag) => {
    if (tag === selectedTag) {
      setSelectedTag('');
      setSearchVal('');
      return;
    }

    setSelectedTag(tag);
    setSearchVal(tag);
  };

  const totalCount = pagination?.total ?? filtered.length;

  return (
    <div className="main-content view-enter" style={{ padding: '32px 36px', maxWidth: 1100, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
            <AppIcon name="library" size={22} /> {t('library.title')}
          </h1>
          <p style={{ margin: '6px 0 0', fontSize: 14, color: 'var(--color-text-secondary)' }}>
            {t('library.subtitle')}
          </p>
        </div>
        <button className="btn-primary" onClick={() => setShowAddModal(true)} style={{ whiteSpace: 'nowrap' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <AppIcon name="plus" size={14} color="#fff" /> {t('library.addTool')}
          </span>
        </button>
      </div>

      {/* Stats row */}
      <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: t('library.totalTools'), val: filtered.length, icon: 'folder' },
          { label: t('library.mustTry'), val: filtered.filter(t2 => t2.priorityKey === 'must_try').length, icon: 'flame' },
          { label: t('library.veryGood'), val: filtered.filter(t2 => t2.priorityKey === 'very_good').length, icon: 'check' },
        ].map(stat => (
          <div key={stat.label} className="card" style={{ flex: 1, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ display: 'flex' }}><AppIcon name={stat.icon} size={22} /></span>
            <div>
              <p style={{ margin: 0, fontSize: 22, fontWeight: 800, color: 'var(--color-primary)' }}>{stat.val}</p>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--color-text-secondary)' }}>{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 24 }}>

        {/* Filter Sidebar */}
        <div style={{ width: 200, flexShrink: 0 }}>
          {/* Search */}
          <input
            value={searchVal}
            onChange={e => setSearchVal(e.target.value)}
            placeholder={t('library.searchPlaceholder')}
            style={{ ...inputStyle, marginBottom: 20 }}
            onFocus={e => e.target.style.borderColor = 'var(--color-primary)'}
            onBlur={e => e.target.style.borderColor = 'var(--color-border)'}
          />

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-secondary)', letterSpacing: '0.07em', margin: 0 }}>{t('library.priority')}</p>
            <span
              className="tooltip-host tooltip-help-icon"
              data-tooltip={t('library.priorityTooltip')}
              aria-label="Info prioritas"
              tabIndex={0}
            >
              ?
            </span>
          </div>
          {PRIORITY_KEYS.map(option => (
            <button
              key={option.value}
              type="button"
              onClick={() => setPriorityFilter(option.value)}
              style={{
                padding: '7px 10px', borderRadius: 8, cursor: 'pointer', fontSize: 13,
                background: priorityFilter === option.value ? 'var(--color-primary-light)' : 'transparent',
                color: priorityFilter === option.value ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                fontWeight: priorityFilter === option.value ? 600 : 400,
                marginBottom: 2, transition: 'all 0.15s',
                border: 'none',
                width: '100%',
                textAlign: 'left',
              }}
            >
              {option.key ? t(option.key) : option.label}
            </button>
          ))}

          <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-secondary)', letterSpacing: '0.07em', margin: '20px 0 8px' }}>{t('library.category')}</p>
          {CATEGORY_FILTERS.map(f => (
            <button
              key={f}
              type="button"
              onClick={() => setCategoryFilter(f)}
              style={{
                padding: '7px 10px', borderRadius: 8, cursor: 'pointer', fontSize: 13,
                background: categoryFilter === f ? 'var(--color-primary-light)' : 'transparent',
                color: categoryFilter === f ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                fontWeight: categoryFilter === f ? 600 : 400,
                marginBottom: 2, transition: 'all 0.15s',
                border: 'none',
                width: '100%',
                textAlign: 'left',
              }}
            >
              {f === 'all' ? t('library.categoryAll') : f}
            </button>
          ))}

          <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-secondary)', letterSpacing: '0.07em', margin: '20px 0 8px' }}>{t('library.tags')}</p>
          {displayedTags.length === 0 ? (
            <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', margin: 0 }}>
              {t('library.noTags')}
            </p>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {displayedTags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => handleTagClick(tag)}
                  style={{
                    border: '1px solid var(--color-border)',
                    background: selectedTag === tag ? 'var(--color-primary-light)' : 'var(--color-surface)',
                    color: selectedTag === tag ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                    borderRadius: 999,
                    padding: '4px 10px',
                    fontSize: 11,
                    cursor: 'pointer',
                  }}
                >
                  #{tag}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Tool Cards Grid */}
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
            <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', margin: 0 }}>
              {t('library.showingXofY').replace('{x}', filtered.length).replace('{y}', totalCount)}
            </p>

            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--color-text-secondary)' }}>
              <span style={{ fontWeight: 600 }}>{t('library.sort')}</span>
              <select
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value)}
                style={{
                  border: '1px solid var(--color-border)',
                  borderRadius: 9,
                  fontSize: 13,
                  padding: '7px 10px',
                  color: 'var(--color-text-primary)',
                  background: 'var(--color-surface)',
                  outline: 'none',
                }}
              >
                {SORT_KEYS.map((option) => (
                  <option key={option.value} value={option.value}>{option.key ? t(option.key) : option.label}</option>
                ))}
              </select>
            </label>
          </div>

          {errorMessage ? (
            <div style={{ textAlign: 'center', padding: '56px 20px' }}>
              <p style={{ margin: '0 0 14px', color: 'var(--color-text-secondary)', fontSize: 14, lineHeight: 1.7 }}>
                {errorMessage}
              </p>
              <button className="btn-secondary" onClick={fetchBookmarks}>
                {t('library.retry')}
              </button>
            </div>
          ) : isLoading ? (
            <div style={{ textAlign: 'center', padding: '56px 20px' }}>
              <p style={{ margin: 0, color: 'var(--color-text-secondary)', fontSize: 14 }}>
                {t('library.loading')}
              </p>
            </div>
          ) : bookmarks.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', minHeight: 280, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: 72, height: 72, borderRadius: 16, background: 'var(--color-bg)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                <AppIcon name="folder" size={36} color="#94A3B8" />
              </div>
              <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 800, color: 'var(--color-text-primary)' }}>
                {t('library.emptyTitle')}
              </h3>
              <p style={{ margin: '0 0 18px', maxWidth: 400, fontSize: 13, lineHeight: 1.6, color: 'var(--color-text-secondary)', marginLeft: 'auto', marginRight: 'auto' }}>
                {t('library.emptyDesc')}
              </p>
              <button className="btn-primary" onClick={() => setActiveView('dashboard')} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', fontSize: 13 }}>
                {t('library.goToDashboard')} <AppIcon name="arrow-right" size={12} color="#fff" />
              </button>
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '56px 20px' }}>
              <span style={{ display: 'inline-flex', position: 'relative' }}>
                <AppIcon name="search" size={48} color="#94A3B8" />
                <span style={{ position: 'absolute', right: -2, bottom: -1, width: 18, height: 18, borderRadius: '50%', background: 'var(--color-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <AppIcon name="x" size={12} color="var(--color-text-secondary)" />
                </span>
              </span>
              <p style={{ margin: '14px 0 14px', color: 'var(--color-text-secondary)', fontSize: 14, lineHeight: 1.7 }}>
                {t('library.noMatch')}
              </p>
              <button className="btn-secondary" onClick={handleResetFilters}>
                {t('library.resetFilter')}
              </button>
            </div>
          ) : (
            <div className="library-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
              {filtered.map(tool => (
                <SavedToolCard key={tool.id} tool={tool} onDelete={handleDeleteRequest} onOpenDetail={handleOpenDetail} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add Tool Modal */}
      {showAddModal && (
        <Modal title={t('library.searchToolTitle')} onClose={() => {
          setShowAddModal(false);
          setSearchToolQuery('');
          setSelectedToolToSave(null);
          setSaveToolNote('');
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 600 }}>{t('library.searchToolLabel')}</label>
              <input
                value={searchToolQuery}
                onChange={(e) => setSearchToolQuery(e.target.value)}
                placeholder={t('library.searchToolPlaceholder')}
                style={inputStyle}
                autoFocus
              />
            </div>

            {selectedToolToSave ? (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'var(--color-primary-light)', borderRadius: 10 }}>
                <div>
                  <p style={{ margin: 0, fontSize: 12, color: 'var(--color-primary)', fontWeight: 600 }}>{t('library.selectedTool')}</p>
                  <p style={{ margin: '2px 0 0', fontSize: 16, fontWeight: 700, color: 'var(--color-text-primary)' }}>{selectedToolToSave.name}</p>
                </div>
                <button type="button" onClick={() => setSelectedToolToSave(null)} style={{ background: 'transparent', border: 'none', color: 'var(--color-primary)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>{t('library.change')}</button>
              </div>
            ) : (
              <div style={{ maxHeight: 240, overflowY: 'auto', border: '1px solid var(--color-border)', borderRadius: 10 }}>
                {isSearchingTool ? (
                  <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--color-text-secondary)', padding: 20 }}>{t('library.searching')}</p>
                ) : searchToolResults.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '30px 10px', background: 'var(--color-bg)' }}>
                    <p style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)' }}>{t('library.toolNotFound')}</p>
                    <p style={{ margin: 0, fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                      {t('library.toolNotFoundDesc')}
                    </p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {searchToolResults.map((tool, index) => (
                      <button
                        key={tool.id}
                        type="button"
                        onClick={() => setSelectedToolToSave(tool)}
                        style={{
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          padding: '12px 14px', background: 'var(--color-surface)', borderBottom: index === searchToolResults.length - 1 ? 'none' : '1px solid var(--color-border)',
                          borderTop: 'none', borderLeft: 'none', borderRight: 'none',
                          cursor: 'pointer', textAlign: 'left', transition: 'background 0.2s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--color-bg)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'var(--color-surface)'}
                      >
                        <div>
                          <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--color-text-primary)' }}>{tool.name}</p>
                          <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--color-text-secondary)' }}>{tool.category}</p>
                        </div>
                        <AppIcon name="arrow-right" size={16} color="var(--color-text-secondary)" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 600 }}>{t('library.noteLabel')}</label>
              <textarea
                value={saveToolNote}
                onChange={(e) => setSaveToolNote(e.target.value)}
                placeholder={t('library.notePlaceholder')}
                rows={3}
                style={{ ...inputStyle, resize: 'none' }}
              />
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
              <button className="btn-ghost" onClick={() => {
                setShowAddModal(false);
                setSearchToolQuery('');
                setSelectedToolToSave(null);
                setSaveToolNote('');
              }} style={{ flex: 1 }}>{t('library.cancel')}</button>
              <button 
                className="btn-primary" 
                onClick={handleAddTool} 
                disabled={!selectedToolToSave || isSavingTool} 
                style={{ flex: 2, opacity: !selectedToolToSave ? 0.5 : 1 }}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  {isSavingTool ? t('dashboard.saving') : <><AppIcon name="check" size={14} color="#fff" /> {t('library.saveToLibrary')}</>}
                </span>
              </button>
            </div>
          </div>
        </Modal>
      )}

      {toolToDelete && (
        <Modal title={t('library.deleteTitle')} onClose={() => setToolToDelete(null)}>
          <p style={{ margin: '0 0 16px', fontSize: 14, color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
            {t('library.deleteConfirm')} {toolToDelete.name} {t('library.deleteFrom')}
          </p>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn-ghost" onClick={() => setToolToDelete(null)} style={{ flex: 1 }}>
              {t('library.cancel')}
            </button>
            <button
              onClick={handleConfirmDelete}
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
              {t('library.confirmDelete')}
            </button>
          </div>
        </Modal>
      )}
      {/* Tool Detail Modal */}
      {selectedDetailTool && (
        <Modal 
          title={selectedDetailTool.name} 
          onClose={() => setSelectedDetailTool(null)}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className={`tag tag-${selectedDetailTool.category.toLowerCase()}`} style={{
                background: selectedDetailTool.category === 'Research' ? '#EEF0FF' : 'var(--color-bg)',
                color: 'var(--color-primary)',
                fontSize: 11,
                fontWeight: 700,
                padding: '3px 10px',
                borderRadius: 999
              }}>{selectedDetailTool.category}</span>
              <PricingBadge pricingType={selectedDetailTool.pricingType} />
            </div>
            
            <div>
              <h4 style={{ margin: '0 0 6px', fontSize: 12, fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {t('library.noteLabel') || 'Deskripsi / Catatan'}
              </h4>
              <p style={{ margin: 0, fontSize: 13.5, color: 'var(--color-text-primary)', lineHeight: 1.6 }}>
                {selectedDetailTool.detailDesc || selectedDetailTool.desc}
              </p>
            </div>

            <div>
              <h4 style={{ margin: '0 0 6px', fontSize: 12, fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Rating & Website
              </h4>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                <span style={{ fontSize: 12, color: '#F59E0B', fontWeight: 600 }}>
                  {'★'.repeat(Math.floor(selectedDetailTool.rating))}{'☆'.repeat(5 - Math.floor(selectedDetailTool.rating))}
                  <span style={{ color: 'var(--color-text-secondary)', fontWeight: 400, marginLeft: 4 }}>{selectedDetailTool.rating}</span>
                </span>
                <a 
                  href={resolveToolUrl(selectedDetailTool.url)} 
                  target="_blank" 
                  rel="noreferrer"
                  style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-primary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}
                >
                  {selectedDetailTool.url} <AppIcon name="external-link" size={14} />
                </a>
              </div>
            </div>

            <div style={{ height: 1, background: 'var(--color-border)', margin: '4px 0' }} />

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="button"
                className="btn-primary"
                onClick={() => setSelectedDetailTool(null)}
                style={{ width: '100%', padding: '10px 0' }}
              >
                Tutup
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Loading Overlay */}
      {isDetailLoading && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 5000,
          backdropFilter: 'blur(2px)'
        }}>
          <div className="card" style={{ padding: '20px 30px', display: 'flex', alignItems: 'center', gap: 12, borderRadius: 16 }}>
            <AppIcon name="loader" size={20} className="animate-spin" color="var(--color-primary)" />
            <span style={{ fontWeight: 600, fontSize: 14 }}>{t('dashboard.loading') || 'Memuat detail...'}</span>
          </div>
        </div>
      )}
    </div>
  );
}
