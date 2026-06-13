import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { CheatSheetComponent } from './cheat-sheet.component';

describe('CheatSheetComponent', () => {
  let fixture: ComponentFixture<CheatSheetComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CheatSheetComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(CheatSheetComponent);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('renders a Movement section heading', () => {
    const headings = fixture.debugElement
      .queryAll(By.css('.section-heading'))
      .map(el => el.nativeElement.textContent.trim());
    expect(headings).toContain('Movement');
  });

  it('renders an Objects section heading', () => {
    const headings = fixture.debugElement
      .queryAll(By.css('.section-heading'))
      .map(el => el.nativeElement.textContent.trim());
    expect(headings).toContain('Objects');
  });

  it('renders a Meta section heading', () => {
    const headings = fixture.debugElement
      .queryAll(By.css('.section-heading'))
      .map(el => el.nativeElement.textContent.trim());
    expect(headings).toContain('Meta');
  });

  it('lists directional movement commands', () => {
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('n / s / e / w');
  });

  it('lists look and inventory commands', () => {
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('look');
    expect(text).toContain('inventory');
  });

  it('lists object interaction commands', () => {
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('take');
    expect(text).toContain('drop');
    expect(text).toContain('examine');
    expect(text).toContain('open');
  });

  it('lists meta commands', () => {
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('save');
    expect(text).toContain('restore');
    expect(text).toContain('undo');
    expect(text).toContain('quit');
  });
});
