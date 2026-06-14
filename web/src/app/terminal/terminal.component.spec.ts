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
    fixture.componentRef.setInput('gameState', makeState({ score: 0, moves: 0 }));
    fixture.detectChanges();

    fixture.componentRef.setInput('gameState', makeState({ score: 5, moves: 3 }));
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
    const spy = vi.spyOn(component, 'submit');
    component.inputValue = 'inventory';
    component.handleKeydown(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(spy).toHaveBeenCalled();
  });

  it('does not call submit on other keys', () => {
    const spy = vi.spyOn(component, 'submit');
    component.handleKeydown(new KeyboardEvent('keydown', { key: 'a' }));
    expect(spy).not.toHaveBeenCalled();
  });

  // ---------------------------------------------------------------------------
  // Command history navigation
  // ---------------------------------------------------------------------------

  it('ArrowUp with empty history does nothing to inputValue', () => {
    component.inputValue = 'partial';
    component.handleKeydown(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
    expect(component.inputValue).toBe('partial');
  });

  it('ArrowUp after submitting a command shows that command in the input', () => {
    component.inputValue = 'go north';
    component.submit();
    component.handleKeydown(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
    expect(component.inputValue).toBe('go north');
  });

  it('ArrowUp twice shows the second-to-last command', () => {
    component.inputValue = 'go north';
    component.submit();
    component.inputValue = 'take lamp';
    component.submit();
    component.handleKeydown(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
    component.handleKeydown(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
    expect(component.inputValue).toBe('go north');
  });

  it('ArrowDown after ArrowUp restores the in-progress draft', () => {
    component.inputValue = 'go north';
    component.submit();
    component.inputValue = 'draft text';
    component.handleKeydown(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
    component.handleKeydown(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    expect(component.inputValue).toBe('draft text');
  });

  it('submitting a new command resets the history index so ArrowUp shows the most recent command', () => {
    component.inputValue = 'go north';
    component.submit();
    component.inputValue = 'take lamp';
    component.submit();
    component.handleKeydown(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
    component.inputValue = 'look';
    component.submit();
    component.handleKeydown(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
    expect(component.inputValue).toBe('look');
  });

  // ---------------------------------------------------------------------------
  // Tab completion
  // ---------------------------------------------------------------------------

  describe('TerminalComponent — tab completion', () => {
    it('Tab on empty input does nothing', () => {
      component.inputValue = '';
      component.handleKeydown(new KeyboardEvent('keydown', { key: 'Tab' }));
      expect(component.inputValue).toBe('');
    });

    it('Tab with input "lo" completes to "look"', () => {
      component.inputValue = 'lo';
      component.handleKeydown(new KeyboardEvent('keydown', { key: 'Tab' }));
      expect(component.inputValue).toBe('look');
    });

    it('Tab with input "n" completes to first match "ne"', () => {
      component.inputValue = 'n';
      component.handleKeydown(new KeyboardEvent('keydown', { key: 'Tab' }));
      expect(component.inputValue).toBe('ne');
    });

    it('second Tab with same prefix "n" cycles to next match "north"', () => {
      component.inputValue = 'n';
      component.handleKeydown(new KeyboardEvent('keydown', { key: 'Tab' }));
      component.handleKeydown(new KeyboardEvent('keydown', { key: 'Tab' }));
      expect(component.inputValue).toBe('north');
    });

    it('Tab with input "xyz" (no match) does nothing', () => {
      component.inputValue = 'xyz';
      component.handleKeydown(new KeyboardEvent('keydown', { key: 'Tab' }));
      expect(component.inputValue).toBe('xyz');
    });

    it('after Enter (submit), Tab on same prefix restarts cycle from beginning', () => {
      component.inputValue = 'n';
      component.handleKeydown(new KeyboardEvent('keydown', { key: 'Tab' }));
      component.handleKeydown(new KeyboardEvent('keydown', { key: 'Tab' }));
      // now on 'north', submit to reset
      component.inputValue = 'north';
      component.submit();
      // restart cycle
      component.inputValue = 'n';
      component.handleKeydown(new KeyboardEvent('keydown', { key: 'Tab' }));
      expect(component.inputValue).toBe('ne');
    });

    it('after ArrowUp, Tab restarts the cycle from the beginning', () => {
      component.inputValue = 'go north';
      component.submit();
      // cycle through two 'n' completions
      component.inputValue = 'n';
      component.handleKeydown(new KeyboardEvent('keydown', { key: 'Tab' }));
      component.handleKeydown(new KeyboardEvent('keydown', { key: 'Tab' }));
      // navigate history to reset tab state
      component.handleKeydown(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
      // type prefix again and Tab should restart from beginning
      component.inputValue = 'n';
      component.handleKeydown(new KeyboardEvent('keydown', { key: 'Tab' }));
      expect(component.inputValue).toBe('ne');
    });
  });

  // ---------------------------------------------------------------------------
  // Font size controls
  // ---------------------------------------------------------------------------

  describe('TerminalComponent — font size', () => {
    afterEach(() => {
      localStorage.removeItem('zork1-font-size');
    });

    it('fontSize defaults to 14 when localStorage has no saved value', () => {
      localStorage.removeItem('zork1-font-size');
      const freshComponent = TestBed.createComponent(TerminalComponent).componentInstance;
      expect(freshComponent.fontSize).toBe(14);
    });

    it('fontSize is initialised from localStorage zork1-font-size key if present', () => {
      localStorage.setItem('zork1-font-size', '18');
      const freshComponent = TestBed.createComponent(TerminalComponent).componentInstance;
      expect(freshComponent.fontSize).toBe(18);
    });

    it('increaseFontSize() increments fontSize by 2', () => {
      component.fontSize = 14;
      component.increaseFontSize();
      expect(component.fontSize).toBe(16);
    });

    it('decreaseFontSize() decrements fontSize by 2', () => {
      component.fontSize = 14;
      component.decreaseFontSize();
      expect(component.fontSize).toBe(12);
    });

    it('increaseFontSize() does not exceed 20', () => {
      component.fontSize = 20;
      component.increaseFontSize();
      expect(component.fontSize).toBe(20);
    });

    it('decreaseFontSize() does not go below 10', () => {
      component.fontSize = 10;
      component.decreaseFontSize();
      expect(component.fontSize).toBe(10);
    });

    it('increaseFontSize() persists the new value to localStorage', () => {
      component.fontSize = 14;
      component.increaseFontSize();
      expect(localStorage.getItem('zork1-font-size')).toBe('16');
    });

    it('decreaseFontSize() persists the new value to localStorage', () => {
      component.fontSize = 14;
      component.decreaseFontSize();
      expect(localStorage.getItem('zork1-font-size')).toBe('12');
    });
  });

  // ---------------------------------------------------------------------------
  // Keyboard shortcuts
  // ---------------------------------------------------------------------------

  describe('TerminalComponent — keyboard shortcuts', () => {
    it('Ctrl+L clears the transcript when it had lines', () => {
      component.addResponse('West of House');
      component.addResponse('You can see a mailbox here.');
      expect(component.transcript).toHaveLength(2);
      component.handleKeydown(new KeyboardEvent('keydown', { key: 'l', ctrlKey: true }));
      expect(component.transcript).toHaveLength(0);
    });

    it('Ctrl+L calls event.preventDefault()', () => {
      const event = new KeyboardEvent('keydown', { key: 'l', ctrlKey: true });
      const spy = vi.spyOn(event, 'preventDefault');
      component.handleKeydown(event);
      expect(spy).toHaveBeenCalled();
    });

    it('Ctrl+S emits "save" on the command EventEmitter', () => {
      const emitted: string[] = [];
      component.command.subscribe((cmd: string) => emitted.push(cmd));
      component.handleKeydown(new KeyboardEvent('keydown', { key: 's', ctrlKey: true }));
      expect(emitted).toEqual(['save']);
    });

    it('Ctrl+S calls event.preventDefault()', () => {
      const event = new KeyboardEvent('keydown', { key: 's', ctrlKey: true });
      const spy = vi.spyOn(event, 'preventDefault');
      component.handleKeydown(event);
      expect(spy).toHaveBeenCalled();
    });

    it('Ctrl+Z emits "undo" on the command EventEmitter', () => {
      const emitted: string[] = [];
      component.command.subscribe((cmd: string) => emitted.push(cmd));
      component.handleKeydown(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true }));
      expect(emitted).toEqual(['undo']);
    });

    it('Ctrl+Z calls event.preventDefault()', () => {
      const event = new KeyboardEvent('keydown', { key: 'z', ctrlKey: true });
      const spy = vi.spyOn(event, 'preventDefault');
      component.handleKeydown(event);
      expect(spy).toHaveBeenCalled();
    });

    it('Ctrl+L does NOT emit a command', () => {
      const emitted: string[] = [];
      component.command.subscribe((cmd: string) => emitted.push(cmd));
      component.handleKeydown(new KeyboardEvent('keydown', { key: 'l', ctrlKey: true }));
      expect(emitted).toHaveLength(0);
    });
  });

  // ---------------------------------------------------------------------------
  // Theme toggle
  // ---------------------------------------------------------------------------

  describe('theme toggle', () => {
    afterEach(() => {
      localStorage.removeItem('zork1-theme');
    });

    it('defaults theme to amber when localStorage has no saved value', () => {
      localStorage.removeItem('zork1-theme');
      const freshComponent = TestBed.createComponent(TerminalComponent).componentInstance;
      expect(freshComponent.theme).toBe('amber');
    });

    it('initializes theme from localStorage zork1-theme key', () => {
      localStorage.setItem('zork1-theme', 'green');
      const freshComponent = TestBed.createComponent(TerminalComponent).componentInstance;
      expect(freshComponent.theme).toBe('green');
    });

    it('toggleTheme switches from amber to green', () => {
      component.theme = 'amber';
      component.toggleTheme();
      expect(component.theme).toBe('green');
    });

    it('toggleTheme switches from green back to amber', () => {
      component.theme = 'green';
      component.toggleTheme();
      expect(component.theme).toBe('amber');
    });

    it('toggleTheme persists new value to localStorage under zork1-theme', () => {
      component.theme = 'amber';
      component.toggleTheme();
      expect(localStorage.getItem('zork1-theme')).toBe('green');
    });
  });
});
