const TeamUI = {
  draft: { name: '', hasKids: false }, // survives re-render
  message: null, // {kind:'ok'|'err', text}

  render(el) {
    const me = Store.current;
    const members = Store.state.users.filter((u) => u.team === me.team);
    const rows = members.map((u) => `<tr>
      <td>${esc(u.name)}</td><td>${esc(u.role)}</td>
      <td>${u.role === 'employee'
        ? `<label class="inline"><input type="checkbox" data-kids="${u.id}" ${u.hasKids ? 'checked' : ''}> Has kids</label>`
        : '<span class="muted">—</span>'}</td></tr>`).join('');

    el.innerHTML = `<h2>Add employee</h2>
      <form id="emp-form" class="card form">
        <label class="wide">Name <input type="text" name="name" value="${esc(this.draft.name)}" placeholder="e.g. Priya"></label>
        <label class="inline wide"><input type="checkbox" name="hasKids" ${this.draft.hasKids ? 'checked' : ''}> Has kids (can apply for Childcare leave)</label>
        <div class="wide muted">Team: ${esc(me.team)}</div>
        ${this.message ? `<div class="wide msg ${this.message.kind}">${esc(this.message.text)}</div>` : ''}
        <div class="wide"><button class="primary" type="submit">Add employee</button></div>
      </form>
      <h2>Team — ${esc(me.team)}</h2>
      <table><thead><tr><th>Name</th><th>Role</th><th>Kids</th></tr></thead><tbody>${rows}</tbody></table>`;

    const form = el.querySelector('#emp-form');
    form.addEventListener('input', () => {
      this.draft = { name: form.elements.name.value, hasKids: form.elements.hasKids.checked };
    });
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const res = Store.addEmployee(this.draft);
      if (res.ok) {
        this.draft = { name: '', hasKids: false };
        this.message = { kind: 'ok', text: `Added ${res.user.name}.` };
      } else {
        this.message = { kind: 'err', text: res.error };
      }
      App.render();
    });
    el.querySelectorAll('input[data-kids]').forEach((c) =>
      c.addEventListener('change', () => { Store.setHasKids(c.dataset.kids, c.checked); this.message = null; App.render(); }));
  },
};
