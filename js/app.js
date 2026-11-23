const App = {
  tab: 'my',

  init() {
    Store.init();
    CalendarUI.init();
    this.render();
  },

  tabsFor(user) {
    return user.role === 'manager'
      ? [['queue', 'Approval queue'], ['overview', 'Overview'], ['calendar', 'Team calendar'], ['team', 'Team'], ['my', 'My leave']]
      : [['my', 'My leave']];
  },

  go(tab) { this.tab = tab; this.render(); },

  render() {
    const me = Store.current;
    const tabs = this.tabsFor(me);
    if (!tabs.some(([k]) => k === this.tab)) this.tab = tabs[0][0];

    const who = document.getElementById('who');
    who.innerHTML = Store.state.users.map((u) =>
      `<option value="${u.id}" ${u.id === me.id ? 'selected' : ''}>${esc(u.name)} (${u.role})</option>`).join('');
    who.onchange = () => { Store.setCurrentUser(who.value); this.tab = this.tabsFor(Store.current)[0][0]; this.render(); };

    const nav = document.getElementById('tabs');
    nav.innerHTML = tabs.map(([k, label]) =>
      `<button class="${k === this.tab ? 'active' : ''}" data-tab="${k}">${label}${
        k === 'queue' ? ` <span class="count">${Store.pendingForManager(me.id).length}</span>` : ''}</button>`).join('');
    nav.querySelectorAll('button').forEach((b) => (b.onclick = () => this.go(b.dataset.tab)));

    const view = document.getElementById('view');
    ({ my: EmployeeUI, queue: ManagerUI, calendar: CalendarUI, team: TeamUI, overview: OverviewUI })[this.tab].render(view);
  },
};

// Day/night theme: saved choice wins, otherwise follow the OS setting.
const Theme = {
  isDark() {
    const t = document.documentElement.dataset.theme;
    return t ? t === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
  },
  paint() { document.getElementById('theme').textContent = this.isDark() ? '☀ Day mode' : '🌙 Night mode'; },
  toggle() {
    const next = this.isDark() ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem('leave-theme', next); } catch (e) { /* ignore */ }
    this.paint();
  },
};
document.getElementById('theme').onclick = () => Theme.toggle();
Theme.paint();

document.getElementById('reset').onclick = () => {
  if (confirm('Reset all data to the demo seed?')) { Data.reset(); Store.init(Data.seed()); App.tab = 'my'; App.render(); }
};
App.init();
