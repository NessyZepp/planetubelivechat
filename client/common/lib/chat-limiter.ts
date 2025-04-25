// client/common/lib/chat-limiter.ts
// Registers a small Converse.js plugin to enforce a max length and live counter on chat inputs
export function registerCharLimiter(maxChars = 200): void {
  const Converse = (window as any).converse;
  if (!Converse) {
    console.warn('[pt-chat-char-limiter] window.converse not found');
    return;
  }

  Converse.plugins.add('pt-chat-char-limiter', {
    initialize() {
      this.on('chatBoxOpened', (payload: any) => {
        const view = payload.view;
        // Ensure el is treated as an HTMLElement so querySelector is typed
        const container = view.el as HTMLElement;
        const ta = container.querySelector('textarea.chat-textarea') as HTMLTextAreaElement | null;
        if (!ta || ta.dataset.limited) return;
        ta.dataset.limited = 'true';

        // enforce maxChars
        ta.maxLength = maxChars;

        // create and attach counter element
        const counter = document.createElement('div');
        counter.className = 'char-counter';
        counter.setAttribute('aria-live', 'polite');
        container.appendChild(counter);

        // update function
        const update = () => {
          const left = maxChars - ta.value.length;
          counter.textContent = `${left} character${left === 1 ? '' : 's'} remaining`;
          counter.style.color = left < 20 ? 'crimson' : '';
        };

        ta.addEventListener('input', update);
        update();
      });
    },
  });
}
