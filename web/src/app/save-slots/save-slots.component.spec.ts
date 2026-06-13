import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SaveSlotsComponent } from './save-slots.component';
import { SlotInfo } from '../game.service';

function makeSlot(overrides: Partial<SlotInfo> = {}): SlotInfo {
  return { name: 'quick', timestamp: 1000000000000, room: 'WEST-OF-HOUSE', score: 0, ...overrides };
}

describe('SaveSlotsComponent', () => {
  let fixture: ComponentFixture<SaveSlotsComponent>;
  let component: SaveSlotsComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SaveSlotsComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(SaveSlotsComponent);
    component = fixture.componentInstance;
    // detectChanges() is called per-test after state is configured
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('starts collapsed', () => {
    fixture.detectChanges();
    expect(component.isOpen).toBe(false);
    const panel = fixture.nativeElement.querySelector('.saves-panel');
    expect(panel).toBeNull();
  });

  it('toggle() sets isOpen to true when closed', () => {
    fixture.detectChanges();
    component.toggle();
    expect(component.isOpen).toBe(true);
  });

  it('toggle() sets isOpen to false when open', () => {
    fixture.detectChanges();
    component.isOpen = true;
    component.toggle();
    expect(component.isOpen).toBe(false);
  });

  it('shows no-saves message when slots is empty and panel is open', () => {
    component.slots = [];
    component.isOpen = true;
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('No saved games');
  });

  it('renders each slot name when panel is open', () => {
    component.slots = [makeSlot({ name: 'run1' }), makeSlot({ name: 'run2' })];
    component.isOpen = true;
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('run1');
    expect(el.textContent).toContain('run2');
  });

  it('emits restoreSlot with the slot name when restore button is clicked', () => {
    component.slots = [makeSlot({ name: 'myslot' })];
    component.isOpen = true;
    fixture.detectChanges();

    const emitted: string[] = [];
    component.restoreSlot.subscribe((name: string) => emitted.push(name));

    const btn: HTMLButtonElement = fixture.nativeElement.querySelector('.restore-btn');
    btn.click();

    expect(emitted).toEqual(['myslot']);
  });

  it('displays the room name for each slot', () => {
    component.slots = [makeSlot({ room: 'FOREST-1' })];
    component.isOpen = true;
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('FOREST-1');
  });

  it('displays the score for each slot', () => {
    component.slots = [makeSlot({ score: 42 })];
    component.isOpen = true;
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('42');
  });
});
