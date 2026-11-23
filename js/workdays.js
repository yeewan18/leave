// Pure date logic — no DOM, no storage. Dates are 'YYYY-MM-DD' strings handled in LOCAL time.
const Workdays = (() => {
  const parse = (s) => {
    const [y, m, d] = s.split('-').map(Number);
    return new Date(y, m - 1, d);
  };
  const fmt = (dt) =>
    `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
  const addDays = (s, n) => {
    const dt = parse(s);
    dt.setDate(dt.getDate() + n);
    return fmt(dt);
  };
  const isWeekend = (s) => {
    const g = parse(s).getDay();
    return g === 0 || g === 6;
  };
  const holidaySet = (holidays) => new Set((holidays || []).map((h) => (typeof h === 'string' ? h : h.date)));
  const isWorkingDay = (s, holidays) => !isWeekend(s) && !holidaySet(holidays).has(s);

  // Inclusive count of working days; 0 if range is invalid.
  const countWorkingDays = (start, end, holidays) => {
    if (!start || !end || end < start) return 0;
    const hs = holidaySet(holidays);
    let n = 0;
    for (let d = start; d <= end; d = addDays(d, 1)) {
      if (!isWeekend(d) && !hs.has(d)) n++;
    }
    return n;
  };
  // Adds "off in lieu" days: a holiday on Sat or Sun gets the next day that is
  // not a weekend and not already a holiday. Returns a new sorted array.
  const withInLieu = (base) => {
    const taken = new Set(base.map((h) => h.date));
    const out = base.map((h) => ({ ...h }));
    [...base].sort((a, b) => (a.date > b.date ? 1 : -1)).forEach((h) => {
      if (!isWeekend(h.date)) return;
      // Sat+Sun both holidays (e.g. CNY 2027): MOM gives one in-lieu day (Mon), from the Sunday.
      if (parse(h.date).getDay() === 6 && taken.has(addDays(h.date, 1))) return;
      let d = addDays(h.date, 1);
      while (isWeekend(d) || taken.has(d)) d = addDays(d, 1);
      taken.add(d);
      out.push({ date: d, name: `${h.name} (off in lieu)`, inLieu: true });
    });
    return out.sort((a, b) => (a.date > b.date ? 1 : -1));
  };
  const rangesOverlap =(aS, aE, bS, bE) => aS <= bE && bS <= aE;

  return { parse, fmt, addDays, isWeekend, isWorkingDay, countWorkingDays, rangesOverlap, withInLieu };
})();
