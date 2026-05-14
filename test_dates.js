const parseLocalDate = (dateVal) => {
  if (!dateVal) return null;
  const [y, m, d] = String(dateVal).substring(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d);
};

const nextOccurrence = (dateVal, todayOverride) => {
  if (!dateVal) return null;
  const today = todayOverride || new Date();
  today.setHours(0, 0, 0, 0);
  const date = parseLocalDate(dateVal);
  date.setHours(0, 0, 0, 0);
  while (date < today) date.setMonth(date.getMonth() + 1);
  return date;
};

const stmtWithDue = (stmtVal, dueVal, todayOverride) => {
  if (!stmtVal) return null;
  const today = todayOverride || new Date();
  today.setHours(0, 0, 0, 0);
  const due = parseLocalDate(dueVal);
  const stmt = parseLocalDate(stmtVal);
  due.setHours(0, 0, 0, 0);
  stmt.setHours(0, 0, 0, 0);
  let months = 0;
  const dueCopy = new Date(due);
  while (dueCopy < today) { dueCopy.setMonth(dueCopy.getMonth() + 1); months++; }
  stmt.setMonth(stmt.getMonth() + months);
  return stmt;
};

const tests = [
  { today: '2026-05-14', stmt: '2026-04-30', due: '2026-05-14', eStmt: '30/4/2026', eDue: '14/5/2026' },
  { today: '2026-05-15', stmt: '2026-04-30', due: '2026-05-14', eStmt: '30/5/2026', eDue: '14/6/2026' },
  { today: '2026-05-14', stmt: '2026-03-30', due: '2026-04-13', eStmt: '30/5/2026', eDue: '13/6/2026' },
];

for (const t of tests) {
  const today = new Date(t.today);
  const due = nextOccurrence(t.due, new Date(t.today));
  const stmt = stmtWithDue(t.stmt, t.due, new Date(t.today));
  const ok = stmt.toLocaleDateString('vi-VN') === t.eStmt && due.toLocaleDateString('vi-VN') === t.eDue;
  console.log(`[${ok ? 'OK' : 'FAIL'}] Today=${t.today} | stmt=${stmt.toLocaleDateString('vi-VN')} (${t.eStmt}) | due=${due.toLocaleDateString('vi-VN')} (${t.eDue})`);
}
