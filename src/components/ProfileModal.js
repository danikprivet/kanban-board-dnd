import React, { useEffect, useState } from 'react';
import Modal from './Modal';

import { api } from '../api';
import { useAuth } from '../auth/AuthContext';

export default function ProfileModal({ open, onClose }) {

  const { refreshUser } = useAuth();
  const [form, setForm] = useState({ name: '', avatar_url: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const emojiOptions = ['😀','😎','🧐','🤓','🦊','🐼','🐯','🐵','🐱','🐶','🦄','🐨','🐸','🐙','🐧','🐢'];

  useEffect(() => {
    async function load() {
      if (!open) return;
      setError(null);
      try {
        const response = await api.get('/auth/me');
        const me = response.success ? response.data : null;
        setForm({ name: me?.name || '', avatar_url: me?.avatar_url || '', password: '' });
      } catch (e) {
        setError(e.message);
      }
    }
    load();
  }, [open]);

  function onPickEmoji(emoji) {
    setForm((f) => ({ ...f, avatar_url: `emoji:${emoji}` }));
  }

  async function onPickFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('avatar', file);
      
      // Upload file to server
      const uploadResponse = await api.post('/upload/avatar', formData);
      if (uploadResponse.success) {
        const newAvatarUrl = uploadResponse.data.url;
        setForm((f) => ({ ...f, avatar_url: newAvatarUrl }));
        // Обновляем пользователя в контексте
        await refreshUser();
      } else {
        throw new Error(uploadResponse.error || 'Upload failed');
      }
    } catch (err) {
      console.error(err);
      alert('Не удалось загрузить аватар');
    }
  }

  async function save(e) {
    e.preventDefault();
    try {
      await api.put('/auth/me', form);
      await refreshUser();
      onClose?.();
      alert('Профиль сохранён');
    } catch (e) {
      setError(e.message);
      alert(e.message || 'Ошибка сохранения профиля');
    }
  }

  return (
    <Modal title="Профиль" open={open} onClose={onClose} style={{ minWidth: 400 }}>
      <form onSubmit={save}>
          {error && <div style={{ color: 'crimson', marginBottom: 8 }}>{error instanceof Error ? error.message : String(error)}</div>}
          
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 6, color: 'var(--text-secondary)' }}>Имя</label>
            <input 
              value={form.name} 
              onChange={(e) => setForm({ ...form, name: e.target.value })} 
              style={{ 
                width: '100%', 
                padding: '10px 12px', 
                borderRadius: 6, 
                border: '1px solid var(--border)', 
                background: 'var(--surface)', 
                color: 'var(--text)',
                boxSizing: 'border-box'
              }} 
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 48, height: 48, borderRadius: '50%',
                background: 'var(--surface-alt)', border: '1px solid var(--border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24,
                overflow: 'hidden',
                flexShrink: 0
              }}>
                {form.avatar_url?.startsWith('emoji:') ? (
                  <span>{form.avatar_url.replace('emoji:', '')}</span>
                ) : form.avatar_url?.startsWith('/uploads/') ? (
                  <img alt="avatar" src={form.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : form.avatar_url ? (
                  <img alt="avatar" src={form.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span>👤</span>
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <label style={{ display: 'block', marginBottom: 6, color: 'var(--text-secondary)' }}>Аватар</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <label style={{ 
                    padding: '6px 10px', 
                    borderRadius: 6, 
                    border: '1px solid var(--border)', 
                    background: 'var(--surface-alt)', 
                    color: 'var(--text)', 
                    cursor: 'pointer',
                    flexShrink: 0
                  }}>
                    Загрузить фото
                    <input type="file" accept="image/*" onChange={onPickFile} style={{ display: 'none' }} />
                  </label>
                  {form.avatar_url && (
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, avatar_url: '' })}
                      style={{
                        padding: '6px 10px',
                        borderRadius: 6,
                        border: '1px solid var(--error)',
                        background: 'transparent',
                        color: 'var(--error)',
                        cursor: 'pointer',
                        fontWeight: 500,
                        fontSize: 14,
                        transition: 'all 0.2s ease'
                      }}
                      onMouseOver={(e) => {
                        e.target.style.background = 'var(--error)';
                        e.target.style.color = '#fff';
                      }}
                      onMouseOut={(e) => {
                        e.target.style.background = 'transparent';
                        e.target.style.color = 'var(--error)';
                      }}
                    >
                      Удалить
                    </button>
                  )}
                  <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>до ~1MB, будет сохранён как data URL</span>
                </div>
              </div>
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 6, color: 'var(--text-secondary)' }}>Быстрый выбор эмодзи</label>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, 32px)', 
              gap: 6,
              maxWidth: '100%'
            }}>
              {emojiOptions.map((e) => (
                <button key={e} type="button" onClick={() => onPickEmoji(e)} style={{
                  width: 32, height: 32, borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface)', cursor: 'pointer'
                }}>
                  {e}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 6, color: 'var(--text-secondary)' }}>Пароль (опционально)</label>
            <div style={{ position: 'relative' }}>
              <input 
                type={showPassword ? "text" : "password"}
                value={form.password} 
                onChange={(e) => setForm({ ...form, password: e.target.value })} 
                placeholder="Новый пароль" 
                style={{ 
                  width: '100%', 
                  padding: '10px 12px', 
                  paddingRight: '40px',
                  borderRadius: 6, 
                  border: '1px solid var(--border)', 
                  background: 'var(--surface)', 
                  color: 'var(--text)',
                  boxSizing: 'border-box'
                }} 
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '8px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                  color: 'var(--text-secondary)',
                  fontSize: '16px'
                }}
              >
                {showPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
          </div>

          <div className="modal-form-actions" style={{ 
            display: 'flex', 
            justifyContent: 'flex-end', 
            gap: '12px',
            marginTop: '24px',
            paddingTop: '16px',
            borderTop: 'none'
          }}>
            <button 
              type="button" 
              onClick={onClose} 
              style={{ 
                padding: '12px 20px', 
                borderRadius: '8px', 
                border: '1px solid var(--border)', 
                background: 'var(--surface-alt)', 
                color: 'var(--text)', 
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '14px',
                transition: 'all 0.2s ease'
              }}
            >
              Отмена
            </button>
            <button 
              type="submit" 
              style={{ 
                padding: '12px 20px', 
                borderRadius: '8px', 
                border: 'none', 
                background: 'var(--primary)', 
                color: '#fff', 
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '14px',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                transition: 'all 0.2s ease'
              }}
            >
              Сохранить
            </button>
          </div>
        </form>
    </Modal>
  );
}
