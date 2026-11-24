/* ==========================================================================
   CareerBridge - Notifications Center Controller
   ========================================================================== */

(() => {
  'use strict';

  const CB = (window.CB = window.CB || {});

  function initNotificationsPage() {
    const listEl = document.getElementById('notificationsList');
    if (!listEl) return;
    if (!CB.auth.requireAuth()) return;

    let activeFilter = 'all';
    const tabs = document.querySelectorAll('[data-notif-tab]');
    const markAllBtn = document.getElementById('markAllReadBtn');
    const clearAllBtn = document.getElementById('clearAllNotifsBtn');

    function iconForType(type) {
      if (type === 'interview') return { cls: 'bi-calendar2-check', color: 'var(--info)', bg: 'var(--info-bg)' };
      if (type === 'job_alert') return { cls: 'bi-briefcase', color: 'var(--primary)', bg: 'var(--primary-light)' };
      return { cls: 'bi-chat-dots', color: 'var(--accent)', bg: 'var(--accent-light)' };
    }

    function render() {
      const all = CB.storage.get('notifications', []);
      const filtered = all.filter((n) => {
        if (activeFilter === 'unread') return !n.read;
        if (activeFilter === 'all') return true;
        return n.type === activeFilter;
      });

      CB.refreshUnreadBadges();

      if (filtered.length === 0) {
        listEl.innerHTML = `
          <div class="empty-state">
            <div class="empty-state-icon"><i class="bi bi-bell-slash"></i></div>
            <h3>No notifications here</h3>
            <p class="text-muted mt-1">You are all caught up on alerts and recruiter messages.</p>
          </div>
        `;
        return;
      }

      listEl.innerHTML = filtered
        .map((n) => {
          const ic = iconForType(n.type);
          return `
            <article class="notification-item ${n.read ? '' : 'unread'} animate-fade">
              <div class="kpi-icon" style="background:${ic.bg}; color:${ic.color}; width:44px; height:44px;">
                <i class="bi ${ic.cls}"></i>
              </div>
              <div style="flex:1; min-width:0;">
                <div class="flex-between gap-2 flex-wrap">
                  <strong style="font-size:0.96rem;">${CB.format.escapeHTML(n.title)}</strong>
                  <small class="text-muted">${CB.format.relativeDate(n.createdAt)}</small>
                </div>
                <p class="text-secondary mt-1" style="font-size:0.88rem;">${CB.format.escapeHTML(n.message)}</p>
                <div class="flex gap-2 mt-2 flex-wrap">
                  ${n.link ? `<a href="${n.link}" class="btn btn-secondary btn-sm">Open</a>` : ''}
                  <button type="button" class="btn btn-ghost btn-sm" data-toggle-read="${n.id}">
                    <i class="bi ${n.read ? 'bi-envelope' : 'bi-check2-all'}"></i> ${n.read ? 'Mark Unread' : 'Mark Read'}
                  </button>
                  <button type="button" class="btn btn-ghost btn-sm text-danger" data-delete-notif="${n.id}">
                    <i class="bi bi-trash"></i> Remove
                  </button>
                </div>
              </div>
            </article>
          `;
        })
        .join('');

      listEl.querySelectorAll('[data-toggle-read]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const id = btn.getAttribute('data-toggle-read');
          CB.storage.update('notifications', (arr) =>
            arr.map((item) => (item.id === id ? { ...item, read: !item.read } : item))
          );
          render();
        });
      });

      listEl.querySelectorAll('[data-delete-notif]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const id = btn.getAttribute('data-delete-notif');
          CB.storage.update('notifications', (arr) => arr.filter((item) => item.id !== id));
          CB.toast.show('Notification removed.', 'info', 'Removed');
          render();
        });
      });
    }

    tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        tabs.forEach((t) => t.classList.remove('btn-primary'));
        tabs.forEach((t) => t.classList.add('btn-secondary'));
        tab.classList.remove('btn-secondary');
        tab.classList.add('btn-primary');
        activeFilter = tab.getAttribute('data-notif-tab');
        render();
      });
    });

    markAllBtn?.addEventListener('click', () => {
      CB.storage.update('notifications', (arr) => arr.map((n) => ({ ...n, read: true })));
      CB.toast.show('All notifications marked as read.', 'success', 'All Read');
      render();
    });

    clearAllBtn?.addEventListener('click', () => {
      CB.modal.confirm({
        title: 'Clear All Notifications?',
        message: 'This will remove all notifications from your inbox.',
        confirmText: 'Clear All',
        danger: true,
        onConfirm: () => {
          CB.storage.set('notifications', []);
          render();
        }
      });
    });

    render();
  }

  document.addEventListener('DOMContentLoaded', initNotificationsPage);
})();
