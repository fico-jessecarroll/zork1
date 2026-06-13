import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HintsComponent } from './hints.component';

describe('HintsComponent', () => {
  let component: HintsComponent;
  let fixture: ComponentFixture<HintsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HintsComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(HintsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('isOpen starts as false', () => {
    expect(component.isOpen).toBe(false);
  });

  it('toggle() sets isOpen to true when it was false', () => {
    component.toggle();
    expect(component.isOpen).toBe(true);
  });

  it('toggle() sets isOpen to false when it was true', () => {
    component.isOpen = true;
    component.toggle();
    expect(component.isOpen).toBe(false);
  });

  it('revealedCount starts at 0', () => {
    expect(component.revealedCount).toBe(0);
  });

  it('revealNext() increments revealedCount', () => {
    component.roomId = 'WEST-OF-HOUSE';
    fixture.detectChanges();
    component.revealNext();
    expect(component.revealedCount).toBe(1);
  });

  it('revealNext() does not exceed hints.length', () => {
    component.roomId = 'WEST-OF-HOUSE';
    fixture.detectChanges();
    const hintCount = component.hints.length;
    for (let i = 0; i < hintCount + 5; i++) {
      component.revealNext();
    }
    expect(component.revealedCount).toBe(hintCount);
  });

  it('hasHints returns true when roomId maps to a known room in HINTS', () => {
    component.roomId = 'WEST-OF-HOUSE';
    fixture.detectChanges();
    expect(component.hasHints).toBe(true);
  });

  it('hasHints returns false for an unknown room ID', () => {
    component.roomId = 'UNKNOWN-ROOM-XYZ';
    fixture.detectChanges();
    expect(component.hasHints).toBe(false);
  });

  it('toggle() resets revealedCount to 0 when closing the panel', () => {
    component.roomId = 'WEST-OF-HOUSE';
    fixture.detectChanges();
    component.toggle(); // open
    component.revealNext();
    component.revealNext();
    expect(component.revealedCount).toBe(2);
    component.toggle(); // close
    expect(component.revealedCount).toBe(0);
  });

  it('hints getter returns the correct array for a known room ID', () => {
    component.roomId = 'LIVING-ROOM';
    fixture.detectChanges();
    expect(component.hints.length).toBeGreaterThan(0);
    expect(component.hints[0]).toContain('trophy case');
  });
});
