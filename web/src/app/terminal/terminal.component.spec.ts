import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { TerminalComponent } from './terminal.component';
import { GameState } from '../../engine/types';

function makeState(overrides: Partial<GameState> = {}): GameState {
  return {
    objectLocations: new Map(),
    flagOverrides: new Map(),
    score: 0,
    moves: 0,
    winner: 'PLAYER',
    here: 'WEST-OF-HOUSE',
    ...overrides,
  };
}

describe('TerminalComponent', () => {
  let fixture: ComponentFixture<TerminalComponent>;
  let component: TerminalComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TerminalComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TerminalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  // ---------------------------------------------------------------------------
  // Input clearing
  // ---------------------------------------------------------------------------

  it('clears the input after submit', () => {
    component.inputValue = 'go north';
    component.submit();
    expect(component.inputValue).toBe('');
  });

  it('does not emit or add a line for a blank submission', () => {
    const emitted: string[] = [];
    component.command.subscribe((cmd: string) => emitted.push(cmd));
    component.inputValue = '   ';
    component.submit();
    expect(emitted).toHaveLength(0);
    expect(component.transcript).toHaveLength(0);
  });

  // ---------------------------------------------------------------------------
  // Transcript growth
  // ---------------------------------------------------------------------------

  it('appends an input line to the transcript on submit', () => {
    component.inputValue = 'open mailbox';
    component.submit();
    expect(component.transcript).toHaveLength(1);
    expect(component.transcript[0]).toEqual({ type: 'input', text: 'open mailbox' });
  });

  it('appends a response line when addResponse is called', () => {
    component.addResponse('There is a leaflet inside.');
    expect(component.transcript).toHaveLength(1);
    expect(component.transcript[0]).toEqual({ type: 'response', text: 'There is a leaflet inside.' });
  });

  it('grows the transcript with alternating input and response lines', () => {
    component.inputValue = 'take leaflet';
    component.submit();
    component.addResponse('Taken.');
    component.inputValue = 'go north';
    component.submit();
    component.addResponse('You can\'t go that way.');

    expect(component.transcript).toHaveLength(4);
    expect(component.transcript.map((l) => l.type)).toEqual([
      'input', 'response', 'input', 'response',
    ]);
  });

  it('emits the trimmed command text on submit', () => {
    const emitted: string[] = [];
    component.command.subscribe((cmd: string) => emitted.push(cmd));
    component.inputValue = '  look  ';
    component.submit();
    expect(emitted).toEqual(['look']);
  });

  // ---------------------------------------------------------------------------
  // Status bar updates
  // ---------------------------------------------------------------------------

  it('shows room name in the status bar', () => {
    component.roomName = 'West of House';
    fixture.detectChanges();
    const el: HTMLElement = fixture.debugElement.query(By.css('.room-name')).nativeElement;
    expect(el.textContent?.trim()).toBe('West of House');
  });

  it('shows score and moves when gameState is set', () => {
    component.gameState = makeState({ score: 10, moves: 5 });
    fixture.detectChanges();
    const el: HTMLElement = fixture.debugElement.query(By.css('.score-moves')).nativeElement;
    expect(el.textContent).toContain('Score: 10');
    expect(el.textContent).toContain('Moves: 5');
  });

  it('updates score and moves when gameState changes', () => {
    component.gameState = makeState({ score: 0, moves: 0 });
    fixture.detectChanges();

    component.gameState = makeState({ score: 5, moves: 3 });
    fixture.detectChanges();

    const el: HTMLElement = fixture.debugElement.query(By.css('.score-moves')).nativeElement;
    expect(el.textContent).toContain('Score: 5');
    expect(el.textContent).toContain('Moves: 3');
  });

  it('hides score-moves element when gameState is null', () => {
    component.gameState = null;
    fixture.detectChanges();
    const el = fixture.debugElement.query(By.css('.score-moves'));
    expect(el).toBeNull();
  });

  // ---------------------------------------------------------------------------
  // Keyboard interaction
  // ---------------------------------------------------------------------------

  it('calls submit on Enter keydown', () => {
    const spy = jest.spyOn(component, 'submit');
    component.inputValue = 'inventory';
    component.handleKeydown(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(spy).toHaveBeenCalled();
  });

  it('does not call submit on other keys', () => {
    const spy = jest.spyOn(component, 'submit');
    component.handleKeydown(new KeyboardEvent('keydown', { key: 'a' }));
    expect(spy).not.toHaveBeenCalled();
  });
});
