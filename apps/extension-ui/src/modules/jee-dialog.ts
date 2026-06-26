import swal from 'sweetalert';

const JEE_SWAL_CLASS = 'jee-swal';

const ghostButton = {
  text: 'Cancel',
  visible: true,
  className: 'jee-swal-btn jee-swal-btn--ghost',
};

const primaryButton = (text = 'Confirm', closeModal = true) => ({
  text,
  visible: true,
  closeModal,
  className: 'jee-swal-btn jee-swal-btn--primary',
});

const base = {
  className: JEE_SWAL_CLASS,
  closeOnClickOutside: true,
};

export const jeeConfirm = (options: {
  title: string
  text?: string
  icon?: 'warning' | 'info'
  confirmText?: string
  cancelText?: string
  closeOnConfirm?: boolean
}) => swal({
  ...base,
  icon: options.icon || 'warning',
  title: options.title,
  text: options.text,
  buttons: {
    cancel: { ...ghostButton, text: options.cancelText || 'Cancel' },
    confirm: primaryButton(options.confirmText || 'Confirm', options.closeOnConfirm !== false),
  },
});

export const jeeSuccess = (title: string, text?: string) => swal({
  ...base,
  icon: 'success',
  title,
  text,
  buttons: {
    confirm: primaryButton('Done'),
  },
});

export const jeeError = (title: string, text?: string) => swal({
  ...base,
  icon: 'error',
  title,
  text,
  buttons: {
    confirm: primaryButton('OK'),
  },
});

export const jeeAlert = (title: string, text?: string) => swal({
  ...base,
  title,
  text,
  buttons: {
    confirm: primaryButton('OK'),
  },
});

export const jeePasswordPrompt = (options: {
  title: string
  confirmText?: string
  placeholder?: string
}) => swal({
  ...base,
  title: options.title,
  content: {
    element: 'input',
    attributes: {
      type: 'password',
      placeholder: options.placeholder || 'Enter password',
      class: 'jee-swal-input',
      autocomplete: 'current-password',
    },
  },
  buttons: {
    cancel: ghostButton,
    confirm: primaryButton(options.confirmText || 'Confirm', false),
  },
  closeOnClickOutside: false,
  closeOnEsc: false,
});

export const jeePrompt = (options: {
  title: string
  placeholder?: string
  confirmText?: string
  defaultValue?: string
}) => swal({
  ...base,
  title: options.title,
  content: {
    element: 'input',
    attributes: {
      type: 'text',
      placeholder: options.placeholder || '',
      value: options.defaultValue || '',
      class: 'jee-swal-input',
    },
  },
  buttons: {
    cancel: ghostButton,
    confirm: primaryButton(options.confirmText || 'Save', false),
  },
});

// Reveals a sensitive secret (seed phrase, private key, etc.) inside a themed
// dialog with a one-tap copy button that briefly animates to "Copied".
export const jeeSecretReveal = (options: {
  title: string
  secret: string
  text?: string
}) => {
  const wrapper = document.createElement('div');
  wrapper.className = 'jee-secret-reveal';

  if(options.text) {
    const note = document.createElement('div');
    note.className = 'jee-secret-note';
    note.textContent = options.text;
    wrapper.appendChild(note);
  }

  const box = document.createElement('div');
  box.className = 'jee-secret-box font-monospace';
  box.textContent = options.secret;
  wrapper.appendChild(box);

  const copyBtn = document.createElement('button');
  copyBtn.type = 'button';
  copyBtn.className = 'jee-secret-copy';
  const idleHtml = '<i class="mdi mdi-content-copy"></i> Copy';
  const doneHtml = '<i class="mdi mdi-check"></i> Copied';
  copyBtn.innerHTML = idleHtml;
  let resetTimer: ReturnType<typeof setTimeout>;
  copyBtn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(options.secret);
      copyBtn.classList.add('jee-secret-copy--done');
      copyBtn.innerHTML = doneHtml;
      clearTimeout(resetTimer);
      resetTimer = setTimeout(() => {
        copyBtn.classList.remove('jee-secret-copy--done');
        copyBtn.innerHTML = idleHtml;
      }, 1400);
    } catch {
      // ignore clipboard failures
    }
  });
  wrapper.appendChild(copyBtn);

  // sweetalert v2 accepts a raw DOM node for `content` at runtime, but its TS
  // types only model `string | { element, attributes }`, so cast through `any`.
  const opts: any = {
    ...base,
    title: options.title,
    content: wrapper,
    buttons: {
      confirm: primaryButton('Done'),
    },
  };
  return swal(opts);
};

export const jeeClose = () => {
  // @ts-expect-error sweetalert global close
  swal.close();
};
