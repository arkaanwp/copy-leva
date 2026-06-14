import { useEffect, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import AppIcon from '../components/AppIcon';
import Modal from '../components/Modal';
import { bookmarkService } from '../services/bookmarkService';
import { taskService } from '../services/taskService';
import { toolService } from '../services/toolService';
import { profileService } from '../services/profileService';

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

const RECOMMENDATIONS_BY_MAJOR = {
  'Teknik Informatika': {
    description: 'Sebagai mahasiswa Teknik Informatika, kamu akan sering berkutat dengan penulisan kode, debugging, dan pemahaman algoritma. Gunakan asisten koding AI dan pencarian terdokumentasi cepat untuk mendongkrak produktivitas belajarmu.',
    tools: ['GitHub Copilot', 'Codeium', 'Perplexity AI'],
    reasoning: {
      'GitHub Copilot': 'Asisten autocomplete koding yang membantumu menulis sintaks pemrograman dan debugging real-time di VS Code.',
      'Codeium': 'Alternatif gratis terbaik dari GitHub Copilot, ideal untuk mahasiswa yang menginginkan autocomplete AI tanpa biaya tambahan.',
      'Perplexity AI': 'Sangat bagus untuk mencari penjelasan konsep pemrograman, dokumentasi API, dan error stack trace secara cepat dengan sitasi sumber terpercaya.'
    }
  },
  'Rekayasa Perangkat Lunak': {
    description: 'Sebagai mahasiswa Rekayasa Perangkat Lunak, fokusmu adalah merancang, mengembangkan, dan memelihara sistem perangkat lunak yang andal. Asisten AI dapat mempercepat penulisan kode, visualisasi arsitektur, dan pembuatan dokumentasi proyek.',
    tools: ['GitHub Copilot', 'Codeium', 'Notion AI'],
    reasoning: {
      'GitHub Copilot': 'Membantu mempercepat siklus pengembangan (coding) dan refactoring struktur kode aplikasi secara otomatis.',
      'Codeium': 'Asisten coding bertenaga AI gratis yang mendukung multi-bahasa pemrograman untuk pengerjaan tugas lab.',
      'Notion AI': 'Luar biasa untuk menyusun Software Requirements Specification (SRS), riset arsitektur, dan membuat dokumentasi proyek kelompok.'
    }
  },
  'Sistem Informasi': {
    description: 'Sistem Informasi menggabungkan aspek bisnis dan teknologi. Kamu akan sering menganalisis proses bisnis, memodelkan basis data, dan menerjemahkan kebutuhan bisnis menjadi sistem. Gunakan AI untuk analisis data, pencarian referensi, dan dokumentasi.',
    tools: ['Julius AI', 'Perplexity AI', 'Notion AI'],
    reasoning: {
      'Julius AI': 'Membantumu menganalisis data bisnis dan spreadsheet hanya dengan menggunakan prompt bahasa Indonesia.',
      'Perplexity AI': 'Membantu riset tren teknologi informasi, studi kasus bisnis, dan mencari referensi sistem informasi terpercaya.',
      'Notion AI': 'Cocok untuk menyusun dokumen analisis sistem, requirement gathering, serta kolaborasi manajemen proyek.'
    }
  },
  'Sains Data': {
    description: 'Sebagai mahasiswa Sains Data, fokus utamamu adalah mengekstrak insight dari data, membangun model prediktif, dan melakukan visualisasi data. Gunakan asisten data bertenaga AI untuk mempercepat coding Python/R dan visualisasi statistik.',
    tools: ['Julius AI', 'Tableau Public', 'GitHub Copilot'],
    reasoning: {
      'Julius AI': 'Sangat kuat untuk menganalisis data mentah secara interaktif, membuat visualisasi grafik, dan menulis snippet Python untuk data science.',
      'Tableau Public': 'Pilihan utama untuk mempublikasikan dashboard data interaktif yang memukau guna portofolio sains datamu.',
      'GitHub Copilot': 'Mempercepat penulisan kode cleaning data (pandas, numpy) dan visualisasi (matplotlib, seaborn) di Jupyter Notebook.'
    }
  },
  'Kedokteran': {
    description: 'Di bidang Kedokteran, kamu dituntut untuk membaca banyak paper ilmiah, memahami jurnal klinis yang kompleks, dan merujuk pada bukti ilmiah (evidence-based medicine). Tool riset akademik akan sangat membantumu memilah informasi medis yang valid.',
    tools: ['Consensus', 'Scite.ai', 'ChatPDF'],
    reasoning: {
      'Consensus': 'Mesin pencari ilmiah peer-reviewed yang memberikan jawaban berbasis bukti (evidence) medis secara ringkas dan valid.',
      'Scite.ai': 'Membantu melacak keabsahan jurnal medis dengan menunjukkan konteks apakah suatu temuan paper didukung atau dibantah oleh penelitian lain.',
      'ChatPDF': 'Sangat praktis untuk "mengobrol" dengan dokumen PDF medis yang tebal atau jurnal ilmiah bahasa asing guna merangkum poin penting.'
    }
  },
  'Farmasi': {
    description: 'Mahasiswa Farmasi mempelajari formula obat, interaksi kimia, dan penelitian uji klinis. Pencarian literatur peer-reviewed yang akurat sangatlah penting untuk menyusun makalah ilmiah dan laporan praktikum.',
    tools: ['Consensus', 'Elicit', 'ChatPDF'],
    reasoning: {
      'Consensus': 'Mencari efektivitas senyawa kimia atau obat langsung dari database ribuan jurnal peer-reviewed secara instan.',
      'Elicit': 'Otomatis mengekstrak informasi penting dari paper farmakologi, mempermudah literature review dengan tabel perbandingan temuan.',
      'ChatPDF': 'Membantumu merangkum dokumen panduan obat (drug monographs) dan laporan riset biokimia secara cepat.'
    }
  },
  'Manajemen': {
    description: 'Di jurusan Manajemen, kamu sering membuat analisis SWOT, proposal bisnis, rencana pemasaran, dan presentasi strategi. Gunakan tool analisis data dan asisten produktivitas untuk memoles strategi bisnismu.',
    tools: ['Notion AI', 'Julius AI', 'Tableau Public'],
    reasoning: {
      'Notion AI': 'Asisten brainstorming ide bisnis, penyusunan rencana proyek, dan penulisan laporan manajemen yang terstruktur rapi.',
      'Julius AI': 'Menganalisis performa data keuangan atau survei pasar secara otomatis tanpa perlu keahlian statistik rumit.',
      'Tableau Public': 'Membuat infografis dan visualisasi data bisnis interaktif untuk disematkan dalam laporan atau presentasi kelayakan bisnis.'
    }
  },
  'Akuntansi': {
    description: 'Akuntansi membutuhkan ketelitian dalam membaca laporan keuangan, analisis rasio, dan audit. Paduan analisis spreadsheet bertenaga AI dan pembaca dokumen otomatis akan sangat membantumu.',
    tools: ['Julius AI', 'ChatPDF', 'Notion AI'],
    reasoning: {
      'Julius AI': 'Mempermudah analisis tren rasio keuangan dan visualisasi data akuntansi dari file Excel secara instan.',
      'ChatPDF': 'Membantu menelaah laporan tahunan (annual reports) atau regulasi perpajakan yang panjang dalam format PDF.',
      'Notion AI': 'Sangat berguna untuk merapikan standar operating procedure (SOP) keuangan, jurnal pencatatan, dan dokumentasi audit.'
    }
  },
  'Desain Komunikasi Visual': {
    description: 'DKV membutuhkan kreativitas tinggi, visual storytelling, dan branding yang kuat. Gunakan AI sebagai partner diskusi kreatif, penyusun konsep desain (moodboard/storyboard), dan penyunting teks promosi.',
    tools: ['Notion AI', 'QuillBot', 'Perplexity AI'],
    reasoning: {
      'Notion AI': 'Membantumu menulis deskripsi konsep desain, naskah iklan, riset pasar kreatif, dan menyusun portofolio.',
      'QuillBot': 'Membantu memparafrase teks narasi konsep karya desainmu agar terlihat lebih profesional dan memikat kurator.',
      'Perplexity AI': 'Sangat bermanfaat untuk mencari tren desain visual terbaru, sejarah seni, dan referensi studi visual.'
    }
  },
  'Ilmu Komunikasi': {
    description: 'Di Ilmu Komunikasi, kamu akan memproduksi konten, menyusun strategi kampanye PR, riset media, dan menulis naskah. AI dapat mempercepat penyusunan draf, merapikan tulisan, dan melakukan riset audiens.',
    tools: ['Notion AI', 'QuillBot', 'Perplexity AI'],
    reasoning: {
      'Notion AI': 'Sempurna untuk menulis naskah video, draf rilis pers, artikel opini, dan menyusun jadwal kampanye media sosial.',
      'QuillBot': 'Alat parafrase terbaik untuk memoles naskah, essay, atau copywriting agar terdengar lebih mengalir dan persuasif.',
      'Perplexity AI': 'Menemukan data statistik audiens terbaru, berita aktual, dan tren komunikasi massa secara real-time dengan rujukan jelas.'
    }
  },
  'Hukum': {
    description: 'Jurusan Hukum berfokus pada undang-undang, pasal-pasal, yurisprudensi kasus, dan argumen tertulis yang rigid. Menguasai dokumen hukum dan mencari pasal hukum yang valid dengan rujukan jelas adalah kunci utama.',
    tools: ['ChatPDF', 'Perplexity AI', 'QuillBot'],
    reasoning: {
      'ChatPDF': 'Menganalisis berkas putusan pengadilan, draf kontrak, atau undang-undang yang ratusan halaman dengan bertanya langsung.',
      'Perplexity AI': 'Mencari putusan hukum lama, dasar hukum undang-undang tertentu, dan artikel opini hukum dengan menyertakan tautan sumber valid.',
      'QuillBot': 'Membantu memformulasikan ulang kalimat argumen hukum agar lebih formal, padat, dan bebas dari plagiasi akademik.'
    }
  },
  'Ilmu Politik': {
    description: 'Ilmu Politik mengeksplorasi kebijakan publik, teori kekuasaan, dan hubungan internasional. Menganalisis dokumen kebijakan dan memetakan opini publik membutuhkan alat analisis teks dan riset tepercaya.',
    tools: ['Consensus', 'Perplexity AI', 'ChatPDF'],
    reasoning: {
      'Consensus': 'Menemukan studi ilmiah peer-reviewed mengenai dampak kebijakan publik atau studi politik di berbagai belahan dunia.',
      'Perplexity AI': 'Riset dinamika politik ter-update, sejarah kebijakan, dan data pemilu dengan disertai sitasi sumber berita terverifikasi.',
      'ChatPDF': 'Membantu membedah buku teks sosiologi politik, dokumen naskah akademik undang-undang, maupun paper jurnal internasional.'
    }
  },
  'Psikologi': {
    description: 'Mahasiswa Psikologi mempelajari perilaku manusia, melakukan eksperimen/survei, dan menulis laporan penelitian ilmiah. Tool riset akademik dan polishing tulisan akan mempercepat penyusunan tugas akhirmu.',
    tools: ['Scite.ai', 'Grammarly', 'QuillBot'],
    reasoning: {
      'Scite.ai': 'Memastikan teori psikologi yang kamu kutip di jurnal didukung oleh penelitian empiris terkini.',
      'Grammarly': 'Penting untuk merapikan penulisan laporan penelitian psikologi berstandar APA Style dengan tata bahasa Inggris yang presisi.',
      'QuillBot': 'Membantu menyusun ulang penjelasan teori kepribadian atau metodologi psikologi agar terhindar dari plagiarisme.'
    }
  },
  'Sastra Inggris': {
    description: 'Sastra Inggris berfokus pada analisis teks sastra, linguistik, dan kemahiran menulis bahasa Inggris tingkat lanjut. AI penulisan dan parafrase akan sangat mendukung kreativitas dan presisi akademikmu.',
    tools: ['Grammarly', 'QuillBot', 'ChatPDF'],
    reasoning: {
      'Grammarly': 'Asisten tata bahasa Inggris mutlak untuk memastikan tulisan esai sastra atau jurnal linguistikmu bebas dari kesalahan gramatikal.',
      'QuillBot': 'Membantu memparafrase kutipan novel, puisi, atau studi linguistik demi menyusun ulasan kritis yang kaya kosakata.',
      'ChatPDF': 'Memudahakn analisis novel klasik atau naskah drama tebal dalam format PDF dengan pencarian cepat sub-teks tertentu.'
    }
  },
  'Teknik Elektro': {
    description: 'Teknik Elektro menuntut pemahaman sirkuit, pengolahan sinyal, matematika teknik, dan fisika elektro. Analisis data eksperimen dan pencarian spesifikasi komponen elektro adalah makanan sehari-hari.',
    tools: ['Julius AI', 'Perplexity AI', 'GitHub Copilot'],
    reasoning: {
      'Julius AI': 'Membantu memplot grafik data pengukuran tegangan, arus, atau spektrum frekuensi serta menulis program analisis data.',
      'Perplexity AI': 'Mencari lembar data (datasheet) komponen elektronika mikroprosesor, sensor, dan standar IEEE secara instan.',
      'GitHub Copilot': 'Membantu menulis kode firmware untuk mikrokontroler (Arduino, ESP32, STM32) dalam bahasa C/C++.'
    }
  },
  'Teknik Mesin': {
    description: 'Sebagai mahasiswa Teknik Mesin, kamu berkutat dengan dinamika fluida, kekuatan bahan, termodinamika, dan manufaktur. Visualisasi data eksperimen dan pencarian standar industri sangatlah penting.',
    tools: ['Julius AI', 'Perplexity AI', 'ChatPDF'],
    reasoning: {
      'Julius AI': 'Sangat berguna untuk plotting grafik termodinamika, regresi data kekuatan bahan, dan pemrosesan data uji tarik.',
      'Perplexity AI': 'Mencari standar desain mekanikal (seperti standar ASME atau ISO) serta penjelasan rumus-rumus mesin secara instan.',
      'ChatPDF': 'Membantu membaca manual mesin yang panjang, standar keselamatan kerja, atau buku panduan material teknik.'
    }
  },
  'Teknik Sipil': {
    description: 'Teknik Sipil berkaitan dengan desain infrastruktur, mekanika tanah, hidrologi, dan manajemen konstruksi. Gunakan AI untuk menganalisis data beban struktur, riset material baru, dan merangkum standar SNI konstruksi.',
    tools: ['Julius AI', 'Perplexity AI', 'ChatPDF'],
    reasoning: {
      'Julius AI': 'Memudahkan analisis data uji tanah (soil testing) dan pemodelan statistik kekuatan beton.',
      'Perplexity AI': 'Riset material konstruksi ramah lingkungan terbaru, metode struktur bangunan, dan yurisprudensi proyek teknik sipil.',
      'ChatPDF': 'Sangat berguna untuk membedah dokumen SNI (Standar Nasional Indonesia) konstruksi beton/baja yang beratus-ratus halaman.'
    }
  },
  'Arsitektur': {
    description: 'Arsitektur mengombinasikan seni ruang, struktur, dan estetika bangunan. Kamu akan melakukan riset tapak, sejarah arsitektur, dan membuat narasi konsep desain bangunan.',
    tools: ['Notion AI', 'Perplexity AI', 'ChatPDF'],
    reasoning: {
      'Notion AI': 'Membantu merapikan program ruang (space programming), brief proyek desain arsitektur, dan menyusun laporan konsep perancangan.',
      'Perplexity AI': 'Riset cepat mengenai sejarah arsitektur lokal, preseden desain bangunan dari arsitek ternama, dan pencarian material bangunan inovatif.',
      'ChatPDF': 'Membantu memahami regulasi tata kota (Rencana Detail Tata Ruang/RDTR) dan koefisien dasar bangunan di area PDF tertentu.'
    }
  }
};

const fallbackRecommendation = {
  description: 'Gunakan asisten AI riset akademik, penulisan esai, dan manajemen tugas harian untuk melipatgandakan produktivitas kuliahmu di jurusan apa pun.',
  tools: ['Perplexity AI', 'Grammarly', 'Notion AI'],
  reasoning: {
    'Perplexity AI': 'Membantu mencari materi kuliah dan referensi terpercaya dengan sitasi sumber langsung.',
    'Grammarly': 'Membantu menyusun tugas akhir, paper, dan email ke dosen pembimbing dengan bahasa Inggris yang baik.',
    'Notion AI': 'Membantu mengorganisir jadwal kuliah, mencatat materi kelas, dan menyusun rencana belajar harian.'
  }
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
function FeaturedToolCard({ tool, onSave, isSaved, isSaving, onOpenDetail }) {
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
        <h3 
          onClick={() => onOpenDetail(tool.id)}
          style={{ 
            margin: 0, 
            fontSize: 17, 
            fontWeight: 700, 
            cursor: 'pointer',
            transition: 'color 0.2s'
          }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--color-primary)'}
          onMouseLeave={e => e.currentTarget.style.color = 'inherit'}
          title={t('dashboard.viewDetail') || 'Klik untuk melihat detail'}
        >
          {tool.name}
        </h3>
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
function SmallToolCard({ tool, onSave, isSaved, isSaving, onOpenDetail }) {
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
          <span 
            onClick={() => onOpenDetail(tool.id)}
            style={{ 
              fontWeight: 700, 
              fontSize: 14, 
              cursor: 'pointer',
              transition: 'color 0.2s'
            }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--color-primary)'}
            onMouseLeave={e => e.currentTarget.style.color = 'inherit'}
            title={t('dashboard.viewDetail') || 'Klik untuk melihat detail'}
          >
            {tool.name}
          </span>
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
    setUser,
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
  const [selectedJurusan, setSelectedJurusan] = useState(user?.jurusan || 'Teknik Informatika');
  const [isSavingJurusan, setIsSavingJurusan] = useState(false);
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
        iconKey: iconByCategory[detail.category] ?? 'sparkles',
      });
    } catch (error) {
      showToast(t('dashboard.failedLoadTools') || 'Gagal memuat detail tool.', 'error');
    } finally {
      setIsDetailLoading(false);
    }
  };

  useEffect(() => {
    if (user?.jurusan) {
      setSelectedJurusan(user.jurusan);
    }
  }, [user?.jurusan]);

  const handleSetAsActiveMajor = async () => {
    if (!user) return;
    setIsSavingJurusan(true);
    try {
      await profileService.update({
        major: selectedJurusan,
        semester: user.semester || 1,
        language_preference: language || 'id'
      });
      
      setUser((prev) => ({
        ...prev,
        jurusan: selectedJurusan,
      }));
      
      showToast(
        language === 'en' 
          ? `Successfully updated major to ${selectedJurusan}!` 
          : `Berhasil mengubah jurusan utama ke ${selectedJurusan}!`, 
        'success'
      );
    } catch (err) {
      showToast(
        language === 'en'
          ? 'Failed to update major. Please try again.'
          : 'Gagal mengubah jurusan. Silakan coba lagi.',
        'error'
      );
    } finally {
      setIsSavingJurusan(false);
    }
  };
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

    try {
      const params = { per_page: 500 };
      if (category && category !== 'Semua') {
        params.category = category;
      }

      const data = await toolService.list(params);
      setTools((data.tools ?? []).map(normalizeTool));
    } catch (error) {
      const message = error.response?.data?.message ?? t('dashboard.failedLoadTools');
      setToolsError(message);
      setTools([]);
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

      {/* Personalized Major Recommendations Widget */}
      <section className="card" style={{ 
        padding: 24, 
        marginBottom: 28,
        borderTop: '4px solid var(--color-primary)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              background: 'var(--color-primary-light)', 
              color: 'var(--color-primary)',
              padding: 8,
              borderRadius: 12
            }}>
              <AppIcon name="graduation-cap" size={22} color="var(--color-primary)" />
            </span>
            <div>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--color-text-primary)' }}>
                {language === 'en' ? 'Recommended Tools by Major' : 'Rekomendasi Tools Berdasarkan Jurusan'}
              </h2>
              <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--color-text-secondary)' }}>
                {language === 'en' 
                  ? 'AI recommendations tailored specifically to your academic field' 
                  : 'Rekomendasi AI yang disesuaikan khusus untuk bidang studi kamu'}
              </p>
            </div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <select
              value={selectedJurusan}
              onChange={(e) => setSelectedJurusan(e.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: 10,
                border: '1px solid var(--color-border)',
                background: 'var(--color-surface)',
                color: 'var(--color-text-primary)',
                fontWeight: 600,
                fontSize: 13,
                outline: 'none',
                cursor: 'pointer',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              }}
            >
              {JURUSAN_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
            
            {selectedJurusan !== user?.jurusan && (
              <button
                type="button"
                onClick={handleSetAsActiveMajor}
                disabled={isSavingJurusan}
                style={{
                  padding: '8px 14px',
                  borderRadius: 10,
                  border: 'none',
                  background: 'var(--color-primary)',
                  color: '#fff',
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: isSavingJurusan ? 'not-allowed' : 'pointer',
                  opacity: isSavingJurusan ? 0.7 : 1,
                  transition: 'all 0.2s',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <AppIcon name="check" size={14} color="#fff" />
                {isSavingJurusan 
                  ? (language === 'en' ? 'Saving...' : 'Menyimpan...') 
                  : (language === 'en' ? 'Set as My Major' : 'Setel Jurusan')}
              </button>
            )}
          </div>
        </div>

        <div style={{ 
          background: 'var(--color-bg)', 
          padding: '16px 20px', 
          borderRadius: 12, 
          marginBottom: 20,
          borderLeft: '4px solid var(--color-primary)',
        }}>
          <p style={{ margin: 0, fontSize: 13.5, color: 'var(--color-text-primary)', lineHeight: 1.6 }}>
            {RECOMMENDATIONS_BY_MAJOR[selectedJurusan]?.description || fallbackRecommendation.description}
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
          {(RECOMMENDATIONS_BY_MAJOR[selectedJurusan]?.tools || fallbackRecommendation.tools).map((toolName) => {
            const toolObj = tools.find(t => t.name === toolName);
            const reason = RECOMMENDATIONS_BY_MAJOR[selectedJurusan]?.reasoning?.[toolName] || fallbackRecommendation.reasoning[toolName];
            
            if (!toolObj) {
              return (
                <div key={toolName} style={{ 
                  height: 200, 
                  background: 'var(--color-border)', 
                  borderRadius: 14, 
                  animation: 'pulse 1.5s infinite',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--color-text-secondary)',
                  fontSize: 12
                }}>
                  {t('dashboard.loading') || 'Memuat...'}
                </div>
              );
            }

            const isSaved = savedToolIds.has(toolObj.id);
            const isSaving = savingToolIds.includes(toolObj.id);

            return (
              <div
                className="card"
                key={toolObj.id}
                style={{
                  padding: 18,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  transition: 'all 0.2s ease',
                  border: '1px solid var(--color-border)',
                  background: 'var(--color-surface)',
                  borderRadius: 14,
                  position: 'relative',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 8px 20px rgba(108,99,255,0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)';
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <span className={tagClass(toolObj.category)}>{getCategoryLabel(toolObj.category, t)}</span>
                    <PricingBadge pricingType={toolObj.pricingType} />
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <span style={{ display: 'flex' }}><AppIcon name={toolObj.iconKey} size={20} color="var(--color-text-primary)" /></span>
                    <span 
                      onClick={() => handleOpenDetail(toolObj.id)}
                      style={{ 
                        fontWeight: 700, 
                        fontSize: 15, 
                        color: 'var(--color-text-primary)',
                        cursor: 'pointer',
                        transition: 'color 0.2s'
                      }}
                      onMouseEnter={e => e.currentTarget.style.color = 'var(--color-primary)'}
                      onMouseLeave={e => e.currentTarget.style.color = 'var(--color-text-primary)'}
                      title={t('dashboard.viewDetail') || 'Klik untuk melihat detail'}
                    >
                      {toolObj.name}
                    </span>
                  </div>

                  <p style={{ margin: '0 0 12px', fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                    {toolObj.desc}
                  </p>
                  
                  <div style={{
                    padding: '10px 12px',
                    borderRadius: 8,
                    background: 'var(--color-bg)',
                    border: '1px dashed rgba(108,99,255,0.25)',
                    fontSize: 11.5,
                    color: 'var(--color-text-secondary)',
                    lineHeight: 1.5,
                    marginBottom: 16
                  }}>
                    <strong style={{ color: 'var(--color-primary)', display: 'block', marginBottom: 2 }}>
                      {language === 'en' ? '💡 Recommended usage:' : '💡 Penggunaan yang disarankan:'}
                    </strong>
                    {reason}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
                  <button
                    disabled={isSaved || isSaving}
                    onClick={() => handleSaveTool(toolObj)}
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
                    {isSaved ? t('tool.saved') : isSaving ? t('tool.saving') : t('tool.save')}
                  </button>
                  <a
                    href={resolveToolUrl(toolObj.url)} target="_blank" rel="noreferrer"
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
          })}
        </div>
      </section>

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
        ) : (isLoadingTools && visibleFeaturedTools.length === 0) ? (
          <div className="tool-grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            {toolSkeletons}
          </div>
        ) : visibleFeaturedTools.length > 0 ? (
          <div className="tool-grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, opacity: isLoadingTools ? 0.6 : 1, transition: 'opacity 0.2s' }}>
            {visibleFeaturedTools.map(tool => (
              <FeaturedToolCard
                key={tool.id}
                tool={tool}
                onSave={handleSaveTool}
                isSaved={savedToolIds.has(tool.id)}
                isSaving={savingToolIds.includes(tool.id)}
                onOpenDetail={handleOpenDetail}
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
        ) : (isLoadingTools && filteredTools.length === 0) ? (
          <div className="tool-grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            {toolSkeletons}
          </div>
        ) : filteredTools.length > 0 ? (
          <div className="tool-grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, opacity: isLoadingTools ? 0.6 : 1, transition: 'opacity 0.2s' }}>
            {filteredTools.map(tool => (
              <SmallToolCard
                key={tool.id}
                tool={tool}
                onSave={handleSaveTool}
                isSaved={savedToolIds.has(tool.id)}
                isSaving={savingToolIds.includes(tool.id)}
                onOpenDetail={handleOpenDetail}
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
      
      {/* Tool Detail Modal */}
      {selectedDetailTool && (
        <Modal 
          title={selectedDetailTool.name} 
          onClose={() => setSelectedDetailTool(null)}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className={tagClass(selectedDetailTool.category)}>{getCategoryLabel(selectedDetailTool.category, t)}</span>
              <PricingBadge pricingType={selectedDetailTool.pricingType} />
            </div>
            
            <div>
              <h4 style={{ margin: '0 0 6px', fontSize: 12, fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {language === 'en' ? 'Description' : 'Deskripsi'}
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
                <StarRating rating={selectedDetailTool.rating} />
                <a 
                  href={resolveToolUrl(selectedDetailTool.url)} 
                  target="_blank" 
                  rel="noreferrer"
                  style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-primary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}
                >
                  {displayToolUrl(selectedDetailTool.url)} <AppIcon name="external-link" size={14} />
                </a>
              </div>
            </div>

            <div style={{ height: 1, background: 'var(--color-border)', margin: '4px 0' }} />

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                disabled={savedToolIds.has(selectedDetailTool.id) || savingToolIds.includes(selectedDetailTool.id)}
                onClick={() => {
                  handleSaveTool(selectedDetailTool);
                }}
                style={{
                  flex: 1,
                  padding: '10px',
                  fontSize: 13,
                  borderRadius: 10,
                  border: savedToolIds.has(selectedDetailTool.id) ? '1px solid #CBD5E1' : 'none',
                  background: savedToolIds.has(selectedDetailTool.id) ? '#E2E8F0' : 'var(--color-primary-light)',
                  color: savedToolIds.has(selectedDetailTool.id) ? '#64748B' : 'var(--color-primary)',
                  fontWeight: 600,
                  cursor: savedToolIds.has(selectedDetailTool.id) || savingToolIds.includes(selectedDetailTool.id) ? 'not-allowed' : 'pointer',
                }}
              >
                {savedToolIds.has(selectedDetailTool.id) ? t('tool.saved') : savingToolIds.includes(selectedDetailTool.id) ? t('tool.saving') : t('tool.save')}
              </button>
              <a
                href={resolveToolUrl(selectedDetailTool.url)} target="_blank" rel="noreferrer"
                style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'var(--color-primary)', color: '#fff',
                  borderRadius: 10, fontSize: 13, fontWeight: 600, textDecoration: 'none',
                  padding: '10px', transition: 'background 0.2s',
                }}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  {t('tool.open')} <AppIcon name="external-link" size={14} color="#fff" />
                </span>
              </a>
            </div>
          </div>
        </Modal>
      )}

      {/* Loading Overlay for Tool Detail Fetch */}
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
