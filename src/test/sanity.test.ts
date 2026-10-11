import { describe, it, expect } from 'vitest';

describe('Frontend Test Environment', () => {
  it('correctly sets up DOM and assertions', () => {
    const el = document.createElement('div');
    el.innerHTML = '<span class="chovique-title">Chovique Chocolates</span>';
    document.body.appendChild(el);

    expect(document.querySelector('.chovique-title')).toBeInTheDocument();
    expect(document.querySelector('.chovique-title')).toHaveTextContent('Chovique Chocolates');
  });
});
