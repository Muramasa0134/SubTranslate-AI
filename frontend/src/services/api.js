import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// App configuration & API Key
export const getConfig = async () => {
  const response = await api.get('/config');
  return response.data;
};

export const setApiKey = async (apiKey) => {
  const response = await api.post('/config/api-key', { api_key: apiKey });
  return response.data;
};

// SRT Operations
export const parseSrtFile = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await api.post('/srt/parse', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

export const translateSrtItems = async ({ 
  items, 
  source_language, 
  target_language, 
  translation_style,
  context_hint,
  file_name, 
  api_key 
}) => {
  const response = await api.post('/srt/translate', {
    items,
    source_language,
    target_language,
    translation_style,
    context_hint,
    file_name,
    api_key,
  });
  return response.data;
};

// Video Operations
export const translateVideoFile = async ({
  file,
  source_language,
  target_language,
  translation_style,
  context_hint,
  api_key,
  font_size,
  font_color,
  outline_color,
  border_style,
  position,
  preset = 'ultrafast',
  onUploadProgress,
}) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('source_language', source_language);
  formData.append('target_language', target_language);
  if (translation_style) formData.append('translation_style', translation_style);
  if (context_hint) formData.append('context_hint', context_hint);
  if (preset) formData.append('preset', preset);
  if (api_key) {
    formData.append('api_key', api_key);
  }
  if (font_size) formData.append('font_size', font_size);
  if (font_color) formData.append('font_color', font_color);
  if (outline_color) formData.append('outline_color', outline_color);
  if (border_style) formData.append('border_style', border_style);
  if (position) formData.append('position', position);

  const response = await api.post('/video/translate', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress,
    timeout: 600000, // 10 minutes for longer video processing
  });
  return response.data;
};

export const renderSubtitledVideo = async ({ jobId, config, items }) => {
  const response = await api.post(
    '/video/render-subtitled',
    { job_id: jobId, config, items },
    { timeout: 300000 }
  );
  return response.data;
};

// Subtitle Export & Save
export const exportSubtitlesFile = async ({ items, file_name, use_translated = true }) => {
  const response = await api.post(
    '/subtitles/export',
    { items, file_name, use_translated },
    { responseType: 'blob' }
  );

  // Trigger browser download
  const blob = new Blob([response.data], { type: 'application/x-subrip' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', file_name || 'subtitles.srt');
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

export const exportMp4Video = async ({ jobId, config, items, fileName }) => {
  const response = await api.post(
    '/video/export-mp4',
    { job_id: jobId, config, items },
    { responseType: 'blob', timeout: 300000 }
  );

  const defaultName = fileName ? fileName.replace(/\.[^/.]+$/, "") : 'video';
  const outName = `${defaultName}_${config?.subtitles_source || 'translated'}_subtitled.mp4`;

  const blob = new Blob([response.data], { type: 'video/mp4' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', outName);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

export const saveJobSubtitles = async (jobId, items) => {
  const response = await api.put(`/history/${jobId}/subtitles`, { items });
  return response.data;
};

// History Operations
export const getHistoryList = async () => {
  const response = await api.get('/history');
  return response.data;
};

export const getHistoryItem = async (jobId) => {
  const response = await api.get(`/history/${jobId}`);
  return response.data;
};

export const deleteHistoryItem = async (jobId) => {
  const response = await api.delete(`/history/${jobId}`);
  return response.data;
};

export default api;
