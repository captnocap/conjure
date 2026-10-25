/**
 * The prompt is the whole page until an idea is typed: one line of text in the middle, a cursor
 * blinking in it. The cursor is drawn by the page rather than the browser, so it blinks the same
 * whether or not the input has focus, restarts its beat on every keystroke like a native caret,
 * and quickens while the studio is thinking. A click on the bare page returns focus to the input,
 * and after a quiet moment a faint hint fades in.
 */
export function installPrompt(form: HTMLFormElement, input: HTMLInputElement, hintAfterMs = 2600) {
  const mirror = form.querySelector<HTMLElement>('.mirror')!;
  const caret = form.querySelector<HTMLElement>('.caret')!;

  /** Put the drawn caret where the native one would be: at the selection point, within the input. */
  const place = () => {
    const style = getComputedStyle(input);
    mirror.style.font = style.font;
    mirror.style.letterSpacing = style.letterSpacing;
    const at = input.selectionStart ?? input.value.length;
    const selecting = input.selectionEnd !== null && input.selectionEnd !== at && document.activeElement === input;
    // Empty: the caret waits at the centre, then glides to the start of the hint as it fades in.
    const empty = !input.value;
    const hinted = empty && document.body.classList.contains('hinted');
    mirror.textContent = hinted ? input.placeholder : input.value;
    const whole = mirror.getBoundingClientRect().width;
    mirror.textContent = input.value.slice(0, at);
    const before = empty ? 0 : mirror.getBoundingClientRect().width;
    caret.classList.toggle('gliding', empty);
    const box = input.getBoundingClientRect();
    const home = form.getBoundingClientRect();
    const padding = parseFloat(style.paddingLeft) || 0;
    const inner = box.width - padding - (parseFloat(style.paddingRight) || 0);
    const offset = style.textAlign === 'center' && whole <= inner ? (inner - whole) / 2 + before : before - input.scrollLeft;
    caret.style.left = `${box.left - home.left + padding + Math.max(0, Math.min(inner, offset))}px`;
    caret.style.top = `${box.top - home.top + box.height / 2}px`;
    caret.style.height = `${parseFloat(style.fontSize) * 1.15}px`;
    caret.classList.toggle('selecting', selecting);
  };
  /** A native caret stays lit for a beat after every keystroke; so does this one. */
  const beat = () => {
    caret.style.animation = 'none';
    void caret.offsetWidth;
    caret.style.animation = '';
  };
  for (const event of ['input', 'focus', 'blur', 'change', 'keyup', 'mouseup']) input.addEventListener(event, place);
  input.addEventListener('input', beat);
  input.addEventListener('keydown', beat);
  document.addEventListener('selectionchange', () => { if (document.activeElement === input) place(); });
  window.addEventListener('resize', place);
  new ResizeObserver(place).observe(input);
  // The font eases when the prompt moves to the top of the page; follow it.
  input.addEventListener('transitionrun', place);
  input.addEventListener('transitionend', place);
  place();

  // A click on the bare page is a wish to type.
  document.addEventListener('mousedown', (event) => {
    const target = event.target as HTMLElement | null;
    if (!target || target.closest('button, a, input, select, textarea, details, dialog, label, [data-key], canvas, img, video, #tree, #sheet')) return;
    if (document.activeElement !== input) {
      input.focus({ preventScroll: true });
      event.preventDefault();
    }
  });
  if (document.activeElement !== input) input.focus({ preventScroll: true });

  // The hint waits a moment, so the page opens as blank as it can be.
  const hint = () => { if (!input.value) { document.body.classList.add('hinted'); place(); } };
  const quiet = window.setTimeout(hint, hintAfterMs);
  input.addEventListener('input', () => { if (input.value) clearTimeout(quiet); }, { once: true });

  return { place };
}
