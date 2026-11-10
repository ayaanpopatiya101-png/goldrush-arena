/** Single-pointer ownership scoped to the playable court, never the document. */
export function bindBrowserCourt(
  node: HTMLElement,
  move: (x: number, y: number) => void,
  host: Window = window,
  doc: Document = document,
) {
  let pointer: number | null = null;
  const previous = { touchAction: node.style.touchAction, overscrollBehavior: node.style.overscrollBehavior };
  node.style.touchAction = 'none';
  node.style.overscrollBehavior = 'contain';
  const release = () => {
    const id = pointer;
    pointer = null;
    if (id !== null && node.hasPointerCapture?.(id)) node.releasePointerCapture(id);
  };
  const update = (e: PointerEvent) => {
    const rect = node.getBoundingClientRect();
    if (rect.width && rect.height) move((e.clientX - rect.left) / rect.width, (e.clientY - rect.top) / rect.height);
  };
  const down = (e: PointerEvent) => {
    if (pointer !== null || !e.isPrimary || (e.pointerType === 'mouse' && e.button !== 0)) return;
    pointer = e.pointerId;
    node.setPointerCapture?.(pointer);
    e.preventDefault();
    update(e);
  };
  const drag = (e: PointerEvent) => {
    if (pointer !== e.pointerId) return;
    e.preventDefault();
    update(e);
  };
  const end = (e: PointerEvent) => { if (pointer === e.pointerId) release(); };
  const touch = (e: TouchEvent) => { if (pointer !== null && e.cancelable) e.preventDefault(); };
  const visibility = () => { if (doc.visibilityState !== 'visible') release(); };
  node.addEventListener('pointerdown', down);
  node.addEventListener('pointermove', drag);
  node.addEventListener('pointerup', end);
  node.addEventListener('pointercancel', end);
  node.addEventListener('lostpointercapture', end);
  node.addEventListener('touchmove', touch, { passive: false });
  host.addEventListener('blur', release);
  host.addEventListener('resize', release);
  host.addEventListener('orientationchange', release);
  doc.addEventListener('visibilitychange', visibility);
  return () => {
    release();
    Object.assign(node.style, previous);
    node.removeEventListener('pointerdown', down);
    node.removeEventListener('pointermove', drag);
    node.removeEventListener('pointerup', end);
    node.removeEventListener('pointercancel', end);
    node.removeEventListener('lostpointercapture', end);
    node.removeEventListener('touchmove', touch);
    host.removeEventListener('blur', release);
    host.removeEventListener('resize', release);
    host.removeEventListener('orientationchange', release);
    doc.removeEventListener('visibilitychange', visibility);
  };
}
