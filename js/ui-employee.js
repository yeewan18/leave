const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const niceDate = (s) => Workdays.parse(s).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
const rangeText = (r) => (r.start === r.end ? niceDate(r.start) : `${niceDate(r.start)} – ${niceDate(r.end)}`);
const badge = (status) => `<span class="badge ${status}">${status}</span>`;

const EmployeeUI = {
  formState: { type: 'annual', start: '', end: '', reason: '' },
  message: null, // {kind:'ok'|'err', text}

  render(el) {
    const me = Store.current;
    const types = Object.entries(LEAVE_TYPES).filter(([k]) => k !== 'childcare' || me.hasKids);
    if (!types.some(([k]) => k === this.formState.type)) this.formState.type = 'annual';
    const cards = Object.entries(LEAVE_TYPES).map(([key, t]) => {
      if (key === 'childcare' && !me.hasKids) {
        return `<div class="card balance" style="--c:#9ca3af"><h3>${t.label}</h3>
          <div class="big">N/A</div><p class="muted">Not applicable (no children)</p></div>`;
      }
      const b = Store.getBalance(me.id, key);
      const capped = b.entitlement !== null;
      const pct = capped ? Math.min(100, Math.round((b.taken / b.entitlement) * 100)) : 0;
      return `<div class="card balance" style="--c:${t.color}">
        <h3>${t.label}</h3>
        <div class="big">${capped ? b.remaining : '∞'}<small> ${capped ? 'days left' : 'no cap'}</small></div>
        ${capped ? `<div class="bar"><span style="width:${pct}%"></span></div>` : ''}
        <dl><div><dt>Entitlement</dt><dd>${capped ? b.entitlement : '—'}</dd></div>
        <div><dt>Taken</dt><dd>${b.taken}</dd></div>
        <div><dt>Remaining</dt><dd>${capped ? b.remaining : '—'}</dd></div></dl>
        ${b.pending ? `<p class="muted">${b.pending} day(s) pending approval</p>` : ''}
      </div>`;
    }).join('');

    const f = this.formState;
    const days = f.start && f.end ? Store.countDays(f.start, f.end) : null;
    const opts = types
      .map(([k, t]) => `<option value="${k}" ${f.type === k ? 'selected' : ''}>${t.label}</option>`).join('');

    const mine = Store.state.requests.filter((r) => r.userId === me.id)
      .sort((a, b) => (b.start > a.start ? 1 : -1));
    const rows = mine.map((r) => `<tr>
      <td>${esc(me.name)}</td><td>${LEAVE_TYPES[r.type].label}</td><td>${rangeText(r)}</td><td>${r.days}</td>
      <td>${esc(r.reason)}</td><td>${badge(r.status)}</td><td>${esc(r.managerComment) || '<span class="muted">—</span>'}</td></tr>`).join('');

    el.innerHTML = `
      <h2>My leave balance — ${esc(me.name)} <span class="muted">(${esc(me.team)})</span></h2><div class="cards">${cards}</div>
      <h2>Apply for leave</h2>
      <form id="leave-form" class="card form">
        <label class="wide">Employee <input type="text" value="${esc(me.name)}" readonly></label>
        <label>Type <select name="type">${opts}</select></label>
        <label>From <input type="date" name="start" value="${f.start}"></label>
        <label>To <input type="date" name="end" value="${f.end}" min="${f.start}"></label>
        <label class="wide">Reason ${f.type === 'unpaid' ? '(required)' : '(optional)'} <textarea name="reason" rows="2">${esc(f.reason)}</textarea></label>
        <div class="wide preview">${days === null ? 'Pick dates to see working days.' :
          `<strong>${days}</strong> working day(s) <span class="muted">(weekends and public holidays excluded)</span>`}</div>
        ${this.message ? `<div class="wide msg ${this.message.kind}">${esc(this.message.text)}</div>` : ''}
        <div class="wide"><button class="primary" type="submit">Submit request</button></div>
      </form>
      <h2>My requests</h2>
      ${rows ? `<table><thead><tr><th>Employee</th><th>Type</th><th>Dates</th><th>Days</th><th>Reason</th><th>Status</th><th>Manager comment</th></tr></thead><tbody>${rows}</tbody></table>`
             : '<p class="muted">No requests yet.</p>'}`;

    const form = el.querySelector('#leave-form');
    // Live preview: keep typed values, re-render on date/type change.
    form.addEventListener('change', (e) => {
      Object.assign(this.formState, Object.fromEntries(new FormData(form)));
      if (this.formState.end && this.formState.end < this.formState.start) this.formState.end = this.formState.start;
      this.message = null;
      App.render();
    });
    form.addEventListener('input', (e) => { if (e.target.name === 'reason') this.formState.reason = e.target.value; });
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      Object.assign(this.formState, Object.fromEntries(new FormData(form)));
      const res = Store.submitRequest({ userId: me.id, ...this.formState });
      if (res.ok) {
        this.formState = { type: this.formState.type, start: '', end: '', reason: '' };
        this.message = { kind: 'ok', text: `Request submitted (${res.request.days} working day(s)). Awaiting approval.` };
      } else {
        this.message = { kind: 'err', text: res.error };
      }
      App.render();
    });
  },
};
