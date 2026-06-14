import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  Sparkles, GraduationCap, Library, MessageCircle,
  ArrowRight, Check, ChevronDown, BookOpen, Bot, Flame,
} from 'lucide-react';

const PRIMARY = '#6C63FF';
const PRIMARY_DARK = '#5A52D5';
const PRIMARY_LIGHT = '#EEF0FF';
const SECONDARY = '#10B981';
const SECONDARY_LIGHT = '#D1FAE5';
const ACCENT = '#F59E0B';
const DARK = '#1E1E2F';
const TEXT = '#1A1A2E';
const TEXT_SECONDARY = '#64748B';
const BORDER = '#E2E8F0';
const BG = '#F8F9FC';

const FEATURES = [
  {
    icon: <Sparkles size={24} color={PRIMARY} />,
    bg: PRIMARY_LIGHT,
    title: 'Rekomendasi Berbasis AI',
    desc: 'RAG engine yang memahami jurusan, semester, dan gaya belajarmu — bukan rekomendasi generik.',
  },
  {
    icon: <Library size={24} color={SECONDARY} />,
    bg: SECONDARY_LIGHT,
    title: 'Library AI Tools Terkurasi',
    desc: 'Ratusan tools dikurasi khusus untuk mahasiswa Indonesia, bukan sekadar daftar panjang yang membingungkan.',
  },
  {
    icon: <MessageCircle size={24} color={ACCENT} />,
    bg: '#FEF3C7',
    title: 'Chat & Task Planner',
    desc: 'Tanyakan apa saja soal tools atau tugasmu. Leva bantu kamu breakdown tugas jadi langkah yang jelas.',
  },
  {
    icon: <GraduationCap size={24} color='#8B5CF6' />,
    bg: '#F3E8FF',
    title: 'Dipersonalisasi per Jurusan',
    desc: 'Mahasiswa Teknik Informatika? Desain? Hukum? Leva paham kebutuhan spesifik setiap jurusan.',
  },
];

const STEPS = [
  {
    num: '01',
    icon: <GraduationCap size={20} color={PRIMARY} />,
    title: 'Isi Profil Akademikmu',
    desc: 'Jurusan, semester, dan gaya belajar — hanya butuh 2 menit.',
  },
  {
    num: '02',
    icon: <Sparkles size={20} color={SECONDARY} />,
    title: 'Dapatkan Rekomendasi Instan',
    desc: 'AI Leva langsung merekomendasikan tools paling relevan untukmu.',
  },
  {
    num: '03',
    icon: <Flame size={20} color={ACCENT} />,
    title: 'Simpan & Gunakan',
    desc: 'Bookmark tools favoritmu dan mulai tingkatkan produktivitas kuliah.',
  },
];

const TESTIMONIALS = [
  {
    name: 'Rafi A.',
    major: 'Teknik Informatika, Sem 5',
    text: 'Leva bikin gue nemuin tools yang gue butuhkan tanpa harus scroll Twitter berjam-jam.',
    avatar: 'R',
    color: PRIMARY,
  },
  {
    name: 'Siti N.',
    major: 'Desain Komunikasi Visual, Sem 3',
    text: 'Akhirnya ada platform yang ngerti bedanya kebutuhan desainer sama yang lain!',
    avatar: 'S',
    color: SECONDARY,
  },
  {
    name: 'Bima P.',
    major: 'Manajemen, Sem 7',
    text: 'Task planner-nya keren banget — ngebantu gue skripsi dengan lebih terstruktur.',
    avatar: 'B',
    color: ACCENT,
  },
];

