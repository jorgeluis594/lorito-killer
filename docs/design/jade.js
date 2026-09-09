const form = document.querySelector('#example-form');
const nameInput = document.querySelector('#name');
const emailInput = document.querySelector('#email');
const saveButton = document.querySelector('#save');
const dialog = document.querySelector('#detail-dialog');
const toast = document.querySelector('#toast');
let toastTimer;
let saveTimer;

function notify(message) {
  clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.add('visible');
  toastTimer = setTimeout(() => toast.classList.remove('visible'), 4000);
}

document.querySelectorAll('[data-color]').forEach(button => {
  button.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(button.dataset.color);
      notify(`${button.dataset.color} copiado`);
    } catch {
      notify(`Copia este color: ${button.dataset.color}`);
    }
  });
});

document.querySelectorAll('.sample-nav button').forEach(button => {
  button.addEventListener('click', () => {
    document.querySelector('.sample-nav [aria-current]')?.removeAttribute('aria-current');
    button.setAttribute('aria-current', 'page');
    document.querySelector('#nav-feedback').textContent = `${button.textContent.trim()} seleccionado en esta muestra.`;
  });
});

function resetValidation() {
  [nameInput, emailInput].forEach(input => {
    input.removeAttribute('aria-invalid');
    document.querySelector(`#${input.id}-error`).hidden = true;
  });
}

form.addEventListener('submit', event => {
  event.preventDefault();
  resetValidation();
  const invalid = [nameInput, emailInput].filter(input => !input.validity.valid || (input === nameInput && !input.value.trim()));
  invalid.forEach(input => {
    input.setAttribute('aria-invalid', 'true');
    document.querySelector(`#${input.id}-error`).hidden = false;
  });
  if (invalid.length) {
    invalid[0].focus();
    return;
  }
  clearTimeout(saveTimer);
  const savedName = nameInput.value.trim();
  saveButton.disabled = true;
  saveButton.setAttribute('aria-busy', 'true');
  saveButton.querySelector('span').textContent = 'Guardando…';
  // Local delay makes the loading state reviewable; this prototype never writes business data.
  saveTimer = setTimeout(() => {
    document.querySelector('#saved-name').textContent = savedName;
    finishSaving();
    notify('Cambios guardados en esta muestra.');
  }, 700);
});

function finishSaving() {
  saveButton.disabled = false;
  saveButton.removeAttribute('aria-busy');
  saveButton.querySelector('span').textContent = 'Guardar cambios';
}

form.addEventListener('reset', () => {
  clearTimeout(saveTimer);
  finishSaving();
  resetValidation();
  document.querySelector('#saved-name').textContent = 'Local principal';
  notify('Valores de ejemplo restablecidos.');
});

document.querySelector('#details').addEventListener('click', () => dialog.showModal());
document.querySelector('#close-dialog').addEventListener('click', () => dialog.close());
document.querySelector('#understood').addEventListener('click', () => dialog.close());

function filterRows() {
  const query = document.querySelector('#search-input').value.trim().toLocaleLowerCase('es');
  const filter = document.querySelector('[name="filter"]:checked').value;
  let count = 0;
  document.querySelectorAll('tbody tr').forEach(row => {
    row.hidden = !row.cells[0].textContent.toLocaleLowerCase('es').includes(query) || (filter !== 'all' && row.dataset.state !== filter);
    if (!row.hidden) count++;
  });
  document.querySelector('#result-count').textContent = `${count} ${count === 1 ? 'registro' : 'registros'}`;
  document.querySelector('#empty').hidden = count !== 0;
}

document.querySelector('#search-input').addEventListener('input', filterRows);
document.querySelectorAll('[name="filter"]').forEach(input => input.addEventListener('change', filterRows));
document.querySelector('#clear-filters').addEventListener('click', () => {
  document.querySelector('#search-input').value = '';
  document.querySelector('[name="filter"][value="all"]').checked = true;
  filterRows();
  document.querySelector('#search-input').focus();
});
