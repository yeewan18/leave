const ManagerUI = {
  comments: {}, // requestId -> draft comment (survives re-render)
  error: null,

  render(el) {
    const me = Store.current;
    const pending = Store.pendingForManager(me.id).sort((a, b) => (a.start > b.start ? 1 : -1));

    const items = pending.map((r) => {
      const emp = Store.user(r.userId);
      const overlaps = Store.getOverlaps(r);
      const bal = Store.getBalance(r.userId, r.type);
      const overlapHtml = overlaps.length
        ? `<div class="overlap warn"><strong>⚠ ${overlaps.length} teammate(s) also off during this period:</strong><ul>${overlaps.map((o) =>
            `<li>${esc(Store.user(o.userId).name)} — ${LEAVE_TYPES[o.type].label}, ${rangeText(o)} ${badge(o.status)}</li>`).join('')}</ul></div>`
        : '<div class="overlap ok">✓ No overlapping leave in the team.</div>';
      return `<article class="card request" data-id="${r.id}">
        <header><h3>${esc(emp.name)}</h3>
          <span class="tag" style="--c:${LEAVE_TYPES[r.type].color}">${LEAVE_TYPES[r.type].label}</span></header>
        <p><strong>${rangeText(r)}</strong> · ${r.days} working day(s)</p>
        <p class="muted">Reason: ${esc(r.reason) || '—'}</p>
        <p class="muted">Balance: ${bal.remaining === null ? 'uncapped' : `${bal.remaining} of ${bal.entitlement} remaining`}</p>
        ${overlapHtml}
        <label>Comment <textarea data-comment="${r.id}" rows="2" placeholder="Optional note to the employee">${esc(this.comments[r.id] || '')}</textarea></label>
        <div class="actions">
          <button class="approve" data-act="approve">Approve</button>
          <button class="reject" data-act="reject">Reject</button>
          <button class="link" data-act="calendar">View in calendar</button>
        </div></article>`;
    }).join('');

    el.innerHTML = `<h2>Approval queue <span class="count">${pending.length}</span></h2>
      ${this.error ? `<div class="msg err">${esc(this.error)}</div>` : ''}
      ${items || '<p class="muted">Nothing waiting for approval. 🎉</p>'}`;

    el.querySelectorAll('textarea[data-comment]').forEach((t) =>
      t.addEventListener('input', () => { this.comments[t.dataset.comment] = t.value; }));
    el.querySelectorAll('button[data-act]').forEach((b) =>
      b.addEventListener('click', () => {
        const id = b.closest('.request').dataset.id;
        if (b.dataset.act === 'calendar') {
          const r = Store.state.requests.find((x) => x.id === id);
          CalendarUI.focus(r);
          return App.go('calendar');
        }
        const res = Store.decide(id, b.dataset.act === 'approve', this.comments[id]);
        this.error = res.ok ? null : res.error;
        if (res.ok) delete this.comments[id];
        App.render();
      }));
  },
};