function Navbar({ onLogin, onRegister }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000,
      background: scrolled ? 'rgba(255,255,255,0.95)' : 'transparent',
      backdropFilter: scrolled ? 'blur(12px)' : 'none',
      borderBottom: scrolled ? `1px solid ${BORDER}` : 'none',
      transition: 'all 0.3s ease',
      padding: '0 24px',
    }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64 }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: `linear-gradient(135deg, ${PRIMARY}, ${PRIMARY_DARK})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Sparkles size={18} color="#fff" />
          </div>
          <span style={{ fontSize: 20, fontWeight: 800, color: scrolled ? TEXT : '#fff', letterSpacing: '-0.3px' }}>Leva</span>
        </div>

        {/* Nav Links - hidden on mobile */}
        <div className="landing-nav-links" style={{ display: 'flex', gap: 32, alignItems: 'center' }}>
          {['Fitur', 'Cara Kerja', 'Testimoni'].map(label => (
            <a
              key={label}
              href={`#${label.toLowerCase().replace(' ', '-')}`}
              style={{
                fontSize: 14, fontWeight: 500,
                color: scrolled ? TEXT_SECONDARY : 'rgba(255,255,255,0.8)',
                textDecoration: 'none', transition: 'color 0.2s',
              }}
              onMouseEnter={e => { e.target.style.color = scrolled ? TEXT : '#fff'; }}
              onMouseLeave={e => { e.target.style.color = scrolled ? TEXT_SECONDARY : 'rgba(255,255,255,0.8)'; }}
            >
              {label}
            </a>
          ))}
        </div>

        {/* CTA */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button
            onClick={onLogin}
            style={{
              padding: '8px 18px', borderRadius: 8, border: `1px solid ${scrolled ? BORDER : 'rgba(255,255,255,0.4)'}`,
              background: 'transparent', color: scrolled ? TEXT : '#fff',
              fontSize: 14, fontWeight: 500, cursor: 'pointer', transition: 'all 0.2s',
            }}
          >
            Masuk
          </button>
          <button
            onClick={onRegister}
            style={{
              padding: '8px 18px', borderRadius: 8, border: 'none',
              background: scrolled ? PRIMARY : '#fff',
              color: scrolled ? '#fff' : PRIMARY,
              fontSize: 14, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
            }}
          >
            Mulai Gratis
          </button>
        </div>
      </div>
    </nav>
  );
}

