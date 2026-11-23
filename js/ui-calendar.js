const CalendarUI = {
  year: 2026, month: 10, // month is 0-based; set from today in init
  highlight: null,       // request whose range to highlight
  selected: null,        // selected date string

  init() {
    const t = new Date();
    this.year = t.getFullYear();
    this.month = t.getMonth();
  },

  focus(req) {
    this.highlight = req;
    const d = Workdays.parse(req.start);
    this.year = d.getFullYear();
    this.month = d.getMonth();
    this.selected = req.start;
  },

  shift(n) {
    const d = new Date(this.year, this.month + n, 1);
    this.year = d.getFullYear();
    this.month = d.getMonth();
  },

  render(el) {
    const team = Store.current.team;
    const first = new Date(this.year, this.month, 1);
    const lead = (first.getDay() + 6) % 7; // Monday-first
    const daysInMonth = new Date(this.year, this.month + 1, 0).getDate();
    const title = first.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
    const hl = this.highlight;

    let cells = '';
    for (let i = 0; i < lead; i++) cells += '<div class="day empty"></div>';
    for (let d = 1; d <= daysInMonth; d++) {
      const date = Workdays.fmt(new Date(this.year, this.month, d));
      const weekend = Workdays.isWeekend(date);
      const hol = Store.holidayOn(date);
      const off = weekend || hol ? [] : Store.requestsOn(date, team);
      const inHl = hl && hl.start <= date && date <= hl.end && !weekend && !hol;
      const cls = ['day', weekend ? 'weekend' : '', hol ? 'holiday' : '', hol && hol.inLieu ? 'lieu' : '', off.length >= 2 ? 'crowded' : '',
        inHl ? 'hl' : '', this.selected === date ? 'sel' : ''].join(' ');
      const chips = off.map((r) => {
        const n = Store.user(r.userId).name.split(' ')[0];
        return `<span class="chip ${r.status}" style="--c:${LEAVE_TYPES[r.type].color}" title="${esc(Store.user(r.userId).name)} – ${LEAVE_TYPES[r.type].label} (${r.status})">${esc(n)}</span>`;
      }).join('');
      cells += `<div class="${cls}" data-date="${date}">
        <div class="num">${d}${off.length >= 2 ? `<span class="ov">${off.length} off</span>` : ''}</div>
        ${hol ? `<div class="hname">${esc(hol.name)}</div>` : ''}${chips}</div>`;
    }

    const legend = Object.values(LEAVE_TYPES)
      .map((t) => `<span class="chip approved" style="--c:${t.color}">${t.label}</span>`).join('') +
      '<span class="chip pending" style="--c:#6b7280">Pending (hatched)</span>' +
      '<span class="chip approved" style="--c:#ca8a04">Public holiday</span>' +
      '<span class="chip approved" style="--c:#f97316">Off in lieu</span>';

    let detail = '';
    if (this.selected) {
      const list = Store.requestsOn(this.selected, team);
      detail = `<div class="card"><h3>${niceDate(this.selected)}</h3>${list.length
        ? `<ul>${list.map((r) => `<li>${esc(Store.user(r.userId).name)} — ${LEAVE_TYPES[r.type].label}, ${rangeText(r)} ${badge(r.status)}</li>`).join('')}</ul>`
        : '<p class="muted">Nobody is on leave.</p>'}</div>`;
    }

    el.innerHTML = `<h2>Team calendar — ${esc(team)}</h2>
      ${hl ? `<div class="msg ok">Highlighting ${esc(Store.user(hl.userId).name)}'s request (${rangeText(hl)}). <button class="link" id="clear-hl">Clear</button></div>` : ''}
      <div class="cal-nav"><button id="prev">‹</button><strong>${title}</strong><button id="next">›</button><button id="today">Today</button></div>
      <div class="legend">${legend}</div>
      <div class="cal"><div class="dow">Mon</div><div class="dow">Tue</div><div class="dow">Wed</div><div class="dow">Thu</div><div class="dow">Fri</div><div class="dow">Sat</div><div class="dow">Sun</div>${cells}</div>
      ${detail}`;

    el.querySelector('#prev').onclick = () => { this.shift(-1); App.render(); };
    el.querySelector('#next').onclick = () => { this.shift(1); App.render(); };
    el.querySelector('#today').onclick = () => { this.init(); App.render(); };
    const clr = el.querySelector('#clear-hl');
    if (clr) clr.onclick = () => { this.highlight = null; App.render(); };
    el.querySelectorAll('.day[data-date]').forEach((c) =>
      c.addEventListener('click', () => { this.selected = c.dataset.date; App.render(); }));
  },
};
