import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { App } from './app';
import { TerminalComponent } from './terminal/terminal.component';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render the terminal component', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('app-terminal')).toBeTruthy();
  });

  it('should render the hints component', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('app-hints')).toBeTruthy();
  });

  it('should pass initial room ID to hints component', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const app = fixture.componentInstance;
    expect(app.roomId).toBe('WEST-OF-HOUSE');
  });
});

describe('App — inventory widget', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
    }).compileComponents();
  });

  it('renders app-inventory element in the sidebar', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('app-inventory')).toBeTruthy();
  });

  it('inventory getter returns non-empty array after taking leaflet', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    app['game'].processCommand('open mailbox');
    app['game'].processCommand('take leaflet');
    expect(app.inventory.length).toBeGreaterThan(0);
  });
});

describe('App — startup splash', () => {
  let fixture: ComponentFixture<App>;
  let terminal: TerminalComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
    }).compileComponents();
    fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    // Let the ngOnInit setTimeout(0) fire before asserting
    await new Promise(resolve => setTimeout(resolve));
    const terminalEl = fixture.debugElement.query(By.directive(TerminalComponent));
    terminal = terminalEl.componentInstance as TerminalComponent;
  });

  it('should contain a line starting with ZORK I:', () => {
    const texts = terminal.transcript.map(l => l.text);
    expect(texts.some(t => t.startsWith('ZORK I:'))).toBe(true);
  });

  it('should contain the copyright line', () => {
    const texts = terminal.transcript.map(l => l.text);
    expect(texts.some(t => t.includes('Copyright'))).toBe(true);
  });

  it('should contain the revision line', () => {
    const texts = terminal.transcript.map(l => l.text);
    expect(texts.some(t => t.startsWith('Revision'))).toBe(true);
  });

  it('should display splash lines before the room description', () => {
    const texts = terminal.transcript.map(l => l.text);
    const splashIdx = texts.findIndex(t => t.startsWith('ZORK I:'));
    const roomIdx = texts.findIndex(t => t.includes('West of House') || t.includes('white house'));
    expect(splashIdx).toBeGreaterThanOrEqual(0);
    expect(roomIdx).toBeGreaterThanOrEqual(0);
    expect(splashIdx).toBeLessThan(roomIdx);
  });
});
