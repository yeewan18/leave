// Manager overview: entitlement / taken / balance per employee and leave type for one year.
const OverviewUI = {
  year: new Date().getFullYear(),

  render(el) {
    const me = Store.current;
    const staff = Store.state.users.filter((u) => u.team === me.team && u.role === 'employee');
    const yrs = new Set([new Date().getFullYear(), this.year]);
    Store.state.requests.forEach((r) => yrs.add(Number(r.start.slice(0, 4))));
    const yearOpts = [...yrs].sort().map((y) => `<option ${y === this.year ? 'selected' : ''}>${y}</option>`).join('');

    const types = Object.entries(LEAVE_TYPES);
    const head1 = types.map(([, t]) => `<th colspan="3" class="grp" style="--c:${t.color}">${t.label}</th>`).join('');
    const head2 = types.map(() => '<th class="v">Ent.</th><th class="v">Taken</th><th class="v">Bal.</th>').join('');

    const rows = staff.map((u) => {
      const cells = types.map(([k]) => {
        if (k === 'childcare' && !u.hasKids) return '<td class="na" colspan="3">N/A</td>';
        const b = Store.getBalance(u.id, k, this.year);
        const capped = b.entitlement !== null;
        const low = capped && b.remaining <= Math.ceil(b.entitlement * 0.2);
        return `<td class="v">${capped ? b.entitlement : '—'}</td>
          <td class="v">${b.taken}${b.pending ? `<small class="pend" title="${b.pending} day(s) pending approval"> +${b.pending}</small>` : ''}</td>
          <td class="v bal ${low ? 'low' : ''}">${capped ? b.remaining : '—'}</td>`;
      }).join('');
      return `<tr><th class="emp">${esc(u.name)}</th>${cells}</tr>`;
    }).join('');

    el.innerHTML = `<h2>Leave overview — ${esc(me.team)}</h2>
      <div class="cal-nav"><label class="inline">Year <select id="ov-year">${yearOpts}</select></label></div>
      <div class="scroll"><table class="overview">
        <thead><tr><th rowspan="2">Employee</th>${head1}</tr><tr>${head2}</tr></thead>
        <tbody>${rows || '<tr><td colspan="16" class="muted">No employees yet.</td></tr>'}</tbody></table></div>
      <p class="muted">Ent. = entitlement, Taken = approved days, Bal. = entitlement − taken.
        <span class="pend">+n</span> = days pending approval. Balances are counted by the year a request starts.
        Balances at 20% or less of entitlement are highlighted.</p>`;

    el.querySelector('#ov-year').onchange = (e) => { this.year = Number(e.target.value); App.render(); };
  },
};