function Hero({ onRegister, onLogin }) {
  return (
    <section style={{
      minHeight: '100vh',
      background: `linear-gradient(160deg, ${DARK} 0%, #2D2D4E 50%, #1A1A3E 100%)`,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      textAlign: 'center', padding: '100px 24px 80px',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Decorative blobs */}
      <div style={{
        position: 'absolute', top: '15%', left: '10%',
        width: 300, height: 300, borderRadius: '50%',
        background: `radial-gradient(circle, ${PRIMARY}33 0%, transparent 70%)`,
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: '20%', right: '8%',
        width: 250, height: 250, borderRadius: '50%',
        background: `radial-gradient(circle, ${SECONDARY}28 0%, transparent 70%)`,
        pointerEvents: 'none',
      }} />

      <div style={{ position: 'relative', maxWidth: 720 }}>
        {/* Badge */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          background: 'rgba(108,99,255,0.15)', border: '1px solid rgba(108,99,255,0.3)',
          borderRadius: 999, padding: '6px 14px', marginBottom: 28,
        }}>
          <Sparkles size={13} color={PRIMARY} />
          <span style={{ fontSize: 13, fontWeight: 600, color: '#A5B4FC', letterSpacing: '0.3px' }}>
            AI Tools Curator untuk Mahasiswa Indonesia
          </span>
        </div>

        <h1 style={{
          fontSize: 'clamp(36px, 6vw, 64px)', fontWeight: 800, lineHeight: 1.12,
          color: '#FFFFFF', margin: '0 0 20px', letterSpacing: '-1px',
        }}>
          Temukan AI Tools{' '}
          <span style={{ color: PRIMARY }}>yang Tepat</span>{' '}
          untuk Kuliahmu
        </h1>

        <p style={{
          fontSize: 'clamp(15px, 2.2vw, 18px)', color: 'rgba(255,255,255,0.65)',
          lineHeight: 1.7, margin: '0 auto 36px', maxWidth: 540,
        }}>
          Leva menggunakan AI untuk merekomendasikan tools yang benar‑benar relevan dengan
          jurusan, semester, dan gaya belajarmu — bukan daftar generik yang sama untuk semua orang.
        </p>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={onRegister}
            style={{
              padding: '14px 28px', borderRadius: 10, border: 'none',
              background: `linear-gradient(135deg, ${PRIMARY}, ${PRIMARY_DARK})`,
              color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 8,
              boxShadow: `0 8px 24px ${PRIMARY}55`,
              transition: 'transform 0.2s, box-shadow 0.2s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = `0 12px 32px ${PRIMARY}77`;
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = `0 8px 24px ${PRIMARY}55`;
            }}
          >
            Mulai Gratis Sekarang
            <ArrowRight size={16} />
          </button>
          <button
            onClick={onLogin}
            style={{
              padding: '14px 28px', borderRadius: 10,
              border: '1px solid rgba(255,255,255,0.2)',
              background: 'rgba(255,255,255,0.07)', backdropFilter: 'blur(8px)',
              color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer',
              transition: 'background 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.13)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; }}
          >
            Sudah punya akun? Masuk
          </button>
        </div>

        {/* Trust signal */}
        <p style={{ marginTop: 20, fontSize: 13, color: 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <Check size={13} color={SECONDARY} />
          Gratis selamanya · Tidak perlu kartu kredit
        </p>
      </div>

      {/* Stats */}
      <div style={{
        position: 'relative', marginTop: 64,
        display: 'flex', gap: 0, flexWrap: 'wrap', justifyContent: 'center',
        background: 'rgba(255,255,255,0.05)', borderRadius: 16,
        border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(12px)',
        padding: '24px 40px', maxWidth: 600, width: '100%',
      }}>
        {[
          { num: '200+', label: 'AI Tools Terkurasi' },
          { num: '18+', label: 'Jurusan Didukung' },
          { num: '3 Detik', label: 'Rekomendasi Instan' },
        ].map((stat, i) => (
          <div key={stat.label} style={{
            flex: 1, minWidth: 140, textAlign: 'center',
            borderRight: i < 2 ? '1px solid rgba(255,255,255,0.1)' : 'none',
            padding: '0 24px',
          }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#fff', letterSpacing: '-0.5px' }}>{stat.num}</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 4, fontWeight: 500 }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Scroll cue */}
      <div style={{ position: 'absolute', bottom: 28, left: '50%', transform: 'translateX(-50%)', opacity: 0.4 }}>
        <ChevronDown size={20} color="#fff" style={{ animation: 'bounce 2s infinite' }} />
      </div>

      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(6px); }
        }
        @media (max-width: 640px) {
          .landing-nav-links { display: none !important; }
        }
      `}</style>
    </section>
  );
}

function Features() {
  return (
    <section id="fitur" style={{ padding: '80px 24px', background: BG }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <div style={{
            display: 'inline-block', background: PRIMARY_LIGHT,
            color: PRIMARY, borderRadius: 999, padding: '5px 14px',
            fontSize: 13, fontWeight: 600, marginBottom: 16,
          }}>
            Fitur Unggulan
          </div>
          <h2 style={{ fontSize: 'clamp(26px, 4vw, 40px)', fontWeight: 800, color: TEXT, margin: 0, letterSpacing: '-0.5px' }}>
            Semua yang Kamu Butuhkan
          </h2>
          <p style={{ color: TEXT_SECONDARY, marginTop: 12, fontSize: 16, maxWidth: 480, margin: '12px auto 0' }}>
            Dirancang khusus untuk mahasiswa Indonesia yang ingin produktif dengan bantuan AI.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20 }}>
          {FEATURES.map((f) => (
            <div
              key={f.title}
              style={{
                background: '#fff', borderRadius: 16, padding: 28,
                border: `1px solid ${BORDER}`,
                boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
                transition: 'transform 0.2s, box-shadow 0.2s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.1)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.04)';
              }}
            >
              <div style={{
                width: 48, height: 48, borderRadius: 12,
                background: f.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: 18,
              }}>
                {f.icon}
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: TEXT, margin: '0 0 8px' }}>{f.title}</h3>
              <p style={{ fontSize: 14, color: TEXT_SECONDARY, lineHeight: 1.6, margin: 0 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  return (
    <section id="cara-kerja" style={{ padding: '80px 24px', background: '#fff' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <div style={{
            display: 'inline-block', background: SECONDARY_LIGHT,
            color: SECONDARY, borderRadius: 999, padding: '5px 14px',
            fontSize: 13, fontWeight: 600, marginBottom: 16,
          }}>
            Cara Kerja
          </div>
          <h2 style={{ fontSize: 'clamp(26px, 4vw, 40px)', fontWeight: 800, color: TEXT, margin: 0, letterSpacing: '-0.5px' }}>
            Mulai dalam 3 Langkah
          </h2>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {STEPS.map((step, i) => (
            <div
              key={step.num}
              style={{
                display: 'flex', gap: 28, alignItems: 'flex-start',
                padding: '28px 0', borderBottom: i < STEPS.length - 1 ? `1px solid ${BORDER}` : 'none',
              }}
            >
              <div style={{ flexShrink: 0 }}>
                <div style={{
                  width: 52, height: 52, borderRadius: 14,
                  background: i === 0 ? PRIMARY_LIGHT : i === 1 ? SECONDARY_LIGHT : '#FEF3C7',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {step.icon}
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6,
                }}>
                  <span style={{
                    fontSize: 11, fontWeight: 700, color: TEXT_SECONDARY,
                    letterSpacing: '1px', textTransform: 'uppercase',
                  }}>
                    {step.num}
                  </span>
                  <div style={{ flex: 1, height: 1, background: BORDER }} />
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: TEXT, margin: '0 0 8px' }}>{step.title}</h3>
                <p style={{ fontSize: 15, color: TEXT_SECONDARY, lineHeight: 1.6, margin: 0 }}>{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Testimonials() {
  return (
    <section id="testimoni" style={{ padding: '80px 24px', background: BG }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div style={{
            display: 'inline-block', background: '#FEF3C7',
            color: ACCENT, borderRadius: 999, padding: '5px 14px',
            fontSize: 13, fontWeight: 600, marginBottom: 16,
          }}>
            Testimoni
          </div>
          <h2 style={{ fontSize: 'clamp(26px, 4vw, 40px)', fontWeight: 800, color: TEXT, margin: 0, letterSpacing: '-0.5px' }}>
            Kata Mahasiswa yang Sudah Pakai
          </h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
          {TESTIMONIALS.map((t) => (
            <div
              key={t.name}
              style={{
                background: '#fff', borderRadius: 16, padding: 28,
                border: `1px solid ${BORDER}`,
                boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
              }}
            >
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: '50%',
                  background: t.color, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 16, fontWeight: 700, color: '#fff', flexShrink: 0,
                }}>
                  {t.avatar}
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: TEXT }}>{t.name}</div>
                  <div style={{ fontSize: 12, color: TEXT_SECONDARY }}>{t.major}</div>
                </div>
              </div>
              <p style={{ fontSize: 15, color: TEXT_SECONDARY, lineHeight: 1.65, margin: 0, fontStyle: 'italic' }}>
                "{t.text}"
              </p>
              <div style={{ display: 'flex', gap: 2, marginTop: 16 }}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <span key={i} style={{ color: ACCENT, fontSize: 14 }}>★</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTASection({ onRegister }) {
  return (
    <section style={{ padding: '80px 24px' }}>
      <div style={{ maxWidth: 700, margin: '0 auto', textAlign: 'center' }}>
        <div style={{
          background: `linear-gradient(135deg, ${DARK} 0%, #2D2D4E 100%)`,
          borderRadius: 24, padding: '56px 40px',
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', top: '-30px', right: '-30px',
            width: 160, height: 160, borderRadius: '50%',
            background: `radial-gradient(circle, ${PRIMARY}33, transparent 70%)`,
            pointerEvents: 'none',
          }} />
          <div style={{ position: 'relative' }}>
            <div style={{ fontSize: 36, marginBottom: 16 }}>🚀</div>
            <h2 style={{ fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: 800, color: '#fff', margin: '0 0 12px', letterSpacing: '-0.5px' }}>
              Siap Tingkatkan Produktivitas Kuliah?
            </h2>
            <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.6)', margin: '0 0 32px', lineHeight: 1.65 }}>
              Bergabunglah dan temukan AI tools yang memang cocok untuk kamu — gratis, selamanya.
            </p>
            <button
              onClick={onRegister}
              style={{
                padding: '14px 32px', borderRadius: 10, border: 'none',
                background: `linear-gradient(135deg, ${PRIMARY}, ${PRIMARY_DARK})`,
                color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer',
                display: 'inline-flex', alignItems: 'center', gap: 8,
                boxShadow: `0 8px 24px ${PRIMARY}55`,
                transition: 'transform 0.2s, box-shadow 0.2s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = `0 12px 32px ${PRIMARY}77`;
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = `0 8px 24px ${PRIMARY}55`;
              }}
            >
              Daftar Sekarang — Gratis
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer style={{
      background: DARK, padding: '32px 24px',
      borderTop: '1px solid rgba(255,255,255,0.06)',
    }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: `linear-gradient(135deg, ${PRIMARY}, ${PRIMARY_DARK})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Sparkles size={15} color="#fff" />
          </div>
          <span style={{ fontSize: 16, fontWeight: 800, color: '#fff' }}>Leva</span>
        </div>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', margin: 0 }}>
          © {new Date().getFullYear()} Leva · AI Tools Curator untuk Mahasiswa Indonesia
        </p>
      </div>
    </footer>
  );
}

export default function LandingView() {
  const { enterApp } = useApp();

  const goToRegister = () => enterApp('register');
  const goToLogin = () => enterApp('login');

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", overflowX: 'hidden' }}>
      <Navbar onLogin={goToLogin} onRegister={goToRegister} />
      <Hero onRegister={goToRegister} onLogin={goToLogin} />
      <Features />
      <HowItWorks />
      <Testimonials />
      <CTASection onRegister={goToRegister} />
      <Footer />
    </div>
  );
}
