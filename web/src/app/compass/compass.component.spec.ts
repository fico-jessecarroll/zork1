import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CompassComponent } from './compass.component';

describe('CompassComponent', () => {
  let fixture: ComponentFixture<CompassComponent>;
  let component: CompassComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CompassComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(CompassComponent);
    component = fixture.componentInstance;
  });

  it('creates successfully', () => {
    expect(component).toBeTruthy();
  });

  describe('isAvailable()', () => {
    it('returns true for a direction present in exits', () => {
      component.exits = ['north', 'east'];
      expect(component.isAvailable('north')).toBe(true);
      expect(component.isAvailable('east')).toBe(true);
    });

    it('returns false for a direction not in exits', () => {
      component.exits = ['north'];
      expect(component.isAvailable('south')).toBe(false);
      expect(component.isAvailable('west')).toBe(false);
    });

    it('returns false when exits is empty', () => {
      component.exits = [];
      expect(component.isAvailable('north')).toBe(false);
    });
  });

  describe('rendering', () => {
    it('applies "available" class to exits in the exits array', () => {
      component.exits = ['north', 'west'];
      fixture.detectChanges();
      const el = fixture.nativeElement as HTMLElement;
      const northCell = el.querySelector('[data-dir="north"]');
      const westCell = el.querySelector('[data-dir="west"]');
      expect(northCell?.classList).toContain('available');
      expect(westCell?.classList).toContain('available');
    });

    it('does not apply "available" class to directions not in exits', () => {
      component.exits = ['north'];
      fixture.detectChanges();
      const el = fixture.nativeElement as HTMLElement;
      const southCell = el.querySelector('[data-dir="south"]');
      const eastCell = el.querySelector('[data-dir="east"]');
      expect(southCell?.classList).not.toContain('available');
      expect(eastCell?.classList).not.toContain('available');
    });

    it('renders all 8 compass direction cells', () => {
      component.exits = [];
      fixture.detectChanges();
      const el = fixture.nativeElement as HTMLElement;
      const dirs = ['north', 'south', 'east', 'west', 'ne', 'nw', 'se', 'sw'];
      for (const dir of dirs) {
        expect(el.querySelector(`[data-dir="${dir}"]`)).not.toBeNull();
      }
    });

    it('displays abbreviated direction labels', () => {
      component.exits = [];
      fixture.detectChanges();
      const el = fixture.nativeElement as HTMLElement;
      expect(el.textContent).toContain('N');
      expect(el.textContent).toContain('S');
      expect(el.textContent).toContain('E');
      expect(el.textContent).toContain('W');
    });
  });
});

describe('CompassComponent — collapsible', () => {
  let fixture: ComponentFixture<CompassComponent>;
  let component: CompassComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CompassComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(CompassComponent);
    component = fixture.componentInstance;
    component.exits = ['north'];
    fixture.detectChanges();
  });

  it('renders a toggle button', () => {
    const btn = (fixture.nativeElement as HTMLElement).querySelector('.compass-toggle');
    expect(btn).not.toBeNull();
  });

  it('is open by default', () => {
    expect(component.isOpen).toBe(true);
  });

  it('hides compass-grid after clicking toggle', () => {
    const btn = (fixture.nativeElement as HTMLElement).querySelector('.compass-toggle') as HTMLElement;
    btn.click();
    fixture.detectChanges();
    const grid = (fixture.nativeElement as HTMLElement).querySelector('.compass-grid');
    expect(grid).toBeNull();
  });

  it('shows compass-grid again after second click', () => {
    const btn = (fixture.nativeElement as HTMLElement).querySelector('.compass-toggle') as HTMLElement;
    btn.click();
    fixture.detectChanges();
    btn.click();
    fixture.detectChanges();
    const grid = (fixture.nativeElement as HTMLElement).querySelector('.compass-grid');
    expect(grid).not.toBeNull();
  });
});
