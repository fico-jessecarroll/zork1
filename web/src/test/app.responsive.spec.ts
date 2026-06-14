import { readFileSync } from 'fs';
import { join } from 'path';

describe('app.scss responsive rules', () => {
  const scss = readFileSync(
    join(__dirname, '../app/app.scss'),
    'utf-8',
  );

  it('contains a max-width media query', () => {
    expect(scss).toMatch(/@media.*max-width.*640px/);
  });

  it('hides the sidebar on mobile', () => {
    expect(scss).toContain('.sidebar');
    // Sidebar hidden rule exists inside a media query block
    const mediaIndex = scss.search(/@media.*max-width.*640px/);
    const afterMedia = scss.slice(mediaIndex);
    expect(afterMedia).toContain('.sidebar');
    expect(afterMedia).toMatch(/display\s*:\s*none/);
  });
});
