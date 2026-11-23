// Seed data + localStorage persistence.
const LEAVE_TYPES = {
  annual:    { label: 'Annual',    entitlement: 20,   color: '#2563eb' },
  childcare: { label: 'Childcare', entitlement: 6,    color: '#db2777' },
  medical:   { label: 'Medical',   entitlement: 14,   color: '#16a34a' },
  hospital:  { label: 'Hospital',  entitlement: 30,   color: '#ea580c' },
  unpaid:    { label: 'Unpaid',    entitlement: null, color: '#6b7280' }, // null = no cap
};

// Singapore gazetted public holidays (MOM) for 2026–2027.
// Off-in-lieu days (holiday on Sat/Sun -> next working day) are added by Workdays.withInLieu.
const SG_HOLIDAYS = [
  { date: '2026-01-01', name: "New Year's Day" },
  { date: '2026-02-17', name: 'Chinese New Year' },
  { date: '2026-02-18', name: 'Chinese New Year' },
  { date: '2026-03-21', name: 'Hari Raya Puasa' },
  { date: '2026-04-03', name: 'Good Friday' },
  { date: '2026-05-01', name: 'Labour Day' },
  { date: '2026-05-27', name: 'Hari Raya Haji' },
  { date: '2026-05-31', name: 'Vesak Day' },
  { date: '2026-08-09', name: 'National Day' },
  { date: '2026-11-08', name: 'Deepavali' },
  { date: '2026-12-25', name: 'Christmas Day' },
  { date: '2027-01-01', name: "New Year's Day" },
  { date: '2027-02-06', name: 'Chinese New Year' },
  { date: '2027-02-07', name: 'Chinese New Year' },
  { date: '2027-03-10', name: 'Hari Raya Puasa' },
  { date: '2027-03-26', name: 'Good Friday' },
  { date: '2027-05-01', name: 'Labour Day' },
  { date: '2027-05-17', name: 'Hari Raya Haji' },
  { date: '2027-05-20', name: 'Vesak Day' },
  { date: '2027-08-09', name: 'National Day' },
  { date: '2027-10-28', name: 'Deepavali' },
  { date: '2027-12-25', name: 'Christmas Day' },
];
const SEED_HOLIDAYS = Workdays.withInLieu(SG_HOLIDAYS);

const SEED_USERS = [
  { id: 'u1', name: 'Maria Tan',   role: 'manager',  team: 'Engineering' },
  // hasKids: only these employees can apply for / see Childcare leave.
  { id: 'u2', name: 'Alice',    role: 'employee', team: 'Engineering', hasKids: true },
  { id: 'u3', name: 'Robert',   role: 'employee', team: 'Engineering', hasKids: true },
  { id: 'u4', name: 'Calista',  role: 'employee', team: 'Engineering', hasKids: false },
  { id: 'u5', name: 'Ali',      role: 'employee', team: 'Engineering', hasKids: false },
  { id: 'u6', name: 'Zen',      role: 'employee', team: 'Engineering', hasKids: true },
  { id: 'u7', name: 'Michael',  role: 'employee', team: 'Engineering', hasKids: false },
];

const SEED_REQUESTS = [
  { id: 'r1', userId: 'u2', type: 'annual',  start: '2026-12-21', end: '2026-12-24', reason: 'Year-end trip', status: 'pending' },
  { id: 'r2', userId: 'u3', type: 'annual',  start: '2026-12-23', end: '2026-12-28', reason: 'Family visit',  status: 'approved', managerComment: 'Enjoy!', decidedBy: 'u1' },
  { id: 'r3', userId: 'u4', type: 'medical', start: '2026-12-02', end: '2026-12-03', reason: 'Fever',         status: 'approved', managerComment: 'Get well soon', decidedBy: 'u1' },
  { id: 'r4', userId: 'u5', type: 'annual',  start: '2026-12-22', end: '2026-12-30', reason: 'Holiday',       status: 'pending' },
  { id: 'r5', userId: 'u6', type: 'childcare', start: '2026-12-07', end: '2026-12-09', reason: 'School holiday care', status: 'approved', managerComment: 'Approved', decidedBy: 'u1' },
  { id: 'r6', userId: 'u7', type: 'annual',  start: '2027-01-04', end: '2027-01-08', reason: 'Short break',   status: 'pending' },
  { id: 'r7', userId: 'u2', type: 'medical', start: '2026-11-26', end: '2026-11-26', reason: 'Dental surgery', status: 'approved', managerComment: 'OK', decidedBy: 'u1' },
];

const Data = {
  KEY: 'leave-app-v2', // bumped: new staff list + demo requests (v1 data is ignored)
  seed() {
    const holidays = SEED_HOLIDAYS;
    const requests = SEED_REQUESTS.map((r) => ({
      createdAt: '2026-11-20',
      managerComment: '',
      ...r,
      days: Workdays.countWorkingDays(r.start, r.end, holidays),
    }));
    return { users: SEED_USERS, holidays, requests, currentUserId: 'u2' };
  },
  load() {
    try {
      const raw = localStorage.getItem(this.KEY);
      if (raw) {
        const s = JSON.parse(raw);
        // Holidays are config, not user data: always use the current list.
        // (Users are user data now: managers can add employees.)
        s.holidays = SEED_HOLIDAYS;
        return s;
      }
    } catch (e) { /* fall through to seed */ }
    return this.seed();
  },
  save(state) {
    try { localStorage.setItem(this.KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
  },
  reset() {
    try { localStorage.removeItem(this.KEY); } catch (e) { /* ignore */ }
  },
};
