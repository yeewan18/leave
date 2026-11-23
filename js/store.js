// State + actions. UI calls these; they persist after each change.
const Store = {
  state: null,

  init(initialState) {
    this.state = initialState || Data.load();
  },
  persist() { Data.save(this.state); },

  user(id) { return this.state.users.find((u) => u.id === id); },
  get current() { return this.user(this.state.currentUserId); },
  setCurrentUser(id) { this.state.currentUserId = id; this.persist(); },

  countDays(start, end) { return Workdays.countWorkingDays(start, end, this.state.holidays); },

  // Balance for one user + type. `remaining` is null for uncapped types.
  // Optional `year` limits to requests that START in that year (a request spanning New Year
  // counts wholly toward its start year). Without it, all requests count (used for validation).
  getBalance(userId, type, year) {
    const ent = LEAVE_TYPES[type].entitlement;
    const mine = this.state.requests.filter((r) => r.userId === userId && r.type === type &&
      (year == null || r.start.slice(0, 4) === String(year)));
    const taken = mine.filter((r) => r.status === 'approved').reduce((s, r) => s + r.days, 0);
    const pending = mine.filter((r) => r.status === 'pending').reduce((s, r) => s + r.days, 0);
    return { entitlement: ent, taken, pending, remaining: ent === null ? null : ent - taken };
  },

  // Manager adds an employee to their own team. Returns { ok, error?, user? }
  addEmployee({ name, hasKids }) {
    const m = this.current;
    if (!m || m.role !== 'manager') return { ok: false, error: 'Only a manager can add employees.' };
    const n = (name || '').trim().replace(/\s+/g, ' ');
    if (!n) return { ok: false, error: 'Please enter the employee name.' };
    if (this.state.users.some((u) => u.name.toLowerCase() === n.toLowerCase())) {
      return { ok: false, error: `"${n}" already exists.` };
    }
    const next = Math.max(0, ...this.state.users.map((u) => Number(String(u.id).slice(1)) || 0)) + 1;
    const user = { id: 'u' + next, name: n, role: 'employee', team: m.team, hasKids: !!hasKids };
    this.state.users.push(user);
    this.persist();
    return { ok: true, user };
  },

  setHasKids(userId, hasKids) {
    const u = this.user(userId);
    if (!u) return { ok: false, error: 'Unknown employee.' };
    u.hasKids = !!hasKids;
    this.persist();
    return { ok: true };
  },

  // Returns { ok, error?, request? }
  submitRequest({ userId, type, start, end, reason }) {
    if (!LEAVE_TYPES[type]) return { ok: false, error: 'Pick a leave type.' };
    if (type === 'childcare' && !(this.user(userId) || {}).hasKids) {
      return { ok: false, error: 'Childcare leave is only for employees with children.' };
    }
    if (!start || !end) return { ok: false, error: 'Pick a start and end date.' };
    if (end < start) return { ok: false, error: 'End date is before start date.' };
    if (type === 'unpaid' && (!reason || !reason.trim())) return { ok: false, error: 'Please give a reason for unpaid leave.' };
    const days = this.countDays(start, end);
    if (days === 0) return { ok: false, error: 'That range has no working days (weekends/holidays only).' };

    const clash = this.state.requests.find(
      (r) => r.userId === userId && r.status !== 'rejected' && Workdays.rangesOverlap(start, end, r.start, r.end)
    );
    if (clash) return { ok: false, error: `Overlaps your existing ${clash.status} request (${clash.start} to ${clash.end}).` };

    const bal = this.getBalance(userId, type);
    if (bal.remaining !== null && days > bal.remaining - bal.pending) {
      return {
        ok: false,
        error: `Not enough ${LEAVE_TYPES[type].label} leave: ${days} day(s) requested, ${bal.remaining - bal.pending} available (after pending).`,
      };
    }
    const request = {
      id: 'r' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
      userId, type, start, end, days, reason: (reason || '').trim(),
      status: 'pending', managerComment: '', decidedBy: null,
      createdAt: Workdays.fmt(new Date()),
    };
    this.state.requests.push(request);
    this.persist();
    return { ok: true, request };
  },

  decide(requestId, approve, comment) {
    const r = this.state.requests.find((x) => x.id === requestId);
    if (!r || r.status !== 'pending') return { ok: false, error: 'Request is no longer pending.' };
    if (approve) {
      const bal = this.getBalance(r.userId, r.type);
      if (bal.remaining !== null && r.days > bal.remaining) {
        return { ok: false, error: 'Employee no longer has enough balance for this request.' };
      }
    }
    r.status = approve ? 'approved' : 'rejected';
    r.managerComment = (comment || '').trim();
    r.decidedBy = this.state.currentUserId;
    this.persist();
    return { ok: true };
  },

  // Other pending/approved requests from the same team overlapping the given request's dates.
  getOverlaps(req) {
    const owner = this.user(req.userId);
    return this.state.requests.filter((o) => {
      if (o.id === req.id || o.status === 'rejected') return false;
      const ou = this.user(o.userId);
      return ou && owner && ou.team === owner.team &&
        Workdays.rangesOverlap(req.start, req.end, o.start, o.end);
    });
  },

  // Active requests (pending/approved) covering a date, for the calendar.
  requestsOn(date, team) {
    return this.state.requests.filter((r) => {
      if (r.status === 'rejected') return false;
      const u = this.user(r.userId);
      return u && (!team || u.team === team) && r.start <= date && date <= r.end;
    });
  },

  holidayOn(date) { return this.state.holidays.find((h) => h.date === date); },
  pendingForManager(managerId) {
    const m = this.user(managerId);
    return this.state.requests.filter(
      (r) => r.status === 'pending' && r.userId !== managerId && this.user(r.userId).team === m.team
    );
  },
};
