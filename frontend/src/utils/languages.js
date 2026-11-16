export const SOURCE_LANGUAGES = [
  { code: 'auto', name: 'Auto Detect (Tự động)' },
  { code: 'en', name: 'English (Tiếng Anh)' },
  { code: 'vi', name: 'Vietnamese (Tiếng Việt)' },
  { code: 'ja', name: 'Japanese (Tiếng Nhật)' },
  { code: 'ko', name: 'Korean (Tiếng Hàn)' },
  { code: 'zh', name: 'Chinese (Tiếng Trung)' },
  { code: 'fr', name: 'French (Tiếng Pháp)' },
  { code: 'es', name: 'Spanish (Tiếng Tây Ban Nha)' },
  { code: 'de', name: 'German (Tiếng Đức)' },
  { code: 'ru', name: 'Russian (Tiếng Nga)' },
  { code: 'th', name: 'Thai (Tiếng Thái)' },
];

export const TARGET_LANGUAGES = [
  { code: 'vi', name: 'Vietnamese (Tiếng Việt)' },
  { code: 'en', name: 'English (Tiếng Anh)' },
  { code: 'ja', name: 'Japanese (Tiếng Nhật)' },
  { code: 'ko', name: 'Korean (Tiếng Hàn)' },
  { code: 'zh', name: 'Chinese (Tiếng Trung)' },
  { code: 'fr', name: 'French (Tiếng Pháp)' },
  { code: 'es', name: 'Spanish (Tiếng Tây Ban Nha)' },
  { code: 'de', name: 'German (Tiếng Đức)' },
  { code: 'ru', name: 'Russian (Tiếng Nga)' },
  { code: 'th', name: 'Thai (Tiếng Thái)' },
];

export const getLanguageName = (code) => {
  const found = [...SOURCE_LANGUAGES, ...TARGET_LANGUAGES].find(
    (l) => l.code.toLowerCase() === (code || '').toLowerCase()
  );
  return found ? found.name : code;
};
