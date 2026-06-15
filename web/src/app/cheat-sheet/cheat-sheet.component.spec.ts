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

describe('CheatSheetComponent — collapsible', () => {
  let fixture: ComponentFixture<CheatSheetComponent>;
  let component: CheatSheetComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CheatSheetComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(CheatSheetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('renders a toggle button', () => {
    const btn = (fixture.nativeElement as HTMLElement).querySelector('.sheet-toggle');
    expect(btn).not.toBeNull();
  });

  it('is open by default', () => {
    expect(component.isOpen).toBe(true);
  });

  it('hides section content after clicking toggle', () => {
    const btn = (fixture.nativeElement as HTMLElement).querySelector('.sheet-toggle') as HTMLElement;
    btn.click();
    fixture.detectChanges();
    const sections = (fixture.nativeElement as HTMLElement).querySelectorAll('.section');
    expect(sections.length).toBe(0);
  });

  it('shows section content again after second click', () => {
    const btn = (fixture.nativeElement as HTMLElement).querySelector('.sheet-toggle') as HTMLElement;
    btn.click();
    fixture.detectChanges();
    btn.click();
    fixture.detectChanges();
    const sections = (fixture.nativeElement as HTMLElement).querySelectorAll('.section');
    expect(sections.length).toBeGreaterThan(0);
  });

  it('toggle button text reflects open state', () => {
    const btn = (fixture.nativeElement as HTMLElement).querySelector('.sheet-toggle') as HTMLElement;
    const openText = btn.textContent;
    btn.click();
    fixture.detectChanges();
    const closedText = btn.textContent;
    expect(openText).not.toEqual(closedText);
  });
});
