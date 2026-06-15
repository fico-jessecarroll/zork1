import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ExitsComponent } from './exits.component';

describe('ExitsComponent', () => {
  let fixture: ComponentFixture<ExitsComponent>;
  let component: ExitsComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExitsComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(ExitsComponent);
    component = fixture.componentInstance;
  });

  it('shows "None" when exits is empty', () => {
    component.exits = [];
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('None');
  });

  it('shows north and east when exits contains them', () => {
    component.exits = ['north', 'east'];
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('N');
    expect(el.textContent).toContain('E');
  });

  it('renders 2 exit elements when exits has 2 entries', () => {
    component.exits = ['north', 'east'];
    fixture.detectChanges();
    const tags = (fixture.nativeElement as HTMLElement).querySelectorAll('.exit-tag');
    expect(tags.length).toBe(2);
  });

  it('displays direction names in uppercase abbreviation', () => {
    component.exits = ['north', 'east'];
    fixture.detectChanges();
    const tags = (fixture.nativeElement as HTMLElement).querySelectorAll('.exit-tag');
    const texts = Array.from(tags).map(t => t.textContent?.trim());
    expect(texts).toContain('N');
    expect(texts).toContain('E');
  });
});

describe('ExitsComponent — collapsible', () => {
  let fixture: ComponentFixture<ExitsComponent>;
  let component: ExitsComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExitsComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(ExitsComponent);
    component = fixture.componentInstance;
    component.exits = ['north'];
    fixture.detectChanges();
  });

  it('renders a toggle button', () => {
    const btn = (fixture.nativeElement as HTMLElement).querySelector('.exits-toggle');
    expect(btn).not.toBeNull();
  });

  it('is open by default', () => {
    expect(component.isOpen).toBe(true);
  });

  it('hides exits-body after clicking toggle', () => {
    const btn = (fixture.nativeElement as HTMLElement).querySelector('.exits-toggle') as HTMLElement;
    btn.click();
    fixture.detectChanges();
    const body = (fixture.nativeElement as HTMLElement).querySelector('.exits-body');
    expect(body).toBeNull();
  });

  it('shows exits-body again after second click', () => {
    const btn = (fixture.nativeElement as HTMLElement).querySelector('.exits-toggle') as HTMLElement;
    btn.click();
    fixture.detectChanges();
    btn.click();
    fixture.detectChanges();
    const body = (fixture.nativeElement as HTMLElement).querySelector('.exits-body');
    expect(body).not.toBeNull();
  });
});
