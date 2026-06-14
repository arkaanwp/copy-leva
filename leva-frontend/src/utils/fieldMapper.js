export function mapOnboardingToApi(form) {
  return {
    major: form.jurusan,
    semester: parseInt(form.semester, 10),
    language_preference: form.bahasa === 'Indonesia' ? 'id' : 'en',
    learning_style: form.learning_style || form.learningStyle || 'visual',
  };
}

export const PRIORITY_LABELS = {
  must_try: { label: 'Wajib Dicoba', color: '#DC2626', bg: '#FEE2E2' },
  very_good: { label: 'Sangat Bagus', color: '#059669', bg: '#D1FAE5' },
  niche: { label: 'Bagus/Niche', color: '#B45309', bg: '#FEF3C7' },
  optional: { label: 'Opsional', color: '#64748B', bg: '#F1F5F9' },
};
